/**
 * BI Management - Protection Middleware
 * حماية النظام من العمليات غير المصرح بها
 */

const { getAuditService, EVENT_CATEGORIES, SEVERITY } = require('../services/audit.service');

/**
 * منع الحذف المباشر
 */
function preventDelete(entityType) {
    return async (req, res, next) => {
        const auditService = getAuditService();
        const user = req.user;

        // تسجيل المحاولة
        await auditService.log({
            eventType: 'delete_attempt_blocked',
            eventCategory: EVENT_CATEGORIES.SYSTEM,
            severity: SEVERITY.WARNING,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            ipAddress: req.ip,
            entityType,
            entityId: req.params.id,
            action: `محاولة حذف مرفوضة: ${entityType}`
        });

        return res.status(403).json({
            success: false,
            error: 'DELETE_NOT_ALLOWED',
            message: 'الحذف المباشر غير مسموح. يرجى تقديم طلب حذف للموافقة.',
            action_required: 'request_deletion_approval'
        });
    };
}

/**
 * حماية تعديل الكمية
 */
function protectQuantityChange(entityType) {
    return async (req, res, next) => {
        const { quantity, quantity_change } = req.body;
        const user = req.user;
        const auditService = getAuditService();

        // إذا كان هناك تغيير مباشر للكمية
        if (quantity !== undefined || quantity_change !== undefined) {
            // فقط المالك يمكنه التعديل المباشر
            if (user?.role !== 'owner') {
                await auditService.log({
                    eventType: 'quantity_change_blocked',
                    eventCategory: EVENT_CATEGORIES.INVENTORY,
                    severity: SEVERITY.WARNING,
                    userId: user?.id,
                    userName: user?.name,
                    userRole: user?.role,
                    ipAddress: req.ip,
                    entityType,
                    entityId: req.params.id,
                    changes: { attempted_quantity: quantity || quantity_change },
                    action: 'محاولة تعديل كمية مرفوضة'
                });

                return res.status(403).json({
                    success: false,
                    error: 'QUANTITY_CHANGE_NOT_ALLOWED',
                    message: 'تعديل الكمية المباشر غير مسموح. استخدم الفواتير أو طلب موافقة.',
                    allowed_methods: [
                        'purchase_invoice',
                        'sale_invoice',
                        'return_invoice',
                        'transfer',
                        'approval_request'
                    ]
                });
            }
        }

        next();
    };
}

/**
 * حماية البيانات الحساسة
 */
const SENSITIVE_FIELDS = {
    'purchase_cost': { level: 'owner', logAccess: true },
    'cost_price': { level: 'owner', logAccess: true },
    'purchase_cost_encrypted': { level: 'owner', logAccess: true },
    'cost_price_encrypted': { level: 'owner', logAccess: true },
    'profit_margin': { level: 'owner', logAccess: true },
    'supplier_price': { level: 'owner', logAccess: true },
    'employee_salary': { level: 'owner', logAccess: true },
};

const ACCESS_LEVELS = {
    'owner': ['owner'],
    'manager': ['owner', 'manager'],
    'accountant': ['owner', 'manager', 'accountant'],
    'sales': ['owner', 'manager', 'accountant', 'sales'],
    'all': ['owner', 'manager', 'accountant', 'sales', 'inspector', 'preparer', 'warehouse', 'delivery', 'viewer']
};

function filterSensitiveData(data, userRole) {
    if (!data || typeof data !== 'object') return data;

    const filtered = Array.isArray(data) ? [...data] : { ...data };

    const filterObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        const result = Array.isArray(obj) ? [] : {};

        for (const [key, value] of Object.entries(obj)) {
            const fieldConfig = SENSITIVE_FIELDS[key];

            if (fieldConfig) {
                const allowedRoles = ACCESS_LEVELS[fieldConfig.level] || [];
                if (!allowedRoles.includes(userRole)) {
                    // إخفاء الحقل
                    continue;
                }
            }

            if (typeof value === 'object' && value !== null) {
                result[key] = filterObject(value);
            } else {
                result[key] = value;
            }
        }

        return result;
    };

    return filterObject(filtered);
}

function sensitiveDataFilter(req, res, next) {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
        const userRole = req.user?.role || 'viewer';
        const filteredData = filterSensitiveData(data, userRole);
        return originalJson(filteredData);
    };

    next();
}

