/**
 * Roles and permissions tables (PostgreSQL)
 */

async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) UNIQUE NOT NULL,
      name_ar VARCHAR(200),
      description TEXT,
      security_level INTEGER NOT NULL DEFAULT 0,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      color VARCHAR(50),
      icon VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) UNIQUE NOT NULL,
      name_ar VARCHAR(200),
      name_en VARCHAR(200),
      module VARCHAR(100),
      feature VARCHAR(100),
      action VARCHAR(50),
      description TEXT,
      is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
      requires_2fa BOOLEAN NOT NULL DEFAULT FALSE,
      requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
      security_level INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      granted_by UUID,
      UNIQUE(role_id, permission_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS permission_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      role_id UUID,
      permission_id UUID,
      action VARCHAR(50),
      old_value TEXT,
      new_value TEXT,
      changed_by UUID,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reason TEXT,
      ip_address VARCHAR(45)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id)`);
}

async function down(pool) {
  await pool.query('DROP TABLE IF EXISTS role_permissions');
  await pool.query('DROP TABLE IF EXISTS permission_history');
  await pool.query('DROP TABLE IF EXISTS permissions');
  await pool.query('DROP TABLE IF EXISTS roles');
}

module.exports = { up, down };
