const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permissions');
const { get, all, run } = require('../config/database');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM settings');
    const data = {};
    for (const r of rows) data[r.key] = r.value;
    res.json({ success: true, data });
  } catch (e) {
    // If the settings table doesn't exist, return defaults instead of crashing
    if (e.message && (e.message.includes('does not exist') || e.code === '42P01')) {
      console.warn('[Settings] Table not found, returning defaults');
      return res.json({ success: true, data: {} });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/', hasPermission('settings.manage'), async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, String(value)]);
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
