const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permissions');
const { all } = require('../config/database');

router.use(auth);
router.use(hasPermission('audit.view'));

router.get('/', async (req, res) => {
  try {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    if (req.query.user_id) params.push(req.query.user_id), sql += ' AND user_id = ?';
    if (req.query.from) params.push(req.query.from), sql += ' AND created_at >= ?';
    if (req.query.to) params.push(req.query.to), sql += ' AND created_at <= ?';
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const rows = await all(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
