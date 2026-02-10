/**
 * BI Management - Accounting Service
 * المحاسبة من قاعدة البيانات
 */
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

async function hasTable(name) {
  try {
    await get(`SELECT 1 FROM ${name} LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function getOverview() {
  let today_sales = 0, today_purchases = 0, month_sales = 0, month_purchases = 0;
  let receivables = 0, payables = 0, cash_balance = 0;
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  if (hasTable('invoices')) {
    const todayRow = await get(`SELECT COALESCE(SUM(CASE WHEN type LIKE 'sale%' THEN total ELSE 0 END), 0) as sales, COALESCE(SUM(CASE WHEN type LIKE 'purchase%' THEN total ELSE 0 END), 0) as purchases FROM invoices WHERE date(created_at) = ? AND (is_deleted = 0 OR is_deleted IS NULL)`, [today]);
    today_sales = parseFloat(todayRow?.sales) || 0;
    today_purchases = parseFloat(todayRow?.purchases) || 0;
    const monthRow = await get(`SELECT COALESCE(SUM(CASE WHEN type LIKE 'sale%' THEN total ELSE 0 END), 0) as sales, COALESCE(SUM(CASE WHEN type LIKE 'purchase%' THEN total ELSE 0 END), 0) as purchases FROM invoices WHERE date(created_at) >= ? AND (is_deleted = 0 OR is_deleted IS NULL)`, [monthStart]);
    month_sales = parseFloat(monthRow?.sales) || 0;
    month_purchases = parseFloat(monthRow?.purchases) || 0;
  }
  if (hasTable('customers')) {
    const r = await get('SELECT COALESCE(SUM(balance), 0) as total FROM customers WHERE balance > 0 AND (is_deleted = 0 OR is_deleted IS NULL)');
    receivables = parseFloat(r?.total) || 0;
  }
  if (hasTable('suppliers')) {
    const p = await get('SELECT COALESCE(SUM(ABS(balance)), 0) as total FROM suppliers WHERE balance < 0 AND (is_deleted = 0 OR is_deleted IS NULL)');
    payables = parseFloat(p?.total) || 0;
  }
  if (hasTable('cash_registers')) {
    const c = await get('SELECT COALESCE(SUM(balance), 0) as total FROM cash_registers WHERE is_active = 1');
    cash_balance = parseFloat(c?.total) || 0;
  }

  return {
    today_sales,
    today_purchases,
    today_expenses: 0,
    today_profit: today_sales - today_purchases,
    month_sales,
    month_purchases,
    month_expenses: 0,
    month_profit: month_sales - month_purchases,
    cash_sales: month_sales,
    credit_sales: 0,
    installment_sales: 0,
    wholesale_sales: 0,
    cogs: month_purchases,
    operating_expenses: 0,
    receivables,
    payables,
    cash_balance,
    pending_installment_transfers: 0,
  };
}

async function getReceivables() {
  if (!hasTable('customers')) return { items: [], total: 0, aging: {} };
  const items = await all('SELECT id as customer_id, name as customer_name, balance, last_purchase_at as last_payment FROM customers WHERE balance > 0 AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY balance DESC');
  const total = items.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
  return { items, total, aging: { current: total, '30_days': 0, '60_days': 0, '90_days': 0, over_90: 0 } };
}

async function getReceivableByCustomer(id) {
  if (!hasTable('customers')) return null;
  const c = await get('SELECT * FROM customers WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)', [id]);
  if (!c) return null;
  const balance = parseFloat(c.balance) || 0;
  const transactions = [];
  if (hasTable('vouchers')) {
    const v = await all('SELECT voucher_number as reference, amount, created_at as date, type FROM vouchers WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20', [id]);
    v.forEach((row) => transactions.push({ date: row.date, type: row.type === 'receipt' ? 'payment' : 'invoice', amount: row.type === 'receipt' ? -parseFloat(row.amount) : parseFloat(row.amount), balance, reference: row.reference }));
  }
  return { customer_id: c.id, customer_name: c.name, balance, credit_limit: parseFloat(c.credit_limit) || 0, transactions };
}

async function getPayables() {
  if (!hasTable('suppliers')) return { items: [], total: 0, due_this_week: 0, overdue: 0 };
  const items = await all('SELECT id as supplier_id, name as supplier_name, balance, updated_at as last_payment FROM suppliers WHERE balance < 0 AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY balance ASC');
  const total = items.reduce((s, r) => s + Math.abs(parseFloat(r.balance || 0)), 0);
  return { items, total, due_this_week: total, overdue: 0 };
}

async function getCashBoxes() {
  if (!hasTable('cash_registers')) return [];
  return await all('SELECT id, name, balance, responsible_user_id as employee_id FROM cash_registers WHERE is_active = 1');
}

async function transferCash(fromBox, toBox, amount, description, userId) {
  if (!hasTable('cash_registers') || !hasTable('cash_transactions')) return null;
  const amt = parseFloat(amount);
  if (amt <= 0) return null;
  const from = await get('SELECT id, balance FROM cash_registers WHERE id = ?', [fromBox]);
  const to = await get('SELECT id, balance FROM cash_registers WHERE id = ?', [toBox]);
  if (!from || !to || parseFloat(from.balance) < amt) return null;
  const tid = generateId();
  const createdAt = now();
  await run('INSERT INTO cash_transactions (id, cash_register_id, type, amount, description, created_at) VALUES (?, ?, "out", ?, ?, ?)', [tid, fromBox, -amt, description || 'تحويل', createdAt]);
  await run('INSERT INTO cash_transactions (id, cash_register_id, type, amount, description, created_at) VALUES (?, ?, "in", ?, ?, ?)', [generateId(), toBox, amt, description || 'تحويل', createdAt]);
  await run('UPDATE cash_registers SET balance = balance - ? WHERE id = ?', [amt, fromBox]);
  await run('UPDATE cash_registers SET balance = balance + ? WHERE id = ?', [amt, toBox]);
  return { from_box: fromBox, to_box: toBox, amount: amt, date: createdAt };
}

async function getExpenses(filters = {}) {
  if (!hasTable('journal_entries') || !hasTable('journal_entry_lines') || !hasTable('accounts')) {
    return { items: [], by_category: {}, total: 0 };
  }
  const { from, to } = filters;
  let query = `SELECT je.id, je.entry_date as date, je.description, jel.credit as amount 
    FROM journal_entries je 
    JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id 
    JOIN accounts a ON a.id = jel.account_id AND a.type = 'expense'
    WHERE je.status = 'posted'`;
  const params = [];
  if (from) { query += ' AND date(je.entry_date) >= ?'; params.push(from); }
  if (to) { query += ' AND date(je.entry_date) <= ?'; params.push(to); }
  query += ' ORDER BY je.entry_date DESC';
  const items = await all(query, params);
  const total = items.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  return { items, by_category: {}, total };
}

async function createExpense(data) {
  const { category, description, amount, expense_date, cash_box_id, created_by } = data;
  if (!hasTable('journal_entries') || !hasTable('journal_entry_lines') || !hasTable('accounts')) {
    return { id: generateId(), category, description, amount, expense_date: expense_date || now(), created_at: now() };
  }
  const expenseAccount = await get("SELECT id FROM accounts WHERE type = 'expense' LIMIT 1");
  const cashAccount = await get("SELECT id FROM accounts WHERE type = 'asset' AND (name LIKE '%صندوق%' OR name LIKE '%نقد%') LIMIT 1");
  const accountId = expenseAccount?.id || cashAccount?.id;
  if (!accountId) return { id: generateId(), category, description, amount, expense_date: expense_date || now(), created_at: now() };
  const id = generateId();
  const lineId = generateId();
  const entryNumber = `EXP-${Date.now()}`;
  const amt = parseFloat(amount);
  const date = expense_date || now().split('T')[0];
  await run(`INSERT INTO journal_entries (id, entry_number, entry_date, description, total_debit, total_credit, status) VALUES (?, ?, ?, ?, ?, ?, 'posted')`, [id, entryNumber, date, description || category || 'مصروف', amt, amt]);
  await run(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, 0, ?)`, [lineId, id, accountId, amt, description || '']);
  const cashLineId = generateId();
  if (cashAccount) await run(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, 0, ?, ?)`, [cashLineId, id, cashAccount.id, amt, 'صرف']);
  return { id, category, description, amount: amt, expense_date: date, created_at: now() };
}

async function getProfitLossReport(from, to) {
  const fromDate = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];
  let revenue = 0, cogs = 0;
  if (hasTable('invoices')) {
    const r = await get(`SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE type LIKE 'sale%' AND date(created_at) BETWEEN ? AND ? AND (is_deleted = 0 OR is_deleted IS NULL)`, [fromDate, toDate]);
    revenue = parseFloat(r?.total) || 0;
    const c = await get(`SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE type LIKE 'purchase%' AND date(created_at) BETWEEN ? AND ? AND (is_deleted = 0 OR is_deleted IS NULL)`, [fromDate, toDate]);
    cogs = parseFloat(c?.total) || 0;
  }
  const grossProfit = revenue - cogs;
  return { period: { from: fromDate, to: toDate }, revenue: { total: revenue }, cost_of_goods_sold: { total: cogs }, gross_profit: grossProfit, operating_expenses: { total: 0 }, net_profit: grossProfit, profit_margin: revenue ? ((grossProfit / revenue) * 100).toFixed(1) + '%' : '0%' };
}

async function getCashFlowReport(from, to) {
  const fromDate = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];
  let opening = 0, inflows = 0, outflows = 0;
  if (hasTable('cash_registers')) {
    const o = await get('SELECT COALESCE(SUM(balance), 0) as total FROM cash_registers');
    opening = parseFloat(o?.total) || 0;
  }
  if (hasTable('vouchers')) {
    const inRows = await all(`SELECT COALESCE(SUM(amount), 0) as total FROM vouchers WHERE type IN ('receipt', 'journal') AND date(created_at) BETWEEN ? AND ?`, [fromDate, toDate]);
    inflows = inRows.reduce((s, r) => s + parseFloat(r.total || 0), 0);
    const outRows = await all(`SELECT COALESCE(SUM(amount), 0) as total FROM vouchers WHERE type IN ('payment', 'journal') AND date(created_at) BETWEEN ? AND ?`, [fromDate, toDate]);
    outflows = outRows.reduce((s, r) => s + parseFloat(r.total || 0), 0);
  }
  const net = inflows - outflows;
  return { period: { from: fromDate, to: toDate }, opening_balance: opening, inflows: { total: inflows }, outflows: { total: outflows }, net_cash_flow: net, closing_balance: opening + net };
}

function getDebtsReport() {
  const rec = getReceivables();
  const pay = getPayables();
  return { receivables: { total: rec.total, by_aging: rec.aging, top_debtors: rec.items.slice(0, 5) }, payables: { total: pay.total, due_this_week: pay.due_this_week, overdue: pay.overdue, top_creditors: pay.items.slice(0, 5) }, net_position: rec.total - pay.total };
}

module.exports = {
  getOverview,
  getReceivables,
  getReceivableByCustomer,
  getPayables,
  getCashBoxes,
  transferCash,
  getExpenses,
  createExpense,
  getProfitLossReport,
  getCashFlowReport,
  getDebtsReport,
};
