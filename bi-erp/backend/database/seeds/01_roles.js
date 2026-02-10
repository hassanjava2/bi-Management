/**
 * Seed default roles (5 security levels)
 */

const ROLES = [
  { id: 'a0000001-0001-0000-0000-000000000001', name: 'owner', name_ar: 'مالك', security_level: 5, is_system: true },
  { id: 'a0000001-0001-0000-0000-000000000002', name: 'admin', name_ar: 'مدير', security_level: 5, is_system: true },
  { id: 'a0000001-0001-0000-0000-000000000003', name: 'manager', name_ar: 'مشرف', security_level: 3, is_system: true },
  { id: 'a0000001-0001-0000-0000-000000000004', name: 'hr', name_ar: 'موارد بشرية', security_level: 4, is_system: true },
  { id: 'a0000001-0001-0000-0000-000000000005', name: 'accountant', name_ar: 'محاسب', security_level: 4, is_system: true },
  { id: 'a0000001-0001-0000-0000-000000000006', name: 'employee', name_ar: 'موظف', security_level: 1, is_system: true },
];

async function run(pool) {
  for (const r of ROLES) {
    await pool.query(
      `INSERT INTO roles (id, name, name_ar, security_level, is_system) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, r.name_ar, r.security_level, r.is_system]
    );
  }
}

module.exports = { run };
