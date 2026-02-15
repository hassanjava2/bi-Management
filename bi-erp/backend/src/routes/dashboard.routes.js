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

// ═══════════════════════════════════════════════
// ANALYTICS — 16 statistical endpoints
// ═══════════════════════════════════════════════
const ND = '(is_deleted = 0 OR is_deleted IS NULL)';


// 1. الربح والخسارة — آخر 12 شهر
router.get('/analytics/profit-loss', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        date_trunc('month', created_at) as month,
        COALESCE(SUM(CASE WHEN type = 'sale' THEN total ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN type = 'purchase' THEN total ELSE 0 END), 0) as purchases,
        COALESCE(SUM(CASE WHEN type = 'sale' THEN profit ELSE 0 END), 0) as profit
      FROM invoices
      WHERE ${ND} AND created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY month ASC
    `).catch(() => []);
    res.json({
      success: true, data: rows.map(r => ({
        month: r.month,
        label: new Date(r.month).toLocaleDateString('ar-IQ', { month: 'short', year: 'numeric' }),
        sales: Number(r.sales) || 0,
        purchases: Number(r.purchases) || 0,
        profit: Number(r.profit) || 0,
      }))
    });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 2. أحدث الفواتير
router.get('/analytics/recent-invoices', async (req, res) => {
  try {
    const rows = await all(`
      SELECT i.id, i.invoice_number, i.type, i.total, i.payment_status, i.created_at,
        COALESCE(c.name, s.name, 'غير محدد') as party_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE ${ND.replace(/is_deleted/g, 'i.is_deleted')}
      ORDER BY i.created_at DESC LIMIT 10
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 3. فواتير متأخرة الدفع
router.get('/analytics/overdue-invoices', async (req, res) => {
  try {
    const rows = await all(`
      SELECT i.id, i.invoice_number, i.type, i.total, i.payment_status, i.due_date, i.created_at,
        COALESCE(c.name, s.name, 'غير محدد') as party_name,
        CURRENT_DATE - i.due_date::date as days_overdue
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE ${ND.replace(/is_deleted/g, 'i.is_deleted')}
        AND i.payment_status != 'paid'
        AND i.due_date IS NOT NULL AND i.due_date::date < CURRENT_DATE
      ORDER BY days_overdue DESC LIMIT 20
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 4. أحدث المدفوعات
router.get('/analytics/recent-payments', async (req, res) => {
  try {
    const rows = await all(`
      SELECT v.id, v.voucher_number, v.type, v.amount, v.currency, v.created_at, v.description,
        COALESCE(c.name, s.name, u.name, 'غير محدد') as party_name
      FROM vouchers v
      LEFT JOIN customers c ON v.customer_id = c.id
      LEFT JOIN suppliers s ON v.supplier_id = s.id
      LEFT JOIN users u ON v.user_id = u.id
      WHERE (v.is_deleted = 0 OR v.is_deleted IS NULL)
      ORDER BY v.created_at DESC LIMIT 10
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 5. أفضل الزبائن شراءً
router.get('/analytics/top-customers', async (req, res) => {
  try {
    const rows = await all(`
      SELECT c.id, c.name, c.phone, c.address,
        COUNT(i.id)::int as invoice_count,
        COALESCE(SUM(i.total), 0) as total_purchases
      FROM customers c
      JOIN invoices i ON i.customer_id = c.id AND i.type = 'sale' AND ${ND.replace(/is_deleted/g, 'i.is_deleted')}
      WHERE ${ND.replace(/is_deleted/g, 'c.is_deleted')}
      GROUP BY c.id, c.name, c.phone, c.address
      ORDER BY total_purchases DESC LIMIT 10
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 6. أعلى الزبائن أرباحاً
router.get('/analytics/most-profitable-customers', async (req, res) => {
  try {
    const rows = await all(`
      SELECT c.id, c.name, c.phone,
        COALESCE(SUM(i.profit), 0) as total_profit,
        COUNT(i.id)::int as invoice_count
      FROM customers c
      JOIN invoices i ON i.customer_id = c.id AND i.type = 'sale' AND ${ND.replace(/is_deleted/g, 'i.is_deleted')}
      WHERE ${ND.replace(/is_deleted/g, 'c.is_deleted')}
      GROUP BY c.id, c.name, c.phone
      ORDER BY total_profit DESC LIMIT 10
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 7. المواد الأعلى استهلاكاً (المبيعات)
router.get('/analytics/top-selling-products', async (req, res) => {
  try {
    const rows = await all(`
      SELECT p.id, p.name, p.code,
        COALESCE(SUM(ii.quantity), 0)::int as total_sold,
        COALESCE(SUM(ii.subtotal), 0) as total_revenue
      FROM products p
      JOIN invoice_items ii ON ii.product_id = p.id
      JOIN invoices i ON i.id = ii.invoice_id AND i.type = 'sale' AND ${ND.replace(/is_deleted/g, 'i.is_deleted')}
      WHERE ${ND.replace(/is_deleted/g, 'p.is_deleted')}
      GROUP BY p.id, p.name, p.code
      ORDER BY total_sold DESC LIMIT 10
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 8. المواد الراكدة
router.get('/analytics/stagnant-products', async (req, res) => {
  try {
    const rows = await all(`
      SELECT p.id, p.name, p.code, p.quantity,
        MAX(i.created_at) as last_sale_date,
        CURRENT_DATE - MAX(i.created_at)::date as days_stagnant
      FROM products p
      LEFT JOIN invoice_items ii ON ii.product_id = p.id
      LEFT JOIN invoices i ON i.id = ii.invoice_id AND i.type = 'sale' AND ${ND.replace(/is_deleted/g, 'i.is_deleted')}
      WHERE ${ND.replace(/is_deleted/g, 'p.is_deleted')} AND p.quantity > 0
      GROUP BY p.id, p.name, p.code, p.quantity
      HAVING MAX(i.created_at) IS NULL OR MAX(i.created_at) < CURRENT_TIMESTAMP - INTERVAL '30 days'
      ORDER BY days_stagnant DESC NULLS FIRST LIMIT 15
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 9. مواد دون المعدل المطلوب
router.get('/analytics/below-minimum', async (req, res) => {
  try {
    const rows = await all(`
      SELECT id, name, code, quantity, COALESCE(min_quantity, 5) as min_quantity,
        COALESCE(min_quantity, 5) - quantity as deficit
      FROM products
      WHERE ${ND} AND quantity < COALESCE(min_quantity, 5) AND quantity >= 0
      ORDER BY deficit DESC LIMIT 20
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 10. المواد برصيد سالب
router.get('/analytics/negative-stock', async (req, res) => {
  try {
    const rows = await all(`
      SELECT id, name, code, quantity
      FROM products
      WHERE ${ND} AND quantity < 0
      ORDER BY quantity ASC LIMIT 20
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 11. الزبون الأفضل تسديداً
router.get('/analytics/best-paying-customers', async (req, res) => {
  try {
    const rows = await all(`
      SELECT c.id, c.name, c.phone,
        COUNT(v.id)::int as payment_count,
        COALESCE(SUM(v.amount), 0) as total_paid,
        COALESCE(c.balance, 0) as current_balance
      FROM customers c
      JOIN vouchers v ON v.customer_id = c.id AND v.type = 'receipt' AND (v.is_deleted = 0 OR v.is_deleted IS NULL)
      WHERE ${ND.replace(/is_deleted/g, 'c.is_deleted')}
      GROUP BY c.id, c.name, c.phone, c.balance
      ORDER BY total_paid DESC LIMIT 10
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 12. المندوب الأكثر مبيعاً
router.get('/analytics/top-sales-reps', async (req, res) => {
  try {
    const rows = await all(`
      SELECT u.id, u.name,
        COUNT(i.id)::int as invoice_count,
        COALESCE(SUM(i.total), 0) as total_sales,
        COALESCE(SUM(i.profit), 0) as total_profit
      FROM users u
      JOIN invoices i ON i.created_by = u.id AND i.type = 'sale' AND ${ND.replace(/is_deleted/g, 'i.is_deleted')}
      WHERE u.is_active = 1
      GROUP BY u.id, u.name
      ORDER BY total_sales DESC LIMIT 10
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 13. المنطقة الأكثر مبيعاً
router.get('/analytics/top-regions', async (req, res) => {
  try {
    const rows = await all(`
      SELECT COALESCE(c.address, c.city, 'غير محدد') as region,
        COUNT(i.id)::int as invoice_count,
        COALESCE(SUM(i.total), 0) as total_sales
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.type = 'sale' AND ${ND.replace(/is_deleted/g, 'i.is_deleted')}
      GROUP BY COALESCE(c.address, c.city, 'غير محدد')
      ORDER BY total_sales DESC LIMIT 10
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 14. الفواتير المرفوعة اليوم
router.get('/analytics/invoices-today', async (req, res) => {
  try {
    const rows = await all(`
      SELECT i.id, i.invoice_number, i.type, i.total, i.payment_status, i.created_at,
        COALESCE(c.name, s.name, 'غير محدد') as party_name,
        u.name as created_by_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE ${ND.replace(/is_deleted/g, 'i.is_deleted')} AND i.created_at::date = CURRENT_DATE
      ORDER BY i.created_at DESC
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 15. الموظفين المتأخرين عن الدوام
router.get('/analytics/late-employees', async (req, res) => {
  try {
    const rows = await all(`
      SELECT u.id, u.name, u.role,
        a.check_in_time, a.status,
        a.check_in_time::time as arrived_at
      FROM users u
      LEFT JOIN attendance a ON a.user_id = u.id AND a.date = CURRENT_DATE
      WHERE u.is_active = 1 AND (a.status = 'late' OR a.id IS NULL)
      ORDER BY a.check_in_time DESC NULLS FIRST LIMIT 15
    `).catch(() => []);
    res.json({
      success: true, data: rows.map(r => ({
        ...r,
        status_label: !r.check_in_time ? 'غائب' : 'متأخر'
      }))
    });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// 16. الموظفين الأسرع إنجازاً
router.get('/analytics/fastest-employees', async (req, res) => {
  try {
    const rows = await all(`
      SELECT u.id, u.name, u.role,
        COUNT(t.id)::int as completed_tasks,
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600), 0) as avg_hours
      FROM users u
      JOIN tasks t ON t.assigned_to = u.id AND t.status = 'completed'
      WHERE u.is_active = 1 AND t.completed_at IS NOT NULL
      GROUP BY u.id, u.name, u.role
      ORDER BY completed_tasks DESC, avg_hours ASC LIMIT 10
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

module.exports = router;
