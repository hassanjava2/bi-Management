/**
 * BI Management - Shares API (Phase 11)
 * نظام الأسهم: ثابتة القيمة متغيرة العدد / ثابتة العدد متغيرة القيمة
 */
const express = require('express');
const router = express.Router();
const { run, get, all } = require('../config/database');
const { auth } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

router.use(auth);

// Tables shareholders, share_distributions, share_distribution_items are created via migrations.

router.get('/config', async (req, res) => {
    try {
        const row = await get(`SELECT value FROM settings WHERE key = 'share_system_type'`);
        const shareValue = await get(`SELECT value FROM settings WHERE key = 'share_value'`);
        const share_system_type = row?.value || 'fixed_value_variable_count';
        res.json({
            success: true,
            data: {
                share_system_type,
                share_value: parseFloat(shareValue?.value) || 2000,
                modes: ['fixed_value_variable_count', 'fixed_count_variable_value']
            }
        });
    } catch (e) {
        res.json({ success: true, data: { share_system_type: 'fixed_value_variable_count', share_value: 2000 } });
    }
});

router.get('/summary', async (req, res) => {
    try {
        const shareholders = await all(`SELECT * FROM shareholders ORDER BY name LIMIT 100`);
        const totalShares = shareholders.reduce((s, sh) => s + (parseFloat(sh.share_percentage) || 0), 0);
        const totalValue = shareholders.reduce((s, sh) => s + (parseFloat(sh.share_value) || 0), 0);
        res.json({ success: true, data: { shareholders, total_shares: totalShares, total_value: totalValue } });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.json({ success: true, data: { shareholders: [], total_shares: 0, total_value: 0 } });
        res.status(500).json({ success: false, error: e.message });
    }
});

// Create shareholder
router.post('/shareholders', async (req, res) => {
    try {
        const { name, code, phone, share_percentage, share_value, monthly_profit, is_active } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'الاسم مطلوب' });
        const id = generateId();
        await run(`INSERT INTO shareholders (id, code, name, phone, share_percentage, share_value, monthly_profit, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, code || null, name, phone || null, share_percentage || 0, share_value || 0, monthly_profit || 0, is_active !== false]);
        res.status(201).json({ success: true, data: await get(`SELECT * FROM shareholders WHERE id = ?`, [id]) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Update shareholder
router.put('/shareholders/:id', async (req, res) => {
    try {
        const existing = await get(`SELECT id FROM shareholders WHERE id = ?`, [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, error: 'المساهم غير موجود' });
        const { name, code, phone, share_percentage, share_value, monthly_profit, is_active } = req.body;
        const updates = [];
        const params = [];
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (code !== undefined) { updates.push('code = ?'); params.push(code); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        if (share_percentage !== undefined) { updates.push('share_percentage = ?'); params.push(share_percentage); }
        if (share_value !== undefined) { updates.push('share_value = ?'); params.push(share_value); }
        if (monthly_profit !== undefined) { updates.push('monthly_profit = ?'); params.push(monthly_profit); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active !== false); }
        if (updates.length > 0) {
            params.push(req.params.id);
            await run(`UPDATE shareholders SET ${updates.join(', ')} WHERE id = ?`, params);
        }
        res.json({ success: true, data: await get(`SELECT * FROM shareholders WHERE id = ?`, [req.params.id]) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Delete shareholder
router.delete('/shareholders/:id', async (req, res) => {
    try {
        await run(`DELETE FROM shareholders WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Distribute profits
router.post('/distribute', async (req, res) => {
    try {
        const { total_profit, period, distribution } = req.body;
        if (!total_profit || !period) return res.status(400).json({ success: false, error: 'total_profit and period required' });
        const distId = generateId();
        await run(`INSERT INTO share_distributions (id, period, total_profit, distributed_by) VALUES (?, ?, ?, ?)`,
            [distId, period, total_profit, req.user?.id]);
        if (Array.isArray(distribution)) {
            for (const d of distribution) {
                const itemId = generateId();
                await run(`INSERT INTO share_distribution_items (id, distribution_id, shareholder_id, percentage, amount) VALUES (?, ?, ?, ?, ?)`,
                    [itemId, distId, d.id, d.share_percentage || 0, d.share || 0]);
            }
        }
        res.status(201).json({ success: true, data: { id: distId, period, total_profit } });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Get distribution history
router.get('/distributions', async (req, res) => {
    try {
        const distributions = await all(`SELECT * FROM share_distributions ORDER BY distributed_at DESC LIMIT 50`);
        res.json({ success: true, data: distributions });
    } catch (e) {
        res.json({ success: true, data: [] });
    }
});

module.exports = router;
