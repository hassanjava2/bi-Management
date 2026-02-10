/**
 * Assign all permissions to owner and admin roles
 */

async function run(pool) {
  const ownerRoleId = 'a0000001-0001-0000-0000-000000000001';
  const perms = await pool.query('SELECT id FROM permissions');
  for (const row of perms.rows) {
    await pool.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING`,
      [ownerRoleId, row.id]
    );
  }
  const adminRoleId = 'a0000001-0001-0000-0000-000000000002';
  for (const row of perms.rows) {
    await pool.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING`,
      [adminRoleId, row.id]
    );
  }
}

module.exports = { run };
