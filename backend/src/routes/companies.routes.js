/**
 * BI Management - Companies API (Phase 3)
 * الشركات للتصنيف الرئيسي متعدد الشركات
 */
const express = require('express');
const router = express.Router();
const { run, get, all } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
    try {
        const rows = await all('SELECT * FROM companies WHERE 1=1 ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.json({ success: true, data: [] });
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { code, name, name_ar } = req.body || {};
        if (!name) return res.status(400).json({ success: false, error: 'name required' });
        const id = generateId();
        await run(`INSERT INTO companies (id, code, name, name_ar) VALUES (?, ?, ?, ?)`,
            [id, code || null, name, name_ar || null]);
        res.status(201).json({ success: true, data: await get('SELECT * FROM companies WHERE id = ?', [id]) });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.status(501).json({ success: false, error: 'companies table not found' });
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
