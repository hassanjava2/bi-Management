/**
 * BI ERP — Accounting Routes (refactored)
 * Thin routing layer — logic in accounting.service.js
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const acct = require('../services/accounting.service');
const logger = require('../utils/logger');

router.use(auth);

// ─── OVERVIEW ──────────────────────────────────
router.get('/overview', async (req, res) => {
  try { res.json({ success: true, data: await acct.getOverview() }); }
  catch (e) { logger.error('Accounting overview error', { error: e.message }); res.status(500).json({ success: false, error: 'فشل في تحميل البيانات المحاسبية' }); }
});

// ─── VOUCHERS ──────────────────────────────────
router.get('/vouchers', async (req, res) => {
  try { res.json({ success: true, data: await acct.listVouchers(req.query) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/vouchers', async (req, res) => {
  try { res.status(201).json({ success: true, data: await acct.createVoucher(req.body, req.user?.id) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── RECEIVABLES ───────────────────────────────
router.get('/receivables', async (req, res) => {
  try { res.json({ success: true, data: await acct.getReceivables() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/receivables/customer/:id', async (req, res) => {
  try {
    const data = await acct.getReceivableCustomer(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'العميل غير موجود' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── PAYABLES ──────────────────────────────────
router.get('/payables', async (req, res) => {
  try { res.json({ success: true, data: await acct.getPayables() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/payables/supplier/:id', async (req, res) => {
  try {
    const data = await acct.getPayableSupplier(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'المورد غير موجود' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── CASH BOXES ────────────────────────────────
router.get('/cash-boxes', async (req, res) => {
  try { res.json({ success: true, data: await acct.getCashBoxes() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/cash-boxes/:id', async (req, res) => {
  try { res.json({ success: true, data: await acct.getCashBox(req.params.id) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/cash-boxes/transfer', async (req, res) => {
  try { res.json({ success: true, message: 'تم التحويل بنجاح', data: await acct.transferCash(req.body, req.user?.id) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── EXPENSES ──────────────────────────────────
router.get('/expenses', async (req, res) => {
  try { res.json({ success: true, data: await acct.listExpenses(req.query) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/expenses', async (req, res) => {
  try { res.status(201).json({ success: true, data: await acct.createExpense(req.body, req.user?.id) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── REPORTS ───────────────────────────────────
router.get('/reports/profit-loss', async (req, res) => {
  try { res.json({ success: true, data: await acct.profitLoss(req.query) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/reports/cash-flow', async (req, res) => {
  try { res.json({ success: true, data: await acct.cashFlow(req.query) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/reports/debts', async (req, res) => {
  try { res.json({ success: true, data: await acct.debtsReport() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── ACCOUNT STATEMENT ─────────────────────────
router.get('/statement/:entityType/:entityId', async (req, res) => {
  try {
    const data = await acct.getStatement(req.params.entityType, req.params.entityId, req.query);
    if (!data) return res.status(404).json({ success: false, error: 'الكيان غير موجود' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── DAILY RECONCILIATION ──────────────────────
router.get('/reconciliation', async (req, res) => {
  try { res.json({ success: true, data: await acct.getReconciliation(req.query.date) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
