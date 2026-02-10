/**
 * BI ERP - Permission & role repository (data access only)
 */

const { get, all, run } = require('../config/database');

async function getAllPermissions() {
  return all(`SELECT * FROM permissions ORDER BY module, feature, action`);
}

async function getPermissionByCode(code) {
  return get('SELECT * FROM permissions WHERE code = ?', [code]);
}

async function getAllRoles() {
  return all(`
    SELECT r.*,
           (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permission_count,
           (SELECT COUNT(*) FROM users WHERE role_id = r.id) as user_count
    FROM roles r
    ORDER BY r.security_level DESC, r.name
  `);
}

async function getRoleById(roleId) {
  return get('SELECT * FROM roles WHERE id = ?', [roleId]);
}

async function getRolePermissions(roleId) {
  return all(
    `SELECT p.* FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id = ?
     ORDER BY p.module, p.feature, p.action`,
    [roleId]
  );
}

async function getUserPermissionCodes(userId) {
  const rows = await all(
    `SELECT p.code FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     JOIN users u ON u.role_id = rp.role_id
     WHERE u.id = ?`,
    [userId]
  );
  const codes = new Set(rows.map((r) => r.code));
  const overrides = await all(
    `SELECT p.code, up.is_granted FROM permissions p
     JOIN user_permissions up ON p.id = up.permission_id
     WHERE up.user_id = ? AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)`,
    [userId]
  );
  for (const o of overrides) {
    if (o.is_granted) codes.add(o.code);
    else codes.delete(o.code);
  }
  return Array.from(codes);
}

async function setRolePermissions(roleId, permissionIds, grantedBy) {
  await run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
  const { v4: uuidv4 } = require('uuid');
  for (const permId of permissionIds) {
    await run(
      `INSERT INTO role_permissions (id, role_id, permission_id, granted_by) VALUES (?, ?, ?, ?)`,
      [uuidv4(), roleId, permId, grantedBy]
    );
  }
  return getRolePermissions(roleId);
}

module.exports = {
  getAllPermissions,
  getPermissionByCode,
  getAllRoles,
  getRoleById,
  getRolePermissions,
  getUserPermissionCodes,
  setRolePermissions,
};
