/**
 * BI ERP - Request Timeout Middleware
 * Prevents requests from hanging forever
 */

function requestTimeout(timeoutMs = 30000) {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            if (!res.headersSent) {
                logger.error(`[TIMEOUT] ${req.method} ${req.path} exceeded ${timeoutMs}ms`);
                res.status(504).json({
                    success: false,
                    error: 'REQUEST_TIMEOUT',
                    message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
                });
            }
        }, timeoutMs);

        // Clean up timer when response finishes
        res.on('finish', () => clearTimeout(timer));
        res.on('close', () => clearTimeout(timer));

        next();
    };
}

module.exports = { requestTimeout };
