/**
 * BI ERP - Auth configuration
 */

const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    logger.error('CRITICAL: JWT_SECRET is required in production');
    process.exit(1);
}
const FALLBACK_SECRET = 'dev-only-secret-' + Date.now();
const SECRET_KEY = JWT_SECRET || FALLBACK_SECRET;

module.exports = {
    SECRET_KEY,
    JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '7d',
    JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '30d',
};
