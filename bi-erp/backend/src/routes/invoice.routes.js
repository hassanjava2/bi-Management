/**
 * BI Management - Invoice Routes
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

// ═══ List ═══
router.get('/', controller.list);

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

// ═══ Get One ═══
router.get('/:id', controller.getOne);

// ═══ Create (generic) ═══
router.post('/', controller.create);

// ═══ Typed Creates ═══
const typedCreate = (invoiceType) => async (req, res) => {
  try {
    const created = await invoiceService.create({ ...req.body, type: invoiceType, created_by: req.user?.id });
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    logger.error(`[Invoice.create ${invoiceType}] Error:`, e.message);
    res.status(500).json({ success: false, error: e.message });
  }
};
router.post('/sale', typedCreate('sale'));
router.post('/purchase', typedCreate('purchase'));
router.post('/return', typedCreate('return'));
router.post('/exchange', typedCreate('exchange'));
router.post('/installment', typedCreate('installment'));

// ═══ Update ═══
router.put('/:id', async (req, res) => {
  try {
    const data = await invoiceService.updateInvoice(req.params.id, req.body);
    if (!data) return res.status(400).json({ success: false, error: 'لا توجد تحديثات' });
    res.json({ success: true, data });
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

// ═══ Prepare ═══
router.post('/:id/prepare', async (req, res) => {
  try {
    const data = await invoiceService.prepareInvoice(req.params.id, req.user?.id);
    res.json({ success: true, data, message: 'تم بدء التحضير' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Convert to Active ═══
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

module.exports = router;
