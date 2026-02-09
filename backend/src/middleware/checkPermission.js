/**
 * BI Management - Permission Checking Middleware
 * نظام فحص الصلاحيات المرن (600+ صلاحية)
 */

const { getDatabase } = require('../config/database');
const { getAuditService, EVENT_CATEGORIES, SEVERITY } = require('../services/audit.service');

/**
 * فحص صلاحية واحدة
 * @param {string} permissionCode - كود الصلاحية مثل 'sales.invoice.create'
 * @param {object} options - خيارات إضافية
 */
function checkPermission(permissionCode, options = {}) {
    return async (req, res, next) => {
        try {
            const db = getDatabase();
            const userId = req.user?.id;
            const userRole = req.user?.role;
            const userSecurityLevel = req.user?.security_level || 0;

            // التحقق من تسجيل الدخول
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'يجب تسجيل الدخول'
                });
            }

            // Super Admin و Owner لهم كل الصلاحيات
            if (['super_admin', 'owner'].includes(userRole)) {
                return next();
            }

            // جلب معلومات الصلاحية
            const permission = db.prepare(`
                SELECT * FROM permissions WHERE code = ?
            `).getAsObject([permissionCode]);

            if (!permission || !permission.id) {
                console.warn(`[Permission] Unknown permission code: ${permissionCode}`);
                // السماح بالمرور إذا الصلاحية غير موجودة (للتطوير)
                if (process.env.NODE_ENV === 'development') {
                    return next();
                }
                return res.status(403).json({
                    success: false,
                    error: 'UNKNOWN_PERMISSION',
                    message: 'صلاحية غير معروفة'
                });
            }

            // التحقق من مستوى الأمان
            if (permission.security_level > userSecurityLevel) {
                logAccessDenied(req, permissionCode, 'SECURITY_LEVEL_LOW');
                return res.status(403).json({
                    success: false,
                    error: 'SECURITY_LEVEL_INSUFFICIENT',
                    message: 'مستوى الأمان غير كافٍ لهذه العملية',
                    required_level: permission.security_level
                });
            }

            // 1. التحقق من الصلاحيات المخصصة للمستخدم أولاً (Override)
            const userPermission = db.prepare(`
                SELECT * FROM user_permissions 
                WHERE user_id = ? AND permission_id = ?
                AND (expires_at IS NULL OR expires_at > datetime('now'))
            `).getAsObject([userId, permission.id]);

            if (userPermission && userPermission.id) {
                if (userPermission.is_granted === 0) {
                    // الصلاحية ملغية صراحة للمستخدم
                    logAccessDenied(req, permissionCode, 'USER_PERMISSION_REVOKED');
                    return res.status(403).json({
                        success: false,
                        error: 'PERMISSION_REVOKED',
                        message: 'هذه الصلاحية ملغية لحسابك',
                        permission: permissionCode
                    });
                }
                // الصلاحية ممنوحة صراحة للمستخدم
                return handleSensitivePermission(req, res, next, permission);
            }

            // 2. التحقق من صلاحيات الدور
            const rolePermission = db.prepare(`
                SELECT rp.* FROM role_permissions rp
                JOIN users u ON u.role_id = rp.role_id
                WHERE u.id = ? AND rp.permission_id = ?
            `).getAsObject([userId, permission.id]);

            if (rolePermission && rolePermission.id) {
                // الصلاحية موجودة في الدور
                return handleSensitivePermission(req, res, next, permission);
            }

            // الصلاحية غير موجودة
            logAccessDenied(req, permissionCode, 'NO_PERMISSION');
            return res.status(403).json({
                success: false,
                error: 'PERMISSION_DENIED',
                message: 'ليس لديك صلاحية لهذه العملية',
                permission: permissionCode,
                required_permission: permission.name_ar
            });

        } catch (error) {
            console.error('[Permission] Error checking permission:', error);
            return res.status(500).json({
                success: false,
                error: 'PERMISSION_CHECK_ERROR',
                message: 'خطأ في التحقق من الصلاحيات'
            });
        }
    };
}

