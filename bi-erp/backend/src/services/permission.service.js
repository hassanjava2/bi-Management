/**
 * BI ERP - Permission service (roles & permissions, async)
 */

const { v4: uuidv4 } = require('uuid');
const permRepo = require('../repositories/permission.repository');
const { run } = require('../config/database');

async function getAllPermissions() {
  return permRepo.getAllPermissions();
}

async function getPermissionsByModule() {
  const list = await permRepo.getAllPermissions();
  const grouped = {};
  for (const p of list) {
    const m = p.module || 'other';
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(p);
  }
  return grouped;
}

async function getPermissionByCode(code) {
  return permRepo.getPermissionByCode(code);
}

async function getAllRoles() {
  return permRepo.getAllRoles();
}

async function getRoleById(roleId) {
  return permRepo.getRoleById(roleId);
}

async function getRolePermissions(roleId) {
  return permRepo.getRolePermissions(roleId);
}

async function getUserAllPermissions(userId) {
  const codes = await permRepo.getUserPermissionCodes(userId);
  const allPerms = await permRepo.getAllPermissions();
  const byCode = new Map(allPerms.map((p) => [p.code, p]));
  return codes.map((code) => ({ ...byCode.get(code), code, is_granted: true }));
}

/** Check if user has all of the given permission codes */
async function hasAllPermissions(userId, permissionCodes) {
  if (!userId || !permissionCodes || permissionCodes.length === 0) return true;
  const userCodes = await permRepo.getUserPermissionCodes(userId);
  const set = new Set(userCodes);
  return permissionCodes.every((c) => set.has(c));
}

/** Check if user has any of the given permission codes */
async function hasAnyPermission(userId, permissionCodes) {
  if (!userId || !permissionCodes || permissionCodes.length === 0) return false;
  const userCodes = await permRepo.getUserPermissionCodes(userId);
  const set = new Set(userCodes);
  return permissionCodes.some((c) => set.has(c));
}

async function createRole(data, createdBy) {
  const id = uuidv4();
  await run(
    `INSERT INTO roles (id, name, name_ar, description, security_level, is_system, color, icon)
     VALUES (?, ?, ?, ?, ?, FALSE, ?, ?)`,
    [id, data.name, data.name_ar || null, data.description || null, data.security_level ?? 1, data.color || '#3B82F6', data.icon || 'Shield']
  );
  return permRepo.getRoleById(id);
}

async function updateRole(roleId, data, updatedBy) {
  const role = await permRepo.getRoleById(roleId);
  if (role?.is_system) throw new Error('لا يمكن تعديل أدوار النظام');
  await run(
    `UPDATE roles SET name = COALESCE(?, name), name_ar = COALESCE(?, name_ar), description = COALESCE(?, description),
     security_level = COALESCE(?, security_level), color = COALESCE(?, color), icon = COALESCE(?, icon), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [data.name, data.name_ar, data.description, data.security_level, data.color, data.icon, roleId]
  );
  return permRepo.getRoleById(roleId);
}

async function deleteRole(roleId, deletedBy) {
  const role = await permRepo.getRoleById(roleId);
  if (role?.is_system) throw new Error('لا يمكن حذف أدوار النظام');
  const { get } = require('../config/database');
  const userWithRole = await get('SELECT id FROM users WHERE role_id = ? LIMIT 1', [roleId]);
  if (userWithRole) throw new Error('لا يمكن حذف دور له مستخدمين');
  await run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
  await run('DELETE FROM roles WHERE id = ?', [roleId]);
  return true;
}

async function setRolePermissions(roleId, permissionIds, grantedBy) {
  return permRepo.setRolePermissions(roleId, permissionIds || [], grantedBy);
}

module.exports = {
  getAllPermissions,
  getPermissionsByModule,
  getPermissionByCode,
  getAllRoles,
  getRoleById,
  getRolePermissions,
  getUserAllPermissions,
  hasAllPermissions,
  hasAnyPermission,
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
};
