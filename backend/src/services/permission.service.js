/**
 * BI Management - Permission Service
 * خدمة إدارة الصلاحيات — PostgreSQL only
 */

const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../config/database');

/**
 * جلب كل الصلاحيات
 */
async function getAllPermissions() {
    return await all(`SELECT * FROM permissions ORDER BY module, feature, action`);
}

/**
 * جلب الصلاحيات مجمعة حسب الوحدة
 */
async function getPermissionsByModule() {
    const permissions = await getAllPermissions();
    const grouped = {};
    for (const perm of permissions) {
        if (!grouped[perm.module]) grouped[perm.module] = [];
        grouped[perm.module].push(perm);
    }
    return grouped;
}

/**
 * جلب صلاحية بالكود
 */
async function getPermissionByCode(code) {
    return await get('SELECT * FROM permissions WHERE code = ?', [code]);
}

/**
 * جلب كل الأدوار
 */
async function getAllRoles() {
    return await all(`
        SELECT r.*, 
               (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permission_count,
               (SELECT COUNT(*) FROM users WHERE role_id = r.id) as user_count
        FROM roles r
        ORDER BY r.security_level DESC, r.name
    `);
}

/**
 * جلب دور بالـ ID
 */
async function getRoleById(roleId) {
    return await get('SELECT * FROM roles WHERE id = ?', [roleId]);
}

/**
 * إنشاء دور جديد
 */
async function createRole(data, createdBy) {
    const id = uuidv4();
    await run(`
        INSERT INTO roles (id, name, name_ar, description, security_level, is_system, color, icon)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `, [
        id,
        data.name,
        data.name_ar,
        data.description || null,
        data.security_level || 1,
        data.color || '#3B82F6',
        data.icon || 'Shield'
    ]);

    await logPermissionChange({
        roleId: id,
        action: 'role_created',
        newValue: JSON.stringify(data),
        changedBy: createdBy
    });

    return await getRoleById(id);
}

/**
 * تحديث دور
 */
async function updateRole(roleId, data, updatedBy) {
    const oldRole = await getRoleById(roleId);

    if (oldRole?.is_system) {
        throw new Error('لا يمكن تعديل أدوار النظام');
    }

    await run(`
        UPDATE roles SET
            name = COALESCE(?, name),
            name_ar = COALESCE(?, name_ar),
            description = COALESCE(?, description),
            security_level = COALESCE(?, security_level),
            color = COALESCE(?, color),
            icon = COALESCE(?, icon),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [
        data.name,
        data.name_ar,
        data.description,
        data.security_level,
        data.color,
        data.icon,
        roleId
    ]);

    await logPermissionChange({
        roleId,
        action: 'role_updated',
        oldValue: JSON.stringify(oldRole),
        newValue: JSON.stringify(data),
        changedBy: updatedBy
    });

    return await getRoleById(roleId);
}

/**
 * حذف دور
 */
async function deleteRole(roleId, deletedBy) {
    const role = await getRoleById(roleId);

    if (role?.is_system) {
        throw new Error('لا يمكن حذف أدوار النظام');
    }

    const result = await get('SELECT COUNT(*) as count FROM users WHERE role_id = ?', [roleId]);
    if (result?.count > 0) {
        throw new Error('لا يمكن حذف دور له مستخدمين');
    }

    await run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    await run('DELETE FROM roles WHERE id = ?', [roleId]);

    await logPermissionChange({
        roleId,
        action: 'role_deleted',
        oldValue: JSON.stringify(role),
        changedBy: deletedBy
    });

    return true;
}

/**
 * جلب صلاحيات دور
 */
async function getRolePermissions(roleId) {
    return await all(`
        SELECT p.* FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
        ORDER BY p.module, p.feature, p.action
    `, [roleId]);
}

/**
 * تعيين صلاحيات لدور
 */
async function setRolePermissions(roleId, permissionIds, grantedBy) {
    if (['role_owner', 'role_super_admin'].includes(roleId)) {
        throw new Error('لا يمكن تعديل صلاحيات هذا الدور');
    }

    await run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

    for (const permId of permissionIds) {
        await run(`
            INSERT INTO role_permissions (id, role_id, permission_id, granted_by, granted_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [uuidv4(), roleId, permId, grantedBy]);
    }

    await logPermissionChange({
        roleId,
        action: 'role_permissions_updated',
        newValue: JSON.stringify(permissionIds),
        changedBy: grantedBy
    });

    return await getRolePermissions(roleId);
}

