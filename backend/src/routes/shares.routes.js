/**
 * BI Management - Shares API (Phase 11)
 * نظام الأسهم: ثابتة القيمة متغيرة العدد / ثابتة العدد متغيرة القيمة
 */
const express = require('express');
const router = express.Router();
const { get, all } = require('../config/database');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/config', async (req, res) => {
    try {
        const row = get(`SELECT value FROM settings WHERE key = 'share_system_type'`);
        const share_system_type = row?.value || 'fixed_value_variable_count';
        res.json({
            success: true,
            data: {
                share_system_type,
                modes: ['fixed_value_variable_count', 'fixed_count_variable_value']
            }
        });
    } catch (e) {
        res.json({ success: true, data: { share_system_type: 'fixed_value_variable_count', modes: ['fixed_value_variable_count', 'fixed_count_variable_value'] } });
    }
});

router.get('/summary', async (req, res) => {
    try {
        const shareholders = all(`SELECT * FROM shareholders ORDER BY name LIMIT 100`);
        const totalShares = shareholders.reduce((s, sh) => s + (parseFloat(sh.shares_count) ?? parseFloat(sh.share_percentage) ?? 0), 0);
        res.json({ success: true, data: { shareholders, total_shares: totalShares } });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.json({ success: true, data: { shareholders: [], total_shares: 0 } });
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
