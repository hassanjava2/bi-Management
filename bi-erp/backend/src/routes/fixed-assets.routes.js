/**
 * BI Management - Fixed Assets API (Phase 4)
 * المواد الثابتة - أصول، ذمة موظف، صرفيات
 */
const express = require('express');
const router = express.Router();
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
    try {
        const rows = await all(`
            SELECT a.*, u.full_name as assigned_employee_name
            FROM fixed_assets a
            LEFT JOIN users u ON a.assigned_employee_id = u.id
            ORDER BY a.name
        `);
        res.json({ success: true, data: rows });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.json({ success: true, data: [] });
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { code, name, category, purchase_invoice_id, cost, is_expense_tracked } = req.body || {};
        if (!name) return res.status(400).json({ success: false, error: 'name required' });
        const id = generateId();
        await run(`INSERT INTO fixed_assets (id, code, name, category, purchase_invoice_id, cost, is_expense_tracked) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, code || null, name, category || null, purchase_invoice_id || null, parseFloat(cost || 0), !!is_expense_tracked]);
        res.status(201).json({ success: true, data: await get('SELECT * FROM fixed_assets WHERE id = ?', [id]) });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.status(501).json({ success: false, error: 'fixed_assets table not found' });
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/expense-types', async (req, res) => {
    try {
        const rows = await all('SELECT * FROM fixed_asset_expense_types ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.json({ success: true, data: [] });
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/:id/expenses', async (req, res) => {
    try {
        const rows = await all('SELECT * FROM fixed_asset_expenses WHERE asset_id = ? ORDER BY expense_date DESC', [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.json({ success: true, data: [] });
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/:id/expenses', async (req, res) => {
    try {
        const { type_id, amount, expense_date, notes } = req.body || {};
        if (amount == null) return res.status(400).json({ success: false, error: 'amount required' });
        const asset = await get('SELECT id FROM fixed_assets WHERE id = ?', [req.params.id]);
        if (!asset) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        const id = generateId();
        await run(`INSERT INTO fixed_asset_expenses (id, asset_id, type_id, amount, expense_date, notes) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, req.params.id, type_id || null, parseFloat(amount), expense_date || now().slice(0, 10), notes || null]);
        res.status(201).json({ success: true, data: await get('SELECT * FROM fixed_asset_expenses WHERE id = ?', [id]) });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.status(501).json({ success: false, error: 'table not found' });
        res.status(500).json({ success: false, error: e.message });
    }
});

router.patch('/:id/assign', async (req, res) => {
    try {
        const { employee_id } = req.body || {};
        const at = now();
        await run(`UPDATE fixed_assets SET assigned_employee_id = ?, assigned_at = ?, custody_status = 'assigned' WHERE id = ?`, [employee_id || null, at, req.params.id]);
        res.json({ success: true, data: await get('SELECT * FROM fixed_assets WHERE id = ?', [req.params.id]) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
