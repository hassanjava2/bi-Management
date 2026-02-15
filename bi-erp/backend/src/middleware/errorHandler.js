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
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error on ${req.method} ${req.path}:`, err.message);

    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Stack:', err.stack);
    }

    // Determine status code
    let statusCode = err.statusCode || err.status || 500;
    let userMessage = err.message || 'حدث خطأ غير متوقع';
    let errorCode = err.code || 'INTERNAL_ERROR';

    // Handle common PostgreSQL errors
    if (err.code === '42P01' || (err.message && err.message.includes('does not exist'))) {
        statusCode = 503;
        userMessage = 'بعض جداول قاعدة البيانات غير موجودة. يرجى تشغيل الترحيل (migrations).';
        errorCode = 'TABLE_NOT_FOUND';
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        statusCode = 503;
        userMessage = 'لا يمكن الاتصال بقاعدة البيانات';
        errorCode = 'DB_CONNECTION_ERROR';
    } else if (err.code === '23505') {
        statusCode = 409;
        userMessage = 'هذا السجل موجود مسبقاً';
        errorCode = 'DUPLICATE_ENTRY';
    } else if (err.code === '23503') {
        statusCode = 400;
        userMessage = 'لا يمكن حذف هذا السجل لأنه مرتبط بسجلات أخرى';
        errorCode = 'FOREIGN_KEY_VIOLATION';
    }

    // Build error response
    const response = {
        success: false,
        error: errorCode,
        message: userMessage
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        response.details = err.message;
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
