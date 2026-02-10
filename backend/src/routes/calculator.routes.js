/**
 * BI Management - Online Calculator API (Phase 9)
 * محادثة علنية ومسار دوري للمندوبين
 */
const express = require('express');
const router = express.Router();
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/chat', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const rows = await all(`SELECT m.*, u.full_name FROM calculator_chat_messages m LEFT JOIN users u ON u.id = m.user_id ORDER BY m.created_at DESC LIMIT ?`, [Math.min(parseInt(limit) || 50, 100)]);
        res.json({ success: true, data: rows.reverse() });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.json({ success: true, data: [] });
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body || {};
        if (!message || !String(message).trim()) return res.status(400).json({ success: false, error: 'message required' });
        const id = generateId();
        await run(`INSERT INTO calculator_chat_messages (id, user_id, message) VALUES (?, ?, ?)`, [id, req.user?.id, String(message).trim()]);
        res.status(201).json({ success: true, data: await get('SELECT * FROM calculator_chat_messages WHERE id = ?', [id]) });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.status(501).json({ success: false, error: 'table not found' });
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/routes', async (req, res) => {
    try {
        const { rep_id, schedule_date } = req.query;
        let query = `SELECT r.*, c.name as customer_name FROM rep_route_schedule r LEFT JOIN customers c ON c.id = r.customer_id WHERE 1=1`;
        const params = [];
        if (rep_id) { query += ` AND r.rep_id = ?`; params.push(rep_id); }
        if (schedule_date) { query += ` AND r.schedule_date = ?`; params.push(schedule_date); }
        query += ` ORDER BY r.schedule_date, r.stop_order`;
        const rows = await all(query, params);
        res.json({ success: true, data: rows });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.json({ success: true, data: [] });
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/routes', async (req, res) => {
    try {
        const { rep_id, schedule_date, customer_id, stop_order, notes } = req.body || {};
        if (!rep_id || !schedule_date) return res.status(400).json({ success: false, error: 'rep_id and schedule_date required' });
        const id = generateId();
        await run(`INSERT INTO rep_route_schedule (id, rep_id, schedule_date, stop_order, customer_id, notes) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, rep_id, schedule_date, parseInt(stop_order || 0), customer_id || null, notes || null]);
        res.status(201).json({ success: true, data: await get('SELECT * FROM rep_route_schedule WHERE id = ?', [id]) });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.status(501).json({ success: false, error: 'table not found' });
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
