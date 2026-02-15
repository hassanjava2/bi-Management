/**
 * BI ERP - User routes (Enhanced with HR analytics)
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { auth } = require('../middleware/auth');
const { hasPermission, adminOnly } = require('../middleware/permissions');
const { get, all, run } = require('../config/database');

router.use(auth);

// ═══════════════════════════════════════════════
// HR ANALYTICS (must be before /:id to avoid conflict)
// ═══════════════════════════════════════════════

// Employee statistics summary
router.get('/analytics/hr-stats', async (req, res) => {
    try {
        const [total, active, departments, roles] = await Promise.all([
            get('SELECT COUNT(*)::int as c FROM users').then(r => r?.c || 0).catch(() => 0),
            get('SELECT COUNT(*)::int as c FROM users WHERE is_active = 1').then(r => r?.c || 0).catch(() => 0),
            all(`SELECT COALESCE(department_name, 'غير محدد') as dept, COUNT(*)::int as c 
           FROM users GROUP BY COALESCE(department_name, 'غير محدد') ORDER BY c DESC`).catch(() => []),
            all(`SELECT role, COUNT(*)::int as c FROM users WHERE is_active = 1 
           GROUP BY role ORDER BY c DESC`).catch(() => []),
        ]);
        res.json({ success: true, data: { total, active, inactive: total - active, departments, roles } });
    } catch (e) { res.json({ success: true, data: {} }); }
});

// Attendance summary (today + monthly)
router.get('/analytics/attendance-summary', async (req, res) => {
    try {
        const [today, monthly] = await Promise.all([
            all(`SELECT a.status, COUNT(*)::int as c FROM attendance a 
           WHERE a.date = CURRENT_DATE GROUP BY a.status`).catch(() => []),
            all(`SELECT 
            COUNT(DISTINCT CASE WHEN status = 'present' THEN user_id END)::int as present_days,
            COUNT(DISTINCT CASE WHEN status = 'late' THEN user_id END)::int as late_days,
            COUNT(DISTINCT CASE WHEN status = 'absent' THEN user_id END)::int as absent_days,
            COUNT(DISTINCT date)::int as working_days
          FROM attendance WHERE date >= date_trunc('month', CURRENT_DATE)`).catch(() => []),
        ]);
        const todayMap = {};
        today.forEach(r => { todayMap[r.status] = r.c; });
        res.json({
            success: true,
            data: {
                today: { present: todayMap.present || 0, late: todayMap.late || 0, absent: todayMap.absent || 0 },
                monthly: monthly[0] || {}
            }
        });
    } catch (e) { res.json({ success: true, data: {} }); }
});

// Employee performance (tasks + sales)
router.get('/analytics/employee-performance', async (req, res) => {
    try {
        const rows = await all(`
      SELECT u.id, u.full_name as name, u.role, u.department_name,
        COALESCE(t.completed, 0)::int as tasks_completed,
        COALESCE(t.total_tasks, 0)::int as total_tasks,
        COALESCE(i.invoice_count, 0)::int as invoices_created,
        COALESCE(i.total_sales, 0) as total_sales
      FROM users u
      LEFT JOIN (
        SELECT assigned_to, 
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(*) as total_tasks
        FROM tasks WHERE (is_deleted = 0 OR is_deleted IS NULL)
        GROUP BY assigned_to
      ) t ON t.assigned_to = u.id
      LEFT JOIN (
        SELECT created_by, COUNT(*) as invoice_count, COALESCE(SUM(total), 0) as total_sales
        FROM invoices WHERE type = 'sale' AND (is_deleted = 0 OR is_deleted IS NULL)
        GROUP BY created_by
      ) i ON i.created_by = u.id
      WHERE u.is_active = 1
      ORDER BY COALESCE(i.total_sales, 0) DESC LIMIT 20
    `).catch(() => []);
        res.json({ success: true, data: rows });
    } catch (e) { res.json({ success: true, data: [] }); }
});

// ═══════════════════════════════════════════════
// CRUD (generic /:id must be last)
// ═══════════════════════════════════════════════
router.get('/', adminOnly, userController.list);
router.post('/', hasPermission('users.create'), userController.create);
router.get('/:id', adminOnly, userController.getOne);
router.put('/:id', hasPermission('users.update'), userController.update);
router.delete('/:id', hasPermission('users.delete'), userController.remove);

module.exports = router;
