/**
 * BI ERP — Accounting Service
 * All accounting business logic extracted from routes
 */
const { get, all, run } = require('../config/database');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

const ND = 'AND (is_deleted = 0 OR is_deleted IS NULL)';
const NC = "AND (status IS NULL OR status NOT IN ('cancelled'))";

// ─── OVERVIEW ──────────────────────────────────
async function getOverview() {
    const mf = "AND (created_at::date) >= date_trunc('month', CURRENT_DATE)::date";
    const tf = "AND (created_at::date) = CURRENT_DATE";

    const [monthSales, monthPurchases, monthExpenses, todaySales, todayPurchases] = await Promise.all([
        get(`SELECT COALESCE(SUM(total),0) as v FROM invoices WHERE type='sale' ${NC} ${mf} ${ND}`).then(r => Number(r?.v) || 0),
        get(`SELECT COALESCE(SUM(total),0) as v FROM invoices WHERE type='purchase' ${NC} ${mf} ${ND}`).then(r => Number(r?.v) || 0),
        get(`SELECT COALESCE(SUM(amount),0) as v FROM vouchers WHERE type='expense' ${mf}`).then(r => Number(r?.v) || 0),
        get(`SELECT COALESCE(SUM(total),0) as v FROM invoices WHERE type='sale' ${NC} ${tf} ${ND}`).then(r => Number(r?.v) || 0),
        get(`SELECT COALESCE(SUM(total),0) as v FROM invoices WHERE type='purchase' ${NC} ${tf} ${ND}`).then(r => Number(r?.v) || 0),
    ]);

    const salesBreakdown = await all(
        `SELECT payment_type, COALESCE(SUM(total),0) as v FROM invoices WHERE type='sale' ${NC} ${mf} ${ND} GROUP BY payment_type`
    );
    const salesByType = {};
    for (const row of salesBreakdown) salesByType[row.payment_type] = Number(row.v) || 0;

    const cashBalance = await get(
        "SELECT COALESCE(SUM(CASE WHEN type IN ('receipt','income') THEN amount ELSE -amount END),0) as v FROM vouchers"
    ).then(r => Number(r?.v) || 0);

    let receivables = 0, payables = 0;
    try { receivables = await get(`SELECT COALESCE(SUM(balance),0) as v FROM customers WHERE balance > 0 ${ND}`).then(r => Number(r?.v) || 0); } catch (_) { }
    try { payables = await get(`SELECT COALESCE(SUM(ABS(balance)),0) as v FROM suppliers WHERE balance < 0 ${ND}`).then(r => Number(r?.v) || 0); } catch (_) { }

    return {
        today_sales: todaySales, today_purchases: todayPurchases, today_profit: todaySales - todayPurchases,
        month_sales: monthSales, month_purchases: monthPurchases, month_expenses: monthExpenses,
        month_profit: monthSales - monthPurchases - monthExpenses, cash_balance: cashBalance,
        cash_sales: salesByType['cash'] || 0, credit_sales: salesByType['credit'] || 0,
        installment_sales: salesByType['installment'] || 0, wholesale_sales: salesByType['wholesale'] || 0,
        receivables, payables,
    };
}

// ─── VOUCHERS ──────────────────────────────────
const voucherSvc = require('./voucher.service');
async function listVouchers(filters = {}) {
    return voucherSvc.list(filters);
}

async function createVoucher(data, userId) {
    return voucherSvc.create({ ...data, created_by: userId }, userId);
}

// ─── RECEIVABLES ───────────────────────────────
async function getReceivables() {
    const rows = await all(`SELECT c.id,c.name,c.phone,c.email,COALESCE(c.balance,0) as balance,
    (SELECT COUNT(*) FROM invoices WHERE customer_id=c.id AND payment_type='credit' AND status!='cancelled' ${ND})::int as credit_invoices,
    (SELECT MAX(created_at) FROM invoices WHERE customer_id=c.id) as last_invoice_date
    FROM customers c WHERE COALESCE(c.balance,0)>0 ${ND} ORDER BY c.balance DESC`);
    return { customers: rows, total: rows.reduce((s, r) => s + Number(r.balance), 0) };
}

async function getReceivableCustomer(id) {
    const customer = await get('SELECT * FROM customers WHERE id=$1', [id]);
    if (!customer) return null;
    const invoices = await all(`SELECT id,invoice_number,total,paid,(total-COALESCE(paid,0)) as remaining,payment_type,status,created_at
    FROM invoices WHERE customer_id=$1 AND payment_type='credit' AND status!='cancelled' ${ND} ORDER BY created_at DESC`, [id]);
    const payments = await all(`SELECT id,voucher_number,amount,notes,created_at FROM vouchers WHERE customer_id=$1 AND type='receipt' ORDER BY created_at DESC LIMIT 50`, [id]);
    return { customer, invoices, payments, balance: Number(customer.balance) || 0 };
}