/**
 * تسجيل الوصول للبيانات الحساسة
 */
function logSensitiveAccess(entityType) {
    return async (req, res, next) => {
        const user = req.user;
        const auditService = getAuditService();

        // إذا طلب حقول حساسة
        const requestedFields = req.query.fields?.split(',') || [];
        const sensitiveRequested = requestedFields.filter(f => SENSITIVE_FIELDS[f]);

        if (sensitiveRequested.length > 0) {
            await auditService.log({
                eventType: 'sensitive_data_accessed',
                eventCategory: EVENT_CATEGORIES.SENSITIVE,
                severity: SEVERITY.WARNING,
                userId: user?.id,
                userName: user?.name,
                userRole: user?.role,
                ipAddress: req.ip,
                entityType,
                entityId: req.params.id,
                changes: { fields_requested: sensitiveRequested },
                action: `وصول لبيانات حساسة: ${sensitiveRequested.join(', ')}`
            });
        }

        next();
    };
}

/**
 * التحقق من الصلاحيات
 */
function requirePermission(permission) {
    return async (req, res, next) => {
        const user = req.user;
        const auditService = getAuditService();

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'يجب تسجيل الدخول أولاً'
            });
        }

        // المالك له كل الصلاحيات
        if (user.role === 'owner') {
            return next();
        }

        // التحقق من الصلاحية
        const hasPermission = checkPermission(user, permission);

        if (!hasPermission) {
            await auditService.log({
                eventType: 'permission_denied',
                eventCategory: EVENT_CATEGORIES.AUTH,
                severity: SEVERITY.WARNING,
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                ipAddress: req.ip,
                changes: { required_permission: permission },
                action: `رفض صلاحية: ${permission}`
            });

            return res.status(403).json({
                success: false,
                error: 'PERMISSION_DENIED',
                message: 'ليس لديك صلاحية لهذه العملية',
                required_permission: permission
            });
        }

        next();
    };
}

function checkPermission(user, permission) {
    if (!user || !user.permissions) return false;

    // all = كل الصلاحيات
    if (user.permissions.all) return true;

    // تحقق من الصلاحية المحددة
    const parts = permission.split('.');
    let current = user.permissions;

    for (const part of parts) {
        if (current[part] === 1) return true;
        if (typeof current[part] === 'object') {
            current = current[part];
        } else {
            return false;
        }
    }

    return current === 1;
}

/**
 * تتبع الطلبات
 */
function requestTracker(req, res, next) {
    const { v4: uuidv4 } = require('uuid');
    req.requestId = uuidv4();
    req.requestStartTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - req.requestStartTime;
        
        // تسجيل الطلبات البطيئة
        if (duration > 5000) {
            console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
    });

    next();
}

/**
 * حماية من الطلبات الكثيرة
 */
const requestCounts = new Map();

function rateLimit(maxRequests = 100, windowMs = 60000) {
    return (req, res, next) => {
        const key = req.user?.id || req.ip;
        const now = Date.now();

        if (!requestCounts.has(key)) {
            requestCounts.set(key, { count: 1, startTime: now });
            return next();
        }

        const data = requestCounts.get(key);

        if (now - data.startTime > windowMs) {
            requestCounts.set(key, { count: 1, startTime: now });
            return next();
        }

        data.count++;

        if (data.count > maxRequests) {
            const auditService = getAuditService();
            auditService.log({
                eventType: 'rate_limit_exceeded',
                eventCategory: EVENT_CATEGORIES.SYSTEM,
                severity: SEVERITY.WARNING,
                userId: req.user?.id,
                userName: req.user?.name,
                ipAddress: req.ip,
                action: `تجاوز حد الطلبات: ${data.count} طلب`
            });

            return res.status(429).json({
                success: false,
                error: 'TOO_MANY_REQUESTS',
                message: 'تم تجاوز الحد المسموح من الطلبات. حاول لاحقاً.',
                retry_after: Math.ceil((windowMs - (now - data.startTime)) / 1000)
            });
        }

        next();
    };
}

module.exports = {
    preventDelete,
    protectQuantityChange,
    sensitiveDataFilter,
    logSensitiveAccess,
    requirePermission,
    checkPermission,
    requestTracker,
    rateLimit,
    filterSensitiveData,
    SENSITIVE_FIELDS,
    ACCESS_LEVELS
};
