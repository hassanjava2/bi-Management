const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/permissions');

router.use(auth);
router.use(adminOnly);

router.get('/status', (req, res) => {
  res.json({ success: true, data: { enabled: false, message: 'النسخ الاحتياطي يمكن إضافته لاحقاً' } });
});

module.exports = router;
