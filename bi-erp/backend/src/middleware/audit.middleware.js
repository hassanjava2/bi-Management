/**
 * BI ERP — Audit Middleware
 * تسجيل كل عملية تعديل تلقائياً
 */
const { run } = require('../config/database');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Log an audit event
 * @param {string} entityType - e.g. 'invoice', 'product', 'customer'
 * @param {string} entityId
 * @param {string} action - 'create', 'update', 'delete', 'status_change', etc.
 * @param {object} oldValues
 * @param {object} newValues
 * @param {object} req - Express request (for user/ip)
 * @param {string} [description]
 */
async function logAudit(entityType, entityId, action, oldValues, newValues, req, description) {
    try {
        const changedFields = [];
        if (oldValues && newValues) {
            for (const key of Object.keys(newValues)) {
                if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
                    changedFields.push(key);
                }
            }
        }
        const userId = req?.user?.id || req?.userId || null;
        const userName = req?.user?.full_name || req?.user?.name || null;
        const ip = req?.ip || req?.headers?.['x-forwarded-for'] || null;
        const ua = req?.headers?.['user-agent'] || null;

        await run(
            `INSERT INTO audit_log (id, entity_type, entity_id, action, old_values, new_values, changed_fields, user_id, user_name, ip_address, user_agent, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                generateId(), entityType, entityId, action,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                changedFields.length ? changedFields : null,
                userId, userName, ip, ua,
                description || null,
            ]
        );
    } catch (err) {
        logger.error('Audit log failed', { error: err.message, entityType, entityId, action });
    }
}

/**
 * Express middleware factory for auto-logging
 * Use on routes that modify data: router.put('/api/x/:id', auditMiddleware('product'), handler)
 */
function auditMiddleware(entityType) {
    return (req, res, next) => {
        // Attach audit helper to request
        req.audit = async (entityId, action, oldValues, newValues, description) => {
            await logAudit(entityType, entityId, action, oldValues, newValues, req, description);
        };
        next();
    };
}

/**
 * Get audit history for an entity
 */
async function getAuditHistory(entityType, entityId, limit = 50) {
    const { all } = require('../config/database');
    return all(
        `SELECT * FROM audit_log WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC LIMIT $3`,
        [entityType, entityId, limit]
    );
}

/**
 * Get recent audit log entries
 */
async function getRecentAudit({ entity_type, user_id, from_date, to_date, limit = 100 } = {}) {
    const { all } = require('../config/database');
    let q = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];
    if (entity_type) { params.push(entity_type); q += ` AND entity_type = $${params.length}`; }
    if (user_id) { params.push(user_id); q += ` AND user_id = $${params.length}`; }
    if (from_date) { params.push(from_date); q += ` AND created_at >= $${params.length}`; }
    if (to_date) { params.push(to_date); q += ` AND created_at <= $${params.length}`; }
    params.push(limit);
    q += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    return all(q, params);
}

module.exports = { logAudit, auditMiddleware, getAuditHistory, getRecentAudit };
