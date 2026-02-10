/**
 * BI ERP - Audit middleware placeholder
 * Attach audit service to req when available
 */

function auditMiddleware(req, res, next) {
  req.audit = null;
  next();
}

module.exports = { auditMiddleware };
