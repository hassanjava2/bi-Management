const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { all, get, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

router.use(auth);

// Stats
router.get('/stats', async (req, res) => {
  try {
    const total = await get('SELECT COUNT(*) as c FROM returns').then(r => r?.c || 0).catch(() => 0);
    const pending = await get("SELECT COUNT(*) as c FROM returns WHERE status = 'pending'").then(r => r?.c || 0).catch(() => 0);
    const completed = await get("SELECT COUNT(*) as c FROM returns WHERE status = 'completed'").then(r => r?.c || 0).catch(() => 0);
    res.json({ success: true, data: { total, pending, completed, in_progress: total - pending - completed } });
  } catch (e) {
    res.json({ success: true, data: { total: 0, pending: 0, completed: 0, in_progress: 0 } });
  }
});

// Overdue
router.get('/overdue', async (req, res) => {
  try {
    const rows = await all("SELECT * FROM returns WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days' ORDER BY created_at ASC LIMIT 50");
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// Alerts
router.get('/alerts', async (req, res) => {
  try {
    const overdue = await all("SELECT * FROM returns WHERE status = 'pending' AND created_at < NOW() - INTERVAL '14 days' LIMIT 10");
    const alerts = overdue.map(r => ({ type: 'critical', message: 'مرتجع متأخر أكثر من 14 يوم', return_id: r.id }));
    res.json({ success: true, data: alerts });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM returns ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { return_number, type, original_invoice_id, customer_id, supplier_id, status, reason_details, notes } = req.body;
    const id = generateId();
    await run(
      `INSERT INTO returns (id, return_number, type, original_invoice_id, customer_id, supplier_id, status, reason_details, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, return_number || null, type || 'sale_return', original_invoice_id || null, customer_id || null, supplier_id || null, status || 'pending', reason_details || null, notes || null, req.user?.id]
    );
    const row = await get('SELECT * FROM returns WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
