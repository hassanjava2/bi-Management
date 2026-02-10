/**
 * Seed default admin user (owner)
 * Email: admin@bi-erp.local  Password: Admin@123
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const OWNER_ROLE_ID = 'a0000001-0001-0000-0000-000000000001';

async function run(pool) {
  const existing = await pool.query("SELECT id FROM users WHERE email = 'admin@bi-erp.local'");
  if (existing.rows.length > 0) return;

  const id = uuidv4();
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  await pool.query(
    `INSERT INTO users (id, username, email, password_hash, full_name, role, role_id, security_level, is_active, employee_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, 'admin', 'admin@bi-erp.local', passwordHash, 'مدير النظام', 'owner', OWNER_ROLE_ID, 5, true, 'EMP001']
  );
}

module.exports = { run };
