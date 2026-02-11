const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { get, all } = require('../config/database');

router.use(auth);

router.get('/summary', async (req, res) => {
  try {
    const [users, customers, invoices, products] = await Promise.all([
      get('SELECT COUNT(*) as c FROM users WHERE is_active = TRUE').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM customers WHERE (is_deleted = FALSE OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM invoices WHERE (is_deleted = FALSE OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM products WHERE (is_deleted = FALSE OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
    ]);
    res.json({ success: true, data: { users, customers, invoices, products } });
  } catch (e) {
    res.json({ success: true, data: { users: 0, customers: 0, invoices: 0, products: 0 } });
  }
});

// Executive Dashboard
router.get('/executive-dashboard', async (req, res) => {
  try {
    const [totalSales, totalPurchases, totalCustomers, totalProducts, todaySales, monthlySales] = await Promise.all([
      get("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type LIKE 'sale%' AND (is_deleted = FALSE OR is_deleted IS NULL)").catch(() => ({ count: 0, total: 0 })),
      get("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type LIKE 'purchase%' AND (is_deleted = FALSE OR is_deleted IS NULL)").catch(() => ({ count: 0, total: 0 })),
      get('SELECT COUNT(*) as c FROM customers WHERE (is_deleted = FALSE OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM products WHERE (is_deleted = FALSE OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
      get("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type LIKE 'sale%' AND created_at::date = CURRENT_DATE AND (is_deleted = FALSE OR is_deleted IS NULL)").catch(() => ({ count: 0, total: 0 })),
      get("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type LIKE 'sale%' AND date_trunc('month', created_at) = date_trunc('month', CURRENT_TIMESTAMP) AND (is_deleted = FALSE OR is_deleted IS NULL)").catch(() => ({ count: 0, total: 0 })),
    ]);
    
    res.json({
      success: true,
      data: {
        sales: { count: totalSales?.count || 0, total: totalSales?.total || 0 },
        purchases: { count: totalPurchases?.count || 0, total: totalPurchases?.total || 0 },
        total_customers: totalCustomers,
        total_products: totalProducts,
        today_sales: { count: todaySales?.count || 0, total: todaySales?.total || 0 },
        monthly_sales: { count: monthlySales?.count || 0, total: monthlySales?.total || 0 },
        revenue: totalSales?.total || 0,
        profit_margin: 0,
      }
    });
  } catch (e) {
    res.json({ success: true, data: { sales: { count: 0, total: 0 }, purchases: { count: 0, total: 0 }, total_customers: 0, total_products: 0, today_sales: { count: 0, total: 0 }, monthly_sales: { count: 0, total: 0 }, revenue: 0, profit_margin: 0 } });
  }
});

// Sales report
router.get('/sales', async (req, res) => {
  try {
    const rows = await all("SELECT created_at::date as date, COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type LIKE 'sale%' AND (is_deleted = FALSE OR is_deleted IS NULL) GROUP BY created_at::date ORDER BY date DESC LIMIT 30");
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// Inventory report
router.get('/inventory', async (req, res) => {
  try {
    const rows = await all("SELECT id, name, quantity, min_quantity, cost_price, selling_price, category_id FROM products WHERE (is_deleted = FALSE OR is_deleted IS NULL) ORDER BY quantity ASC LIMIT 50");
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

module.exports = router;
