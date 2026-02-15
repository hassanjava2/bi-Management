/**
 * BI Management - Settings Routes (Complete)
 * الإعدادات — GET all, GET by key, GET by category, PUT by key
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permissions');
const { get, all, run } = require('../config/database');

router.use(auth);

// ═══════════════════════════════════════════════
// GET ALL SETTINGS
// ═══════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM settings');
    const data = {};
    for (const r of rows) data[r.key] = r.value;
    res.json({ success: true, data });
  } catch (e) {
    if (e.message && (e.message.includes('does not exist') || e.code === '42P01')) {
      return res.json({ success: true, data: {} });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// GET BY CATEGORY
// Must be before /:key to avoid conflict
// ═══════════════════════════════════════════════
router.get('/category/:category', async (req, res) => {
  try {
    const rows = await all(
      "SELECT key, value FROM settings WHERE key LIKE $1 ORDER BY key",
      [`${req.params.category}_%`]
    ).catch(() => []);
    const data = {};
    for (const r of rows) data[r.key] = r.value;
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: {} });
  }
});

// ═══════════════════════════════════════════════
// GET SINGLE SETTING BY KEY
// ═══════════════════════════════════════════════
router.get('/:key', async (req, res) => {
  try {
    const row = await get('SELECT key, value FROM settings WHERE key = $1', [req.params.key]);
    if (!row) return res.json({ success: true, data: null });
    res.json({ success: true, data: row.value });
  } catch (e) {
    res.json({ success: true, data: null });
  }
});

// ═══════════════════════════════════════════════
// UPDATE SINGLE SETTING BY KEY
// ═══════════════════════════════════════════════
router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;
    await run(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [req.params.key, String(value)]
    );
    res.json({ success: true, data: { key: req.params.key, value: String(value) } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// BULK UPDATE (backward compat)
// ═══════════════════════════════════════════════
router.put('/', hasPermission('settings.manage'), async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await run(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, String(value)]
      );
    }
    const rows = await all('SELECT key, value FROM settings');
    const data = {};
    for (const r of rows) data[r.key] = r.value;
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
