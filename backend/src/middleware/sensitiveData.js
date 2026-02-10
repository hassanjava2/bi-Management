/**
 * BI Management - Sensitive Data Middleware
 * حماية البيانات الحساسة
 */

const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

/**
 * Middleware للتحقق من صلاحية الوصول للبيانات الحساسة
 * @param {number} requiredLevel - مستوى الأمان المطلوب (1-5)
 */
function sensitiveDataMiddleware(requiredLevel) {
    return async (req, res, next) => {
        const userLevel = req.user?.security_level || 1;

        if (userLevel < requiredLevel) {
            // تسجيل محاولة الوصول المرفوضة
            await logAccessDenied(req.user?.id, req.path, requiredLevel, userLevel);

            // فحص المحاولات المتكررة
            await checkSuspiciousActivity(req.user?.id);

            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'ليس لديك صلاحية الوصول لهذه البيانات'
            });
        }

        // تسجيل الوصول الناجح
        await logSensitiveAccess(req.user?.id, req.method, req.path);

        next();
    };
}

/**
 * Middleware لإخفاء الحقول الحساسة من الاستجابة
 */
function hideSensitiveFields(fieldsToHide = []) {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = (data) => {
            const sanitized = sanitizeResponse(data, fieldsToHide, req.user?.security_level || 1);
            return originalJson(sanitized);
        };

        next();
    };
}

/**
 * تنظيف الاستجابة من الحقول الحساسة
 */
function sanitizeResponse(data, fieldsToHide, userLevel) {
    if (!data) return data;

    // الحقول التي تتطلب مستويات مختلفة
    const levelRequirements = {
        salary: 4,
        basic_salary: 4,
        net_salary: 4,
        bank_account: 5,
        national_id: 4,
        password_hash: 999, // لا أحد يرى
        password: 999,
        secret: 999
    };

    function sanitize(obj) {
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }

        if (obj && typeof obj === 'object') {
            const result = {};
            
            for (const [key, value] of Object.entries(obj)) {
                const requiredLevel = levelRequirements[key] || 0;
                
                if (fieldsToHide.includes(key) || userLevel < requiredLevel) {
                    // إخفاء الحقل أو عرض placeholder
                    if (key.includes('salary') || key.includes('amount')) {
                        result[key] = userLevel >= requiredLevel ? value : '******';
                    } else {
                        // لا نضيف الحقل أصلاً
                        continue;
                    }
                } else {
                    result[key] = sanitize(value);
                }
            }
            
            return result;
        }

        return obj;
    }

    return sanitize(data);
}

/**
 * تسجيل محاولة الوصول المرفوضة
 */
async function logAccessDenied(userId, path, requiredLevel, actualLevel) {
    try {
        await run(`
            INSERT INTO security_events (
                id, user_id, event_type, severity, details, ip_address, created_at
            ) VALUES (?, ?, 'ACCESS_DENIED', 'warning', ?, ?, CURRENT_TIMESTAMP)
        `, [
            generateId(),
            userId,
            JSON.stringify({ path, required_level: requiredLevel, actual_level: actualLevel }),
            null // IP يضاف لاحقاً
        ]);
    } catch (e) {
        console.error('[Security] Log access denied error:', e.message);
    }
}

/**
 * تسجيل الوصول للبيانات الحساسة
 */
async function logSensitiveAccess(userId, method, path) {
    try {
        await run(`
            INSERT INTO audit_logs (
                id, user_id, action, table_name, details, created_at
            ) VALUES (?, ?, ?, 'sensitive_data', ?, CURRENT_TIMESTAMP)
        `, [
            generateId(),
            userId,
            `${method} ${path}`,
            JSON.stringify({ path, method })
        ]);
    } catch (e) {
        // Ignore logging errors
    }
}

/**
 * فحص النشاط المشبوه
 */
async function checkSuspiciousActivity(userId) {
    if (!userId) return;

    try {
        // عد المحاولات المرفوضة في آخر ساعة
        const result = await get(`
            SELECT COUNT(*) as count FROM security_events
            WHERE user_id = ? 
            AND event_type = 'ACCESS_DENIED'
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
        `, [userId]);

        if (result?.count >= 5) {
            // تنبيه - نشاط مشبوه
            await alertSecurityTeam(userId, 'SUSPICIOUS_ACCESS_ATTEMPTS', result.count);
        }
    } catch (e) {
        console.error('[Security] Check suspicious activity error:', e.message);
    }
}

/**
 * تنبيه فريق الأمان
 */
async function alertSecurityTeam(userId, alertType, details) {
    try {
        // تسجيل التنبيه
        await run(`
            INSERT INTO security_events (
                id, user_id, event_type, severity, details, created_at
            ) VALUES (?, ?, ?, 'critical', ?, CURRENT_TIMESTAMP)
        `, [
            generateId(),
            userId,
            alertType,
            JSON.stringify({ details })
        ]);

        // إرسال إشعار للـ Admin
        const admins = await all(
            `SELECT id FROM users WHERE role = 'admin'`
        );

        const notificationService = require('../services/notification.service');
        
        for (const admin of admins) {
            notificationService.create({
                user_id: admin.id,
                title: '🚨 تنبيه أمني',
                body: `نشاط مشبوه من المستخدم: ${userId}`,
                type: 'urgent',
                data: { alert_type: alertType, target_user: userId }
            });
        }

        console.log(`[SECURITY ALERT] ${alertType} for user ${userId}`);
    } catch (e) {
        console.error('[Security] Alert error:', e.message);
    }
}

/**
 * Middleware للتحقق من الطلبات المشبوهة
 */
function requestValidator(req, res, next) {
    // فحص محاولات SQL Injection
    const suspiciousPatterns = [
        /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
        /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
        /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
        /(union|select|insert|update|delete|drop|exec|execute)/i
    ];

    const checkValue = (value) => {
        if (typeof value === 'string') {
            for (const pattern of suspiciousPatterns) {
                if (pattern.test(value)) {
                    return true;
                }
            }
        }
        return false;
    };

    // فحص query params
    for (const [key, value] of Object.entries(req.query || {})) {
        if (checkValue(value)) {
            logAccessDenied(req.user?.id, req.path, 0, 0);
            return res.status(400).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: 'طلب غير صالح'
            });
        }
    }

    // فحص body
    const checkObject = (obj) => {
        if (!obj) return false;
        for (const value of Object.values(obj)) {
            if (typeof value === 'object') {
                if (checkObject(value)) return true;
            } else if (checkValue(value)) {
                return true;
            }
        }
        return false;
    };

    if (checkObject(req.body)) {
        logAccessDenied(req.user?.id, req.path, 0, 0);
        return res.status(400).json({
            success: false,
            error: 'INVALID_REQUEST',
            message: 'طلب غير صالح'
        });
    }

    next();
}

module.exports = {
    sensitiveDataMiddleware,
    hideSensitiveFields,
    sanitizeResponse,
    requestValidator,
    logSensitiveAccess,
    alertSecurityTeam
};
