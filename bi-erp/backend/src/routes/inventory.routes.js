/**
 * BI Management - Inventory Routes (Complete)
 * المخزون — يشمل الأجهزة والمنتجات والقطع مع كل العمليات
 * 
 * Note: This file handles ALL /api/inventory/* requests.
 * Device and product sub-routes redirect to their respective handlers
 * using inline pass-through to avoid double-middleware issues.
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventory.controller');
const { auth } = require('../middleware/auth');
const { get, all, run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

router.use(auth);

// Auto-create stock count tables
(async () => {
  try {
    await run(`CREATE TABLE IF NOT EXISTS stock_counts (
      id TEXT PRIMARY KEY, warehouse_id TEXT, status TEXT DEFAULT 'in_progress',
      notes TEXT, created_by TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    )`);
    await run(`CREATE TABLE IF NOT EXISTS stock_count_items (
      id TEXT PRIMARY KEY, stock_count_id TEXT REFERENCES stock_counts(id),
      product_id TEXT, expected_quantity INTEGER DEFAULT 0,
      actual_quantity INTEGER, counted_at TIMESTAMP
    )`);
  } catch (e) { /* tables may already exist */ }
})();

// ═══════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════
router.get('/stats', controller.stats);

// ═══════════════════════════════════════════════
// DEVICES — inline handlers (avoid sub-router double auth)
// Frontend calls /api/inventory/devices/*
// ═══════════════════════════════════════════════

