/**
 * BI Management - RBAC Middleware
 * Role-Based Access Control + Permission-Based Access Control
 */

const { ROLES, SECURITY_LEVELS } = require('../config/constants');

// Lazy load to avoid circular dependency
let auditService = null;
let permissionService = null;

function getAuditService() {
    if (!auditService) {
        auditService = require('../services/audit.service').auditService;
    }
    return auditService;
}

function getPermissionService() {
    if (!permissionService) {
        permissionService = require('../services/permission.service').permissionService;
    }
    return permissionService;
}

/**
 * Check if user has required permission(s)
 */
function hasPermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'NOT_AUTHENTICATED',
                message: 'يجب تسجيل الدخول'
            });
        }

        const permService = getPermissionService();
        const hasAll = permService.hasAllPermissions(req.user.id, requiredPermissions);

        if (!hasAll) {
            // Log denied access
            getAuditService()?.log({
                user_id: req.user.id,
                action: 'PERMISSION_DENIED',
                details: { required: requiredPermissions },
                ip_address: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'PERMISSION_DENIED',
                message: 'ليس لديك صلاحية لهذه العملية'
            });
        }

        next();
    };
}

/**
 * Check if user has any of the required permissions
 */
function hasAnyPermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'NOT_AUTHENTICATED',
                message: 'يجب تسجيل الدخول'
            });
        }

        const permService = getPermissionService();
        const hasAny = permService.hasAnyPermission(req.user.id, requiredPermissions);

        if (!hasAny) {
            getAuditService()?.log({
                user_id: req.user.id,
                action: 'PERMISSION_DENIED',
                details: { required_any: requiredPermissions },
                ip_address: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'PERMISSION_DENIED',
                message: 'ليس لديك صلاحية لهذه العملية'
            });
        }

        next();
    };
}

/**
 * Check if user has required role(s)
 */
function hasRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'NOT_AUTHENTICATED',
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;

        // Admin has access to everything
        if (userRole === ROLES.ADMIN) {
            return next();
        }

        if (!allowedRoles.includes(userRole)) {
            getAuditService()?.log({
                user_id: req.user.id,
                action: 'PERMISSION_DENIED',
                table_name: null,
                record_id: null,
                details: { required_roles: allowedRoles, user_role: userRole },
                ip_address: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'FORBIDDEN',
                message: 'You do not have permission to perform this action'
            });
        }

        next();
    };
}

/**
 * Check if user has minimum security level
 */
function hasSecurityLevel(minLevel) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'NOT_AUTHENTICATED',
                message: 'Authentication required'
            });
        }

        const userLevel = req.user.security_level;

        if (userLevel < minLevel) {
            // Log the denied access
            logAudit({
                user_id: req.user.id,
                action: 'PERMISSION_DENIED',
                table_name: null,
                record_id: null,
                old_values: null,
                new_values: { required_level: minLevel, user_level: userLevel },
                ip_address: req.ip,
                is_sensitive: true
            });

            return res.status(403).json({
                success: false,
                error: 'INSUFFICIENT_SECURITY_LEVEL',
                message: 'You do not have sufficient security clearance'
            });
        }

        next();
    };
}

/**
 * Check if user is admin
 */
function isAdmin(req, res, next) {
    return hasRole(ROLES.ADMIN)(req, res, next);
}

/**
 * Check if user is manager or higher
 */
function isManager(req, res, next) {
    return hasRole(ROLES.ADMIN, ROLES.MANAGER)(req, res, next);
}

/**
 * Check if user is HR
 */
function isHR(req, res, next) {
    return hasRole(ROLES.ADMIN, ROLES.HR)(req, res, next);
}

/**
 * Check if user can view sensitive data (level 4+)
 */
function canViewSensitive(req, res, next) {
    return hasSecurityLevel(SECURITY_LEVELS.HR_ACCOUNTANT)(req, res, next);
}

/**
 * Check if user owns the resource or is admin
 */
function isOwnerOrAdmin(userIdField = 'id') {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'NOT_AUTHENTICATED',
                message: 'Authentication required'
            });
        }

        const resourceUserId = req.params[userIdField] || req.body[userIdField];
        
        // Admin can access everything
        if (req.user.role === ROLES.ADMIN) {
            return next();
        }

        // User can access their own resource
        if (req.user.id === resourceUserId) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'You can only access your own resources'
        });
    };
}

/**
 * Check if user is developer (restricted access)
 */
function isDeveloper(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'NOT_AUTHENTICATED'
        });
    }

    req.isDeveloper = req.user.role === 'developer';
    next();
}

/**
 * Block developers from accessing sensitive data
 */
function blockDevelopers(req, res, next) {
    if (req.user?.role === 'developer') {
        getAuditService()?.logSecurityEvent({
            user_id: req.user.id,
            event_type: 'DEVELOPER_ACCESS_BLOCKED',
            severity: 'warning',
            details: { path: req.path, method: req.method },
            ip_address: req.ip
        });

        return res.status(403).json({
            success: false,
            error: 'DEVELOPER_RESTRICTED',
            message: 'المطورون لا يملكون صلاحية الوصول لهذه البيانات'
        });
    }

    next();
}

/**
 * Owner only middleware
 */
function ownerOnly(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'NOT_AUTHENTICATED',
            message: 'يجب تسجيل الدخول'
        });
    }

    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
        getAuditService()?.log({
            user_id: req.user.id,
            action: 'OWNER_ACCESS_DENIED',
            details: { path: req.path },
            ip_address: req.ip
        });

        return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'هذه العملية متاحة للمالك فقط'
        });
    }

    next();
}

/**
 * Admin only middleware
 */
function adminOnly(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'NOT_AUTHENTICATED',
            message: 'يجب تسجيل الدخول'
        });
    }

    if (!['owner', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'هذه العملية متاحة للمدراء فقط'
        });
    }

    next();
}

module.exports = {
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasSecurityLevel,
    isAdmin,
    isManager,
    isHR,
    canViewSensitive,
    isOwnerOrAdmin,
    isDeveloper,
    blockDevelopers,
    ownerOnly,
    adminOnly
};
