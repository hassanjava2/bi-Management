/**
 * BI ERP - Authentication middleware (JWT)
 */

const { verifyToken } = require('../utils/jwt');

function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'يجب تسجيل الدخول',
      });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded || decoded.expired || decoded.invalid) {
      return res.status(401).json({
        success: false,
        error: decoded?.expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: decoded?.expired ? 'انتهت الجلسة' : 'توكن غير صالح',
      });
    }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
      security_level: decoded.security_level ?? 1,
    };
    next();
  } catch (e) {
    console.error('Auth middleware error:', e);
    return res.status(500).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'خطأ في التحقق من الهوية',
    });
  }
}

module.exports = { auth };
