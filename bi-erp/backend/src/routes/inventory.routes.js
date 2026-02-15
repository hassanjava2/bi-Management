/**
 * BI Management - Inventory Routes (Complete)
 * المخزون — يوجّه طلبات الأجهزة والمنتجات والقطع للمسارات المناسبة
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventory.controller');
const { auth } = require('../middleware/auth');
const { get, all, run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

router.use(auth);

// ═══════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════
router.get('/stats', controller.stats);

// ═══════════════════════════════════════════════
// DEVICES — proxy to /api/devices routes
// ═══════════════════════════════════════════════
const deviceRoutes = require('./device.routes');
router.use('/devices', deviceRoutes);

// ═══════════════════════════════════════════════
// PRODUCTS — proxy to /api/products routes
// ═══════════════════════════════════════════════
const productRoutes = require('./products.routes');
router.use('/products', productRoutes);

// ═══════════════════════════════════════════════
// WAREHOUSES
// ═══════════════════════════════════════════════
router.get('/warehouses', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM warehouses ORDER BY name').catch(() => []);
    res.json({ success: true, data: rows.length ? rows : [{ id: 'main', name: 'المخزن الرئيسي', location: 'الرئيسي' }] });
  } catch (e) {
    res.json({ success: true, data: [{ id: 'main', name: 'المخزن الرئيسي', location: 'الرئيسي' }] });
  }
});

router.get('/warehouses/:id/stats', async (req, res) => {
  try {
    const warehouse = await get('SELECT * FROM warehouses WHERE id = $1', [req.params.id]);
    if (!warehouse) return res.status(404).json({ success: false, error: 'المخزن غير موجود' });

    const deviceCount = await get(
      'SELECT COUNT(*)::int as count FROM devices WHERE warehouse_id = $1 AND is_deleted = 0', [req.params.id]
    ).then(r => r?.count || 0).catch(() => 0);

    const productCount = await get(
      'SELECT COUNT(*)::int as count FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)', []
    ).then(r => r?.count || 0).catch(() => 0);

    const totalValue = await get(
      'SELECT COALESCE(SUM(selling_price), 0) as v FROM devices WHERE warehouse_id = $1 AND is_deleted = 0', [req.params.id]
    ).then(r => Number(r?.v) || 0).catch(() => 0);

    res.json({
      success: true,
      data: { ...warehouse, device_count: deviceCount, product_count: productCount, total_value: totalValue }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// PARTS & ACCESSORIES
// ═══════════════════════════════════════════════
router.get('/parts', async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = "SELECT * FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL) AND (category_id IN (SELECT id FROM categories WHERE name ILIKE '%قطع%' OR name ILIKE '%اكسسوار%'))";
    const params = [];
    if (search) {
      query += ` AND (name ILIKE $${params.length + 1} OR code ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    query += ' ORDER BY name LIMIT 100';
    const rows = await all(query, params).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

router.post('/parts', async (req, res) => {
  try {
    const { name, code, price, quantity, category_id, description } = req.body;
    const id = uuidv4();
    await run(
      'INSERT INTO products (id, name, code, price, quantity, category_id, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)',
      [id, name, code, price || 0, quantity || 0, category_id, description]
    );
    const row = await get('SELECT * FROM products WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/parts/:id', async (req, res) => {
  try {
    const { name, code, price, quantity, description } = req.body;
    await run(
      'UPDATE products SET name = COALESCE($1, name), code = COALESCE($2, code), price = COALESCE($3, price), quantity = COALESCE($4, quantity), description = COALESCE($5, description), updated_at = CURRENT_TIMESTAMP WHERE id = $6',
      [name, code, price, quantity, description, req.params.id]
    );
    const row = await get('SELECT * FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// MOVEMENTS
// ═══════════════════════════════════════════════
router.get('/movements', controller.movements);
router.post('/movements', controller.addMovement);

// ═══════════════════════════════════════════════
// LOW STOCK / ALERTS
// ═══════════════════════════════════════════════
router.get('/low-stock', async (req, res) => {
  try {
    const rows = await all(
      'SELECT * FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL) AND quantity <= COALESCE(min_quantity, 5) ORDER BY quantity ASC LIMIT 50'
    ).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const rows = await all(
      'SELECT * FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL) AND quantity <= COALESCE(min_quantity, 5) LIMIT 20'
    ).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ═══════════════════════════════════════════════
// SERIAL GENERATION
// ═══════════════════════════════════════════════
router.post('/generate-serial', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const countResult = await get(
      "SELECT COUNT(*) as c FROM devices WHERE serial_number LIKE $1", [`BI-${year}-%`]
    );
    const count = parseInt(countResult?.c || 0) + 1;
    const serial = `BI-${year}-${String(count).padStart(6, '0')}`;
    res.json({ success: true, data: { serial_number: serial } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// GENERIC (backwards compat)
// ═══════════════════════════════════════════════
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);

module.exports = router;
