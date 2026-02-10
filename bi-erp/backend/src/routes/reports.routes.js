const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { get } = require('../config/database');

router.use(auth);

router.get('/summary', async (req, res) => {
  try {
    const users = await get('SELECT COUNT(*) as c FROM users WHERE is_active = TRUE').then(r => r?.c || 0);
    const customers = await get('SELECT COUNT(*) as c FROM customers WHERE (is_deleted = FALSE OR is_deleted IS NULL)').then(r => r?.c || 0);
    const invoices = await get('SELECT COUNT(*) as c FROM invoices WHERE (is_deleted = FALSE OR is_deleted IS NULL)').then(r => r?.c || 0);
    res.json({ success: true, data: { users, customers, invoices } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
