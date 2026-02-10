/**
 * BI Management - Rate Limiting Middleware
 * حماية من الهجمات
 */

const rateLimit = require('express-rate-limit');

// Check if in development mode
const isDev = process.env.NODE_ENV !== 'production';

// General API rate limit (higher in dev for bot testing)
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: isDev ? 1000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100),
    message: {
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for bot requests in development
        return isDev && req.headers['x-bot-request'] === 'true';
    }
});

// Strict limit for login attempts (relaxed in dev for bot testing)
const loginLimiter = rateLimit({
    windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
    max: isDev ? 100 : 5, // 100 in dev, 5 in prod
    message: {
        success: false,
        error: 'TOO_MANY_LOGIN_ATTEMPTS',
        message: 'Too many login attempts, please try again after 15 minutes'
    },
    skipSuccessfulRequests: true,
    skip: (req) => {
        // Skip rate limiting for bot requests
        return isDev && req.headers['x-bot-request'] === 'true';
    }
});

// Strict limit for sensitive operations
const sensitiveLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: {
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many requests for sensitive data'
    }
});

// Very strict limit for password operations
const passwordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts
    message: {
        success: false,
        error: 'TOO_MANY_PASSWORD_ATTEMPTS',
        message: 'Too many password change attempts, please try again after 1 hour'
    }
});

module.exports = {
    generalLimiter,
    loginLimiter,
    sensitiveLimiter,
    passwordLimiter
};
