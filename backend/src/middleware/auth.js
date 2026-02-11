/**
 * BI Management - Authentication Middleware
 * طبقة التحقق من الهوية
 */

const jwt = require('jsonwebtoken');
const { getAuditService, EVENT_CATEGORIES, SEVERITY } = require('../services/audit.service');

// التحقق من وجود مفتاح JWT - مطلوب في الإنتاج
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: JWT_SECRET environment variable is required in production!');
    process.exit(1);
}
// استخدام مفتاح ثابت كـ fallback (يجب تعيين JWT_SECRET في الإنتاج!)
const FALLBACK_SECRET = 'dev-bi-management-fallback-jwt-secret-2024';
const SECRET_KEY = JWT_SECRET || FALLBACK_SECRET;
if (!JWT_SECRET) {
    console.warn('[!] WARNING: JWT_SECRET not set. Using fallback secret (NOT secure for production!)');
}

/**
 * فك تشفير وتحقق من التوكن
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { expired: true, error: 'TOKEN_EXPIRED' };
        }
        if (error.name === 'JsonWebTokenError') {
            return { invalid: true, error: 'INVALID_TOKEN' };
        }
        return null;
    }
}

/**
 * Middleware للتحقق من تسجيل الدخول
 */
function auth(req, res, next) {
    try {
        // جلب التوكن من الهيدر
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'يجب تسجيل الدخول'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'توكن غير صالح'
            });
        }

        // التحقق من أن التوكن منتهي الصلاحية
        if (decoded.expired) {
            return res.status(401).json({
                success: false,
                error: 'TOKEN_EXPIRED',
                message: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً'
            });
        }

        // التحقق من أن التوكن غير صالح
        if (decoded.invalid) {
            return res.status(401).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'توكن غير صالح'
            });
        }

        // التحقق من وجود بيانات المستخدم الأساسية
        if (!decoded.id) {
            return res.status(401).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'توكن لا يحتوي على بيانات صالحة'
            });
        }

        // إضافة بيانات المستخدم للطلب
        req.user = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name || decoded.full_name,
            role: decoded.role,
            security_level: decoded.security_level,
            permissions: decoded.permissions || []
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'AUTH_ERROR',
            message: 'خطأ في التحقق من الهوية'
        });
    }
}

/**
 * Middleware للتحقق من صلاحيات المالك
 */
function ownerOnly(req, res, next) {
    if (req.user?.role !== 'owner') {
        // تسجيل المحاولة
        if (req.db) {
            const auditService = getAuditService(req.db);
            auditService.log({
                eventType: 'unauthorized_access',
                eventCategory: EVENT_CATEGORIES.SECURITY,
                severity: SEVERITY.WARNING,
                userId: req.user?.id,
                userName: req.user?.name,
                ipAddress: req.ip,
                action: 'محاولة وصول لصفحة المالك فقط',
                details: { url: req.originalUrl }
            });
        }

        return res.status(403).json({
            success: false,
            error: 'OWNER_ONLY',
            message: 'هذا الإجراء متاح للمالك فقط'
        });
    }
    next();
}

/**
 * Middleware للتحقق من صلاحيات المدير
 */
function adminOnly(req, res, next) {
    if (!['owner', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({
            success: false,
            error: 'ADMIN_ONLY',
            message: 'هذا الإجراء متاح للمديرين فقط'
        });
    }
    next();
}

/**
 * Middleware للتحقق من الأدوار المحددة
 * @param {string[]} allowedRoles - الأدوار المسموحة
 */
function authorize(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'يجب تسجيل الدخول'
            });
        }

        // المالك له صلاحية كاملة
        if (req.user.role === 'owner') {
            return next();
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'FORBIDDEN',
                message: 'ليس لديك صلاحية لهذا الإجراء'
            });
        }
        next();
    };
}

/**
 * إنشاء توكن جديد
 */
function generateToken(user, expiresIn = '7d') {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.full_name || user.name,
            role: user.role,
            permissions: user.permissions || []
        },
        SECRET_KEY,
        { expiresIn }
    );
}

/**
 * إنشاء توكن تحديث
 */
function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id, type: 'refresh' },
        SECRET_KEY,
        { expiresIn: '30d' }
    );
}

module.exports = {
    auth,
    authorize,
    ownerOnly,
    adminOnly,
    verifyToken,
    generateToken,
    generateRefreshToken
};
