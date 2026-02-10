const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { all, get, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

router.use(auth);

router.get('/vouchers', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM vouchers ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/vouchers', async (req, res) => {
  try {
    const { voucher_number, type, amount, currency, customer_id, supplier_id, notes } = req.body;
    const id = generateId();
    await run(
      `INSERT INTO vouchers (id, voucher_number, type, amount, currency, customer_id, supplier_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, voucher_number || null, type || 'receipt', parseFloat(amount) || 0, currency || 'IQD', customer_id || null, supplier_id || null, notes || null, req.user?.id]
    );
    const row = await get('SELECT * FROM vouchers WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
