/**
 * BI ERP — Analytics Routes (Phase 10)
 * مسارات التحليلات ولوحة التحكم
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const analytics = require('../services/analytics.service');

router.use(auth);

router.get('/dashboard-summary', async (req, res) => {
    try { res.json({ success: true, data: await analytics.dashboardSummary() }); }
    catch (e) { res.json({ success: true, data: {} }); }
});

router.get('/top-profit-customers', async (req, res) => {
    try { res.json({ success: true, data: await analytics.topProfitCustomers(req.query) }); }
    catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/top-consumed', async (req, res) => {
    try { res.json({ success: true, data: await analytics.topConsumed(req.query) }); }
    catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/best-paying-customers', async (req, res) => {
    try { res.json({ success: true, data: await analytics.bestPayingCustomers(req.query) }); }
    catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/top-salespeople', async (req, res) => {
    try { res.json({ success: true, data: await analytics.topSalespeople(req.query) }); }
    catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/top-areas', async (req, res) => {
    try { res.json({ success: true, data: await analytics.topAreas(req.query) }); }
    catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/invoice-trend', async (req, res) => {
    try { res.json({ success: true, data: await analytics.recentInvoiceTrend(req.query) }); }
    catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/underperforming', async (req, res) => {
    try { res.json({ success: true, data: await analytics.underperformingSalespeople(req.query) }); }
    catch (e) { res.json({ success: true, data: [] }); }
});

module.exports = router;