/**
 * فحص عدة صلاحيات (يحتاج واحدة منها على الأقل)
 * @param {string[]} permissionCodes - قائمة أكواد الصلاحيات
 */
function checkAnyPermission(permissionCodes) {
    return async (req, res, next) => {
        const db = getDatabase();
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'يجب تسجيل الدخول'
            });
        }

        // Super Admin و Owner لهم كل الصلاحيات
        if (['super_admin', 'owner'].includes(userRole)) {
            return next();
        }

        for (const code of permissionCodes) {
            const hasPermission = await checkUserHasPermission(userId, code);
            if (hasPermission) {
                return next();
            }
        }

        logAccessDenied(req, permissionCodes.join(','), 'NO_ANY_PERMISSION');
        return res.status(403).json({
            success: false,
            error: 'PERMISSION_DENIED',
            message: 'ليس لديك أي من الصلاحيات المطلوبة',
            required_permissions: permissionCodes
        });
    };
}

/**
 * فحص عدة صلاحيات (يحتاج جميعها)
 * @param {string[]} permissionCodes - قائمة أكواد الصلاحيات
 */
function checkAllPermissions(permissionCodes) {
    return async (req, res, next) => {
        const db = getDatabase();
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'يجب تسجيل الدخول'
            });
        }

        // Super Admin و Owner لهم كل الصلاحيات
        if (['super_admin', 'owner'].includes(userRole)) {
            return next();
        }

        const missingPermissions = [];
        for (const code of permissionCodes) {
            const hasPermission = await checkUserHasPermission(userId, code);
            if (!hasPermission) {
                missingPermissions.push(code);
            }
        }

        if (missingPermissions.length > 0) {
            logAccessDenied(req, missingPermissions.join(','), 'MISSING_PERMISSIONS');
            return res.status(403).json({
                success: false,
                error: 'PERMISSION_DENIED',
                message: 'ينقصك بعض الصلاحيات المطلوبة',
                missing_permissions: missingPermissions
            });
        }

        return next();
    };
}

/**
 * فحص مستوى الأمان
 * @param {number} requiredLevel - المستوى المطلوب (1-5)
 */
function checkSecurityLevel(requiredLevel) {
    return (req, res, next) => {
        const userLevel = req.user?.security_level || 0;

        if (userLevel < requiredLevel) {
            logAccessDenied(req, `security_level_${requiredLevel}`, 'SECURITY_LEVEL_LOW');
            return res.status(403).json({
                success: false,
                error: 'SECURITY_LEVEL_INSUFFICIENT',
                message: 'مستوى الأمان غير كافٍ',
                required_level: requiredLevel,
                current_level: userLevel
            });
        }

        return next();
    };
}

/**
 * التحقق من أن المستخدم لديه صلاحية معينة
 * @param {string} userId 
 * @param {string} permissionCode 
 * @returns {boolean}
 */
async function checkUserHasPermission(userId, permissionCode) {
    try {
        const db = getDatabase();

        // جلب معلومات الصلاحية
        const stmt1 = db.prepare('SELECT id FROM permissions WHERE code = ?');
        stmt1.bind([permissionCode]);
        let permission = null;
        if (stmt1.step()) {
            permission = stmt1.getAsObject();
        }
        stmt1.free();

        if (!permission) {
            return false;
        }

        // التحقق من صلاحيات المستخدم المخصصة
        const stmt2 = db.prepare(`
            SELECT is_granted FROM user_permissions 
            WHERE user_id = ? AND permission_id = ?
            AND (expires_at IS NULL OR expires_at > datetime('now'))
        `);
        stmt2.bind([userId, permission.id]);
        let userPerm = null;
        if (stmt2.step()) {
            userPerm = stmt2.getAsObject();
        }
        stmt2.free();

        if (userPerm) {
            return userPerm.is_granted === 1;
        }

        // التحقق من صلاحيات الدور
        const stmt3 = db.prepare(`
            SELECT 1 FROM role_permissions rp
            JOIN users u ON u.role_id = rp.role_id
            WHERE u.id = ? AND rp.permission_id = ?
        `);
        stmt3.bind([userId, permission.id]);
        const hasRolePerm = stmt3.step();
        stmt3.free();

        return hasRolePerm;
    } catch (error) {
        console.error('[Permission] Error in checkUserHasPermission:', error);
        return false;
    }
}