// List devices
router.get('/devices', async (req, res) => {
  try {
    const { status, warehouse_id, supplier_id, customer_id, search, page = 1, limit = 50 } = req.query;

    let query = `
      SELECT d.*, 
        w.name as warehouse_name,
        p.name as product_name, p.brand, p.model,
        s.name as supplier_name,
        c.name as customer_name
      FROM devices d
      LEFT JOIN warehouses w ON d.warehouse_id = w.id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE (d.is_deleted = 0 OR d.is_deleted IS NULL)
    `;
    const params = [];
    let paramIndex = 1;

    if (status) { query += ` AND d.status = $${paramIndex++}`; params.push(status); }
    if (warehouse_id) { query += ` AND d.warehouse_id = $${paramIndex++}`; params.push(warehouse_id); }
    if (supplier_id) { query += ` AND d.supplier_id = $${paramIndex++}`; params.push(supplier_id); }
    if (customer_id) { query += ` AND d.customer_id = $${paramIndex++}`; params.push(customer_id); }
    if (search) {
      query += ` AND (d.serial_number ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY d.created_at DESC';
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const rows = await all(query, params).catch(() => []);
    res.json({
      success: true, data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), hasMore: rows.length === parseInt(limit) }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Scan device by barcode/serial
router.get('/devices/scan/:code', async (req, res) => {
  try {
    const code = req.params.code.trim();
    const devices = await all(`
      SELECT d.id, d.serial_number, d.status, d.selling_price, d.actual_specs,
        p.name as product_name, p.brand, p.model, p.code as product_code,
        w.name as warehouse_name
      FROM devices d
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN warehouses w ON d.warehouse_id = w.id
      WHERE (d.is_deleted = 0 OR d.is_deleted IS NULL)
        AND (d.serial_number ILIKE $1 OR p.barcode = $2 OR p.code = $2)
      LIMIT 5
    `, [`%${code}%`, code]).catch(() => []);

    if (devices.length === 0) {
      const products = await all(`
        SELECT p.id as product_id, p.name as product_name, p.code as product_code,
          p.barcode, p.price as selling_price, p.brand, p.model,
          p.quantity as stock_quantity
        FROM products p
        WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL)
          AND (p.barcode = $1 OR p.code = $1 OR p.name ILIKE $2)
        LIMIT 5
      `, [code, `%${code}%`]).catch(() => []);
      return res.json({ success: true, source: 'product', data: products });
    }

    res.json({ success: true, source: 'device', data: devices });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get single device
router.get('/devices/:id', async (req, res) => {
  try {
    const device = await get(`
      SELECT d.*, 
        w.name as warehouse_name, p.name as product_name,
        s.name as supplier_name, c.name as customer_name
      FROM devices d
      LEFT JOIN warehouses w ON d.warehouse_id = w.id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.id = $1
    `, [req.params.id]);

    if (!device) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });

    const history = await all(`
      SELECT * FROM device_history WHERE device_id = $1 ORDER BY created_at DESC LIMIT 50
    `, [req.params.id]).catch(() => []);

    res.json({ success: true, data: { device, history } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create device
router.post('/devices', async (req, res) => {
  try {
    const { product_id, serial_number, actual_specs, purchase_cost, selling_price,
      warehouse_id, supplier_id, notes, status } = req.body;

    const id = uuidv4();
    const sn = serial_number || `BI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    await run(`
      INSERT INTO devices (id, serial_number, product_id, actual_specs, purchase_cost, selling_price,
        status, warehouse_id, supplier_id, notes, created_by, created_at, is_deleted)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, 0)
    `, [id, sn, product_id, actual_specs || null, purchase_cost || 0, selling_price || 0,
      status || 'available', warehouse_id || null, supplier_id || null, notes || null, req.user?.id]);

    const device = await get('SELECT * FROM devices WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: device, message: `تم إنشاء الجهاز ${sn}` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Update device
router.put('/devices/:id', async (req, res) => {
  try {
    const { serial_number, actual_specs, selling_price, status, warehouse_id, notes, supplier_id, customer_id } = req.body;
    const sets = []; const params = []; let i = 1;
    const addField = (name, val) => { if (val !== undefined) { sets.push(`${name} = $${i++}`); params.push(val); } };

    addField('serial_number', serial_number);
    addField('actual_specs', actual_specs);
    addField('selling_price', selling_price);
    addField('status', status);
    addField('warehouse_id', warehouse_id);
    addField('notes', notes);
    addField('supplier_id', supplier_id);
    addField('customer_id', customer_id);

    if (sets.length === 0) return res.status(400).json({ success: false, error: 'لا توجد تحديثات' });

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.params.id);
    await run(`UPDATE devices SET ${sets.join(', ')} WHERE id = $${i}`, params);

    const device = await get('SELECT * FROM devices WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: device });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Delete device (soft)
router.delete('/devices/:id', async (req, res) => {
  try {
    await run('UPDATE devices SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'تم حذف الجهاز' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Device history
router.get('/devices/:id/history', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM device_history WHERE device_id = $1 ORDER BY created_at DESC LIMIT 50', [req.params.id]).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// Device transfer
router.post('/devices/:id/transfer', async (req, res) => {
  try {
    const { to_warehouse_id, notes } = req.body;
    const device = await get('SELECT * FROM devices WHERE id = $1', [req.params.id]);
    if (!device) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });

    const fromWarehouse = device.warehouse_id;
    await run('UPDATE devices SET warehouse_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [to_warehouse_id, req.params.id]);

    try {
      await run(`INSERT INTO device_history (id, device_id, action, from_warehouse_id, to_warehouse_id, notes, created_by, created_at)
        VALUES ($1, $2, 'transfer', $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [uuidv4(), req.params.id, fromWarehouse, to_warehouse_id, notes || null, req.user?.id]);
    } catch (_) { }

    const updated = await get('SELECT * FROM devices WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: updated, message: 'تم نقل الجهاز' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Device custody
router.post('/devices/:id/custody', async (req, res) => {
  try {
    const { customer_id, notes } = req.body;
    await run('UPDATE devices SET customer_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [customer_id, customer_id ? 'sold' : 'available', req.params.id]);

    try {
      await run(`INSERT INTO device_history (id, device_id, action, notes, created_by, created_at)
        VALUES ($1, $2, 'custody_change', $3, $4, CURRENT_TIMESTAMP)`,
        [uuidv4(), req.params.id, notes || `تغيير العهدة`, req.user?.id]);
    } catch (_) { }

    const updated = await get('SELECT * FROM devices WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: updated, message: 'تم تحديث العهدة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// PRODUCTS — inline handlers
// Frontend calls /api/inventory/products/*
// ═══════════════════════════════════════════════
router.get('/products', async (req, res) => {
  try {
    const { search, category_id, page = 1, limit = 50 } = req.query;
    let query = 'SELECT * FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)';
    const params = []; let idx = 1;

    if (search) { query += ` AND (name ILIKE $${idx} OR code ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    if (category_id) { query += ` AND category_id = $${idx++}`; params.push(category_id); }

    query += ' ORDER BY name';
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const rows = await all(query, params).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { name, code, barcode, price, quantity, category_id, brand, model, description, min_quantity } = req.body;
    const id = uuidv4();
    await run(
      `INSERT INTO products (id, name, code, barcode, price, quantity, category_id, brand, model, description, min_quantity, created_at, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, 0)`,
      [id, name, code || null, barcode || null, price || 0, quantity || 0, category_id || null, brand || null, model || null, description || null, min_quantity || 5]
    );
    const row = await get('SELECT * FROM products WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { name, code, barcode, price, quantity, category_id, brand, model, description, min_quantity } = req.body;
    await run(
      `UPDATE products SET name = COALESCE($1, name), code = COALESCE($2, code), barcode = COALESCE($3, barcode),
       price = COALESCE($4, price), quantity = COALESCE($5, quantity), category_id = COALESCE($6, category_id),
       brand = COALESCE($7, brand), model = COALESCE($8, model), description = COALESCE($9, description),
       min_quantity = COALESCE($10, min_quantity), updated_at = CURRENT_TIMESTAMP WHERE id = $11`,
      [name, code, barcode, price, quantity, category_id, brand, model, description, min_quantity, req.params.id]
    );
    const row = await get('SELECT * FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

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

    const totalValue = await get(
      'SELECT COALESCE(SUM(selling_price), 0) as v FROM devices WHERE warehouse_id = $1 AND is_deleted = 0', [req.params.id]
    ).then(r => Number(r?.v) || 0).catch(() => 0);

    res.json({ success: true, data: { ...warehouse, device_count: deviceCount, total_value: totalValue } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// PARTS & ACCESSORIES
// ═══════════════════════════════════════════════
router.get('/parts', async (req, res) => {
  try {
    const { search } = req.query;
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
    const countResult = await get("SELECT COUNT(*) as c FROM devices WHERE serial_number LIKE $1", [`BI-${year}-%`]);
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
// ═══════════════════════════════════════════════
// STOCK COUNT (الجرد)
// ═══════════════════════════════════════════════
router.get('/stock-counts', async (req, res) => {
  try {
    const rows = await all(`
      SELECT sc.*, u.full_name as created_by_name,
        (SELECT COUNT(*)::int FROM stock_count_items WHERE stock_count_id = sc.id) as item_count,
        (SELECT COUNT(*)::int FROM stock_count_items WHERE stock_count_id = sc.id AND actual_quantity IS NOT NULL) as counted_items
      FROM stock_counts sc
      LEFT JOIN users u ON sc.created_by = u.id
      ORDER BY sc.created_at DESC LIMIT 20
    `).catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

router.get('/stock-counts/:id', async (req, res) => {
  try {
    const count = await get('SELECT * FROM stock_counts WHERE id = $1', [req.params.id]);
    if (!count) return res.status(404).json({ success: false, error: 'جلسة الجرد غير موجودة' });
    const items = await all(`
      SELECT sci.*, p.name as product_name, p.barcode, p.code
      FROM stock_count_items sci
      LEFT JOIN products p ON sci.product_id = p.id
      WHERE sci.stock_count_id = $1
      ORDER BY p.name
    `, [req.params.id]).catch(() => []);
    res.json({ success: true, data: { ...count, items } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/stock-counts', async (req, res) => {
  try {
    const { warehouse_id, notes } = req.body;
    const id = uuidv4();

    // Create stock count session
    await run(
      'INSERT INTO stock_counts (id, warehouse_id, status, notes, created_by, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
      [id, warehouse_id || 'main', 'in_progress', notes || '', req.user?.id || null]
    );

    // Populate with all products
    const products = await all(
      "SELECT id, quantity FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)"
    ).catch(() => []);

    for (const p of products) {
      await run(
        'INSERT INTO stock_count_items (id, stock_count_id, product_id, expected_quantity, actual_quantity) VALUES ($1, $2, $3, $4, NULL)',
        [uuidv4(), id, p.id, p.quantity || 0]
      ).catch(() => { });
    }

    const created = await get('SELECT * FROM stock_counts WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: created, message: `تم بدء جلسة جرد (${products.length} منتج)` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/stock-counts/:id/items/:itemId', async (req, res) => {
  try {
    const { actual_quantity } = req.body;
    await run(
      'UPDATE stock_count_items SET actual_quantity = $1, counted_at = CURRENT_TIMESTAMP WHERE id = $2 AND stock_count_id = $3',
      [actual_quantity, req.params.itemId, req.params.id]
    );
    res.json({ success: true, message: 'تم تحديث الكمية' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/stock-counts/:id/complete', async (req, res) => {
  try {
    // Apply differences to products
    const items = await all(
      'SELECT * FROM stock_count_items WHERE stock_count_id = $1 AND actual_quantity IS NOT NULL',
      [req.params.id]
    ).catch(() => []);

    for (const item of items) {
      if (item.actual_quantity !== item.expected_quantity) {
        await run(
          'UPDATE products SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.actual_quantity, item.product_id]
        ).catch(() => { });
      }
    }

    await run(
      "UPDATE stock_counts SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1",
      [req.params.id]
    );

    res.json({ success: true, message: `تم إكمال الجرد وتحديث ${items.length} منتج` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
