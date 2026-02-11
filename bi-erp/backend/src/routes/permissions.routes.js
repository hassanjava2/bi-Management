/**
 * BI ERP - Permissions Routes
 * مسارات الصلاحيات
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { all, get, run } = require('../config/database');

router.use(auth);

// Get all roles
router.get('/roles', async (req, res) => {
  try {
    const roles = await all('SELECT * FROM roles ORDER BY name');
    res.json({ success: true, data: roles });
  } catch (e) {
    // Fallback default roles
    res.json({ success: true, data: [
      { id: 'owner', name: 'owner', label: 'مالك النظام', description: 'صلاحيات كاملة' },
      { id: 'admin', name: 'admin', label: 'مدير', description: 'إدارة النظام' },
      { id: 'manager', name: 'manager', label: 'مدير قسم', description: 'إدارة القسم' },
      { id: 'accountant', name: 'accountant', label: 'محاسب', description: 'العمليات المالية' },
      { id: 'sales', name: 'sales', label: 'مبيعات', description: 'عمليات البيع' },
      { id: 'inventory', name: 'inventory', label: 'مخزن', description: 'إدارة المخزون' },
      { id: 'hr', name: 'hr', label: 'موارد بشرية', description: 'شؤون الموظفين' },
      { id: 'employee', name: 'employee', label: 'موظف', description: 'صلاحيات أساسية' },
    ]});
  }
});

// Get all permissions
router.get('/all', async (req, res) => {
  try {
    const permissions = await all('SELECT * FROM permissions ORDER BY module, action');
    res.json({ success: true, data: permissions });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// Get user permissions
router.get('/user/:id', async (req, res) => {
  try {
    const user = await get('SELECT id, role, full_name FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    const permissions = await all('SELECT permission FROM user_permissions WHERE user_id = ?', [req.params.id]);
    res.json({ success: true, data: { user, permissions: permissions.map(p => p.permission) } });
  } catch (e) {
    res.json({ success: true, data: { user: null, permissions: [] } });
  }
});

module.exports = router;