/**
 * جلب كل صلاحيات المستخدم
 * @param {string} userId 
 * @returns {string[]} قائمة أكواد الصلاحيات
 */
async function getUserPermissions(userId) {
    try {
        const db = getDatabase();
        const permissions = new Set();

        // جلب صلاحيات الدور
        const rolePerms = db.prepare(`
            SELECT p.code FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN users u ON u.role_id = rp.role_id
            WHERE u.id = ?
        `);
        rolePerms.bind([userId]);
        while (rolePerms.step()) {
            const row = rolePerms.getAsObject();
            permissions.add(row.code);
        }
        rolePerms.free();

        // جلب صلاحيات المستخدم المخصصة
        const userPerms = db.prepare(`
            SELECT p.code, up.is_granted FROM permissions p
            JOIN user_permissions up ON p.id = up.permission_id
            WHERE up.user_id = ?
            AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))
        `);
        userPerms.bind([userId]);
        while (userPerms.step()) {
            const row = userPerms.getAsObject();
            if (row.is_granted === 1) {
                permissions.add(row.code);
            } else {
                permissions.delete(row.code);
            }
        }
        userPerms.free();

        return Array.from(permissions);
    } catch (error) {
        console.error('[Permission] Error getting user permissions:', error);
        return [];
    }
}

/**
 * معالجة الصلاحيات الحساسة
 */
async function handleSensitivePermission(req, res, next, permission) {
    // إذا الصلاحية تتطلب 2FA
    if (permission.requires_2fa && !req.user.two_factor_verified) {
        return res.status(403).json({
            success: false,
            error: 'REQUIRES_2FA',
            message: 'هذه العملية تتطلب التحقق بخطوتين',
            permission: permission.code
        });
    }

    // إذا الصلاحية تتطلب موافقة
    if (permission.requires_approval) {
        req.requiresApproval = true;
        req.permissionCode = permission.code;
    }

    // تسجيل استخدام الصلاحية الحساسة
    if (permission.is_sensitive) {
        try {
            const db = getDatabase();
            const auditService = getAuditService(db);
            auditService.log({
                eventType: 'sensitive_permission_used',
                eventCategory: EVENT_CATEGORIES.SECURITY,
                severity: SEVERITY.INFO,
                userId: req.user.id,
                userName: req.user.name,
                ipAddress: req.ip,
                action: permission.code,
                details: {
                    permission_name: permission.name_ar,
                    url: req.originalUrl,
                    method: req.method
                }
            });
        } catch (e) {
            console.error('[Permission] Error logging sensitive permission:', e);
        }
    }

    return next();
}

/**
 * تسجيل رفض الوصول
 */
function logAccessDenied(req, permissionCode, reason) {
    try {
        const db = getDatabase();
        const auditService = getAuditService(db);
        auditService.log({
            eventType: 'access_denied',
            eventCategory: EVENT_CATEGORIES.SECURITY,
            severity: SEVERITY.WARNING,
            userId: req.user?.id,
            userName: req.user?.name,
            ipAddress: req.ip,
            action: `Denied: ${permissionCode}`,
            details: {
                reason,
                url: req.originalUrl,
                method: req.method,
                user_role: req.user?.role
            }
        });
    } catch (e) {
        console.error('[Permission] Error logging access denied:', e);
    }
}

module.exports = {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    checkSecurityLevel,
    checkUserHasPermission,
    getUserPermissions
};
