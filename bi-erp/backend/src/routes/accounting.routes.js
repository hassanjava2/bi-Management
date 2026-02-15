const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { all, get, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

router.use(auth);

router.get('/overview', async (req, res) => {
  try {
    const monthFilter = "AND (created_at::date) >= date_trunc('month', CURRENT_DATE)::date";
    const notDeleted = "AND (is_deleted = FALSE OR is_deleted IS NULL)";
    const notCancelled = "AND (status IS NULL OR status NOT IN ('cancelled'))";

    // Monthly totals
    const monthSales = await get(
      `SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' ${notCancelled} ${monthFilter} ${notDeleted}`,
      []
    ).then((r) => Number(r?.v) || 0);
    const monthPurchases = await get(
      `SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'purchase' ${notCancelled} ${monthFilter} ${notDeleted}`,
      []
    ).then((r) => Number(r?.v) || 0);
    const monthExpenses = await get(
      `SELECT COALESCE(SUM(amount), 0) as v FROM vouchers WHERE type = 'expense' ${monthFilter}`,
      []
    ).then((r) => Number(r?.v) || 0);

    // Today's totals
    const todayFilter = "AND (created_at::date) = CURRENT_DATE";
    const todaySales = await get(
      `SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' ${notCancelled} ${todayFilter} ${notDeleted}`,
      []
    ).then((r) => Number(r?.v) || 0);
    const todayPurchases = await get(
      `SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'purchase' ${notCancelled} ${todayFilter} ${notDeleted}`,
      []
    ).then((r) => Number(r?.v) || 0);

    // Sales breakdown by payment type (this month)
    const salesBreakdown = await all(
      `SELECT payment_type, COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' ${notCancelled} ${monthFilter} ${notDeleted} GROUP BY payment_type`,
      []
    );
    const salesByType = {};
    for (const row of salesBreakdown) {
      salesByType[row.payment_type] = Number(row.v) || 0;
    }

    // Cash balance
    const cashBalance = await get(
      "SELECT COALESCE(SUM(CASE WHEN type IN ('receipt','income') THEN amount ELSE -amount END), 0) as v FROM vouchers",
      []
    ).then((r) => Number(r?.v) || 0);

    // Receivables (customer debts)
    let receivables = 0;
    try {
      const r = await get('SELECT COALESCE(SUM(balance), 0) as v FROM customers WHERE balance > 0 AND (is_deleted = FALSE OR is_deleted IS NULL)');
      receivables = Number(r?.v) || 0;
    } catch (_) { /* table may not exist */ }

    // Payables (supplier debts)
    let payables = 0;
    try {
      const p = await get('SELECT COALESCE(SUM(ABS(balance)), 0) as v FROM suppliers WHERE balance < 0 AND (is_deleted = FALSE OR is_deleted IS NULL)');
      payables = Number(p?.v) || 0;
    } catch (_) { /* table may not exist */ }

    res.json({
      success: true,
      data: {
        today_sales: todaySales,
        today_purchases: todayPurchases,
        today_profit: todaySales - todayPurchases,
        month_sales: monthSales,
        month_purchases: monthPurchases,
        month_expenses: monthExpenses,
        month_profit: monthSales - monthPurchases - monthExpenses,
        cash_balance: cashBalance,
        cash_sales: salesByType['cash'] || 0,
        credit_sales: salesByType['credit'] || 0,
        installment_sales: salesByType['installment'] || 0,
        wholesale_sales: salesByType['wholesale'] || 0,
        receivables,
        payables,
      },
    });
  } catch (e) {
    console.error('[Accounting] Overview error:', e.message);
    res.status(500).json({ success: false, error: 'فشل في تحميل البيانات المحاسبية', details: e.message });
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