// ─── PAYABLES ──────────────────────────────────
async function getPayables() {
    const rows = await all(`SELECT s.id,s.name,s.phone,s.email,COALESCE(ABS(s.balance),0) as balance,
    (SELECT COUNT(*) FROM invoices WHERE supplier_id=s.id AND type='purchase' AND status!='cancelled' ${ND})::int as purchase_invoices,
    (SELECT MAX(created_at) FROM invoices WHERE supplier_id=s.id) as last_invoice_date
    FROM suppliers s WHERE s.balance<0 ${ND} ORDER BY ABS(s.balance) DESC`);
    return { suppliers: rows, total: rows.reduce((s, r) => s + Number(r.balance), 0) };
}

async function getPayableSupplier(id) {
    const supplier = await get('SELECT * FROM suppliers WHERE id=$1', [id]);
    if (!supplier) return null;
    const invoices = await all(`SELECT id,invoice_number,total,paid,(total-COALESCE(paid,0)) as remaining,status,created_at
    FROM invoices WHERE supplier_id=$1 AND type='purchase' AND status!='cancelled' ${ND} ORDER BY created_at DESC`, [id]);
    const payments = await all(`SELECT id,voucher_number,amount,notes,created_at FROM vouchers WHERE supplier_id=$1 AND type='payment' ORDER BY created_at DESC LIMIT 50`, [id]);
    return { supplier, invoices, payments, balance: Math.abs(Number(supplier.balance)) || 0 };
}

// ─── CASH BOXES ────────────────────────────────
async function getCashBoxes() {
    const balances = await all(`SELECT COALESCE(currency,'IQD') as currency,
    SUM(CASE WHEN type IN ('receipt','income') THEN amount ELSE 0 END) as total_in,
    SUM(CASE WHEN type IN ('payment','expense') THEN amount ELSE 0 END) as total_out
    FROM vouchers GROUP BY COALESCE(currency,'IQD')`);
    const boxes = balances.map(b => ({
        currency: b.currency,
        balance: (Number(b.total_in) || 0) - (Number(b.total_out) || 0),
        total_in: Number(b.total_in) || 0, total_out: Number(b.total_out) || 0,
    }));
    if (!boxes.length) boxes.push({ currency: 'IQD', balance: 0, total_in: 0, total_out: 0 });
    return boxes;
}

async function getCashBox(currency) {
    const balance = await get(`SELECT SUM(CASE WHEN type IN ('receipt','income') THEN amount ELSE -amount END) as balance FROM vouchers WHERE COALESCE(currency,'IQD')=$1`, [currency]);
    const recentTx = await all(`SELECT * FROM vouchers WHERE COALESCE(currency,'IQD')=$1 ORDER BY created_at DESC LIMIT 20`, [currency]);
    return { currency, balance: Number(balance?.balance) || 0, recent_transactions: recentTx };
}

async function transferCash(data, userId) {
    const { from_currency, to_currency, amount, rate, notes } = data;
    const fromAmount = parseFloat(amount) || 0;
    const toAmount = fromAmount * (parseFloat(rate) || 1);
    const outId = generateId();
    await run(`INSERT INTO vouchers (id,voucher_number,type,amount,currency,notes,created_by,created_at) VALUES ($1,$2,'transfer_out',$3,$4,$5,$6,CURRENT_TIMESTAMP)`,
        [outId, `TRF-OUT-${Date.now().toString().slice(-6)}`, fromAmount, from_currency || 'IQD', notes || `تحويل إلى ${to_currency}`, userId]);
    const inId = generateId();
    await run(`INSERT INTO vouchers (id,voucher_number,type,amount,currency,notes,created_by,created_at) VALUES ($1,$2,'transfer_in',$3,$4,$5,$6,CURRENT_TIMESTAMP)`,
        [inId, `TRF-IN-${Date.now().toString().slice(-6)}`, toAmount, to_currency || 'USD', notes || `تحويل من ${from_currency}`, userId]);
    return { from: fromAmount, to: toAmount, rate };
}

