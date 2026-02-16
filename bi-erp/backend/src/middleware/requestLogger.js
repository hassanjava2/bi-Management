/**
 * BI ERP — Request Logger Middleware
 * Logs every API request with method, path, status, and duration
 */
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

        logger.log(level, `${method} ${originalUrl} ${statusCode} ${duration}ms`, {
            method,
            url: originalUrl,
            status: statusCode,
            duration,
            user: req.user?.id || null,
            ip: req.ip,
        });
    });

    next();
}

module.exports = { requestLogger };
