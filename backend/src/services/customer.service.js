/**
 * BI Management - Customer Service
 * إدارة العملاء من قاعدة البيانات
 */
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

async function ensureCustomersTable() {
  try {
    await get('SELECT 1 FROM customers LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

async function list(filters = {}) {
  const { search, type, page = 1, limit = 100 } = filters;
  let query = `SELECT * FROM customers WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)`;
  const params = [];
  if (search) {
    query += ` AND (name LIKE ? OR phone LIKE ? OR phone2 LIKE ? OR email LIKE ? OR code LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }
  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const limitNum = parseInt(limit, 10) || 100;
  const offset = (parseInt(page, 10) - 1) * limitNum;
  params.push(limitNum, offset);
  return await all(query, params);
}

async function getById(id) {
  return await get('SELECT * FROM customers WHERE id = ? AND (is_deleted IS NOT TRUE OR is_deleted IS NULL)', [String(id)]);
}

async function create(data) {
  const id = data.id || generateId();
  const {
    name,
    code,
    type = 'retail',
    phone,
    phone2,
    email,
    address,
    addresses,
    credit_limit = 0,
    notes,
    created_by,
  } = data;
  const addrJson = addresses ? JSON.stringify(addresses) : (address ? JSON.stringify([{ label: 'الافتراضي', address, is_default: true }]) : '[]');
  const createdAt = now();
  await run(
    `INSERT INTO customers (id, code, name, type, phone, phone2, email, addresses, balance, credit_limit, notes, created_at, updated_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    [id, code || null, name || '', type, phone || '', phone2 || null, email || null, addrJson, parseFloat(credit_limit) || 0, notes || null, createdAt, createdAt, created_by || null]
  );
  return getById(id);
}

async function update(id, data) {
  const existing = await get('SELECT * FROM customers WHERE id = ?', [String(id)]);
  if (!existing) return null;
  const allowed = ['name', 'code', 'type', 'phone', 'phone2', 'email', 'addresses', 'credit_limit', 'notes', 'is_active', 'is_blocked', 'blocked_reason'];
  const updates = [];
  const params = [];
  for (const key of allowed) {
    if (data[key] === undefined) continue;
    if (key === 'addresses' && typeof data[key] === 'object') {
      updates.push('addresses = ?');
      params.push(JSON.stringify(data[key]));
    } else {
      updates.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (updates.length === 0) return getById(id);
  updates.push('updated_at = ?');
  params.push(now());
  params.push(String(id));
  await run(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params);
  return getById(id);
}

async function remove(id) {
  const existing = await get('SELECT id FROM customers WHERE id = ?', [String(id)]);
  if (!existing) return false;
  await run(`UPDATE customers SET is_deleted = 1, deleted_at = ? WHERE id = ?`, [now(), String(id)]);
  return true;
}

async function getStats() {
  if (!ensureCustomersTable()) return null;
  const totalRow = await get('SELECT COUNT(*) as total FROM customers WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)');
  const withBalance = await get('SELECT COUNT(*) as cnt FROM customers WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL) AND balance > 0');
  const receivables = await get('SELECT COALESCE(SUM(balance), 0) as total FROM customers WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL) AND balance > 0');
  const byType = await all('SELECT type, COUNT(*) as cnt FROM customers WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL) GROUP BY type');
  const byTier = await all('SELECT loyalty_level as tier, COUNT(*) as cnt FROM customers WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL) GROUP BY loyalty_level');
  const thisMonth = await get(
    `SELECT COUNT(*) as cnt FROM customers WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL) AND date(created_at) >= date_trunc('month', CURRENT_DATE)::date`
  );
  const byTypeMap = {};
  (byType || []).forEach((r) => { byTypeMap[r.type] = r.cnt; });
  const byTierMap = {};
  (byTier || []).forEach((r) => { byTierMap[r.tier] = r.cnt; });
  return {
    total: totalRow?.total || 0,
    with_balance: withBalance?.cnt || 0,
    total_receivables: parseFloat(receivables?.total) || 0,
    vip_count: byTierMap.platinum || 0,
    new_this_month: thisMonth?.cnt || 0,
    by_type: byTypeMap,
    by_tier: byTierMap,
  };
}

async function getTransactions(customerId) {
  const customer = getById(customerId);
  if (!customer) return [];
  const transactions = [];
  try {
    const invoices = await all(
      `SELECT id, invoice_number as reference, total as amount, created_at as date, 'invoice' as type FROM invoices WHERE customer_id = ? AND (is_deleted IS NOT TRUE OR is_deleted IS NULL) ORDER BY created_at DESC LIMIT 50`,
      [customerId]
    );
    invoices.forEach((i) => transactions.push({ date: i.date, type: 'invoice', amount: parseFloat(i.amount), reference: i.reference }));
  } catch (_) {}
  try {
    const vouchers = await all(
      `SELECT id, voucher_number as reference, amount, created_at as date, type FROM vouchers WHERE customer_id = ? AND (is_deleted IS NOT TRUE OR is_deleted IS NULL) ORDER BY created_at DESC LIMIT 50`,
      [customerId]
    );
    vouchers.forEach((v) => transactions.push({ date: v.date, type: v.type === 'receipt' ? 'payment' : v.type, amount: v.type === 'receipt' ? -parseFloat(v.amount) : parseFloat(v.amount), reference: v.reference }));
  } catch (_) {}
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  return transactions.slice(0, 50);
}

async function getInvoices(customerId) {
  const customer = getById(customerId);
  if (!customer) return [];
  try {
    const rows = await all(
      `SELECT id, invoice_number as number, created_at as date, total, status, type FROM invoices WHERE customer_id = ? AND (is_deleted IS NOT TRUE OR is_deleted IS NULL) ORDER BY created_at DESC LIMIT 50`,
      [customerId]
    );
    return rows.map((r) => ({ ...r, total: parseFloat(r.total) }));
  } catch (_) {
    return [];
  }
}

async function adjustBalance(customerId, amount, reason, reference, userId) {
  const customer = getById(customerId);
  if (!customer) return null;
  const newBalance = parseFloat(customer.balance) + parseFloat(amount);
  await run(`UPDATE customers SET balance = ?, updated_at = ? WHERE id = ?`, [newBalance, now(), String(customerId)]);
  return getById(customerId);
}

module.exports = {
  ensureCustomersTable,
  list,
  getById,
  create,
  update,
  remove,
  getStats,
  getTransactions,
  getInvoices,
  adjustBalance,
};
