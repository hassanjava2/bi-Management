/**
 * BI Management - Permissions Routes
 * مسارات إدارة الصلاحيات
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { checkPermission, checkSecurityLevel } = require('../middleware/checkPermission');
const { getPermissionService } = require('../services/permission.service');
const { getDatabase } = require('../config/database');

// ═══════════════════════════════════════════════════════════════════════════════
// الصلاحيات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب كل الصلاحيات
 */
router.get('/permissions', auth, checkPermission('system.permissions.view'), async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        const { grouped } = req.query;
        
        if (grouped === 'true') {
            const permissions = permissionService.getPermissionsByModule();
            return res.json({ success: true, data: permissions });
        }
        
        const permissions = permissionService.getAllPermissions();
        res.json({ success: true, data: permissions });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الصلاحيات' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// الأدوار
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب كل الأدوار
 */
router.get('/roles', auth, checkPermission('system.roles.view'), async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        const roles = permissionService.getAllRoles();
        res.json({ success: true, data: roles });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الأدوار' });
    }
});

/**
 * جلب دور واحد مع صلاحياته
 */
router.get('/roles/:id', auth, checkPermission('system.roles.view'), async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        const role = permissionService.getRoleById(req.params.id);
        if (!role) {
            return res.status(404).json({ success: false, message: 'الدور غير موجود' });
        }
        
        const permissions = permissionService.getRolePermissions(req.params.id);
        
        res.json({ 
            success: true, 
            data: { 
                ...role, 
                permissions,
                permission_codes: permissions.map(p => p.code)
            } 
        });
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الدور' });
    }
});

/**
 * إنشاء دور جديد
 */
router.post('/roles', auth, checkPermission('system.roles.create'), checkSecurityLevel(4), async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        const { name, name_ar, description, security_level, color, icon, permission_ids } = req.body;
        
        if (!name || !name_ar) {
            return res.status(400).json({ success: false, message: 'اسم الدور مطلوب' });
        }
        
        const role = permissionService.createRole({
            name, name_ar, description, security_level, color, icon
        }, req.user.id);
        
        // تعيين الصلاحيات إذا موجودة
        if (permission_ids && permission_ids.length > 0) {
            permissionService.setRolePermissions(role.id, permission_ids, req.user.id);
        }
        
        res.status(201).json({ success: true, data: role, message: 'تم إنشاء الدور بنجاح' });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ success: false, message: error.message || 'خطأ في إنشاء الدور' });
    }
});

/**
 * تحديث دور
 */
router.put('/roles/:id', auth, checkPermission('system.roles.edit'), checkSecurityLevel(4), async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        const role = permissionService.updateRole(req.params.id, req.body, req.user.id);
        
        // تحديث الصلاحيات إذا موجودة
        if (req.body.permission_ids) {
            permissionService.setRolePermissions(req.params.id, req.body.permission_ids, req.user.id);
        }
        
        res.json({ success: true, data: role, message: 'تم تحديث الدور بنجاح' });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ success: false, message: error.message || 'خطأ في تحديث الدور' });
    }
});

/**
 * حذف دور
 */
router.delete('/roles/:id', auth, checkPermission('system.roles.delete'), checkSecurityLevel(5), async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        permissionService.deleteRole(req.params.id, req.user.id);
        
        res.json({ success: true, message: 'تم حذف الدور بنجاح' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ success: false, message: error.message || 'خطأ في حذف الدور' });
    }
});

/**
 * تعيين صلاحيات لدور
 */