/**
 * جلب صلاحيات مستخدم (المخصصة)
 */
async function getUserCustomPermissions(userId) {
    return await all(`
        SELECT p.*, up.is_granted, up.expires_at, up.reason
        FROM permissions p
        JOIN user_permissions up ON p.id = up.permission_id
        WHERE up.user_id = ?
        ORDER BY p.module, p.feature, p.action
    `, [userId]);
}

/**
 * جلب كل صلاحيات المستخدم (الدور + المخصصة)
 */
async function getUserAllPermissions(userId) {
    const permissions = new Map();

    // صلاحيات الدور
    const rolePerms = await all(`
        SELECT p.* FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN users u ON u.role_id = rp.role_id
        WHERE u.id = ?
    `, [userId]);

    for (const perm of rolePerms) {
        permissions.set(perm.code, { ...perm, source: 'role', is_granted: true });
    }

    // الصلاحيات المخصصة (override)
    const userPerms = await all(`
        SELECT p.*, up.is_granted, up.expires_at, up.reason
        FROM permissions p
        JOIN user_permissions up ON p.id = up.permission_id
        WHERE up.user_id = ?
        AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
    `, [userId]);

    for (const perm of userPerms) {
        if (perm.is_granted) {
            permissions.set(perm.code, { ...perm, source: 'user', is_granted: true });
        } else {
            permissions.delete(perm.code);
        }
    }

    return Array.from(permissions.values());
}

/**
 * منح صلاحية لمستخدم
 */
async function grantUserPermission(userId, permissionId, data, grantedBy) {
    const id = uuidv4();
    // Delete existing override then insert fresh
    await run(`DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?`, [userId, permissionId]);
    await run(`
        INSERT INTO user_permissions 
        (id, user_id, permission_id, is_granted, granted_by, granted_at, expires_at, reason)
        VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP, ?, ?)
    `, [
        id,
        userId,
        permissionId,
        grantedBy,
        data.expires_at || null,
        data.reason || null
    ]);

    await logPermissionChange({
        userId,
        permissionId,
        action: 'permission_granted',
        newValue: JSON.stringify({ is_granted: true, ...data }),
        changedBy: grantedBy
    });

    return true;
}

/**
 * إلغاء صلاحية من مستخدم
 */
async function revokeUserPermission(userId, permissionId, reason, revokedBy) {
    await run(`DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?`, [userId, permissionId]);
    await run(`
        INSERT INTO user_permissions 
        (id, user_id, permission_id, is_granted, granted_by, granted_at, reason)
        VALUES (?, ?, ?, 0, ?, CURRENT_TIMESTAMP, ?)
    `, [
        uuidv4(),
        userId,
        permissionId,
        revokedBy,
        reason || null
    ]);

    await logPermissionChange({
        userId,
        permissionId,
        action: 'permission_revoked',
        newValue: JSON.stringify({ is_granted: false, reason }),
        changedBy: revokedBy
    });

    return true;
}

/**
 * إزالة تخصيص صلاحية (إعادة للافتراضي)
 */
async function removeUserPermissionOverride(userId, permissionId, removedBy) {
    await run(`DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?`, [userId, permissionId]);

    await logPermissionChange({
        userId,
        permissionId,
        action: 'permission_override_removed',
        changedBy: removedBy
    });

    return true;
}

