/**
 * BI Management - JWT Utilities
 */

const jwt = require('jsonwebtoken');

// التحقق من وجود مفتاح JWT
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production!');
}
// يجب أن يتطابق مع المفتاح في auth.js middleware
const FALLBACK_SECRET = 'dev-bi-management-fallback-jwt-secret-2024';
const SECRET_KEY = JWT_SECRET || FALLBACK_SECRET;
if (!JWT_SECRET) {
    console.warn('[!] WARNING: JWT_SECRET not set in jwt.js. Using fallback secret.');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Generate access token
 */
function generateToken(payload) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(payload) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Verify token
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
 * Decode token without verification
 */
function decodeToken(token) {
    return jwt.decode(token);
}

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken,
    decodeToken
};
