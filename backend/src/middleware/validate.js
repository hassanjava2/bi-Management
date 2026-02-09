/**
 * BI Management - Validation Middleware
 * التحقق من المدخلات
 */

/**
 * Validate request body against Joi schema
 */
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Invalid input data',
                errors
            });
        }

        // Replace body with validated value
        req.body = value;
        next();
    };
}

/**
 * Validate query parameters
 */
function validateQuery(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Invalid query parameters',
                errors
            });
        }

        req.query = value;
        next();
    };
}

/**
 * Validate URL parameters
 */
function validateParams(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Invalid URL parameters',
                errors: error.details.map(d => ({
                    field: d.path.join('.'),
                    message: d.message
                }))
            });
        }

        req.params = value;
        next();
    };
}

module.exports = {
    validate,
    validateQuery,
    validateParams
};