router.put('/roles/:id/permissions', auth, checkPermission('system.permissions.assign'), checkSecurityLevel(4), async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        const { permission_ids } = req.body;
        
        if (!Array.isArray(permission_ids)) {
            return res.status(400).json({ success: false, message: 'قائمة الصلاحيات مطلوبة' });
        }
        
        const permissions = permissionService.setRolePermissions(req.params.id, permission_ids, req.user.id);
        
        res.json({ success: true, data: permissions, message: 'تم تحديث صلاحيات الدور بنجاح' });
    } catch (error) {
        console.error('Error setting role permissions:', error);
        res.status(500).json({ success: false, message: error.message || 'خطأ في تعيين الصلاحيات' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// صلاحيات المستخدمين
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب صلاحيات مستخدم
 */
router.get('/users/:userId/permissions', auth, checkPermission('system.permissions.view'), async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        const { type } = req.query; // all, custom, role
        
        let permissions;
        if (type === 'custom') {
            permissions = permissionService.getUserCustomPermissions(req.params.userId);
        } else if (type === 'all') {
            permissions = permissionService.getUserAllPermissions(req.params.userId);
        } else {
            permissions = permissionService.getUserAllPermissions(req.params.userId);
        }
        
        res.json({ 
            success: true, 
            data: permissions,
            codes: permissions.filter(p => p.is_granted !== false).map(p => p.code)
        });
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب صلاحيات المستخدم' });
    }
});

/**
 * منح صلاحية لمستخدم
 */
router.post('/users/:userId/permissions/:permissionId/grant', 
    auth, 
    checkPermission('system.permissions.assign'), 
    checkSecurityLevel(4),
    async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        const { expires_at, reason } = req.body;
        
        permissionService.grantUserPermission(
            req.params.userId,
            req.params.permissionId,
            { expires_at, reason },
            req.user.id
        );
        
        res.json({ success: true, message: 'تم منح الصلاحية بنجاح' });
    } catch (error) {
        console.error('Error granting permission:', error);
        res.status(500).json({ success: false, message: 'خطأ في منح الصلاحية' });
    }
});

/**
 * إلغاء صلاحية من مستخدم
 */
router.post('/users/:userId/permissions/:permissionId/revoke', 
    auth, 
    checkPermission('system.permissions.revoke'), 
    checkSecurityLevel(4),
    async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        const { reason } = req.body;
        
        permissionService.revokeUserPermission(
            req.params.userId,
            req.params.permissionId,
            reason,
            req.user.id
        );
        
        res.json({ success: true, message: 'تم إلغاء الصلاحية بنجاح' });
    } catch (error) {
        console.error('Error revoking permission:', error);
        res.status(500).json({ success: false, message: 'خطأ في إلغاء الصلاحية' });
    }
});

/**
 * إزالة تخصيص صلاحية (إعادة للافتراضي)
 */
router.delete('/users/:userId/permissions/:permissionId', 
    auth, 
    checkPermission('system.permissions.assign'), 
    checkSecurityLevel(4),
    async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        permissionService.removeUserPermissionOverride(
            req.params.userId,
            req.params.permissionId,
            req.user.id
        );
        
        res.json({ success: true, message: 'تم إزالة التخصيص بنجاح' });
    } catch (error) {
        console.error('Error removing permission override:', error);
        res.status(500).json({ success: false, message: 'خطأ في إزالة التخصيص' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// سجل الصلاحيات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب سجل تغييرات الصلاحيات
 */
router.get('/history', auth, checkPermission('system.permissions.history'), async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        const { userId, roleId, fromDate, toDate, limit } = req.query;
        
        const history = permissionService.getPermissionHistory({
            userId,
            roleId,
            fromDate,
            toDate,
            limit: limit ? parseInt(limit) : 100
        });
        
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error fetching permission history:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب سجل الصلاحيات' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// صلاحياتي (للمستخدم الحالي)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب صلاحياتي
 */
router.get('/my-permissions', auth, async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        // Super Admin و Owner لهم كل الصلاحيات
        if (['super_admin', 'owner'].includes(req.user.role)) {
            const allPermissions = permissionService.getAllPermissions();
            return res.json({
                success: true,
                data: allPermissions,
                codes: allPermissions.map(p => p.code),
                is_super: true
            });
        }
        
        const permissions = permissionService.getUserAllPermissions(req.user.id);
        
        res.json({ 
            success: true, 
            data: permissions,
            codes: permissions.filter(p => p.is_granted !== false).map(p => p.code),
            is_super: false
        });
    } catch (error) {
        console.error('Error fetching my permissions:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب صلاحياتك' });
    }
});

/**
 * التحقق من صلاحية معينة
 */
router.get('/check/:code', auth, async (req, res) => {
    try {
        const db = getDatabase();
        const permissionService = getPermissionService(db);
        
        // Super Admin و Owner لهم كل الصلاحيات
        if (['super_admin', 'owner'].includes(req.user.role)) {
            return res.json({ success: true, has_permission: true });
        }
        
        const permissions = permissionService.getUserAllPermissions(req.user.id);
        const hasPermission = permissions.some(p => p.code === req.params.code && p.is_granted !== false);
        
        res.json({ success: true, has_permission: hasPermission });
    } catch (error) {
        console.error('Error checking permission:', error);
        res.status(500).json({ success: false, message: 'خطأ في التحقق من الصلاحية' });
    }
});

module.exports = router;
