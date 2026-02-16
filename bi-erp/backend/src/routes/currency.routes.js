/**
 * BI ERP — Currency & Exchange Rate Routes
 */
const express = require('express');
const router = express.Router();
const currencyService = require('../services/currency.service');
const { auditMiddleware, logAudit } = require('../middleware/audit.middleware');
const logger = require('../utils/logger');

function ok(res, data) { res.json({ success: true, data }); }
function err(res, msg, code = 500) { res.status(code).json({ success: false, error: msg }); }

// ─── Currencies ────────────────────────
router.get('/currencies', async (req, res) => {
    try { ok(res, await currencyService.listCurrencies()); }
    catch (e) { logger.error('List currencies', e); err(res, e.message); }
});

router.post('/currencies', async (req, res) => {
    try {
        const c = await currencyService.createCurrency(req.body);
        await logAudit('currency', c.id, 'create', null, req.body, req);
        ok(res, c);
    } catch (e) { logger.error('Create currency', e); err(res, e.message); }
});

router.put('/currencies/:id', async (req, res) => {
    try {
        const old = await currencyService.getCurrency(req.params.id);
        const c = await currencyService.updateCurrency(req.params.id, req.body);
        if (!c) return err(res, 'لا توجد تغييرات', 400);
        await logAudit('currency', req.params.id, 'update', old, req.body, req);
        ok(res, c);
    } catch (e) { logger.error('Update currency', e); err(res, e.message); }
});

router.put('/currencies/:id/default', async (req, res) => {
    try {
        const c = await currencyService.setDefault(req.params.id);
        await logAudit('currency', req.params.id, 'set_default', null, null, req);
        ok(res, c);
    } catch (e) { logger.error('Set default currency', e); err(res, e.message); }
});

router.delete('/currencies/:id', async (req, res) => {
    try {
        const result = await currencyService.deleteCurrency(req.params.id);
        if (result.error) return err(res, result.error, 400);
        await logAudit('currency', req.params.id, 'delete', null, null, req);
        ok(res, result);
    } catch (e) { logger.error('Delete currency', e); err(res, e.message); }
});

// ─── Exchange Rates ────────────────────
router.get('/exchange-rates', async (req, res) => {
    try { ok(res, await currencyService.listExchangeRates(req.query)); }
    catch (e) { logger.error('List exchange rates', e); err(res, e.message); }
});

router.post('/exchange-rates', async (req, res) => {
    try {
        const r = await currencyService.setExchangeRate(req.body, req.user?.id);
        await logAudit('exchange_rate', null, 'set', null, req.body, req);
        ok(res, r);
    } catch (e) { logger.error('Set exchange rate', e); err(res, e.message); }
});

router.get('/exchange-rates/convert', async (req, res) => {
    try {
        const { amount, from, to, date } = req.query;
        const result = await currencyService.convert(parseFloat(amount || 0), from || 'IQD', to || 'USD', date);
        ok(res, { amount: parseFloat(amount), from, to, result });
    } catch (e) { logger.error('Convert currency', e); err(res, e.message); }
});

module.exports = router;
