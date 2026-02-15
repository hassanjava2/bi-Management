/**
 * BI Management - Product Service
 * إدارة المنتجات من قاعدة البيانات
 */
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

// مجموعات المنتجات (للتوافق مع الواجهة - يمكن استبدالها بجدول categories لاحقاً)
const PRODUCT_GROUP_IDS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const PRODUCT_GROUPS = {
  1: { id: '1', name: 'عام', name_en: 'General' },
  2: { id: '2', name: 'لابتوبات', name_en: 'Laptops' },
  3: { id: '3', name: 'تفعيلات', name_en: 'Activations' },
  4: { id: '4', name: 'إكسسوارات', name_en: 'Accessories' },
  5: { id: '5', name: 'ألعاب', name_en: 'Gaming' },
  6: { id: '6', name: 'قطع غيار', name_en: 'Parts' },
  7: { id: '7', name: 'شاشات', name_en: 'Monitors' },
  8: { id: '8', name: 'طابعات', name_en: 'Printers' },
};

async function ensureProductsTable() {
  try {
    await get('SELECT 1 FROM products LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

async function list(filters = {}) {
  const { search, group_id, category_id, page = 1, limit = 50 } = filters;
  const catId = group_id || category_id;
  let query = `
    SELECT p.*, c.name as category_name, c.name_ar as category_name_ar
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL)
  `;
  const params = [];
  if (search) {
    query += ` AND (p.name LIKE ? OR p.name_ar LIKE ? OR p.code LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (catId && catId !== 'all') {
    query += ` AND p.category_id = ?`;
    params.push(String(catId));
  }
  query += ` ORDER BY p.name ASC LIMIT ? OFFSET ?`;
  const limitNum = parseInt(limit, 10) || 50;
  const offset = (parseInt(page, 10) - 1) * limitNum;
  params.push(limitNum, offset);
  const rows = await all(query, params);
  const countParams = [];
  let countQuery = `SELECT COUNT(*) as total FROM products p WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL)`;
  if (search) {
    countQuery += ` AND (p.name LIKE ? OR p.name_ar LIKE ? OR p.code LIKE ?)`;
    const term = `%${search}%`;
    countParams.push(term, term, term);
  }
  if (catId && catId !== 'all') {
    countQuery += ` AND p.category_id = ?`;
    countParams.push(String(catId));
  }
  const countResult = await get(countQuery, countParams);
  const total = (countResult && countResult.total) || 0;
  return {
    rows,
    total,
    page: parseInt(page, 10),
    limit: limitNum,
    pages: Math.ceil(total / limitNum) || 1,
  };
}

async function search(queryTerm, limit = 20) {
  if (!queryTerm || queryTerm.length < 2) return [];
  const term = `%${queryTerm}%`;
  const rows = await all(
    `SELECT id, name, name_ar, code, cost_price, selling_price, wholesale_price, category_id FROM products
     WHERE (is_deleted = 0 OR is_deleted IS NULL) AND (name LIKE ? OR name_ar LIKE ? OR code LIKE ?)
     ORDER BY name LIMIT ?`,
    [term, term, term, parseInt(limit, 10)]
  );
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    name_ar: p.name_ar,
    buy_price: p.cost_price,
    sale_price: p.selling_price,
    cost_price: p.cost_price,
    selling_price: p.selling_price,
    group_id: p.category_id ? parseInt(p.category_id, 10) : 1,
    category_id: p.category_id,
    group_name: PRODUCT_GROUPS[parseInt(p.category_id, 10)]?.name || 'عام',
  }));
}

async function getById(id) {
  const row = await get(
    `SELECT p.*, c.name as category_name, c.name_ar as category_name_ar
     FROM products p LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)`,
    [String(id)]
  );
  if (!row) return null;
  return {
    ...row,
    buy_price: row.cost_price,
    sale_price: row.selling_price,
    group_id: row.category_id ? parseInt(row.category_id, 10) : 1,
    group_name: row.category_name || PRODUCT_GROUPS[parseInt(row.category_id, 10)]?.name || 'عام',
  };
}

async function create(data) {
  const id = data.id ? String(data.id) : generateId();
  const {
    name,
    name_ar,
    code,
    sku,
    barcode,
    description,
    category_id,
    group_id,
    brand,
    model,
    cost_price,
    buy_price,
    selling_price,
    sale_price,
    wholesale_price,
    min_price,
    track_by_serial = 0,
    quantity = 0,
    min_quantity = 0,
    unit = 'piece',
    warranty_months = 0,
    is_active = true,
    created_by,
  } = data;
  const catId = category_id || (group_id != null ? String(group_id) : null);
  const cost = cost_price != null ? cost_price : buy_price;
  const selling = selling_price != null ? selling_price : sale_price;
  const createdAt = now();
  await run(
    `INSERT INTO products (id, code, sku, barcode, name, name_ar, description, category_id, brand, model,
       cost_price, selling_price, wholesale_price, min_price, track_by_serial, quantity, min_quantity, unit, warranty_months, is_active, created_at, updated_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code || null,
      sku || null,
      barcode || null,
      name || '',
      name_ar || null,
      description || null,
      catId,
      brand || null,
      model || null,
      cost != null ? parseFloat(cost) : null,
      selling != null ? parseFloat(selling) : null,
      wholesale_price != null ? parseFloat(wholesale_price) : null,
      min_price != null ? parseFloat(min_price) : null,
      !!track_by_serial,
      parseInt(quantity, 10) || 0,
      parseInt(min_quantity, 10) || 0,
      unit,
      parseInt(warranty_months, 10) || 0,
      is_active !== false,
      createdAt,
      createdAt,
      created_by || null,
    ]
  );
  return getById(id);
}

async function update(id, data) {
  const existing = await get('SELECT * FROM products WHERE id = ?', [String(id)]);
  if (!existing) return null;
  const {
    name,
    name_ar,
    code,
    sku,
    barcode,
    description,
    category_id,
    group_id,
    brand,
    model,
    cost_price,
    buy_price,
    selling_price,
    sale_price,
    wholesale_price,
    min_price,
    track_by_serial,
    quantity,
    min_quantity,
    unit,
    warranty_months,
    is_active,
  } = data;
  const catId = category_id !== undefined ? category_id : (group_id !== undefined ? String(group_id) : undefined);
  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (name_ar !== undefined) { updates.push('name_ar = ?'); params.push(name_ar); }
  if (code !== undefined) { updates.push('code = ?'); params.push(code); }
  if (sku !== undefined) { updates.push('sku = ?'); params.push(sku); }
  if (barcode !== undefined) { updates.push('barcode = ?'); params.push(barcode); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (catId !== undefined) { updates.push('category_id = ?'); params.push(catId); }
  if (brand !== undefined) { updates.push('brand = ?'); params.push(brand); }
  if (model !== undefined) { updates.push('model = ?'); params.push(model); }
  if (cost_price !== undefined) { updates.push('cost_price = ?'); params.push(parseFloat(cost_price)); }
  else if (buy_price !== undefined) { updates.push('cost_price = ?'); params.push(parseFloat(buy_price)); }
  if (selling_price !== undefined) { updates.push('selling_price = ?'); params.push(parseFloat(selling_price)); }
  else if (sale_price !== undefined) { updates.push('selling_price = ?'); params.push(parseFloat(sale_price)); }
  if (wholesale_price !== undefined) { updates.push('wholesale_price = ?'); params.push(parseFloat(wholesale_price)); }
  if (min_price !== undefined) { updates.push('min_price = ?'); params.push(parseFloat(min_price)); }
  if (track_by_serial !== undefined) { updates.push('track_by_serial = ?'); params.push(track_by_serial ? true : false); }
  if (quantity !== undefined) { updates.push('quantity = ?'); params.push(parseInt(quantity, 10)); }
  if (min_quantity !== undefined) { updates.push('min_quantity = ?'); params.push(parseInt(min_quantity, 10)); }
  if (unit !== undefined) { updates.push('unit = ?'); params.push(unit); }
  if (warranty_months !== undefined) { updates.push('warranty_months = ?'); params.push(parseInt(warranty_months, 10)); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active !== false); }
  if (updates.length === 0) return getById(id);
  updates.push('updated_at = ?');
  params.push(now());
  params.push(String(id));
  await run(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
  return getById(id);
}

async function remove(id) {
  const existing = await get('SELECT id FROM products WHERE id = ?', [String(id)]);
  if (!existing) return false;
  await run(`UPDATE products SET is_deleted = TRUE, deleted_at = ? WHERE id = ?`, [now(), String(id)]);
  return true;
}

async function getGroups() {
  const countQuery = `SELECT category_id as id, COUNT(*) as count FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL) AND category_id IS NOT NULL GROUP BY category_id`;
  const counts = await all(countQuery);
  const countMap = {};
  counts.forEach((c) => { countMap[c.id] = c.count; });
  return PRODUCT_GROUP_IDS.map((id) => ({
    id: parseInt(id, 10),
    name: PRODUCT_GROUPS[id]?.name || 'عام',
    name_en: PRODUCT_GROUPS[id]?.name_en || 'General',
    count: countMap[id] || 0,
  }));
}

async function getStats() {
  const rows = await all(
    `SELECT COUNT(*) as total, AVG(cost_price) as avg_buy_price, AVG(selling_price) as avg_sale_price,
      SUM(quantity * COALESCE(cost_price, 0)) as total_value
     FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)`
  );
  const r = rows[0];
  const byGroup = await all(
    `SELECT category_id, COUNT(*) as cnt FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL) AND category_id IS NOT NULL GROUP BY category_id`
  );
  const by_group = {};
  byGroup.forEach((g) => { by_group[g.category_id] = g.cnt; });
  return {
    total: r?.total || 0,
    avg_buy_price: Math.round(parseFloat(r?.avg_buy_price) || 0),
    avg_sale_price: Math.round(parseFloat(r?.avg_sale_price) || 0),
    total_value: Math.round(parseFloat(r?.total_value) || 0),
    by_group,
  };
}

async function seedFromJson(productsArray) {
  const created = [];
  for (const p of productsArray) {
    const id = String(p.id);
    if (await get('SELECT id FROM products WHERE id = ?', [id])) continue;
    create({
      id,
      name: p.name,
      buy_price: p.buy_price,
      sale_price: p.sale_price,
      group_id: p.group_id,
    });
    created.push(id);
  }
  return created.length;
}

module.exports = {
  ensureProductsTable,
  list,
  search,
  getById,
  create,
  update,
  remove,
  getGroups,
  getStats,
  seedFromJson,
  PRODUCT_GROUPS,
};
