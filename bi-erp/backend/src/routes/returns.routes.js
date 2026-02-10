const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { all, get, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

router.use(auth);

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
