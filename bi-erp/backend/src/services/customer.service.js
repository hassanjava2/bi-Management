/**
 * BI ERP — Enhanced Customer Service (Phase 7)
 * منع التكرار + أرصدة متعددة العملات + كشف حساب + إضافة سريعة
 */
const customerRepo = require('../repositories/customer.repository');
const { get, all, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

const ND = 'AND (is_deleted = 0 OR is_deleted IS NULL)';

async function list(filters) {
  return customerRepo.findAll(filters || {});
}

async function getById(id) {
  const cust = await customerRepo.findById(id);
  if (!cust) return null;

  // Attach multi-currency balances
  cust.currency_balances = await all(
    'SELECT currency, balance, last_payment_at FROM customer_balances WHERE customer_id = $1 ORDER BY currency', [id]
  ).catch(() => []);

  return cust;
}

// ─── DUPLICATE CHECK ──────────────────
async function checkDuplicate(name, phone) {
  const params = [];
  let q = 'SELECT id, name, phone FROM customers WHERE 1=1 ' + ND;
  if (name) { params.push(name.trim()); q += ` AND LOWER(name) = LOWER($${params.length})`; }
  if (phone) { params.push(phone.trim()); q += ` AND (phone = $${params.length} OR phone2 = $${params.length} OR phone3 = $${params.length})`; }
  if (params.length === 0) return null;
  return get(q + ' LIMIT 1', params);
}

// ─── CREATE WITH VALIDATION ──────────
async function create(data) {
  // Duplicate check
  if (data.name || data.phone) {
    const dup = await checkDuplicate(data.name, data.phone);
    if (dup) return { error: 'DUPLICATE', existing: dup, message: `يوجد زبون بنفس ${data.phone ? 'الهاتف' : 'الاسم'}: ${dup.name}` };
  }

  const result = await customerRepo.create({
    ...data,
    debt_limit: parseFloat(data.debt_limit) || 0,
    protection_level: data.protection_level || 'medium',
    salesperson_id: data.salesperson_id || null,
    customer_type_id: data.customer_type_id || null,
    phone2: data.phone2 || null,
    phone3: data.phone3 || null,
  });

  // Auto-assign salesperson by area
  if (data.area && !data.salesperson_id) {
    try {
      const sp = await get("SELECT id FROM users WHERE role = 'sales' AND area = $1 AND is_active = 1 LIMIT 1", [data.area]);
      if (sp) await run('UPDATE customers SET salesperson_id = $1 WHERE id = $2', [sp.id, result.id]).catch(() => { });
    } catch (_) { }
  }

  return result;
}

// ─── QUICK CREATE (from invoice) ─────
async function quickCreate(data) {
  const id = generateId();
  await run(
    `INSERT INTO customers (id, name, phone, type, balance, created_by) VALUES ($1, $2, $3, $4, 0, $5)`,
    [id, data.name || 'زبون جديد', data.phone || null, data.type || 'retail', data.created_by || null]
  );
  return get('SELECT id, name, phone, type FROM customers WHERE id = $1', [id]);
}

async function update(id, data) {
  // If changing name/phone, check duplicate
  if (data.name || data.phone) {
    const dup = await checkDuplicate(data.name, data.phone);
    if (dup && dup.id !== id) return { error: 'DUPLICATE', existing: dup, message: `يوجد زبون آخر بنفس البيانات: ${dup.name}` };
  }
  return customerRepo.update(id, data);
}

async function remove(id) {
  await customerRepo.remove(id);
}

// ─── MULTI-CURRENCY BALANCE ──────────
async function updateBalance(customerId, currency, amount) {
  const cur = currency || 'IQD';
  const amt = parseFloat(amount) || 0;

  // Update main balance
  await run('UPDATE customers SET balance = COALESCE(balance, 0) + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amt, customerId]).catch(() => { });

  // Update currency-specific balance
  await run(`
    INSERT INTO customer_balances (id, customer_id, currency, balance, last_payment_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (customer_id, currency)
    DO UPDATE SET balance = customer_balances.balance + $4, last_payment_at = CURRENT_TIMESTAMP
  `, [generateId(), customerId, cur, amt]).catch(() => { });
}

async function getBalances(customerId) {
  return all('SELECT currency, balance, last_payment_at FROM customer_balances WHERE customer_id = $1 ORDER BY currency', [customerId]).catch(() => []);
}

// ─── ACCOUNT STATEMENT (كشف حساب) ────
async function getStatement(customerId, { from, to } = {}) {
  const cust = await getById(customerId);
  if (!cust) return null;

  let q = `
    SELECT 'invoice' as entry_type, i.invoice_number as reference, i.type as sub_type,
      i.created_at, i.total as debit, 0 as credit, i.currency, i.notes
    FROM invoices i WHERE i.customer_id = $1 AND i.status != 'cancelled' AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
  `;
  const params = [customerId];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }

  q += ` UNION ALL
    SELECT 'voucher' as entry_type, v.voucher_number as reference, v.type as sub_type,
      v.created_at, 0 as debit, v.amount as credit, v.currency, v.notes
    FROM vouchers v WHERE v.customer_id = $1 AND (v.status IS NULL OR v.status != 'cancelled')
  `;
  if (from) q += ` AND v.created_at::date >= $${params.indexOf(from) + 1}`;
  if (to) q += ` AND v.created_at::date <= $${params.indexOf(to) + 1}`;

  q += ` UNION ALL
    SELECT 'return' as entry_type, r.return_number as reference, r.type as sub_type,
      r.created_at, 0 as debit, r.total as credit, r.currency, r.notes
    FROM returns r WHERE r.customer_id = $1 AND r.status = 'confirmed'
  `;
  if (from) q += ` AND r.created_at::date >= $${params.indexOf(from) + 1}`;
  if (to) q += ` AND r.created_at::date <= $${params.indexOf(to) + 1}`;

  q += ' ORDER BY created_at ASC';

  const entries = await all(q, params).catch(() => []);

  // Calculate running balance
  let runningBalance = 0;
  const statement = entries.map(e => {
    const debit = parseFloat(e.debit) || 0;
    const credit = parseFloat(e.credit) || 0;
    runningBalance += debit - credit;
    return { ...e, debit, credit, running_balance: runningBalance };
  });

  const totalDebit = statement.reduce((s, e) => s + e.debit, 0);
  const totalCredit = statement.reduce((s, e) => s + e.credit, 0);

  return {
    customer: { id: cust.id, name: cust.name, phone: cust.phone, balance: cust.balance },
    entries: statement,
    totals: { debit: totalDebit, credit: totalCredit, net: totalDebit - totalCredit },
    currency_balances: cust.currency_balances,
  };
}

// ─── STATS ───────────────────────────
async function getStats() {
  const [total, withBalance, receivables, topDebtors] = await Promise.all([
    get('SELECT COUNT(*) as c FROM customers WHERE 1=1 ' + ND).then(r => r?.c || 0).catch(() => 0),
    get('SELECT COUNT(*) as c FROM customers WHERE balance > 0 ' + ND).then(r => r?.c || 0).catch(() => 0),
    get('SELECT COALESCE(SUM(balance), 0) as s FROM customers WHERE balance > 0 ' + ND).then(r => r?.s || 0).catch(() => 0),
    all('SELECT id, name, phone, balance FROM customers WHERE balance > 0 ' + ND + ' ORDER BY balance DESC LIMIT 5').catch(() => []),
  ]);
  return { total, with_balance: withBalance, total_receivables: receivables, top_debtors: topDebtors };
}

module.exports = {
  list, getById, create, quickCreate, update, remove,
  checkDuplicate, updateBalance, getBalances, getStatement,
  getStats,
};
