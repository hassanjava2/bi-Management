const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const cameraService = require('../services/camera.service');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const data = await cameraService.list();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const data = await cameraService.getStats();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
