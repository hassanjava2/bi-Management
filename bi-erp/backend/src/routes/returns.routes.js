/**
 * BI Management - Returns Routes
 * مسارات المرتجعات — thin controller
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const returnsService = require('../services/returns.service');
const logger = require('../utils/logger');

router.use(auth);

// ─── Stats ───
router.get('/stats', async (req, res) => {
  try {
    const data = await returnsService.getStats();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: { total: 0, pending: 0, sent: 0, received: 0, completed: 0, rejected: 0 } });
  }
});

// ─── Overdue Returns ───
router.get('/overdue', async (req, res) => {
  try {
    const data = await returnsService.getOverdue();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ─── Alerts ───
router.get('/alerts', async (req, res) => {
  try {
    const data = await returnsService.getAlerts();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ─── List All Returns ───
router.get('/', async (req, res) => {
  try {
    const data = await returnsService.listReturns(req.query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Get Single Return ───
router.get('/:id', async (req, res) => {
  try {
    const data = await returnsService.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'المرتجع غير موجود' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Create Return ───
router.post('/', async (req, res) => {
  try {
    const data = await returnsService.create(req.body, req.user?.id);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Typed Creates ───
const returnSvc = require('../services/return.service');

router.post('/purchase-return', async (req, res) => {
  try {
    const data = await returnSvc.createPurchaseReturn(req.body, req.user?.id);
    res.status(201).json({ success: true, data, message: 'تم إنشاء إرجاع الشراء' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/sale-return', async (req, res) => {
  try {
    const data = await returnSvc.createSaleReturn(req.body, req.user?.id);
    res.status(201).json({ success: true, data, message: 'تم إنشاء إرجاع البيع' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Confirm / Cancel ───
router.post('/:id/confirm', async (req, res) => {
  try {
    const result = await returnSvc.confirmReturn(req.params.id, req.user?.id);
    if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'المرتجع غير موجود' });
    if (result.error) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data, message: 'تم تأكيد المرتجع وتحديث المخزون' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await returnSvc.cancelReturn(req.params.id, req.body.reason, req.user?.id);
    if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'المرتجع غير موجود' });
    if (result.error) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data, message: 'تم إلغاء المرتجع' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── Get invoice for return ───
router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const data = await returnSvc.getInvoiceForReturn(req.params.invoiceId);
    if (!data) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── Update Return ───
router.put('/:id', async (req, res) => {
  try {
    const data = await returnsService.update(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Update Status ───
router.post('/:id/status', async (req, res) => {
  try {
    const data = await returnsService.updateStatus(req.params.id, req.body.status, req.body.notes, req.user?.id);
    res.json({ success: true, data, message: 'تم تحديث الحالة بنجاح' });
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ success: false, error: e.message });
  }
});

// ─── Add Follow-Up ───
router.post('/:id/follow-up', async (req, res) => {
  try {
    const data = await returnsService.addFollowUp(req.params.id, req.body.content, req.body.type, req.user?.id);
    res.status(201).json({ success: true, data, message: 'تم إضافة المتابعة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Receive Return (+ Inventory Update) ───
router.post('/:id/receive', async (req, res) => {
  try {
    const data = await returnsService.receiveReturn(req.params.id, req.body.received_items, req.body.notes, req.user?.id);
    res.json({ success: true, data, message: 'تم استلام المرتجع وتحديث المخزون' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Send Reminder ───
router.post('/:id/reminder', async (req, res) => {
  try {
    const data = await returnsService.sendReminder(req.params.id, req.user?.id);
    if (!data) return res.status(404).json({ success: false, error: 'المرتجع غير موجود' });
    res.json({ success: true, message: 'تم إرسال التذكير', data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Bulk Reminder ───
router.post('/bulk-reminder', async (req, res) => {
  try {
    const { return_ids } = req.body;
    if (!return_ids || !Array.isArray(return_ids)) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد المرتجعات' });
    }
    const sent = await returnsService.bulkReminder(return_ids, req.user?.id);
    res.json({ success: true, message: `تم إرسال ${sent} تذكير`, data: { sent } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
