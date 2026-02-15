const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const goalsService = require('../services/goals.service');

router.use(auth);

// Root endpoint - leaderboard/overview
router.get('/', async (req, res) => {
  try {
    const data = await goalsService.getUserPoints(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: { total_points: 0, level: 1, badges: [] } });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { all } = require('../config/database');
    const rows = await all('SELECT u.id, u.full_name, u.role, COALESCE(g.total_points, 0) as points FROM users u LEFT JOIN user_goals g ON u.id = g.user_id WHERE u.is_active = 1 ORDER BY points DESC LIMIT 20');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

router.get('/my-points', async (req, res) => {
  try {
    const data = await goalsService.getUserPoints(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/my-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const data = await goalsService.getPointsHistory(req.user.id, limit, offset);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/my-stats', async (req, res) => {
  try {
    const data = await goalsService.getStats(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
