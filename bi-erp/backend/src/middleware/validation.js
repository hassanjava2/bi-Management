/**
 * BI ERP - Validation middleware (optional Joi)
 * Use: validateBody(Joi.object({ ... })) when Joi is installed
 */

function validateBody(schema) {
  return function (req, res, next) {
    if (!schema || typeof schema.validate !== 'function') {
      return next();
    }
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'بيانات غير صالحة',
        errors: error.details,
      });
    }
    req.body = value;
    next();
  };
}

module.exports = { validateBody };
