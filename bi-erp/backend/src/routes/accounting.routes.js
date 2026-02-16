/**
 * BI ERP — Accounting Routes (Phase 3 Enhanced)
 * Thin routing layer — logic in accounting.service.js + voucher.service.js
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const acct = require('../services/accounting.service');
const voucher = require('../services/voucher.service');
const logger = require('../utils/logger');

router.use(auth);

// ─── OVERVIEW ──────────────────────────────────
router.get('/overview', async (req, res) => {
  try { res.json({ success: true, data: await acct.getOverview() }); }
  catch (e) { logger.error('Accounting overview error', { error: e.message }); res.status(500).json({ success: false, error: 'فشل في تحميل البيانات المحاسبية' }); }
});

// ═══ VOUCHERS — Full CRUD ═══════════════════════

// List + search
router.get('/vouchers', async (req, res) => {
  try { res.json({ success: true, data: await voucher.list(req.query) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Stats
router.get('/vouchers/stats', async (req, res) => {
  try { res.json({ success: true, data: await voucher.getStats() }); }
  catch (e) { res.json({ success: true, data: {} }); }
});

// Get one
router.get('/vouchers/:id', async (req, res) => {
  try {
    const data = await voucher.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'السند غير موجود' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Generic create
router.post('/vouchers', async (req, res) => {
  try { res.status(201).json({ success: true, data: await voucher.create(req.body, req.user?.id) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Typed creates
router.post('/vouchers/receipt', async (req, res) => {
  try { res.status(201).json({ success: true, data: await voucher.createReceipt(req.body, req.user?.id), message: 'تم إنشاء سند القبض' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/vouchers/payment', async (req, res) => {
  try { res.status(201).json({ success: true, data: await voucher.createPayment(req.body, req.user?.id), message: 'تم إنشاء سند الدفع' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/vouchers/expense', async (req, res) => {
  try { res.status(201).json({ success: true, data: await voucher.createExpense(req.body, req.user?.id), message: 'تم إنشاء سند الصرف' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/vouchers/exchange', async (req, res) => {
  try { res.status(201).json({ success: true, data: await voucher.createExchange(req.body, req.user?.id), message: 'تم صيرفة المبلغ' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/vouchers/hawala', async (req, res) => {
  try { res.status(201).json({ success: true, data: await voucher.createHawala(req.body, req.user?.id), message: 'تم إنشاء الحوالة' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/vouchers/journal', async (req, res) => {
  try { res.status(201).json({ success: true, data: await voucher.createJournal(req.body, req.user?.id), message: 'تم إنشاء القيد المحاسبي' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Cancel voucher
router.post('/vouchers/:id/cancel', async (req, res) => {
  try {
    const result = await voucher.cancelVoucher(req.params.id, req.body.reason, req.user?.id);
    if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'السند غير موجود' });
    if (result.error === 'ALREADY_CANCELLED') return res.status(400).json({ success: false, error: 'السند ملغي بالفعل' });
    res.json({ success: true, data: result.data, message: 'تم إلغاء السند' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
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

// ═══ Phase 6: Multi-Party Vouchers ═══

router.post('/vouchers/multi-receipt', async (req, res) => {
  try { res.json({ success: true, data: await voucher.createMultiReceipt(req.body, req.user?.id) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/vouchers/multi-payment', async (req, res) => {
  try { res.json({ success: true, data: await voucher.createMultiPayment(req.body, req.user?.id) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/vouchers/profit-distribution', async (req, res) => {
  try { res.json({ success: true, data: await voucher.createProfitDistribution(req.body, req.user?.id) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
