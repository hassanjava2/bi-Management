/**
 * BI ERP — Cashbox Routes (Phase 6)
 * مسارات الصندوق/القاصة
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const cashboxService = require('../services/cashbox.service');

router.use(auth);

// List all cashboxes
router.get('/', async (req, res) => {
    try { res.json({ success: true, data: await cashboxService.list() }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Get cashbox by ID (with movements)
router.get('/:id', async (req, res) => {
    try {
        const data = await cashboxService.getById(req.params.id);
        if (!data) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Create cashbox
router.post('/', async (req, res) => {
    try { res.json({ success: true, data: await cashboxService.create(req.body, req.user?.id) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Transfer between cashboxes
router.post('/transfer', async (req, res) => {
    try {
        const result = await cashboxService.transfer(req.body, req.user?.id);
        if (result.error) return res.status(400).json({ success: false, error: result.error });
        res.json({ success: true, data: result });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Daily summary
router.get('/:id/summary', async (req, res) => {
    try { res.json({ success: true, data: await cashboxService.dailySummary(req.params.id, req.query.date) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Reconcile
router.post('/:id/reconcile', async (req, res) => {
    try {
        const result = await cashboxService.reconcile(req.params.id, req.body.actual_balance, req.body.notes, req.user?.id);
        if (result.error) return res.status(400).json({ success: false, error: result.error });
        res.json({ success: true, data: result });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
