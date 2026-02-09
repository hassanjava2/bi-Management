/**
 * BI Management - Permission Service
 * خدمة إدارة الصلاحيات
 */

const { v4: uuidv4 } = require('uuid');

class PermissionService {
    constructor(db) {
        this.db = db;
    }

    /**
     * جلب كل الصلاحيات
     */
    getAllPermissions() {
        const stmt = this.db.prepare(`
            SELECT * FROM permissions 
            ORDER BY module, feature, action
        `);
        const permissions = [];
        while (stmt.step()) {
            permissions.push(stmt.getAsObject());
        }
        stmt.free();
        return permissions;
    }

    /**
     * جلب الصلاحيات مجمعة حسب الوحدة
     */
    getPermissionsByModule() {
        const permissions = this.getAllPermissions();
        const grouped = {};
        
        for (const perm of permissions) {
            if (!grouped[perm.module]) {
                grouped[perm.module] = [];
            }
            grouped[perm.module].push(perm);
        }
        
        return grouped;
    }

    /**
     * جلب صلاحية بالكود
     */
    getPermissionByCode(code) {
        const stmt = this.db.prepare('SELECT * FROM permissions WHERE code = ?');
        stmt.bind([code]);
        let permission = null;
        if (stmt.step()) {
            permission = stmt.getAsObject();
        }
        stmt.free();
        return permission;
    }

