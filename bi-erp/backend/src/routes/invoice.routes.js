/**
 * BI Management - Invoice Routes (Phase 2 Enhanced)
 * الفواتير — thin controller
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/invoice.controller');
const invoiceService = require('../services/invoice.service');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(auth);

// ═══ Stats ═══
router.get('/stats', async (req, res) => {
  try {
    const data = await invoiceService.getStats();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: { total: 0, today: 0, pending: 0, total_amount: 0, today_amount: 0 } });
  }
});

// ═══ Waiting ═══
router.get('/waiting', async (req, res) => {
  try {
    const data = await invoiceService.getWaiting();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ═══ List (enhanced with filters) ═══
router.get('/', async (req, res) => {
  try {
    const data = await invoiceService.list(req.query);
    res.json({ success: true, data });
  } catch (e) {
    logger.error('[Invoice.list]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Print ═══
router.get('/:id/print', async (req, res) => {
  try {
    const data = await invoiceService.getPrintData(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ History (audit log) ═══
router.get('/:id/history', async (req, res) => {
  try {
    const data = await invoiceService.getInvoiceHistory(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Expenses ═══
router.get('/:id/expenses', async (req, res) => {
  try {
    const data = await invoiceService.getExpenses(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/:id/expenses', async (req, res) => {
  try {
    const data = await invoiceService.addExpense(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/expenses/:expenseId', async (req, res) => {
  try {
    const result = await invoiceService.deleteExpense(req.params.expenseId);
    if (result.error) return res.status(404).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Get One ═══
router.get('/:id', async (req, res) => {
  try {
    const data = await invoiceService.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Create (generic) ═══
router.post('/', async (req, res) => {
  try {
    const data = await invoiceService.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data });
  } catch (e) {
    logger.error('[Invoice.create]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Typed Creates ═══
router.post('/purchase', async (req, res) => {
  try {
    const data = await invoiceService.createPurchaseInvoice(req.body, req.user?.id);
    res.status(201).json({ success: true, data, message: 'تم إنشاء فاتورة الشراء' });
  } catch (e) {
    logger.error('[Invoice.purchase]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/sale', async (req, res) => {
  try {
    const data = await invoiceService.createSaleInvoice(req.body, req.user?.id);
    res.status(201).json({ success: true, data, message: 'تم إنشاء فاتورة البيع' });
  } catch (e) {
    logger.error('[Invoice.sale]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Update ═══
router.put('/:id', async (req, res) => {
  try {
    const data = await invoiceService.updateInvoice(req.params.id, req.body, req.user?.id);
    if (!data) return res.status(400).json({ success: false, error: 'لا توجد تحديثات' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Audit (تدقيق) ═══
router.put('/:id/audit', async (req, res) => {
  try {
    const result = await invoiceService.auditInvoice(req.params.id, req.user?.id);
    if (result.error) return res.status(404).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data, message: 'تم التدقيق' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Prepare (تجهيز) ═══
router.post('/:id/prepare', async (req, res) => {
  try {
    const data = await invoiceService.prepareInvoice(req.params.id, req.user?.id);
    res.json({ success: true, data, message: 'تم بدء التحضير' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Confirm (تأكيد) ═══
router.post('/:id/confirm', async (req, res) => {
  try {
    const result = await invoiceService.confirmInvoice(req.params.id, req.user?.id);
    if (result.error) return res.status(404).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data, message: 'تم تأكيد الفاتورة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Cancel ═══
router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await invoiceService.cancelInvoice(req.params.id, req.body.reason, req.user?.id);
    if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    if (result.error === 'ALREADY_CANCELLED') return res.status(400).json({ success: false, error: 'الفاتورة ملغاة بالفعل' });
    res.json({ success: true, data: result.data, message: 'تم إلغاء الفاتورة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Transition ═══
router.post('/:id/transition', async (req, res) => {
  try {
    const result = await invoiceService.transitionStatus(req.params.id, req.body.status, req.body.notes);
    if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    if (result.error) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data, message: `تم تحويل الحالة إلى ${req.body.status}` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Convert to Active (backward compat) ═══
router.post('/:id/convert-to-active', async (req, res) => {
  try {
    const result = await invoiceService.convertToActive(req.params.id, req.user?.id);
    if (result.error) return res.status(404).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data, message: 'تم تفعيل الفاتورة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Items / Payments / Status (controller) ═══
router.post('/:id/items', controller.addItem);
router.post('/:id/payments', controller.addPayment);
router.put('/:id/status', controller.updateStatus);

// ═══ CONSUMED INVOICES ═══════════════════════
const consumedSvc = require('../services/consumed.service');

router.post('/consumed', async (req, res) => {
  try { res.status(201).json({ success: true, data: await consumedSvc.create(req.body, req.user?.id), message: 'تم إنشاء فاتورة المواد المستهلكة' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/consumed/list', async (req, res) => {
  try { res.json({ success: true, data: await consumedSvc.list(req.query) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══ DAMAGED INVOICES ════════════════════════
const damagedSvc = require('../services/damaged.service');

router.post('/damaged', async (req, res) => {
  try { res.status(201).json({ success: true, data: await damagedSvc.create(req.body, req.user?.id), message: 'تم إنشاء فاتورة المواد التالفة' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/damaged/list', async (req, res) => {
  try { res.json({ success: true, data: await damagedSvc.list(req.query) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══ QUOTE INVOICES ═════════════════════════
const quoteSvc = require('../services/quote.service');

router.post('/quote', async (req, res) => {
  try { res.status(201).json({ success: true, data: await quoteSvc.create(req.body, req.user?.id), message: 'تم إنشاء عرض السعر' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/quote/list', async (req, res) => {
  try { res.json({ success: true, data: await quoteSvc.list(req.query) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/quote/:id/convert-to-sale', async (req, res) => {
  try {
    const result = await quoteSvc.convertToSale(req.params.id, req.user?.id);
    if (result.error) return res.status(404).json({ success: false, error: 'عرض السعر غير موجود' });
    res.json({ success: true, data: result.data, message: 'تم تحويل عرض السعر لفاتورة بيع' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══ PRICING ════════════════════════════════
const pricingSvc = require('../services/pricing.service');

router.get('/pricing/:productId', async (req, res) => {
  try { res.json({ success: true, data: await pricingSvc.getProductPrices(req.params.productId) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/pricing/:productId', async (req, res) => {
  try { res.json({ success: true, data: await pricingSvc.setPrice(req.params.productId, req.body.customer_type_id, req.body) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/pricing/:productId/bulk', async (req, res) => {
  try { res.json({ success: true, data: await pricingSvc.bulkSetPrices(req.params.productId, req.body.prices) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/pricing/resolve/:productId/:customerId', async (req, res) => {
  try { res.json({ success: true, data: await pricingSvc.resolveItemPrice(req.params.productId, req.params.customerId) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;

