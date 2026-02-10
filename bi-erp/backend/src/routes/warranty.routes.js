const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { all, get, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM warranty_claims ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { claim_number, product_id, customer_id, status, description } = req.body;
    const id = generateId();
    await run(
      `INSERT INTO warranty_claims (id, claim_number, product_id, customer_id, status, description) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, claim_number || null, product_id || null, customer_id || null, status || 'pending', description || null]
    );
    const row = await get('SELECT * FROM warranty_claims WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
