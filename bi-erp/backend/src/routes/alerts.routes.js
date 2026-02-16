/**
 * BI ERP — Alerts Routes (Phase 6)
 * مسارات التنبيهات
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const alertsService = require('../services/alerts.service');

router.use(auth);

// Get all active alerts
router.get('/', async (req, res) => {
    try { res.json({ success: true, data: await alertsService.getAlerts() }); }
    catch (e) { res.json({ success: true, data: [] }); }
});

// Get alert counts only
router.get('/counts', async (req, res) => {
    try { res.json({ success: true, data: await alertsService.getAlertCounts() }); }
    catch (e) { res.json({ success: true, data: { total: 0 } }); }
});

module.exports = router;
