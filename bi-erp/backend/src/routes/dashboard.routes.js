const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const taskService = require('../services/task.service');
const attendanceService = require('../services/attendance.service');
const { get, all } = require('../config/database');

router.use(auth);

// /api/dashboard/stats - Main dashboard data
router.get('/stats', async (req, res) => {
  try {
    const notDeleted = '(is_deleted = 0 OR is_deleted IS NULL)';

    const [totalCustomers, totalSuppliers, totalProducts, totalInvoices, todaySales, monthSales, totalEmployees, lowStock, pendingCredit] = await Promise.all([
      get(`SELECT COUNT(*) as c FROM customers WHERE ${notDeleted}`).then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*) as c FROM suppliers WHERE ${notDeleted}`).then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*) as c FROM products WHERE ${notDeleted}`).then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*) as c FROM invoices WHERE ${notDeleted}`).then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*) as c, COALESCE(SUM(total),0) as total FROM invoices WHERE type = 'sale' AND created_at::date = CURRENT_DATE AND ${notDeleted}`).then(r => ({ count: r?.c || 0, total: Number(r?.total) || 0 })).catch(() => ({ count: 0, total: 0 })),
      get(`SELECT COUNT(*) as c, COALESCE(SUM(total),0) as total FROM invoices WHERE type = 'sale' AND date_trunc('month', created_at) = date_trunc('month', CURRENT_TIMESTAMP) AND ${notDeleted}`).then(r => ({ count: r?.c || 0, total: Number(r?.total) || 0 })).catch(() => ({ count: 0, total: 0 })),
      get('SELECT COUNT(*) as c FROM users WHERE is_active = 1').then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*) as c FROM products WHERE quantity <= COALESCE(min_quantity, 5) AND quantity >= 0 AND ${notDeleted}`).then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*) as c FROM invoices WHERE payment_type = 'credit' AND payment_status != 'paid' AND ${notDeleted}`).then(r => r?.c || 0).catch(() => 0),
    ]);

    res.json({
      success: true,
      data: {
        total_customers: totalCustomers,
        total_suppliers: totalSuppliers,
        total_products: totalProducts,
        total_invoices: totalInvoices,
        today_sales_count: todaySales.count,
        today_sales_total: todaySales.total,
        month_sales_count: monthSales.count,
        month_sales_total: monthSales.total,
        total_employees: totalEmployees,
        low_stock_count: lowStock,
        pending_credit_count: pendingCredit,
      },
    });
  } catch (e) {
    console.error('[Dashboard] Stats error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// /api/dashboard/chart - 7-day sales/purchases chart
router.get('/chart', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        d::date as date,
        COALESCE((SELECT SUM(total) FROM invoices WHERE type = 'sale' AND created_at::date = d::date AND (is_deleted = 0 OR is_deleted IS NULL)), 0) as sales,
        COALESCE((SELECT SUM(total) FROM invoices WHERE type = 'purchase' AND created_at::date = d::date AND (is_deleted = 0 OR is_deleted IS NULL)), 0) as purchases
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: rows.map(r => ({
        date: r.date,
        label: new Date(r.date).toLocaleDateString('ar-IQ', { weekday: 'short', day: 'numeric' }),
        sales: Number(r.sales) || 0,
        purchases: Number(r.purchases) || 0,
      })),
    });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// /api/dashboard - Tasks + Attendance
router.get('/', async (req, res) => {
  try {
    let taskStats = { total: 0, today: 0, overdue: 0 };
    let attendanceStats = { checked_in: 0, total_employees: 0 };

    try { taskStats = await taskService.getTaskStats({}); } catch (_) { }
    try { attendanceStats = await attendanceService.getStats(); } catch (_) { }

    res.json({
      success: true,
      data: {
        tasks: {
          total: taskStats?.total ?? 0,
          today: taskStats?.today ?? 0,
          overdue: taskStats?.overdue ?? 0,
        },
        attendance: {
          checked_in: attendanceStats?.checked_in ?? attendanceStats?.present ?? 0,
          total_employees: attendanceStats?.total_employees ?? 0,
        },
      },
    });
  } catch (e) {
    // Never 500 the dashboard — return zeros
    res.json({
      success: true,
      data: {
        tasks: { total: 0, today: 0, overdue: 0 },
        attendance: { checked_in: 0, total_employees: 0 },
      },
    });
  }
});

module.exports = router;