    /**
     * جلب كل الأدوار
     */
    getAllRoles() {
        const stmt = this.db.prepare(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permission_count,
                   (SELECT COUNT(*) FROM users WHERE role_id = r.id) as user_count
            FROM roles r
            ORDER BY r.security_level DESC, r.name
        `);
        const roles = [];
        while (stmt.step()) {
            roles.push(stmt.getAsObject());
        }
        stmt.free();
        return roles;
    }

    /**
     * جلب دور بالـ ID
     */
    getRoleById(roleId) {
        const stmt = this.db.prepare('SELECT * FROM roles WHERE id = ?');
        stmt.bind([roleId]);
        let role = null;
        if (stmt.step()) {
            role = stmt.getAsObject();
        }
        stmt.free();
        return role;
    }

    /**
     * إنشاء دور جديد
     */
    createRole(data, createdBy) {
        const id = uuidv4();
        this.db.run(`
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
        
        this.logPermissionChange({
            roleId: id,
            action: 'role_created',
            newValue: JSON.stringify(data),
            changedBy: createdBy
        });
        
        return this.getRoleById(id);
    }

    /**
     * تحديث دور
     */
    updateRole(roleId, data, updatedBy) {
        const oldRole = this.getRoleById(roleId);
        
        // لا يمكن تعديل أدوار النظام
        if (oldRole.is_system) {
            throw new Error('لا يمكن تعديل أدوار النظام');
        }
        
        this.db.run(`
            UPDATE roles SET
                name = COALESCE(?, name),
                name_ar = COALESCE(?, name_ar),
                description = COALESCE(?, description),
                security_level = COALESCE(?, security_level),
                color = COALESCE(?, color),
                icon = COALESCE(?, icon),
                updated_at = datetime('now')
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
        
        this.logPermissionChange({
            roleId,
            action: 'role_updated',
            oldValue: JSON.stringify(oldRole),
            newValue: JSON.stringify(data),
            changedBy: updatedBy
        });
        
        return this.getRoleById(roleId);
    }

    /**
     * حذف دور
     */
    deleteRole(roleId, deletedBy) {
        const role = this.getRoleById(roleId);
        
        // لا يمكن حذف أدوار النظام
        if (role.is_system) {
            throw new Error('لا يمكن حذف أدوار النظام');
        }
        
        // التحقق من عدم وجود مستخدمين
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE role_id = ?');
        stmt.bind([roleId]);
        stmt.step();
        const result = stmt.getAsObject();
        stmt.free();
        
        if (result.count > 0) {
            throw new Error('لا يمكن حذف دور له مستخدمين');
        }
        
        this.db.run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
        this.db.run('DELETE FROM roles WHERE id = ?', [roleId]);
        
        this.logPermissionChange({
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
    getRolePermissions(roleId) {
        const stmt = this.db.prepare(`
            SELECT p.* FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
            ORDER BY p.module, p.feature, p.action
        `);
        stmt.bind([roleId]);
        const permissions = [];
        while (stmt.step()) {
            permissions.push(stmt.getAsObject());
        }
        stmt.free();
        return permissions;
    }

    /**
     * تعيين صلاحيات لدور
     */
    setRolePermissions(roleId, permissionIds, grantedBy) {
        const role = this.getRoleById(roleId);
        
        // لا يمكن تعديل صلاحيات أدوار Owner و Super Admin
        if (['role_owner', 'role_super_admin'].includes(roleId)) {
            throw new Error('لا يمكن تعديل صلاحيات هذا الدور');
        }
        
        // حذف الصلاحيات القديمة
        this.db.run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
        
        // إضافة الصلاحيات الجديدة
        for (const permId of permissionIds) {
            this.db.run(`
                INSERT INTO role_permissions (id, role_id, permission_id, granted_by, granted_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            `, [uuidv4(), roleId, permId, grantedBy]);
        }
        
        this.logPermissionChange({
            roleId,
            action: 'role_permissions_updated',
            newValue: JSON.stringify(permissionIds),
            changedBy: grantedBy
        });
        
        return this.getRolePermissions(roleId);
    }

    /**
     * جلب صلاحيات مستخدم (المخصصة)
     */
    getUserCustomPermissions(userId) {
        const stmt = this.db.prepare(`
            SELECT p.*, up.is_granted, up.expires_at, up.reason
            FROM permissions p
            JOIN user_permissions up ON p.id = up.permission_id
            WHERE up.user_id = ?
            ORDER BY p.module, p.feature, p.action
        `);
        stmt.bind([userId]);
        const permissions = [];
        while (stmt.step()) {
            permissions.push(stmt.getAsObject());
        }
        stmt.free();
        return permissions;
    }

    /**
     * جلب كل صلاحيات المستخدم (الدور + المخصصة)
     */
    getUserAllPermissions(userId) {
        const permissions = new Map();

        // صلاحيات الدور
        const rolePermsStmt = this.db.prepare(`
            SELECT p.* FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN users u ON u.role_id = rp.role_id
            WHERE u.id = ?
        `);
        rolePermsStmt.bind([userId]);
        while (rolePermsStmt.step()) {
            const perm = rolePermsStmt.getAsObject();
            permissions.set(perm.code, { ...perm, source: 'role', is_granted: true });
        }
        rolePermsStmt.free();

        // الصلاحيات المخصصة (override)
        const userPermsStmt = this.db.prepare(`
            SELECT p.*, up.is_granted, up.expires_at, up.reason
            FROM permissions p
            JOIN user_permissions up ON p.id = up.permission_id
            WHERE up.user_id = ?
            AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))
        `);
        userPermsStmt.bind([userId]);
        while (userPermsStmt.step()) {
            const perm = userPermsStmt.getAsObject();
            if (perm.is_granted) {
                permissions.set(perm.code, { ...perm, source: 'user', is_granted: true });
            } else {
                permissions.delete(perm.code);
            }
        }
        userPermsStmt.free();

        return Array.from(permissions.values());
    }

    /**
     * منح صلاحية لمستخدم
     */
    grantUserPermission(userId, permissionId, data, grantedBy) {
        const id = uuidv4();
        this.db.run(`
            INSERT OR REPLACE INTO user_permissions 
            (id, user_id, permission_id, is_granted, granted_by, granted_at, expires_at, reason)
            VALUES (?, ?, ?, 1, ?, datetime('now'), ?, ?)
        `, [
            id,
            userId,
            permissionId,
            grantedBy,
            data.expires_at || null,
            data.reason || null
        ]);
        
        this.logPermissionChange({
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
    revokeUserPermission(userId, permissionId, reason, revokedBy) {
        this.db.run(`
            INSERT OR REPLACE INTO user_permissions 
            (id, user_id, permission_id, is_granted, granted_by, granted_at, reason)
            VALUES (?, ?, ?, 0, ?, datetime('now'), ?)
        `, [
            uuidv4(),
            userId,
            permissionId,
            revokedBy,
            reason || null
        ]);
        
        this.logPermissionChange({
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
    removeUserPermissionOverride(userId, permissionId, removedBy) {
        this.db.run(`
            DELETE FROM user_permissions 
            WHERE user_id = ? AND permission_id = ?
        `, [userId, permissionId]);
        
        this.logPermissionChange({
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
    logPermissionChange(data) {
        this.db.run(`
            INSERT INTO permission_history 
            (id, user_id, role_id, permission_id, action, old_value, new_value, changed_by, changed_at, reason, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
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
    }

    /**
     * جلب سجل تغييرات الصلاحيات
     */
    getPermissionHistory(filters = {}) {
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

        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const history = [];
        while (stmt.step()) {
            history.push(stmt.getAsObject());
        }
        stmt.free();
        return history;
    }
}

// Singleton
let instance = null;

function getPermissionService(db) {
    if (!instance) {
        instance = new PermissionService(db);
    }
    return instance;
}

module.exports = {
    PermissionService,
    getPermissionService
};
