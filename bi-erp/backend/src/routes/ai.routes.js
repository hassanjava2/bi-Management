const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { get } = require('../config/database');
const aiService = require('../services/ai.service');

router.use(auth);

router.post('/chat', async (req, res) => {
  try {
    const { message, conversation_id } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'MISSING_MESSAGE' });
    }
    const user = await get('SELECT id, full_name, department_id, position_id, security_level FROM users WHERE id = ?', [req.user.id]);
    const userInfo = {
      id: req.user.id,
      full_name: user?.full_name || 'موظف',
      department_name: user?.department_id || '',
      position_name: user?.position_id || '',
      security_level: user?.security_level || 1,
    };
    const result = await aiService.chat(req.user.id, String(message).trim(), userInfo, conversation_id);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
