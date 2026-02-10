/**
 * BI ERP - Audit service (async)
 */

const { v4: uuidv4 } = require('uuid');
const { run } = require('../config/database');

async function log(data) {
  const {
    user_id,
    action,
    event_type,
    event_category = 'system',
    severity = 'info',
    entity_type,
    entity_id,
    old_value,
    new_value,
    ip_address,
    user_agent,
  } = data;
  try {
    await run(
      `INSERT INTO audit_logs (id, user_id, event_type, event_category, severity, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        uuidv4(),
        user_id || null,
        event_type || action,
        event_category,
        severity,
        action || null,
        entity_type || null,
        entity_id || null,
        typeof old_value === 'object' ? JSON.stringify(old_value) : old_value,
        typeof new_value === 'object' ? JSON.stringify(new_value) : new_value,
        ip_address || null,
        user_agent || null,
      ]
    );
    return { success: true };
  } catch (e) {
    console.error('[Audit]', e.message);
    return { success: false };
  }
}

async function logAudit(data) {
  return log({
    ...data,
    action: data.action || data.event_type,
    event_type: data.event_type || data.action,
  });
}

module.exports = { log, logAudit };
