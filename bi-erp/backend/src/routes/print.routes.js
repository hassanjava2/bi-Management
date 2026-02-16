/**
 * BI ERP — Print & Settings Routes (Phase 11)
 * مسارات الطباعة والقوالب
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const printService = require('../services/print.service');

router.use(auth);

// Print settings
router.get('/print', async (req, res) => {
    try { res.json({ success: true, data: await printService.getPrintSettings() }); }
    catch (e) { res.json({ success: true, data: {} }); }
});

router.put('/print', async (req, res) => {
    try { res.json({ success: true, data: await printService.updatePrintSettings(req.body) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Invoice templates
router.get('/templates', async (req, res) => {
    try { res.json({ success: true, data: await printService.getTemplates() }); }
    catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/templates/:id', async (req, res) => {
    try {
        const data = await printService.getTemplate(req.params.id);
        if (!data) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/templates', async (req, res) => {
    try { res.json({ success: true, data: await printService.saveTemplate(req.body) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
