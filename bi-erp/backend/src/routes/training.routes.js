const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const onboardingService = require('../services/onboarding.service');

router.use(auth);

router.get('/my-progress', async (req, res) => {
  try {
    const data = await onboardingService.checkProgress(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/complete-task/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const { score, notes } = req.body;
    const data = await onboardingService.completeTrainingTask(req.user.id, index, score, notes);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
