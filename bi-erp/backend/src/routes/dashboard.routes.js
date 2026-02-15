const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const taskService = require('../services/task.service');
const attendanceService = require('../services/attendance.service');

router.use(auth);

// /api/dashboard/stats - Frontend calls this
router.get('/stats', async (req, res) => {
  try {
    const { get, all } = require('../config/database');
    const [totalCustomers, totalSuppliers, totalProducts, totalInvoices, todaySales, totalEmployees] = await Promise.all([
      get('SELECT COUNT(*) as c FROM customers').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM suppliers').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM invoices WHERE (is_deleted = 0 OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
      get("SELECT COUNT(*) as c, COALESCE(SUM(total),0) as total FROM invoices WHERE type LIKE 'sale%' AND created_at::date = CURRENT_DATE AND (is_deleted = 0 OR is_deleted IS NULL)").then(r => ({ count: r?.c || 0, total: r?.total || 0 })).catch(() => ({ count: 0, total: 0 })),
      get('SELECT COUNT(*) as c FROM users WHERE is_active = 1').then(r => r?.c || 0).catch(() => 0),
    ]);
    res.json({ success: true, data: { total_customers: totalCustomers, total_suppliers: totalSuppliers, total_products: totalProducts, total_invoices: totalInvoices, today_sales_count: todaySales.count, today_sales_total: todaySales.total, total_employees: totalEmployees } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const [taskStats, attendanceStats] = await Promise.all([
      taskService.getTaskStats({}),
      attendanceService.getStats(),
    ]);
    res.json({
      success: true,
      data: {
        tasks: {
          total: taskStats.total ?? 0,
          today: taskStats.today ?? 0,
          overdue: taskStats.overdue ?? 0,
        },
        attendance: {
          checked_in: attendanceStats.checked_in ?? attendanceStats.present ?? 0,
          total_employees: attendanceStats.total_employees ?? 0,
        },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
