const { get, all, run } = require('../config/database');

async function findAll(filters = {}) {
  let sql = `SELECT * FROM suppliers WHERE (is_deleted = 0 OR is_deleted IS NULL)`;
  const params = [];
  if (filters.search) {
    sql += ` AND (name ILIKE ? OR name_ar ILIKE ? OR contact_person ILIKE ? OR phone ILIKE ? OR code ILIKE ?)`;
    const term = `%${filters.search}%`;
    params.push(term, term, term, term, term);
  }
  if (filters.type) params.push(filters.type), sql += ` AND type = ?`;
  sql += ` ORDER BY name`;
  if (filters.limit) params.push(parseInt(filters.limit, 10) || 100), sql += ` LIMIT ?`;
  if (filters.offset) params.push(parseInt(filters.offset, 10)), sql += ` OFFSET ?`;
  return all(sql, params);
}

async function findById(id) {
  return get('SELECT * FROM suppliers WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)', [id]);
}

async function create(data) {
  const { generateId } = require('../utils/helpers');
  const id = data.id || generateId();
  await run(
    `INSERT INTO suppliers (id, code, name, name_ar, type, contact_person, phone, phone2, email, website, address, city, country, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.code || null, data.name || '', data.name_ar || null, data.type || 'company', data.contact_person || null, data.phone || null, data.phone2 || null, data.email || null, data.website || null, data.address || null, data.city || null, data.country || null, data.notes || null]
  );
  return findById(id);
}

async function update(id, data) {
  const allowed = ['name', 'name_ar', 'code', 'type', 'contact_person', 'phone', 'phone2', 'email', 'website', 'address', 'city', 'country', 'notes', 'is_active'];
  const set = [];
  const params = [];
  for (const k of allowed) {
    if (data[k] === undefined) continue;
    set.push(`${k} = ?`);
    params.push(data[k]);
  }
  if (set.length === 0) return findById(id);
  set.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  await run(`UPDATE suppliers SET ${set.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

async function remove(id) {
  await run('UPDATE suppliers SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

module.exports = { findAll, findById, create, update, remove };
