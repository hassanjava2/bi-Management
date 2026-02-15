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

module.exports = router;
