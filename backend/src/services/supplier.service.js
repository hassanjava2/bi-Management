/**
 * BI Management - Supplier Service
 * إدارة الموردين من قاعدة البيانات
 */
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

async function ensureSuppliersTable() {
  try {
    await get('SELECT 1 FROM suppliers LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

async function list(filters = {}) {
  const { search, type, page = 1, limit = 100 } = filters;
  let query = `SELECT * FROM suppliers WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)`;
  const params = [];
  if (search) {
    query += ` AND (name LIKE ? OR name_ar LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR phone2 LIKE ? OR code LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term, term, term);
  }
  if (type && type !== 'all') {
    query += ` AND type = ?`;
    params.push(type);
  }
  query += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
  const limitNum = parseInt(limit, 10) || 100;
  const offset = (parseInt(page, 10) - 1) * limitNum;
  params.push(limitNum, offset);
  return await all(query, params);
}

async function getById(id) {
  return await get('SELECT * FROM suppliers WHERE id = ? AND (is_deleted IS NOT TRUE OR is_deleted IS NULL)', [String(id)]);
}

async function create(data) {
  const id = data.id || generateId();
  const {
    name,
    name_ar,
    code,
    type = 'company',
    contact_person,
    phone,
    phone2,
    email,
    website,
    address,
    city,
    country,
    notes,
  } = data;
  const createdAt = now();
  await run(
    `INSERT INTO suppliers (id, code, name, name_ar, type, contact_person, phone, phone2, email, website, address, city, country, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, code || null, name || '', name_ar || null, type, contact_person || null, phone || null, phone2 || null, email || null, website || null, address || null, city || null, country || null, notes || null, createdAt, createdAt]
  );
  return getById(id);
}

async function update(id, data) {
  const existing = await get('SELECT * FROM suppliers WHERE id = ?', [String(id)]);
  if (!existing) return null;
  const allowed = ['name', 'name_ar', 'code', 'type', 'contact_person', 'phone', 'phone2', 'email', 'website', 'address', 'city', 'country', 'notes', 'is_active'];
  const updates = [];
  const params = [];
  for (const key of allowed) {
    if (data[key] === undefined) continue;
    updates.push(`${key} = ?`);
    params.push(data[key]);
  }
  if (updates.length === 0) return getById(id);
  updates.push('updated_at = ?');
  params.push(now());
  params.push(String(id));
  await run(`UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`, params);
  return getById(id);
}

async function remove(id) {
  const existing = await get('SELECT id FROM suppliers WHERE id = ?', [String(id)]);
  if (!existing) return false;
  await run(`UPDATE suppliers SET is_deleted = 1, deleted_at = ? WHERE id = ?`, [now(), String(id)]);
  return true;
}

async function getTransactions(supplierId) {
  const supplier = getById(supplierId);
  if (!supplier) return [];
  const transactions = [];
  try {
    const vouchers = await all(
      `SELECT id, voucher_number as reference, amount, created_at as date, type FROM vouchers WHERE supplier_id = ? AND (is_deleted IS NOT TRUE OR is_deleted IS NULL) ORDER BY created_at DESC LIMIT 50`,
      [supplierId]
    );
    vouchers.forEach((v) => transactions.push({ date: v.date, type: v.type === 'payment' ? 'payment' : 'purchase', amount: v.type === 'payment' ? -parseFloat(v.amount) : parseFloat(v.amount), reference: v.reference }));
  } catch (_) {}
  try {
    const invoices = await all(
      `SELECT id, invoice_number as reference, total as amount, created_at as date FROM invoices WHERE supplier_id = ? AND (is_deleted IS NOT TRUE OR is_deleted IS NULL) ORDER BY created_at DESC LIMIT 50`,
      [supplierId]
    );
    invoices.forEach((i) => transactions.push({ date: i.date, type: 'purchase', amount: parseFloat(i.amount), reference: i.reference }));
  } catch (_) {}
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  return transactions.slice(0, 50);
}

async function getReturns(supplierId) {
  const supplier = getById(supplierId);
  if (!supplier) return [];
  try {
    const rows = await all(
      `SELECT r.id, r.status, r.created_at, ri.serial_number as serial FROM returns r JOIN return_items ri ON ri.return_id = r.id WHERE r.supplier_id = ? ORDER BY r.created_at DESC LIMIT 50`,
      [supplierId]
    );
    return rows;
  } catch (_) {
    return await all(
      `SELECT id, status, created_at FROM returns WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 50`,
      [supplierId]
    ).catch(() => []);
  }
}

async function getStats(supplierId) {
  const supplier = getById(supplierId);
  if (!supplier) return null;
  const total_purchases = parseFloat(supplier.total_purchases) || 0;
  let total_returns = 0;
  let pending_returns = 0;
  try {
    const r = await get('SELECT COUNT(*) as cnt FROM returns WHERE supplier_id = ?', [supplierId]);
    total_returns = r?.cnt || 0;
    const p = await get(`SELECT COUNT(*) as cnt FROM returns WHERE supplier_id = ? AND status NOT IN ('received', 'cancelled')`, [supplierId]);
    pending_returns = p?.cnt || 0;
  } catch (_) {}
  return {
    total_purchases,
    total_returns,
    resolved_returns: total_returns - pending_returns,
    pending_returns,
    avg_return_time: 0,
    last_purchase: null,
    quality_score: parseFloat(supplier.rating) || 0,
  };
}

module.exports = {
  ensureSuppliersTable,
  list,
  getById,
  create,
  update,
  remove,
  getTransactions,
  getReturns,
  getStats,
};
