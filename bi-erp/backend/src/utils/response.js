/**
 * BI ERP — Standardized API Response Helpers
 */

/** Success response */
function ok(res, data, message = 'success', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
}

/** Created response */
function created(res, data, message = 'تم الإنشاء بنجاح') {
    return ok(res, data, message, 201);
}

/** Paginated response */
function paginated(res, { rows, total, page = 1, limit = 20 }) {
    return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / limit),
        },
    });
}

/** Error response */
function fail(res, message = 'حدث خطأ', statusCode = 400, code = 'BAD_REQUEST') {
    return res.status(statusCode).json({ success: false, error: code, message });
}

/** Not found */
function notFound(res, message = 'غير موجود') {
    return fail(res, message, 404, 'NOT_FOUND');
}

/** Forbidden */
function forbidden(res, message = 'غير مصرح') {
    return fail(res, message, 403, 'FORBIDDEN');
}

/** Server error */
function serverError(res, err, context = '') {
    const logger = require('./logger');
    logger.error(`${context}: ${err.message}`, { stack: err.stack });
    return fail(res, 'حدث خطأ في الخادم', 500, 'INTERNAL_ERROR');
}

module.exports = { ok, created, paginated, fail, notFound, forbidden, serverError };
