/**
 * BI Management - Accounting Routes (Complete)
 * المحاسبة — overview + vouchers + receivables + payables + cash-boxes + expenses + reports
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { all, get, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

router.use(auth);

// ═══════════════════════════════════════════════
// OVERVIEW — الملخص المالي
// ═══════════════════════════════════════════════
router.get('/overview', async (req, res) => {
  try {
    const monthFilter = "AND (created_at::date) >= date_trunc('month', CURRENT_DATE)::date";
    const notDeleted = "AND (is_deleted = 0 OR is_deleted IS NULL)";
    const notCancelled = "AND (status IS NULL OR status NOT IN ('cancelled'))";

    const monthSales = await get(
      `SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' ${notCancelled} ${monthFilter} ${notDeleted}`
    ).then(r => Number(r?.v) || 0);
    const monthPurchases = await get(
      `SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'purchase' ${notCancelled} ${monthFilter} ${notDeleted}`
    ).then(r => Number(r?.v) || 0);
    const monthExpenses = await get(
      `SELECT COALESCE(SUM(amount), 0) as v FROM vouchers WHERE type = 'expense' ${monthFilter}`
    ).then(r => Number(r?.v) || 0);

    const todayFilter = "AND (created_at::date) = CURRENT_DATE";
    const todaySales = await get(
      `SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' ${notCancelled} ${todayFilter} ${notDeleted}`
    ).then(r => Number(r?.v) || 0);
    const todayPurchases = await get(
      `SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'purchase' ${notCancelled} ${todayFilter} ${notDeleted}`
    ).then(r => Number(r?.v) || 0);

    const salesBreakdown = await all(
      `SELECT payment_type, COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' ${notCancelled} ${monthFilter} ${notDeleted} GROUP BY payment_type`
    );
    const salesByType = {};
    for (const row of salesBreakdown) { salesByType[row.payment_type] = Number(row.v) || 0; }

    const cashBalance = await get(
      "SELECT COALESCE(SUM(CASE WHEN type IN ('receipt','income') THEN amount ELSE -amount END), 0) as v FROM vouchers"
    ).then(r => Number(r?.v) || 0);

    let receivables = 0;
    try { const r = await get('SELECT COALESCE(SUM(balance), 0) as v FROM customers WHERE balance > 0 AND (is_deleted = 0 OR is_deleted IS NULL)'); receivables = Number(r?.v) || 0; } catch (_) { }

    let payables = 0;
    try { const p = await get('SELECT COALESCE(SUM(ABS(balance)), 0) as v FROM suppliers WHERE balance < 0 AND (is_deleted = 0 OR is_deleted IS NULL)'); payables = Number(p?.v) || 0; } catch (_) { }

    res.json({
      success: true,
      data: {
        today_sales: todaySales, today_purchases: todayPurchases, today_profit: todaySales - todayPurchases,
        month_sales: monthSales, month_purchases: monthPurchases, month_expenses: monthExpenses,
        month_profit: monthSales - monthPurchases - monthExpenses,
        cash_balance: cashBalance,
        cash_sales: salesByType['cash'] || 0, credit_sales: salesByType['credit'] || 0,
        installment_sales: salesByType['installment'] || 0, wholesale_sales: salesByType['wholesale'] || 0,
        receivables, payables,
      },
    });
  } catch (e) {
    console.error('[Accounting] Overview error:', e.message);
    res.status(500).json({ success: false, error: 'فشل في تحميل البيانات المحاسبية' });
  }
});

// ═══════════════════════════════════════════════
// VOUCHERS — السندات
// ═══════════════════════════════════════════════
router.get('/vouchers', async (req, res) => {
  try {
    const { type, search } = req.query;
    let query = `
      SELECT v.*, u.full_name as created_by_name,
        c.name as customer_name, s.name as supplier_name
      FROM vouchers v
      LEFT JOIN users u ON v.created_by = u.id
      LEFT JOIN customers c ON v.customer_id = c.id
      LEFT JOIN suppliers s ON v.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (type) { query += ` AND v.type = $${params.length + 1}`; params.push(type); }
    if (search) { query += ` AND (v.voucher_number ILIKE $${params.length + 1} OR v.notes ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    query += ' ORDER BY v.created_at DESC LIMIT 200';
    const rows = await all(query, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/vouchers', async (req, res) => {
  try {
    const { voucher_number, type, amount, currency, customer_id, supplier_id, notes, category } = req.body;
    const id = generateId();
    const vNum = voucher_number || `V-${Date.now().toString().slice(-8)}`;
    await run(
      `INSERT INTO vouchers (id, voucher_number, type, amount, currency, customer_id, supplier_id, notes, category, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [id, vNum, type || 'receipt', parseFloat(amount) || 0, currency || 'IQD', customer_id || null, supplier_id || null, notes || null, category || null, req.user?.id]
    );

    // Update customer/supplier balance
    if (customer_id && amount) {
      const delta = type === 'receipt' ? -parseFloat(amount) : parseFloat(amount);
      try { await run('UPDATE customers SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [delta, customer_id]); } catch (_) { }
    }
    if (supplier_id && amount) {
      const delta = type === 'payment' ? parseFloat(amount) : -parseFloat(amount);
      try { await run('UPDATE suppliers SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [delta, supplier_id]); } catch (_) { }
    }

    const row = await get('SELECT * FROM vouchers WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// RECEIVABLES — ذمم العملاء
// ═══════════════════════════════════════════════
router.get('/receivables', async (req, res) => {
  try {
    const rows = await all(`
      SELECT c.id, c.name, c.phone, c.email,
        COALESCE(c.balance, 0) as balance,
        (SELECT COUNT(*) FROM invoices WHERE customer_id = c.id AND payment_type = 'credit' AND status != 'cancelled' AND (is_deleted = 0 OR is_deleted IS NULL))::int as credit_invoices,
        (SELECT MAX(created_at) FROM invoices WHERE customer_id = c.id) as last_invoice_date
      FROM customers c
      WHERE COALESCE(c.balance, 0) > 0 AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
      ORDER BY c.balance DESC
    `);
    const total = rows.reduce((sum, r) => sum + Number(r.balance), 0);
    res.json({ success: true, data: { customers: rows, total } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/receivables/customer/:id', async (req, res) => {
  try {
    const customer = await get('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!customer) return res.status(404).json({ success: false, error: 'العميل غير موجود' });

    const invoices = await all(`
      SELECT id, invoice_number, total, paid, (total - COALESCE(paid, 0)) as remaining, payment_type, status, created_at
      FROM invoices
      WHERE customer_id = $1 AND payment_type = 'credit' AND status != 'cancelled' AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY created_at DESC
    `, [req.params.id]);

    const payments = await all(`
      SELECT id, voucher_number, amount, notes, created_at
      FROM vouchers
      WHERE customer_id = $1 AND type = 'receipt'
      ORDER BY created_at DESC LIMIT 50
    `, [req.params.id]);

    res.json({ success: true, data: { customer, invoices, payments, balance: Number(customer.balance) || 0 } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// PAYABLES — ذمم الموردين
// ═══════════════════════════════════════════════
router.get('/payables', async (req, res) => {
  try {
    const rows = await all(`
      SELECT s.id, s.name, s.phone, s.email,
        COALESCE(ABS(s.balance), 0) as balance,
        (SELECT COUNT(*) FROM invoices WHERE supplier_id = s.id AND type = 'purchase' AND status != 'cancelled' AND (is_deleted = 0 OR is_deleted IS NULL))::int as purchase_invoices,
        (SELECT MAX(created_at) FROM invoices WHERE supplier_id = s.id) as last_invoice_date
      FROM suppliers s
      WHERE s.balance < 0 AND (s.is_deleted = 0 OR s.is_deleted IS NULL)
      ORDER BY ABS(s.balance) DESC
    `);
    const total = rows.reduce((sum, r) => sum + Number(r.balance), 0);
    res.json({ success: true, data: { suppliers: rows, total } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/payables/supplier/:id', async (req, res) => {
  try {
    const supplier = await get('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (!supplier) return res.status(404).json({ success: false, error: 'المورد غير موجود' });

    const invoices = await all(`
      SELECT id, invoice_number, total, paid, (total - COALESCE(paid, 0)) as remaining, status, created_at
      FROM invoices
      WHERE supplier_id = $1 AND type = 'purchase' AND status != 'cancelled' AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY created_at DESC
    `, [req.params.id]);

    const payments = await all(`
      SELECT id, voucher_number, amount, notes, created_at
      FROM vouchers
      WHERE supplier_id = $1 AND type = 'payment'
      ORDER BY created_at DESC LIMIT 50
    `, [req.params.id]);

    res.json({ success: true, data: { supplier, invoices, payments, balance: Math.abs(Number(supplier.balance)) || 0 } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// CASH BOXES — الصناديق النقدية
// ═══════════════════════════════════════════════
router.get('/cash-boxes', async (req, res) => {
  try {
    // Calculate balance from vouchers grouped by currency
    const balances = await all(`
      SELECT
        COALESCE(currency, 'IQD') as currency,
        SUM(CASE WHEN type IN ('receipt', 'income') THEN amount ELSE 0 END) as total_in,
        SUM(CASE WHEN type IN ('payment', 'expense') THEN amount ELSE 0 END) as total_out
      FROM vouchers
      GROUP BY COALESCE(currency, 'IQD')
    `);

    const boxes = balances.map(b => ({
      currency: b.currency,
      balance: (Number(b.total_in) || 0) - (Number(b.total_out) || 0),
      total_in: Number(b.total_in) || 0,
      total_out: Number(b.total_out) || 0,
    }));

    // If no data, return default
    if (boxes.length === 0) {
      boxes.push({ currency: 'IQD', balance: 0, total_in: 0, total_out: 0 });
    }

    res.json({ success: true, data: boxes });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/cash-boxes/:id', async (req, res) => {
  try {
    const currency = req.params.id;
    const balance = await get(`
      SELECT
        SUM(CASE WHEN type IN ('receipt', 'income') THEN amount ELSE -amount END) as balance
      FROM vouchers
      WHERE COALESCE(currency, 'IQD') = $1
    `, [currency]);

    const recentTx = await all(`
      SELECT * FROM vouchers
      WHERE COALESCE(currency, 'IQD') = $1
      ORDER BY created_at DESC LIMIT 20
    `, [currency]);

    res.json({ success: true, data: { currency, balance: Number(balance?.balance) || 0, recent_transactions: recentTx } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/cash-boxes/transfer', async (req, res) => {
  try {
    const { from_currency, to_currency, amount, rate, notes } = req.body;
    const fromAmount = parseFloat(amount) || 0;
    const toAmount = fromAmount * (parseFloat(rate) || 1);

    // Create withdrawal voucher
    const outId = generateId();
    await run(
      `INSERT INTO vouchers (id, voucher_number, type, amount, currency, notes, created_by, created_at) VALUES ($1, $2, 'transfer_out', $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [outId, `TRF-OUT-${Date.now().toString().slice(-6)}`, fromAmount, from_currency || 'IQD', notes || `تحويل إلى ${to_currency}`, req.user?.id]
    );

    // Create deposit voucher
    const inId = generateId();
    await run(
      `INSERT INTO vouchers (id, voucher_number, type, amount, currency, notes, created_by, created_at) VALUES ($1, $2, 'transfer_in', $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [inId, `TRF-IN-${Date.now().toString().slice(-6)}`, toAmount, to_currency || 'USD', notes || `تحويل من ${from_currency}`, req.user?.id]
    );

    res.json({ success: true, message: 'تم التحويل بنجاح', data: { from: fromAmount, to: toAmount, rate } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// EXPENSES — المصاريف
// ═══════════════════════════════════════════════
router.get('/expenses', async (req, res) => {
  try {
    const { category, from_date, to_date } = req.query;
    let query = `
      SELECT v.*, u.full_name as created_by_name
      FROM vouchers v
      LEFT JOIN users u ON v.created_by = u.id
      WHERE v.type = 'expense'
    `;
    const params = [];
    if (category) { query += ` AND v.category = $${params.length + 1}`; params.push(category); }
    if (from_date) { query += ` AND v.created_at >= $${params.length + 1}`; params.push(from_date); }
    if (to_date) { query += ` AND v.created_at <= $${params.length + 1}`; params.push(to_date); }
    query += ' ORDER BY v.created_at DESC LIMIT 200';
    const rows = await all(query, params);

    const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    res.json({ success: true, data: { expenses: rows, total } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const { amount, category, notes, currency } = req.body;
    const id = generateId();
    await run(
      `INSERT INTO vouchers (id, voucher_number, type, amount, currency, category, notes, created_by, created_at) VALUES ($1, $2, 'expense', $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [id, `EXP-${Date.now().toString().slice(-8)}`, parseFloat(amount) || 0, currency || 'IQD', category || 'general', notes || null, req.user?.id]
    );
    const row = await get('SELECT * FROM vouchers WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// REPORTS — التقارير المالية
// ═══════════════════════════════════════════════

// Profit & Loss
router.get('/reports/profit-loss', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const from = from_date || new Date(new Date().setDate(1)).toISOString().slice(0, 10);
    const to = to_date || new Date().toISOString().slice(0, 10);
    const notDeleted = "AND (is_deleted = 0 OR is_deleted IS NULL)";
    const notCancelled = "AND (status IS NULL OR status NOT IN ('cancelled'))";

    const sales = await get(`SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' AND created_at::date BETWEEN $1 AND $2 ${notCancelled} ${notDeleted}`, [from, to]).then(r => Number(r?.v) || 0);
    const purchases = await get(`SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'purchase' AND created_at::date BETWEEN $1 AND $2 ${notCancelled} ${notDeleted}`, [from, to]).then(r => Number(r?.v) || 0);
    const expenses = await get(`SELECT COALESCE(SUM(amount), 0) as v FROM vouchers WHERE type = 'expense' AND created_at::date BETWEEN $1 AND $2`, [from, to]).then(r => Number(r?.v) || 0);
    const returns = await get(`SELECT COALESCE(COUNT(*), 0) as c, COALESCE(SUM(total_amount), 0) as v FROM returns WHERE created_at::date BETWEEN $1 AND $2 AND (is_deleted = 0 OR is_deleted IS NULL)`, [from, to]).catch(() => ({ c: 0, v: 0 }));

    const grossProfit = sales - purchases;
    const netProfit = grossProfit - expenses;

    res.json({
      success: true,
      data: {
        period: { from, to },
        revenue: { sales, returns_count: Number(returns?.c) || 0, returns_value: Number(returns?.v) || 0 },
        costs: { purchases, expenses },
        profit: { gross: grossProfit, net: netProfit, margin: sales > 0 ? ((netProfit / sales) * 100).toFixed(1) : 0 },
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Cash Flow
router.get('/reports/cash-flow', async (req, res) => {
  try {
    const { period } = req.query; // 'daily', 'weekly', 'monthly'
    const days = period === 'monthly' ? 90 : period === 'weekly' ? 28 : 7;

    const cashFlow = await all(`
      SELECT
        d::date as date,
        COALESCE((SELECT SUM(total) FROM invoices WHERE type = 'sale' AND created_at::date = d::date AND status != 'cancelled' AND (is_deleted = 0 OR is_deleted IS NULL)), 0) as sales,
        COALESCE((SELECT SUM(total) FROM invoices WHERE type = 'purchase' AND created_at::date = d::date AND status != 'cancelled' AND (is_deleted = 0 OR is_deleted IS NULL)), 0) as purchases,
        COALESCE((SELECT SUM(amount) FROM vouchers WHERE type = 'receipt' AND created_at::date = d::date), 0) as receipts,
        COALESCE((SELECT SUM(amount) FROM vouchers WHERE type IN ('payment', 'expense') AND created_at::date = d::date), 0) as payments
      FROM generate_series(CURRENT_DATE - ${days}, CURRENT_DATE, '1 day') d
      ORDER BY d
    `);

    res.json({ success: true, data: cashFlow });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Debt Report
router.get('/reports/debts', async (req, res) => {
  try {
    let receivables = [], payables = [];
    try {
      receivables = await all(`
        SELECT id, name, phone, COALESCE(balance, 0) as balance
        FROM customers WHERE balance > 0 AND (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY balance DESC LIMIT 50
      `);
    } catch (_) { }
    try {
      payables = await all(`
        SELECT id, name, phone, ABS(COALESCE(balance, 0)) as balance
        FROM suppliers WHERE balance < 0 AND (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY ABS(balance) DESC LIMIT 50
      `);
    } catch (_) { }

    res.json({
      success: true,
      data: {
        receivables: { items: receivables, total: receivables.reduce((s, r) => s + Number(r.balance), 0) },
        payables: { items: payables, total: payables.reduce((s, r) => s + Number(r.balance), 0) },
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// ACCOUNT STATEMENT — كشف حساب
// ═══════════════════════════════════════════════
router.get('/statement/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { from_date, to_date } = req.query;
    let entity = null;
    let transactions = [];

    if (entityType === 'customer') {
      entity = await get('SELECT id, name, phone, balance FROM customers WHERE id = $1', [entityId]);
      if (!entity) return res.status(404).json({ success: false, error: 'العميل غير موجود' });

      // Get invoices + payments interleaved
      const invoices = await all(`
        SELECT 'invoice' as tx_type, id, invoice_number as reference, total as amount, 'debit' as direction, created_at
        FROM invoices WHERE customer_id = $1 AND type = 'sale' AND status != 'cancelled' AND (is_deleted = 0 OR is_deleted IS NULL)
        ${from_date ? 'AND created_at::date >= $2' : ''} ${to_date ? `AND created_at::date <= $${from_date ? 3 : 2}` : ''}
        ORDER BY created_at
      `, [entityId, ...(from_date ? [from_date] : []), ...(to_date ? [to_date] : [])]);

      const payments = await all(`
        SELECT 'payment' as tx_type, id, voucher_number as reference, amount, 'credit' as direction, created_at
        FROM vouchers WHERE customer_id = $1 AND type = 'receipt'
        ${from_date ? 'AND created_at::date >= $2' : ''} ${to_date ? `AND created_at::date <= $${from_date ? 3 : 2}` : ''}
        ORDER BY created_at
      `, [entityId, ...(from_date ? [from_date] : []), ...(to_date ? [to_date] : [])]);

      transactions = [...invoices, ...payments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      // Calculate running balance
      let runningBalance = 0;
      transactions = transactions.map(tx => {
        runningBalance += tx.direction === 'debit' ? Number(tx.amount) : -Number(tx.amount);
        return { ...tx, running_balance: runningBalance };
      });

    } else if (entityType === 'supplier') {
      entity = await get('SELECT id, name, phone, balance FROM suppliers WHERE id = $1', [entityId]);
      if (!entity) return res.status(404).json({ success: false, error: 'المورد غير موجود' });

      const invoices = await all(`
        SELECT 'invoice' as tx_type, id, invoice_number as reference, total as amount, 'debit' as direction, created_at
        FROM invoices WHERE supplier_id = $1 AND type = 'purchase' AND status != 'cancelled' AND (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY created_at
      `, [entityId]);

      const payments = await all(`
        SELECT 'payment' as tx_type, id, voucher_number as reference, amount, 'credit' as direction, created_at
        FROM vouchers WHERE supplier_id = $1 AND type = 'payment'
        ORDER BY created_at
      `, [entityId]);

      transactions = [...invoices, ...payments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      let runningBalance = 0;
      transactions = transactions.map(tx => {
        runningBalance += tx.direction === 'debit' ? Number(tx.amount) : -Number(tx.amount);
        return { ...tx, running_balance: runningBalance };
      });
    }

    res.json({ success: true, data: { entity, transactions } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// DAILY RECONCILIATION — المطابقة اليومية
// ═══════════════════════════════════════════════
router.get('/reconciliation', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const notDeleted = "AND (is_deleted = 0 OR is_deleted IS NULL)";

    const sales = await all(`
      SELECT id, invoice_number, total, payment_type, customer_id, created_at
      FROM invoices WHERE type = 'sale' AND created_at::date = $1 AND status != 'cancelled' ${notDeleted}
      ORDER BY created_at
    `, [date]);

    const purchases = await all(`
      SELECT id, invoice_number, total, supplier_id, created_at
      FROM invoices WHERE type = 'purchase' AND created_at::date = $1 AND status != 'cancelled' ${notDeleted}
      ORDER BY created_at
    `, [date]);

    const vouchers = await all(`
      SELECT id, voucher_number, type, amount, currency, notes, created_at
      FROM vouchers WHERE created_at::date = $1
      ORDER BY created_at
    `, [date]);

    const totalSales = sales.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const cashSales = sales.filter(s => s.payment_type === 'cash').reduce((s, r) => s + (Number(r.total) || 0), 0);
    const creditSales = totalSales - cashSales;
    const totalPurchases = purchases.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const totalReceipts = vouchers.filter(v => v.type === 'receipt').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalPayments = vouchers.filter(v => ['payment', 'expense'].includes(v.type)).reduce((s, r) => s + (Number(r.amount) || 0), 0);

    res.json({
      success: true,
      data: {
        date,
        summary: {
          total_sales: totalSales, cash_sales: cashSales, credit_sales: creditSales,
          total_purchases: totalPurchases,
          total_receipts: totalReceipts, total_payments: totalPayments,
          net_cash: cashSales + totalReceipts - totalPurchases - totalPayments,
        },
        details: { sales, purchases, vouchers },
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