// ─── EXPENSES ──────────────────────────────────
async function listExpenses({ category, from_date, to_date } = {}) {
    let query = `SELECT v.*, u.full_name as created_by_name FROM vouchers v LEFT JOIN users u ON v.created_by=u.id WHERE v.type='expense'`;
    const params = [];
    if (category) { query += ` AND v.category=$${params.length + 1}`; params.push(category); }
    if (from_date) { query += ` AND v.created_at>=$${params.length + 1}`; params.push(from_date); }
    if (to_date) { query += ` AND v.created_at<=$${params.length + 1}`; params.push(to_date); }
    query += ' ORDER BY v.created_at DESC LIMIT 200';
    const rows = await all(query, params);
    return { expenses: rows, total: rows.reduce((s, r) => s + (Number(r.amount) || 0), 0) };
}

async function createExpense(data, userId) {
    const { amount, category, notes, currency } = data;
    const id = generateId();
    await run(`INSERT INTO vouchers (id,voucher_number,type,amount,currency,category,notes,created_by,created_at) VALUES ($1,$2,'expense',$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)`,
        [id, `EXP-${Date.now().toString().slice(-8)}`, parseFloat(amount) || 0, currency || 'IQD', category || 'general', notes || null, userId]);
    return get('SELECT * FROM vouchers WHERE id=$1', [id]);
}

// ─── REPORTS ───────────────────────────────────
async function profitLoss({ from_date, to_date } = {}) {
    const from = from_date || new Date(new Date().setDate(1)).toISOString().slice(0, 10);
    const to = to_date || new Date().toISOString().slice(0, 10);
    const [sales, purchases, expenses, returns] = await Promise.all([
        get(`SELECT COALESCE(SUM(total),0) as v FROM invoices WHERE type='sale' AND created_at::date BETWEEN $1 AND $2 ${NC} ${ND}`, [from, to]).then(r => Number(r?.v) || 0),
        get(`SELECT COALESCE(SUM(total),0) as v FROM invoices WHERE type='purchase' AND created_at::date BETWEEN $1 AND $2 ${NC} ${ND}`, [from, to]).then(r => Number(r?.v) || 0),
        get(`SELECT COALESCE(SUM(amount),0) as v FROM vouchers WHERE type='expense' AND created_at::date BETWEEN $1 AND $2`, [from, to]).then(r => Number(r?.v) || 0),
        get(`SELECT COALESCE(COUNT(*),0) as c, COALESCE(SUM(total_amount),0) as v FROM returns WHERE created_at::date BETWEEN $1 AND $2 ${ND}`, [from, to]).catch(() => ({ c: 0, v: 0 })),
    ]);
    const grossProfit = sales - purchases;
    const netProfit = grossProfit - expenses;
    return {
        period: { from, to },
        revenue: { sales, returns_count: Number(returns?.c) || 0, returns_value: Number(returns?.v) || 0 },
        costs: { purchases, expenses },
        profit: { gross: grossProfit, net: netProfit, margin: sales > 0 ? ((netProfit / sales) * 100).toFixed(1) : 0 },
    };
}

async function cashFlow({ period } = {}) {
    const days = period === 'monthly' ? 90 : period === 'weekly' ? 28 : 7;
    return all(`SELECT d::date as date,
    COALESCE((SELECT SUM(total) FROM invoices WHERE type='sale' AND created_at::date=d::date AND status!='cancelled' ${ND}),0) as sales,
    COALESCE((SELECT SUM(total) FROM invoices WHERE type='purchase' AND created_at::date=d::date AND status!='cancelled' ${ND}),0) as purchases,
    COALESCE((SELECT SUM(amount) FROM vouchers WHERE type='receipt' AND created_at::date=d::date),0) as receipts,
    COALESCE((SELECT SUM(amount) FROM vouchers WHERE type IN ('payment','expense') AND created_at::date=d::date),0) as payments
    FROM generate_series(CURRENT_DATE - ${days}, CURRENT_DATE, '1 day') d ORDER BY d`);
}

async function debtsReport() {
    let receivables = [], payables = [];
    try { receivables = await all(`SELECT id,name,phone,COALESCE(balance,0) as balance FROM customers WHERE balance>0 ${ND} ORDER BY balance DESC LIMIT 50`); } catch (_) { }
    try { payables = await all(`SELECT id,name,phone,ABS(COALESCE(balance,0)) as balance FROM suppliers WHERE balance<0 ${ND} ORDER BY ABS(balance) DESC LIMIT 50`); } catch (_) { }
    return {
        receivables: { items: receivables, total: receivables.reduce((s, r) => s + Number(r.balance), 0) },
        payables: { items: payables, total: payables.reduce((s, r) => s + Number(r.balance), 0) },
    };
}

