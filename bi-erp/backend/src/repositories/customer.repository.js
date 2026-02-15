const { get, all, run } = require('../config/database');

async function findAll(filters = {}) {
  let sql = `SELECT * FROM customers WHERE (is_deleted = 0 OR is_deleted IS NULL)`;
  const params = [];
  if (filters.search) {
    sql += ` AND (name ILIKE ? OR phone ILIKE ? OR email ILIKE ? OR code ILIKE ?)`;
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }
  if (filters.type) params.push(filters.type), sql += ` AND type = ?`;
  sql += ` ORDER BY created_at DESC`;
  if (filters.limit) params.push(parseInt(filters.limit, 10) || 100), sql += ` LIMIT ?`;
  if (filters.offset) params.push(parseInt(filters.offset, 10)), sql += ` OFFSET ?`;
  return all(sql, params);
}

async function findById(id) {
  return get('SELECT * FROM customers WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)', [id]);
}

async function create(data) {
  const { generateId } = require('../utils/helpers');
  const id = data.id || generateId();
  const addr = data.addresses ? JSON.stringify(data.addresses) : (data.address ? JSON.stringify([{ label: 'الافتراضي', address: data.address, is_default: true }]) : '[]');
  await run(
    `INSERT INTO customers (id, code, name, type, phone, phone2, email, addresses, balance, credit_limit, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [id, data.code || null, data.name || '', data.type || 'retail', data.phone || null, data.phone2 || null, data.email || null, addr, parseFloat(data.credit_limit) || 0, data.notes || null, data.created_by || null]
  );
  return findById(id);
}

async function update(id, data) {
  const allowed = ['name', 'code', 'type', 'phone', 'phone2', 'email', 'addresses', 'credit_limit', 'notes', 'is_active', 'is_blocked', 'blocked_reason'];
  const set = [];
  const params = [];
  for (const k of allowed) {
    if (data[k] === undefined) continue;
    set.push(`${k} = ?`);
    params.push(typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k]);
  }
  if (set.length === 0) return findById(id);
  set.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  await run(`UPDATE customers SET ${set.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

async function remove(id) {
  await run('UPDATE customers SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

module.exports = { findAll, findById, create, update, remove };
