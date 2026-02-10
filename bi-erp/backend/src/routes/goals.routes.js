const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const goalsService = require('../services/goals.service');

router.use(auth);

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
