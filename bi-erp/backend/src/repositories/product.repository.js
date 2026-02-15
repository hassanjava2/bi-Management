const { get, all, run } = require('../config/database');

async function findAll(filters = {}) {
  let sql = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL)`;
  const params = [];
  if (filters.low_stock === 'true') sql += ` AND p.quantity < p.min_quantity`;
  if (filters.category_id) { params.push(filters.category_id); sql += ` AND p.category_id = ?`; }
  if (filters.search) {
    const term = `%${filters.search}%`;
    params.push(term, term);
    sql += ` AND (p.name ILIKE ? OR p.code ILIKE ?)`;
  }
  sql += ` ORDER BY p.name`;
  if (filters.limit) { params.push(parseInt(filters.limit, 10) || 100); sql += ` LIMIT ?`; }
  return all(sql, params);
}

async function findById(id) {
  return get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [id]);
}

async function create(data) {
  const { generateId } = require('../utils/helpers');
  const id = data.id || generateId();
  await run(
    `INSERT INTO products (id, code, name, name_ar, description, category_id, brand, model, cost_price, selling_price, wholesale_price, min_quantity, unit, quantity, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, TRUE, ?)`,
    [id, data.code || null, data.name || '', data.name_ar || null, data.description || null, data.category_id || null, data.brand || null, data.model || null, parseFloat(data.cost_price) || 0, parseFloat(data.selling_price) || 0, parseFloat(data.wholesale_price) || 0, parseInt(data.min_quantity, 10) || 0, data.unit || 'piece', data.created_by || null]
  );
  return findById(id);
}

async function update(id, data) {
  const allowed = ['code', 'name', 'name_ar', 'description', 'category_id', 'brand', 'model', 'cost_price', 'selling_price', 'wholesale_price', 'min_quantity', 'unit', 'quantity', 'is_active'];
  const set = [];
  const params = [];
  for (const k of allowed) {
    if (data[k] === undefined) continue;
    set.push(k + ' = ?');
    params.push(data[k]);
  }
  if (set.length === 0) return findById(id);
  set.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  await run('UPDATE products SET ' + set.join(', ') + ' WHERE id = ?', params);
  return findById(id);
}

async function addMovement(productId, type, quantity, reason, notes, createdBy, warehouseId) {
  const { generateId } = require('../utils/helpers');
  const product = await get('SELECT quantity FROM products WHERE id = ?', [productId]);
  if (!product) return null;
  const beforeQty = product.quantity || 0;
  const mult = type === 'in' ? 1 : -1;
  const afterQty = Math.max(0, beforeQty + quantity * mult);
  const movId = generateId();
  await run(
    `INSERT INTO inventory_movements (id, product_id, warehouse_id, type, quantity, before_quantity, after_quantity, reason, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [movId, productId, warehouseId || null, type, quantity, beforeQty, afterQty, reason || null, notes || null, createdBy || null]
  );
  await run('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [afterQty, productId]);
  return { id: movId };
}

module.exports = { findAll, findById, create, update, addMovement };