// ─── ACCOUNT STATEMENT ─────────────────────────
async function getStatement(entityType, entityId, { from_date, to_date } = {}) {
    let entity = null, transactions = [];

    if (entityType === 'customer') {
        entity = await get('SELECT id,name,phone,balance FROM customers WHERE id=$1', [entityId]);
        if (!entity) return null;
        const invoices = await all(`SELECT 'invoice' as tx_type, id, invoice_number as reference, total as amount, 'debit' as direction, created_at
      FROM invoices WHERE customer_id=$1 AND type='sale' AND status!='cancelled' ${ND}
      ${from_date ? 'AND created_at::date>=$2' : ''} ${to_date ? `AND created_at::date<=$${from_date ? 3 : 2}` : ''}
      ORDER BY created_at`, [entityId, ...(from_date ? [from_date] : []), ...(to_date ? [to_date] : [])]);
        const payments = await all(`SELECT 'payment' as tx_type, id, voucher_number as reference, amount, 'credit' as direction, created_at
      FROM vouchers WHERE customer_id=$1 AND type='receipt'
      ${from_date ? 'AND created_at::date>=$2' : ''} ${to_date ? `AND created_at::date<=$${from_date ? 3 : 2}` : ''}
      ORDER BY created_at`, [entityId, ...(from_date ? [from_date] : []), ...(to_date ? [to_date] : [])]);
        transactions = [...invoices, ...payments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        let rb = 0;
        transactions = transactions.map(tx => { rb += tx.direction === 'debit' ? Number(tx.amount) : -Number(tx.amount); return { ...tx, running_balance: rb }; });

    } else if (entityType === 'supplier') {
        entity = await get('SELECT id,name,phone,balance FROM suppliers WHERE id=$1', [entityId]);
        if (!entity) return null;
        const invoices = await all(`SELECT 'invoice' as tx_type, id, invoice_number as reference, total as amount, 'debit' as direction, created_at
      FROM invoices WHERE supplier_id=$1 AND type='purchase' AND status!='cancelled' ${ND} ORDER BY created_at`, [entityId]);
        const payments = await all(`SELECT 'payment' as tx_type, id, voucher_number as reference, amount, 'credit' as direction, created_at
      FROM vouchers WHERE supplier_id=$1 AND type='payment' ORDER BY created_at`, [entityId]);
        transactions = [...invoices, ...payments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        let rb = 0;
        transactions = transactions.map(tx => { rb += tx.direction === 'debit' ? Number(tx.amount) : -Number(tx.amount); return { ...tx, running_balance: rb }; });
    }

    return { entity, transactions };
}

// ─── DAILY RECONCILIATION ──────────────────────
async function getReconciliation(date) {
    date = date || new Date().toISOString().slice(0, 10);
    const [sales, purchases, vouchers] = await Promise.all([
        all(`SELECT id,invoice_number,total,payment_type,customer_id,created_at FROM invoices WHERE type='sale' AND created_at::date=$1 AND status!='cancelled' ${ND} ORDER BY created_at`, [date]),
        all(`SELECT id,invoice_number,total,supplier_id,created_at FROM invoices WHERE type='purchase' AND created_at::date=$1 AND status!='cancelled' ${ND} ORDER BY created_at`, [date]),
        all(`SELECT id,voucher_number,type,amount,currency,notes,created_at FROM vouchers WHERE created_at::date=$1 ORDER BY created_at`, [date]),
    ]);
    const totalSales = sales.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const cashSales = sales.filter(s => s.payment_type === 'cash').reduce((s, r) => s + (Number(r.total) || 0), 0);
    const creditSales = totalSales - cashSales;
    const totalPurchases = purchases.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const totalReceipts = vouchers.filter(v => v.type === 'receipt').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalPayments = vouchers.filter(v => ['payment', 'expense'].includes(v.type)).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return {
        date,
        summary: { total_sales: totalSales, cash_sales: cashSales, credit_sales: creditSales, total_purchases: totalPurchases, total_receipts: totalReceipts, total_payments: totalPayments, net_cash: cashSales + totalReceipts - totalPurchases - totalPayments },
        details: { sales, purchases, vouchers },
    };
}

module.exports = {
    getOverview, listVouchers, createVoucher,
    getReceivables, getReceivableCustomer, getPayables, getPayableSupplier,
    getCashBoxes, getCashBox, transferCash,
    listExpenses, createExpense,
    profitLoss, cashFlow, debtsReport,
    getStatement, getReconciliation,
};
