/**
 * BI Management - Error Handler Middleware
 * معالجة الأخطاء
 */

/**
 * 404 Not Found handler
 */
function notFound(req, res, next) {
    res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`
    });
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Stack:', err.stack);
    }

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Build error response
    const response = {
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred'
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    // Add validation errors if present
    if (err.errors) {
        response.errors = err.errors;
    }

    res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Create custom error
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    notFound,
    errorHandler,
    asyncHandler,
    AppError
};
