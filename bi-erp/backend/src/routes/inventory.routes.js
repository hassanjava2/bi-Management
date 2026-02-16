/**
 * BI ERP — Inventory Routes (refactored)
 * Thin routing — logic in inventory.service.js + inventory.controller.js
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventory.controller');
const { auth } = require('../middleware/auth');
const svc = require('../services/inventory.service');

router.use(auth);

// ─── STATS (controller) ───────────────────────
router.get('/stats', controller.stats);

// ═════════════════════════════════════════════════
// DEVICES
// ═════════════════════════════════════════════════
router.get('/devices', async (req, res) => {
  try { const r = await svc.listDevices(req.query); res.json({ success: true, data: r.rows, pagination: r.pagination }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/devices/scan/:code', async (req, res) => {
  try { const r = await svc.scanDevice(req.params.code); res.json({ success: true, ...r }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/devices/:id', async (req, res) => {
  try {
    const data = await svc.getDevice(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/devices', async (req, res) => {
  try { const d = await svc.createDevice(req.body, req.user?.id); res.status(201).json({ success: true, data: d, message: `تم إنشاء الجهاز ${d.serial_number}` }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/devices/:id', async (req, res) => {
  try {
    const d = await svc.updateDevice(req.params.id, req.body);
    if (!d) return res.status(400).json({ success: false, error: 'لا توجد تحديثات' });
    res.json({ success: true, data: d });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/devices/:id', async (req, res) => {
  try { await svc.deleteDevice(req.params.id); res.json({ success: true, message: 'تم حذف الجهاز' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/devices/:id/history', async (req, res) => {
  try { res.json({ success: true, data: await svc.getDeviceHistory(req.params.id) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.post('/devices/:id/transfer', async (req, res) => {
  try {
    const d = await svc.transferDevice(req.params.id, req.body, req.user?.id);
    if (!d) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
    res.json({ success: true, data: d, message: 'تم نقل الجهاز' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/devices/:id/custody', async (req, res) => {
  try { res.json({ success: true, data: await svc.custodyDevice(req.params.id, req.body, req.user?.id), message: 'تم تحديث العهدة' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ═════════════════════════════════════════════════
// PRODUCTS
// ═════════════════════════════════════════════════
router.get('/products', async (req, res) => {
  try { res.json({ success: true, data: await svc.listProducts(req.query) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/products/:id', async (req, res) => {
  try {
    const row = await svc.getProduct(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    res.json({ success: true, data: row });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/products', async (req, res) => {
  try { res.status(201).json({ success: true, data: await svc.createProduct(req.body) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/products/:id', async (req, res) => {
  try { res.json({ success: true, data: await svc.updateProduct(req.params.id, req.body) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ═════════════════════════════════════════════════
// WAREHOUSES
// ═════════════════════════════════════════════════
router.get('/warehouses', async (req, res) => {
  try { res.json({ success: true, data: await svc.listWarehouses() }); }
  catch (e) { res.json({ success: true, data: [{ id: 'main', name: 'المخزن الرئيسي', location: 'الرئيسي' }] }); }
});

router.get('/warehouses/:id/stats', async (req, res) => {
  try {
    const data = await svc.getWarehouseStats(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'المخزن غير موجود' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ═════════════════════════════════════════════════
// PARTS
// ═════════════════════════════════════════════════
router.get('/parts', async (req, res) => {
  try { res.json({ success: true, data: await svc.listParts(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.post('/parts', async (req, res) => {
  try { res.status(201).json({ success: true, data: await svc.createPart(req.body) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/parts/:id', async (req, res) => {
  try { res.json({ success: true, data: await svc.updatePart(req.params.id, req.body) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ═════════════════════════════════════════════════
// MOVEMENTS (controller)
// ═════════════════════════════════════════════════
router.get('/movements', controller.movements);
router.post('/movements', controller.addMovement);

// ═════════════════════════════════════════════════
// ALERTS
// ═════════════════════════════════════════════════
router.get('/low-stock', async (req, res) => {
  try { res.json({ success: true, data: await svc.getLowStock() }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/alerts', async (req, res) => {
  try { res.json({ success: true, data: await svc.getAlerts() }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

// ═════════════════════════════════════════════════
// SERIAL GENERATION
// ═════════════════════════════════════════════════
router.post('/generate-serial', async (req, res) => {
  try { res.json({ success: true, data: { serial_number: await svc.generateSerial() } }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ═════════════════════════════════════════════════
// GENERIC (backwards compat — controller)
// ═════════════════════════════════════════════════
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);

// ═════════════════════════════════════════════════
// STOCK COUNTS
// ═════════════════════════════════════════════════
router.get('/stock-counts', async (req, res) => {
  try { res.json({ success: true, data: await svc.listStockCounts() }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/stock-counts/:id', async (req, res) => {
  try {
    const data = await svc.getStockCount(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'جلسة الجرد غير موجودة' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/stock-counts', async (req, res) => {
  try {
    const { data, count } = await svc.createStockCount(req.body, req.user?.id);
    res.status(201).json({ success: true, data, message: `تم بدء جلسة جرد (${count} منتج)` });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/stock-counts/:id/items/:itemId', async (req, res) => {
  try { await svc.updateStockCountItem(req.params.id, req.params.itemId, req.body.actual_quantity); res.json({ success: true, message: 'تم تحديث الكمية' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/stock-counts/:id/complete', async (req, res) => {
  try { const n = await svc.completeStockCount(req.params.id); res.json({ success: true, message: `تم إكمال الجرد وتحديث ${n} منتج` }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
