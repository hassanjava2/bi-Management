const productService = require('../services/product.service');
const { all } = require('../config/database');

async function list(req, res) {
  const data = await productService.list({
    warehouse_id: req.query.warehouse_id,
    low_stock: req.query.low_stock,
    category_id: req.query.category_id,
    search: req.query.search,
    limit: req.query.limit || 100,
  });
  res.json({ success: true, data });
}

async function getOne(req, res) {
  const product = await productService.getById(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  res.json({ success: true, data: product });
}

async function create(req, res) {
  const created = await productService.create({ ...req.body, created_by: req.user?.id });
  res.status(201).json({ success: true, data: created });
}

async function update(req, res) {
  const updated = await productService.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  res.json({ success: true, data: updated });
}

async function movements(req, res) {
  const rows = await all(`
    SELECT im.*, p.name as product_name FROM inventory_movements im
    LEFT JOIN products p ON im.product_id = p.id
    ORDER BY im.created_at DESC LIMIT 100
  `);
  res.json({ success: true, data: rows });
}

async function addMovement(req, res) {
  const { product_id, type, quantity, reason, notes, warehouse_id } = req.body;
  if (!product_id || !type || quantity == null) {
    return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
  }
  const result = await productService.addMovement(product_id, type, parseInt(quantity, 10), reason, notes, req.user?.id, warehouse_id);
  if (!result) return res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND' });
  res.status(201).json({ success: true, data: result });
}

async function stats(req, res) {
  const { get } = require('../config/database');
  const total = await get('SELECT COUNT(*) as c FROM products WHERE (is_deleted = FALSE OR is_deleted IS NULL)').then(r => r?.c || 0);
  const lowStock = await get('SELECT COUNT(*) as c FROM products WHERE (is_deleted = FALSE OR is_deleted IS NULL) AND quantity < min_quantity').then(r => r?.c || 0);
  const totalValue = await get('SELECT COALESCE(SUM(quantity * cost_price), 0) as s FROM products WHERE (is_deleted = FALSE OR is_deleted IS NULL)').then(r => r?.s || 0);
  res.json({ success: true, data: { total_products: total, low_stock_count: lowStock, total_value: totalValue } });
}

module.exports = { list, getOne, create, update, movements, addMovement, stats };