/**
 * تسجيل تغيير الصلاحيات
 */
async function logPermissionChange(data) {
    try {
        await run(`
            INSERT INTO permission_history 
            (id, user_id, role_id, permission_id, action, old_value, new_value, changed_by, changed_at, reason, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
        `, [
            uuidv4(),
            data.userId || null,
            data.roleId || null,
            data.permissionId || null,
            data.action,
            data.oldValue || null,
            data.newValue || null,
            data.changedBy,
            data.reason || null,
            data.ipAddress || null
        ]);
    } catch (e) {
        console.error('[Permission] logChange error:', e.message);
    }
}

/**
 * جلب سجل تغييرات الصلاحيات
 */
async function getPermissionHistory(filters = {}) {
    let sql = `
        SELECT ph.*, 
               u.full_name as user_name,
               r.name_ar as role_name,
               p.name_ar as permission_name,
               cb.full_name as changed_by_name
        FROM permission_history ph
        LEFT JOIN users u ON ph.user_id = u.id
        LEFT JOIN roles r ON ph.role_id = r.id
        LEFT JOIN permissions p ON ph.permission_id = p.id
        LEFT JOIN users cb ON ph.changed_by = cb.id
        WHERE 1=1
    `;
    const params = [];

    if (filters.userId) {
        sql += ' AND ph.user_id = ?';
        params.push(filters.userId);
    }
    if (filters.roleId) {
        sql += ' AND ph.role_id = ?';
        params.push(filters.roleId);
    }
    if (filters.fromDate) {
        sql += ' AND ph.changed_at >= ?';
        params.push(filters.fromDate);
    }
    if (filters.toDate) {
        sql += ' AND ph.changed_at <= ?';
        params.push(filters.toDate);
    }

    sql += ' ORDER BY ph.changed_at DESC';

    if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
    }

    return await all(sql, params);
}

// ============================================
// Backward-compatible class wrapper
// ============================================
class PermissionService {
    constructor() {}
    getAllPermissions() { return getAllPermissions(); }
    getPermissionsByModule() { return getPermissionsByModule(); }
    getPermissionByCode(code) { return getPermissionByCode(code); }
    getAllRoles() { return getAllRoles(); }
    getRoleById(roleId) { return getRoleById(roleId); }
    createRole(data, createdBy) { return createRole(data, createdBy); }
    updateRole(roleId, data, updatedBy) { return updateRole(roleId, data, updatedBy); }
    deleteRole(roleId, deletedBy) { return deleteRole(roleId, deletedBy); }
    getRolePermissions(roleId) { return getRolePermissions(roleId); }
    setRolePermissions(roleId, permissionIds, grantedBy) { return setRolePermissions(roleId, permissionIds, grantedBy); }
    getUserCustomPermissions(userId) { return getUserCustomPermissions(userId); }
    getUserAllPermissions(userId) { return getUserAllPermissions(userId); }
    grantUserPermission(userId, permissionId, data, grantedBy) { return grantUserPermission(userId, permissionId, data, grantedBy); }
    revokeUserPermission(userId, permissionId, reason, revokedBy) { return revokeUserPermission(userId, permissionId, reason, revokedBy); }
    removeUserPermissionOverride(userId, permissionId, removedBy) { return removeUserPermissionOverride(userId, permissionId, removedBy); }
    getPermissionHistory(filters) { return getPermissionHistory(filters); }
}

let instance = null;

function getPermissionService() {
    if (!instance) {
        instance = new PermissionService();
    }
    return instance;
}

module.exports = {
    PermissionService,
    getPermissionService,
    // Direct function exports
    getAllPermissions,
    getPermissionsByModule,
    getPermissionByCode,
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getRolePermissions,
    setRolePermissions,
    getUserCustomPermissions,
    getUserAllPermissions,
    grantUserPermission,
    revokeUserPermission,
    removeUserPermissionOverride,
    getPermissionHistory,
};
