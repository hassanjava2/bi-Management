/**
 * BI ERP — Winston Logger
 * Structured logging with file rotation + console output
 */
const { createLogger, format, transports } = require('winston');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.json()
    ),
    defaultMeta: { service: 'bi-erp-api' },
    transports: [
        // Error log file
        new transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
        }),
        // Combined log file
        new transports.File({
            filename: path.join(LOG_DIR, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        }),
    ],
});

// Console transport for non-production
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(({ timestamp, level, message, service, ...meta }) => {
                    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                    return `[${timestamp}] ${level}: ${message}${extra}`;
                })
            ),
        })
    );
} else {
    // Production: concise console
    logger.add(
        new transports.Console({
            format: format.combine(
                format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
            ),
        })
    );
}

module.exports = logger;
