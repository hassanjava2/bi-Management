const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { get, all } = require('../config/database');

router.use(auth);

router.get('/summary', async (req, res) => {
  try {
    const [users, customers, invoices, products] = await Promise.all([
      get('SELECT COUNT(*) as c FROM users WHERE is_active = 1').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM customers WHERE (is_deleted = 0 OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM invoices WHERE (is_deleted = 0 OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
    ]);
    res.json({ success: true, data: { users, customers, invoices, products } });
  } catch (e) {
    res.json({ success: true, data: { users: 0, customers: 0, invoices: 0, products: 0 } });
  }
});

// Executive Dashboard — REAL data
router.get('/executive-dashboard', async (req, res) => {
  try {
    const notDeleted = "AND (is_deleted = 0 OR is_deleted IS NULL)";
    const notCancelled = "AND (status IS NULL OR status NOT IN ('cancelled'))";

    // === Core Totals ===
    const [totalSales, totalPurchases, totalCustomers, totalProducts, todaySales, monthlySales] = await Promise.all([
      get(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type = 'sale' ${notCancelled} ${notDeleted}`).catch(() => ({ count: 0, total: 0 })),
      get(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type = 'purchase' ${notCancelled} ${notDeleted}`).catch(() => ({ count: 0, total: 0 })),
      get(`SELECT COUNT(*) as c FROM customers WHERE (is_deleted = 0 OR is_deleted IS NULL)`).then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*) as c FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)`).then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type = 'sale' ${notCancelled} AND created_at::date = CURRENT_DATE ${notDeleted}`).catch(() => ({ count: 0, total: 0 })),
      get(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type = 'sale' ${notCancelled} AND date_trunc('month', created_at) = date_trunc('month', CURRENT_TIMESTAMP) ${notDeleted}`).catch(() => ({ count: 0, total: 0 })),
    ]);

    const salesTotal = Number(totalSales?.total) || 0;
    const purchasesTotal = Number(totalPurchases?.total) || 0;
    const profit = salesTotal - purchasesTotal;

    // === Cash Flow — last 7 days ===
    let cashFlow = [];
    try {
      cashFlow = await all(`
        SELECT
          created_at::date as date,
          COALESCE(SUM(CASE WHEN type = 'sale' THEN total ELSE 0 END), 0) as sales,
          COALESCE(SUM(CASE WHEN type = 'purchase' THEN total ELSE 0 END), 0) as purchases
        FROM invoices
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
          ${notCancelled} ${notDeleted}
        GROUP BY created_at::date
        ORDER BY date ASC
      `);
      cashFlow = cashFlow.map(r => ({
        date: r.date,
        sales: Number(r.sales) || 0,
        purchases: Number(r.purchases) || 0,
        profit: (Number(r.sales) || 0) - (Number(r.purchases) || 0),
      }));
    } catch (_) { }

    // === Top Sellers (this month) ===
    let topSellers = [];
    try {
      topSellers = await all(`
        SELECT
          p.name as product_name,
          SUM(ii.quantity) as total_qty,
          SUM(ii.quantity * ii.unit_price) as total_revenue
        FROM invoice_items ii
        JOIN invoices i ON i.id = ii.invoice_id
        JOIN products p ON p.id = ii.product_id
        WHERE i.type = 'sale'
          AND date_trunc('month', i.created_at) = date_trunc('month', CURRENT_TIMESTAMP)
          ${notDeleted.replace(/is_deleted/g, 'i.is_deleted')}
          ${notCancelled.replace(/status/g, 'i.status')}
        GROUP BY p.id, p.name
        ORDER BY total_qty DESC
        LIMIT 10
      `);
      topSellers = topSellers.map(r => ({
        name: r.product_name,
        qty: Number(r.total_qty) || 0,
        revenue: Number(r.total_revenue) || 0,
      }));
    } catch (_) { }

    // === Alerts ===
    let lowStock = 0;
    let overduePayments = 0;
    try {
      const ls = await get(`SELECT COUNT(*) as c FROM products WHERE quantity <= COALESCE(min_quantity, 5) AND quantity > 0 AND (is_deleted = 0 OR is_deleted IS NULL)`);
      lowStock = ls?.c || 0;
    } catch (_) { }
    try {
      const op = await get(`SELECT COUNT(*) as c FROM invoices WHERE payment_type = 'credit' AND payment_status != 'paid' AND (is_deleted = 0 OR is_deleted IS NULL)`);
      overduePayments = op?.c || 0;
    } catch (_) { }

    res.json({
      success: true,
      data: {
        sales: { count: totalSales?.count || 0, total: salesTotal },
        purchases: { count: totalPurchases?.count || 0, total: purchasesTotal },
        total_customers: totalCustomers,
        total_products: totalProducts,
        today_sales: { count: todaySales?.count || 0, total: Number(todaySales?.total) || 0 },
        monthly_sales: { count: monthlySales?.count || 0, total: Number(monthlySales?.total) || 0 },
        revenue: {
          total_sales: salesTotal,
          total_purchases: purchasesTotal,
          net_profit: profit,
          profit_margin: salesTotal > 0 ? ((profit / salesTotal) * 100).toFixed(1) : 0,
        },
        cash_flow: cashFlow,
        top_sellers_month: topSellers,
        alerts: { low_stock: lowStock, overdue_payments: overduePayments, pending_approvals: 0 },
      },
    });
  } catch (e) {
    console.error('[Reports] Executive error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Sales report — daily breakdown (last 30 days)
router.get('/sales', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        created_at::date as date,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total,
        COALESCE(SUM(total - COALESCE(cost_total, 0)), 0) as profit
      FROM invoices
      WHERE type = 'sale'
        AND (is_deleted = 0 OR is_deleted IS NULL)
      GROUP BY created_at::date
      ORDER BY date DESC
      LIMIT 30
    `);
    res.json({ success: true, data: rows.map(r => ({ ...r, total: Number(r.total), profit: Number(r.profit) })) });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// Inventory report — products sorted by quantity (low stock first)
router.get('/inventory', async (req, res) => {
  try {
    const rows = await all(`
      SELECT id, name, quantity, min_quantity, cost_price, selling_price, category_id
      FROM products
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY quantity ASC
      LIMIT 50
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// Top customers by total purchases
router.get('/top-customers', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        c.id, c.name, c.phone,
        COUNT(i.id) as invoice_count,
        COALESCE(SUM(i.total), 0) as total_spent
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id = c.id AND i.type = 'sale' AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
      WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)
      GROUP BY c.id, c.name, c.phone
      ORDER BY total_spent DESC
      LIMIT 20
    `);
    res.json({ success: true, data: rows.map(r => ({ ...r, total_spent: Number(r.total_spent) })) });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// Sales by Employee
router.get('/sales-by-employee', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        u.id, u.full_name,
        COUNT(i.id)::int as invoice_count,
        COALESCE(SUM(i.total), 0) as total_sales,
        COALESCE(SUM(i.total - COALESCE(i.cost_total, 0)), 0) as total_profit
      FROM users u
      LEFT JOIN invoices i ON i.created_by = u.id AND i.type = 'sale'
        AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
        AND (i.status IS NULL OR i.status != 'cancelled')
      WHERE u.is_active = 1 AND u.role IN ('sales', 'admin', 'manager', 'owner')
      GROUP BY u.id, u.full_name
      ORDER BY total_sales DESC
    `);
    res.json({ success: true, data: rows.map(r => ({ ...r, total_sales: Number(r.total_sales), total_profit: Number(r.total_profit) })) });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// Profit by product
router.get('/profit-by-product', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        p.id, p.name,
        SUM(ii.quantity)::int as total_sold,
        COALESCE(SUM(ii.quantity * ii.unit_price), 0) as total_revenue,
        COALESCE(SUM(ii.quantity * COALESCE(p.cost_price, 0)), 0) as total_cost,
        COALESCE(SUM(ii.quantity * ii.unit_price), 0) - COALESCE(SUM(ii.quantity * COALESCE(p.cost_price, 0)), 0) as profit
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id AND i.type = 'sale'
        AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
        AND (i.status IS NULL OR i.status != 'cancelled')
      JOIN products p ON p.id = ii.product_id
      GROUP BY p.id, p.name
      ORDER BY profit DESC
      LIMIT 50
    `);
    res.json({ success: true, data: rows.map(r => ({ ...r, total_revenue: Number(r.total_revenue), total_cost: Number(r.total_cost), profit: Number(r.profit) })) });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// Aging report (debt aging)
router.get('/aging-report', async (req, res) => {
  try {
    const customers = await all(`
      SELECT
        c.id, c.name, c.phone,
        COUNT(i.id)::int as pending_invoices,
        COALESCE(SUM(i.total - COALESCE(i.paid, 0)), 0) as total_remaining,
        COALESCE(SUM(CASE WHEN i.created_at < CURRENT_TIMESTAMP - INTERVAL '30 days' THEN (i.total - COALESCE(i.paid, 0)) ELSE 0 END), 0) as overdue_amount,
        COALESCE(SUM(CASE WHEN i.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN (i.total - COALESCE(i.paid, 0)) ELSE 0 END), 0) as due_30_days
      FROM customers c
      JOIN invoices i ON i.customer_id = c.id
        AND i.payment_type = 'credit'
        AND (i.payment_status IS NULL OR i.payment_status != 'paid')
        AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
      WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)
      GROUP BY c.id, c.name, c.phone
      HAVING SUM(i.total - COALESCE(i.paid, 0)) > 0
      ORDER BY total_remaining DESC
    `);

    const total_receivable = customers.reduce((s, c) => s + Number(c.total_remaining), 0);
    const total_overdue = customers.reduce((s, c) => s + Number(c.overdue_amount), 0);
    const total_due_30 = customers.reduce((s, c) => s + Number(c.due_30_days), 0);

    res.json({
      success: true,
      data: {
        customers: customers.map(c => ({ ...c, total_remaining: Number(c.total_remaining), overdue_amount: Number(c.overdue_amount), due_30_days: Number(c.due_30_days) })),
        totals: { total_receivable, total_overdue, total_due_30, customers_count: customers.length }
      }
    });
  } catch (e) {
    res.json({ success: true, data: { customers: [], totals: {} } });
  }
});

// Employee performance report
router.get('/employee-performance', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const employees = await all(`
      SELECT
        u.id, u.full_name,
        (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE created_by = u.id AND type = 'sale' AND created_at::date BETWEEN $1 AND $2 AND (is_deleted = 0 OR is_deleted IS NULL)) as sales_total,
        (SELECT COUNT(*) FROM invoices WHERE created_by = u.id AND type = 'sale' AND created_at::date BETWEEN $1 AND $2 AND (is_deleted = 0 OR is_deleted IS NULL))::int as invoices_created,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status = 'completed' AND updated_at::date BETWEEN $1 AND $2)::int as tasks_completed,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND created_at::date BETWEEN $1 AND $2)::int as tasks_total,
        (SELECT COUNT(*) FROM attendance WHERE user_id = u.id AND date BETWEEN $1 AND $2 AND status = 'present')::int as present_days,
        (SELECT COUNT(*) FROM attendance WHERE user_id = u.id AND date BETWEEN $1 AND $2 AND status = 'late')::int as late_days
      FROM users u
      WHERE u.is_active = 1
      ORDER BY sales_total DESC
    `, [startDate, endDate]);

    res.json({ success: true, data: { employees: employees.map(e => ({ ...e, sales_total: Number(e.sales_total) })) } });
  } catch (e) {
    res.json({ success: true, data: { employees: [] } });
  }
});

// Universal CSV export
router.get('/export/:type', async (req, res) => {
  try {
    const type = req.params.type;
    let rows = [];
    let headers = [];

    if (type === 'sales') {
      rows = await all(`SELECT created_at::date as date, COUNT(*)::int as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE type = 'sale' AND (is_deleted = 0 OR is_deleted IS NULL) GROUP BY created_at::date ORDER BY date DESC LIMIT 60`);
      headers = ['التاريخ', 'عدد الفواتير', 'المجموع'];
      rows = rows.map(r => [r.date, r.count, r.total]);
    } else if (type === 'sales-by-employee') {
      rows = await all(`SELECT u.full_name, COUNT(i.id)::int as invoices, COALESCE(SUM(i.total), 0) as total FROM users u LEFT JOIN invoices i ON i.created_by = u.id AND i.type = 'sale' AND (i.is_deleted = 0 OR i.is_deleted IS NULL) WHERE u.is_active = 1 GROUP BY u.id, u.full_name ORDER BY total DESC`);
      headers = ['الموظف', 'عدد الفواتير', 'المجموع'];
      rows = rows.map(r => [r.full_name, r.invoices, r.total]);
    } else if (type === 'customers') {
      rows = await all(`SELECT c.name, c.phone, COUNT(i.id)::int as invoices, COALESCE(SUM(i.total), 0) as total FROM customers c LEFT JOIN invoices i ON i.customer_id = c.id AND (i.is_deleted = 0 OR i.is_deleted IS NULL) WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL) GROUP BY c.id, c.name, c.phone ORDER BY total DESC LIMIT 100`);
      headers = ['العميل', 'الهاتف', 'الفواتير', 'المجموع'];
      rows = rows.map(r => [r.name, r.phone || '', r.invoices, r.total]);
    } else if (type === 'inventory') {
      rows = await all(`SELECT name, quantity, COALESCE(min_quantity, 0) as min_qty, COALESCE(cost_price, 0) as cost, COALESCE(selling_price, 0) as price FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL) ORDER BY quantity ASC LIMIT 100`);
      headers = ['المنتج', 'الكمية', 'الحد الأدنى', 'التكلفة', 'السعر'];
      rows = rows.map(r => [r.name, r.quantity, r.min_qty, r.cost, r.price]);
    } else if (type === 'profit-by-product') {
      rows = await all(`SELECT p.name, SUM(ii.quantity)::int as sold, COALESCE(SUM(ii.quantity * ii.unit_price), 0) as revenue, COALESCE(SUM(ii.quantity * COALESCE(p.cost_price, 0)), 0) as cost FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id AND i.type = 'sale' AND (i.is_deleted = 0 OR i.is_deleted IS NULL) JOIN products p ON p.id = ii.product_id GROUP BY p.id, p.name ORDER BY revenue DESC LIMIT 50`);
      headers = ['المنتج', 'المباع', 'الإيرادات', 'التكلفة', 'الربح'];
      rows = rows.map(r => [r.name, r.sold, r.revenue, r.cost, Number(r.revenue) - Number(r.cost)]);
    } else if (type === 'aging-report') {
      rows = await all(`SELECT c.name, c.phone, COALESCE(SUM(i.total - COALESCE(i.paid, 0)), 0) as remaining FROM customers c JOIN invoices i ON i.customer_id = c.id AND i.payment_type = 'credit' AND (i.is_deleted = 0 OR i.is_deleted IS NULL) WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL) GROUP BY c.id, c.name, c.phone HAVING SUM(i.total - COALESCE(i.paid, 0)) > 0 ORDER BY remaining DESC`);
      headers = ['العميل', 'الهاتف', 'المتبقي'];
      rows = rows.map(r => [r.name, r.phone || '', r.remaining]);
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported export type' });
    }

    // Generate CSV
    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
