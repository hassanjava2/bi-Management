const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { all, get, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

router.use(auth);

router.get('/overview', async (req, res) => {
  try {
    const monthSales = await get(
      "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' AND (status IS NULL OR status NOT IN ('cancelled')) AND (created_at::date) >= date_trunc('month', CURRENT_DATE)::date AND (is_deleted = FALSE OR is_deleted IS NULL)",
      []
    ).then((r) => Number(r?.v) || 0);
    const monthPurchases = await get(
      "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'purchase' AND (status IS NULL OR status NOT IN ('cancelled')) AND (created_at::date) >= date_trunc('month', CURRENT_DATE)::date AND (is_deleted = FALSE OR is_deleted IS NULL)",
      []
    ).then((r) => Number(r?.v) || 0);
    const monthExpenses = await get(
      "SELECT COALESCE(SUM(amount), 0) as v FROM vouchers WHERE type = 'expense' AND (created_at::date) >= date_trunc('month', CURRENT_DATE)::date",
      []
    ).then((r) => Number(r?.v) || 0);
    const cashBalance = await get(
      "SELECT COALESCE(SUM(CASE WHEN type IN ('receipt','income') THEN amount ELSE -amount END), 0) as v FROM vouchers",
      []
    ).then((r) => Number(r?.v) || 0);
    res.json({
      success: true,
      data: {
        month_sales: monthSales,
        month_purchases: monthPurchases,
        month_expenses: monthExpenses,
        month_profit: monthSales - monthPurchases - monthExpenses,
        cash_balance: cashBalance,
        cash_sales: monthSales,
        credit_sales: 0,
        installment_sales: 0,
        wholesale_sales: 0,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/vouchers', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM vouchers ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/vouchers', async (req, res) => {
  try {
    const { voucher_number, type, amount, currency, customer_id, supplier_id, notes } = req.body;
    const id = generateId();
    await run(
      `INSERT INTO vouchers (id, voucher_number, type, amount, currency, customer_id, supplier_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, voucher_number || null, type || 'receipt', parseFloat(amount) || 0, currency || 'IQD', customer_id || null, supplier_id || null, notes || null, req.user?.id]
    );
    const row = await get('SELECT * FROM vouchers WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
