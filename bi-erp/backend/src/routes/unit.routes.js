/**
 * BI ERP — Unit, Customer Type, Product Price Routes
 */
const express = require('express');
const router = express.Router();
const unitService = require('../services/unit.service');
const { logAudit } = require('../middleware/audit.middleware');
const logger = require('../utils/logger');

function ok(res, data) { res.json({ success: true, data }); }
function err(res, msg, code = 500) { res.status(code).json({ success: false, error: msg }); }

// ─── Units ─────────────────────────────
router.get('/units', async (req, res) => {
    try { ok(res, await unitService.listUnits()); }
    catch (e) { logger.error('List units', e); err(res, e.message); }
});

router.post('/units', async (req, res) => {
    try {
        const u = await unitService.createUnit(req.body);
        ok(res, u);
    } catch (e) { logger.error('Create unit', e); err(res, e.message); }
});

router.put('/units/:id', async (req, res) => {
    try {
        const u = await unitService.updateUnit(req.params.id, req.body);
        if (!u) return err(res, 'لا توجد تغييرات', 400);
        ok(res, u);
    } catch (e) { logger.error('Update unit', e); err(res, e.message); }
});

router.delete('/units/:id', async (req, res) => {
    try { ok(res, await unitService.deleteUnit(req.params.id)); }
    catch (e) { logger.error('Delete unit', e); err(res, e.message); }
});

// ─── Product Units ─────────────────────
router.get('/products/:productId/units', async (req, res) => {
    try { ok(res, await unitService.getProductUnits(req.params.productId)); }
    catch (e) { logger.error('Get product units', e); err(res, e.message); }
});

router.post('/products/:productId/units', async (req, res) => {
    try { ok(res, await unitService.setProductUnit(req.params.productId, req.body)); }
    catch (e) { logger.error('Set product unit', e); err(res, e.message); }
});

router.delete('/products/:productId/units/:unitId', async (req, res) => {
    try { ok(res, await unitService.removeProductUnit(req.params.productId, req.params.unitId)); }
    catch (e) { logger.error('Remove product unit', e); err(res, e.message); }
});

// ─── Customer Types ────────────────────
router.get('/customer-types', async (req, res) => {
    try { ok(res, await unitService.listCustomerTypes()); }
    catch (e) { logger.error('List customer types', e); err(res, e.message); }
});

router.post('/customer-types', async (req, res) => {
    try { ok(res, await unitService.createCustomerType(req.body)); }
    catch (e) { logger.error('Create customer type', e); err(res, e.message); }
});

router.put('/customer-types/:id', async (req, res) => {
    try {
        const ct = await unitService.updateCustomerType(req.params.id, req.body);
        if (!ct) return err(res, 'لا توجد تغييرات', 400);
        ok(res, ct);
    } catch (e) { logger.error('Update customer type', e); err(res, e.message); }
});

// ─── Product Prices ────────────────────
router.get('/products/:productId/prices', async (req, res) => {
    try { ok(res, await unitService.getProductPrices(req.params.productId)); }
    catch (e) { logger.error('Get product prices', e); err(res, e.message); }
});

router.post('/products/:productId/prices', async (req, res) => {
    try { ok(res, await unitService.setProductPrice(req.params.productId, req.body)); }
    catch (e) { logger.error('Set product price', e); err(res, e.message); }
});

router.get('/products/:productId/price-for-type/:typeId', async (req, res) => {
    try {
        const { currency } = req.query;
        ok(res, await unitService.getPriceForCustomerType(req.params.productId, req.params.typeId, currency));
    } catch (e) { logger.error('Get price for type', e); err(res, e.message); }
});

// ─── Audit Log ─────────────────────────
const { getAuditHistory, getRecentAudit } = require('../middleware/audit.middleware');

router.get('/audit-log', async (req, res) => {
    try { ok(res, await getRecentAudit(req.query)); }
    catch (e) { logger.error('Get audit log', e); err(res, e.message); }
});

router.get('/audit-log/:entityType/:entityId', async (req, res) => {
    try { ok(res, await getAuditHistory(req.params.entityType, req.params.entityId)); }
    catch (e) { logger.error('Get audit history', e); err(res, e.message); }
});

module.exports = router;
