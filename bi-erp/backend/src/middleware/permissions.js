/**
 * BI ERP - Permission middleware (hasPermission, hasRole, hasSecurityLevel)
 */

const { ROLES, SECURITY_LEVELS } = require('../config/constants');

let permissionService;
function getPermissionService() {
  if (!permissionService) permissionService = require('../services/permission.service');
  return permissionService;
}

function hasPermission(...requiredCodes) {
  return (req, res, next) => {
    (async () => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول' });
      }
      const hasAll = await getPermissionService().hasAllPermissions(req.user.id, requiredCodes);
      if (!hasAll) {
        return res.status(403).json({ success: false, error: 'PERMISSION_DENIED', message: 'ليس لديك صلاحية لهذه العملية' });
      }
      next();
    })().catch(next);
  };
}

function hasAnyPermission(...requiredCodes) {
  return (req, res, next) => {
    (async () => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول' });
      }
      const hasAny = await getPermissionService().hasAnyPermission(req.user.id, requiredCodes);
      if (!hasAny) {
        return res.status(403).json({ success: false, error: 'PERMISSION_DENIED', message: 'ليس لديك صلاحية لهذه العملية' });
      }
      next();
    })().catch(next);
  };
}

function hasRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول' });
    }
    if (req.user.role === ROLES.OWNER || req.user.role === ROLES.ADMIN) return next();
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'ليس لديك صلاحية لهذا الإجراء' });
    }
    next();
  };
}

function hasSecurityLevel(minLevel) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول' });
    }
    const level = req.user.security_level ?? 1;
    if (level < minLevel) {
      return res.status(403).json({ success: false, error: 'INSUFFICIENT_SECURITY_LEVEL', message: 'صلاحية غير كافية' });
    }
    next();
  };
}

function adminOnly(req, res, next) {
  return hasRole(ROLES.ADMIN, ROLES.OWNER)(req, res, next);
}

function ownerOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  if (req.user.role !== ROLES.OWNER) {
    return res.status(403).json({ success: false, error: 'OWNER_ONLY', message: 'هذا الإجراء متاح للمالك فقط' });
  }
  next();
}

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasRole,
  hasSecurityLevel,
  adminOnly,
  ownerOnly,
};
