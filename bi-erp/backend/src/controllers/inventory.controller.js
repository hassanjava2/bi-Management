const productService = require('../services/product.service');
const { all } = require('../config/database');

async function list(req, res) {
  try {
    const data = await productService.list({
      warehouse_id: req.query.warehouse_id,
      low_stock: req.query.low_stock,
      category_id: req.query.category_id,
      search: req.query.search,
      limit: req.query.limit || 100,
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

// /api/inventory/devices - Frontend calls this for device list
async function devices(req, res) {
  try {
    const { all: dbAll, get: dbGet } = require('../config/database');
    const { search, warehouse, status } = req.query;
    let query = 'SELECT * FROM devices WHERE 1=1';
    const params = [];
    let idx = 0;
    if (search) { idx++; query += ` AND (serial_number ILIKE $${idx} OR product_name ILIKE $${idx})`; params.push(`%${search}%`); }
    if (warehouse && warehouse !== 'all') { idx++; query += ` AND warehouse_id = $${idx}`; params.push(warehouse); }
    if (status && status !== 'all') { idx++; query += ` AND status = $${idx}`; params.push(status); }
    query += ' ORDER BY created_at DESC LIMIT 200';
    const rows = await dbAll(query, params).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    // Fallback - devices table might not exist, return products instead
    try {
      const data = await productService.list({ search: req.query.search, limit: 100 });
      res.json({ success: true, data });
    } catch (e2) {
      res.json({ success: true, data: [] });
    }
  }
}

async function getOne(req, res) {
  try {
    const product = await productService.getById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    res.json({ success: true, data: product });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function create(req, res) {
  try {
    const created = await productService.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function update(req, res) {
  try {
    const updated = await productService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function movements(req, res) {
  try {
    const rows = await all(`
      SELECT im.*, p.name as product_name FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
      ORDER BY im.created_at DESC LIMIT 100
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
}

async function addMovement(req, res) {
  try {
    const { product_id, type, quantity, reason, notes, warehouse_id } = req.body;
    if (!product_id || !type || quantity == null) {
      return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
    }
    const result = await productService.addMovement(product_id, type, parseInt(quantity, 10), reason, notes, req.user?.id, warehouse_id);
    if (!result) return res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND' });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function stats(req, res) {
  try {
    const { get } = require('../config/database');
    const [total, lowStock, totalValue] = await Promise.all([
      get('SELECT COUNT(*) as c FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COUNT(*) as c FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL) AND quantity < min_quantity').then(r => r?.c || 0).catch(() => 0),
      get('SELECT COALESCE(SUM(quantity * cost_price), 0) as s FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)').then(r => r?.s || 0).catch(() => 0),
    ]);
    res.json({ success: true, data: { total_products: total, low_stock_count: lowStock, total_value: totalValue } });
  } catch (e) {
    res.json({ success: true, data: { total_products: 0, low_stock_count: 0, total_value: 0 } });
  }
}

module.exports = { list, devices, getOne, create, update, movements, addMovement, stats };
