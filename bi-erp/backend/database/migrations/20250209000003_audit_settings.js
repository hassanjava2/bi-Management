/**
 * Audit logs, security events, settings (PostgreSQL)
 */

async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(100),
      event_category VARCHAR(50),
      severity VARCHAR(20) NOT NULL DEFAULT 'info',
      user_id UUID,
      user_name VARCHAR(200),
      user_role VARCHAR(50),
      ip_address VARCHAR(45),
      user_agent TEXT,
      device_fingerprint VARCHAR(255),
      entity_type VARCHAR(100),
      entity_id UUID,
      entity_name VARCHAR(255),
      old_value TEXT,
      new_value TEXT,
      changes TEXT,
      request_id VARCHAR(100),
      session_id VARCHAR(100),
      module VARCHAR(100),
      action VARCHAR(100),
      metadata TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS security_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(100),
      severity VARCHAR(20) NOT NULL DEFAULT 'low',
      user_id UUID,
      details TEXT,
      resolved BOOLEAN NOT NULL DEFAULT FALSE,
      resolved_by UUID,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`);
}

async function down(pool) {
  await pool.query('DROP TABLE IF EXISTS audit_logs');
  await pool.query('DROP TABLE IF EXISTS security_events');
  await pool.query('DROP TABLE IF EXISTS settings');
}

module.exports = { up, down };
