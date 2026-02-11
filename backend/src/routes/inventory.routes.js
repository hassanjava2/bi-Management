/**
 * BI Management - Inventory Routes
 * مسارات المخزون
 */

const router = require('express').Router();
const { run, get, all } = require('../config/database');
const { auth } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

router.use(auth);

/**
 * GET /api/inventory
 * عرض المخزون
 */
router.get('/', async (req, res) => {
    try {
        const { warehouse_id, low_stock } = req.query;
        
        let query = `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];
        
        if (low_stock === 'true') {
            query += ` AND p.quantity < p.min_quantity`;
        }
        
        query += ` ORDER BY p.name LIMIT 100`;
        
        const products = await all(query, params);
        
        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/inventory/movements
 * حركات المخزون
 */
router.get('/movements', async (req, res) => {
    try {
        const movements = await all(`
            SELECT im.*, p.name as product_name
            FROM inventory_movements im
            LEFT JOIN products p ON im.product_id = p.id
            ORDER BY im.created_at DESC
            LIMIT 50
        `);
        
        res.json({
            success: true,
            data: movements
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/inventory/movements
 * إضافة حركة مخزون
 */
router.post('/movements', async (req, res) => {
    try {
        const { product_id, type, quantity, reason, notes } = req.body;
        const id = generateId();
        
        await run(`
            INSERT INTO inventory_movements (id, product_id, type, quantity, reason, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [id, product_id, type, quantity, reason, notes, req.user?.id]);
        
        // تحديث كمية المنتج
        const multiplier = type === 'in' ? 1 : -1;
        await run(`UPDATE products SET quantity = quantity + ? WHERE id = ?`, [quantity * multiplier, product_id]);
        
        res.status(201).json({
            success: true,
            data: { id }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/inventory/stats
 * إحصائيات المخزون
 */
router.get('/stats', async (req, res) => {
    try {
        const totalProducts = await get(`SELECT COUNT(*) as count FROM products`);
        const lowStock = await get(`SELECT COUNT(*) as count FROM products WHERE quantity < min_quantity`);
        const outOfStock = await get(`SELECT COUNT(*) as count FROM products WHERE quantity = 0`);
        const totalValue = await get(`SELECT SUM(quantity * cost_price) as value FROM products`);
        
        res.json({
            success: true,
            data: {
                totalProducts: totalProducts?.count || 0,
                lowStock: lowStock?.count || 0,
                outOfStock: outOfStock?.count || 0,
                totalValue: totalValue?.value || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/inventory/warehouses
 * المستودعات
 */
router.get('/warehouses', async (req, res) => {
    try {
        const warehouses = await all(`SELECT * FROM warehouses ORDER BY name`);
        res.json({
            success: true,
            data: warehouses.length ? warehouses : [{ id: 'main', name: 'المخزن الرئيسي', code: 'MAIN', type: 'main' }]
        });
    } catch (error) {
        res.json({ success: true, data: [{ id: 'main', name: 'المخزن الرئيسي', code: 'MAIN', type: 'main' }] });
    }
});

/**
 * GET /api/inventory/products
 * قائمة المنتجات (للفورمات)
 */
router.get('/products', async (req, res) => {
    try {
        const products = await all(`SELECT id, name, name_ar, code, cost_price, selling_price, category_id FROM products WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL) ORDER BY name LIMIT 500`);
        res.json({ success: true, data: products });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

/**
 * GET /api/inventory/devices
 * قائمة الأجهزة/السيريالات
 */
router.get('/devices', async (req, res) => {
    try {
        const rows = await all(`
            SELECT sn.*, p.name as product_name
            FROM serial_numbers sn
            LEFT JOIN products p ON sn.product_id = p.id
            ORDER BY sn.created_at DESC
            LIMIT 200
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

/**
 * POST /api/inventory/devices
 * إضافة جهاز/سيريال جديد
 */
router.post('/devices', async (req, res) => {
    try {
        const { product_id, serial_number, supplier_id, purchase_price, warehouse_id, location_shelf, location_row } = req.body;
        if (!product_id) {
            return res.status(400).json({ success: false, error: 'product_id مطلوب' });
        }
        const id = generateId();
        const serial = serial_number && String(serial_number).trim() ? String(serial_number).trim() : `BI-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        await run(`
            INSERT INTO serial_numbers (id, serial_number, product_id, purchase_cost, supplier_id, status, warehouse_id, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, 'available', ?, CURRENT_TIMESTAMP, ?)
        `, [id, serial, product_id, purchase_price ? parseFloat(purchase_price) : null, supplier_id || null, warehouse_id || 'main', req.user?.id]);
        res.status(201).json({
            success: true,
            data: { id, serial_number: serial }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/inventory/devices/:id
 */
router.get('/devices/:id', async (req, res) => {
    try {
        const row = await get(`SELECT sn.*, p.name as product_name FROM serial_numbers sn LEFT JOIN products p ON sn.product_id = p.id WHERE sn.id = ?`, [req.params.id]);
        if (!row) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
        res.json({ success: true, data: row });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/inventory/devices/:id
 */
router.put('/devices/:id', async (req, res) => {
    try {
        const existing = await get(`SELECT id FROM serial_numbers WHERE id = ?`, [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
        const { status, warehouse_id, serial_number } = req.body;
        const updates = [];
        const params = [];
        if (status !== undefined) { updates.push('status = ?'); params.push(status); }
        if (warehouse_id !== undefined) { updates.push('warehouse_id = ?'); params.push(warehouse_id); }
        if (serial_number !== undefined) { updates.push('serial_number = ?'); params.push(String(serial_number).trim()); }
        if (updates.length === 0) {
            const row = await get(`SELECT sn.*, p.name as product_name FROM serial_numbers sn LEFT JOIN products p ON sn.product_id = p.id WHERE sn.id = ?`, [req.params.id]);
            return res.json({ success: true, data: row });
        }
        params.push(req.params.id);
        await run(`UPDATE serial_numbers SET ${updates.join(', ')} WHERE id = ?`, params);
        const row = await get(`SELECT sn.*, p.name as product_name FROM serial_numbers sn LEFT JOIN products p ON sn.product_id = p.id WHERE sn.id = ?`, [req.params.id]);
        res.json({ success: true, data: row });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/inventory/devices/:id
 */
router.delete('/devices/:id', async (req, res) => {
    try {
        const existing = await get(`SELECT id FROM serial_numbers WHERE id = ?`, [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
        await run(`DELETE FROM serial_numbers WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/inventory/devices/:id/history
 */
router.get('/devices/:id/history', async (req, res) => {
    try {
        const existing = await get(`SELECT id FROM serial_numbers WHERE id = ?`, [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
        let history = [];
        try {
            const rows = await all(`SELECT * FROM serial_number_history WHERE device_id = ? ORDER BY created_at DESC LIMIT 50`, [req.params.id]);
            history = Array.isArray(rows) ? rows : [];
        } catch (_) {
            // جدول السجل قد يكون غير موجود
        }
        res.json({ success: true, data: history });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

/**
 * POST /api/inventory/devices/:id/transfer
 */
router.post('/devices/:id/transfer', async (req, res) => {
    try {
        const existing = await get(`SELECT id, warehouse_id FROM serial_numbers WHERE id = ?`, [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
        const { warehouse_id, reason } = req.body;
        if (!warehouse_id) return res.status(400).json({ success: false, error: 'warehouse_id مطلوب' });
        await run(`UPDATE serial_numbers SET warehouse_id = ? WHERE id = ?`, [warehouse_id, req.params.id]);
        const row = await get(`SELECT sn.*, p.name as product_name FROM serial_numbers sn LEFT JOIN products p ON sn.product_id = p.id WHERE sn.id = ?`, [req.params.id]);
        res.json({ success: true, data: row });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/inventory/devices/:id/custody
 * تسجيل/تحرير ذمة جهاز
 */
router.post('/devices/:id/custody', async (req, res) => {
    try {
        const existing = await get(`SELECT id, serial_number FROM serial_numbers WHERE id = ?`, [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
        const { action, reason } = req.body; // action: 'take' or 'release'
        if (action === 'take') {
            await run(`UPDATE serial_numbers SET custody_employee_id = ?, custody_date = CURRENT_TIMESTAMP WHERE id = ?`, [req.user?.id, req.params.id]);
        } else if (action === 'release') {
            await run(`UPDATE serial_numbers SET custody_employee_id = NULL, custody_date = NULL WHERE id = ?`, [req.params.id]);
        }
        // Log to history
        try {
            const hId = generateId();
            await run(`INSERT INTO serial_number_history (id, device_id, action_type, action_details, employee_id, created_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [hId, req.params.id, action === 'take' ? 'custody_taken' : 'custody_released', reason || null, req.user?.id]);
        } catch (_) { /* history table might not exist */ }
        const row = await get(`SELECT sn.*, p.name as product_name FROM serial_numbers sn LEFT JOIN products p ON sn.product_id = p.id WHERE sn.id = ?`, [req.params.id]);
        res.json({ success: true, data: row });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/inventory/devices/:id/inspect
 * تسجيل نتيجة فحص جهاز
 */
router.post('/devices/:id/inspect', async (req, res) => {
    try {
        const existing = await get(`SELECT id, serial_number FROM serial_numbers WHERE id = ?`, [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
        const { result, actual_specs, discrepancies, condition_notes, photos } = req.body;
        // result: 'pass' | 'pass_with_notes' | 'fail' | 'return_to_supplier'
        let newStatus = 'available';
        if (result === 'fail') newStatus = 'defective';
        if (result === 'return_to_supplier') newStatus = 'return_to_supplier';
        if (result === 'pass' || result === 'pass_with_notes') newStatus = 'ready_for_prep';

        await run(`UPDATE serial_numbers SET status = ?, inspection_result = ?, inspection_notes = ?, inspected_by = ?, inspected_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [newStatus, result || null, condition_notes || null, req.user?.id, req.params.id]);

        // Log to history
        try {
            const hId = generateId();
            await run(`INSERT INTO serial_number_history (id, device_id, action_type, action_details, employee_id, created_at)
                 VALUES (?, ?, 'inspected', ?, ?, CURRENT_TIMESTAMP)`,
                [hId, req.params.id, JSON.stringify({ result, discrepancies: discrepancies || null }), req.user?.id]);
        } catch (_) { /* history table might not exist */ }

        const row = await get(`SELECT sn.*, p.name as product_name FROM serial_numbers sn LEFT JOIN products p ON sn.product_id = p.id WHERE sn.id = ?`, [req.params.id]);
        if (result === 'pass' || result === 'pass_with_notes') {
            try {
                const eventBus = require('../services/ai-distribution/event-bus');
                eventBus.emit(eventBus.EVENT_TYPES.INSPECTION_COMPLETE, { device_id: req.params.id, deviceId: req.params.id, result, inspection_result: result });
            } catch (_) { /* optional */ }
        }
        res.json({ success: true, data: row });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/inventory/devices/:id/prepare
 * بدء/إكمال تجهيز جهاز
 */
router.post('/devices/:id/prepare', async (req, res) => {
    try {
        const existing = await get(`SELECT id, serial_number, status FROM serial_numbers WHERE id = ?`, [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
        const { action, checklist, notes } = req.body;
        // action: 'start' or 'complete'
        if (action === 'start') {
            await run(`UPDATE serial_numbers SET status = 'preparing', prep_started_at = CURRENT_TIMESTAMP, prep_employee_id = ? WHERE id = ?`,
                [req.user?.id, req.params.id]);
        } else if (action === 'complete') {
            await run(`UPDATE serial_numbers SET status = 'ready_to_sell', warehouse_id = 'main', prep_completed_at = CURRENT_TIMESTAMP, prep_notes = ? WHERE id = ?`,
                [notes || null, req.params.id]);
        }
        // Log
        try {
            const hId = generateId();
            await run(`INSERT INTO serial_number_history (id, device_id, action_type, action_details, employee_id, created_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [hId, req.params.id, action === 'start' ? 'prep_started' : 'prep_completed', JSON.stringify({ checklist, notes }), req.user?.id]);
        } catch (_) {}
        const row = await get(`SELECT sn.*, p.name as product_name FROM serial_numbers sn LEFT JOIN products p ON sn.product_id = p.id WHERE sn.id = ?`, [req.params.id]);
        res.json({ success: true, data: row });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/inventory/generate-serial
 * توليد سيريال جديد
 */
router.post('/generate-serial', async (req, res) => {
    try {
        const year = new Date().getFullYear();
        const lastSerial = await get(`SELECT serial_number FROM serial_numbers WHERE serial_number LIKE ? ORDER BY serial_number DESC LIMIT 1`, [`BI-${year}-%`]);
        let nextNum = 1;
        if (lastSerial && lastSerial.serial_number) {
            const parts = lastSerial.serial_number.split('-');
            const lastNum = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }
        const serial = `BI-${year}-${String(nextNum).padStart(6, '0')}`;
        res.json({ success: true, data: { serial_number: serial } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/inventory/low-stock
 * المنتجات منخفضة المخزون
 */
router.get('/low-stock', async (req, res) => {
    try {
        const items = await all(`SELECT * FROM products WHERE quantity < min_quantity AND (is_deleted IS NOT TRUE OR is_deleted IS NULL) ORDER BY quantity ASC LIMIT 50`);
        res.json({ success: true, data: items });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

/**
 * GET /api/inventory/parts
 * القطع والإكسسوارات
 */
router.get('/parts', async (req, res) => {
    try {
        let rows = [];
        try {
            rows = await all(`SELECT * FROM parts WHERE (is_active IS NOT FALSE OR is_active IS NULL) ORDER BY name LIMIT 200`);
        } catch (e) {
            // parts table might not exist
            rows = [];
        }
        res.json({ success: true, data: rows });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

/**
 * POST /api/inventory/parts
 * إضافة قطعة/إكسسوار
 */
router.post('/parts', async (req, res) => {
    try {
        const { name, category, quantity, cost_price, selling_price, warehouse_id } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'name مطلوب' });
        const id = generateId();
        await run(`INSERT INTO parts (id, name, category, quantity, cost_price, selling_price, warehouse_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [id, name, category || null, quantity || 0, cost_price || 0, selling_price || 0, warehouse_id || null]);
        res.status(201).json({ success: true, data: { id, name } });
    } catch (error) {
        if (error.message && error.message.includes('no such table')) {
            return res.status(501).json({ success: false, error: 'parts table not found' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
