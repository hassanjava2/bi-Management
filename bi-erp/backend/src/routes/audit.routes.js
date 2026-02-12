const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permissions');
const { all, get } = require('../config/database');

router.use(auth);
router.use(hasPermission('audit.view'));

router.get('/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const [total, recent, todayCount] = await Promise.all([
      get('SELECT COUNT(*)::int as c FROM audit_logs').then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*)::int as c FROM audit_logs WHERE created_at > NOW() - INTERVAL '${days} days'`).then(r => r?.c || 0).catch(() => 0),
      get("SELECT COUNT(*)::int as c FROM audit_logs WHERE created_at::date = CURRENT_DATE").then(r => r?.c || 0).catch(() => 0),
    ]);
    res.json({ success: true, data: { total, recent, today: todayCount, period_days: days } });
  } catch (e) {
    res.json({ success: true, data: { total: 0, recent: 0, today: 0, period_days: 7 } });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const [total, today, byAction] = await Promise.all([
      get('SELECT COUNT(*) as c FROM audit_logs').then(r => r?.c || 0).catch(() => 0),
      get("SELECT COUNT(*) as c FROM audit_logs WHERE created_at::date = CURRENT_DATE").then(r => r?.c || 0).catch(() => 0),
      all('SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC LIMIT 10').catch(() => []),
    ]);
    res.json({ success: true, data: { total, today, by_action: byAction } });
  } catch (e) {
    res.json({ success: true, data: { total: 0, today: 0, by_action: [] } });
  }
});

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
