const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const attendanceService = require('../services/attendance.service');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const data = await attendanceService.list({
      user_id: req.query.user_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/today', async (req, res) => {
  try {
    const record = await attendanceService.getToday(req.user.id);
    res.json({ success: true, data: record });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/check-in', async (req, res) => {
  try {
    const result = await attendanceService.checkIn(req.user.id, req.body);
    if (result.error) return res.status(400).json({ success: false, error: result.error, message: result.message });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/check-out', async (req, res) => {
  try {
    const result = await attendanceService.checkOut(req.user.id, req.body);
    if (result.error) return res.status(400).json({ success: false, error: result.error, message: result.message });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
