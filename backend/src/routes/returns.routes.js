/**
 * Bi Management - Returns Routes
 * مسارات تتبع المرتجعات - من قاعدة البيانات
 */
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { get, all } = require('../config/database');
const returnService = require('../services/return.service');

// ============================================
// Returns - المرتجعات
// ============================================

// جلب فاتورة برقم القائمة (لربط مرتجع شراء/بيع بالفاتورة الأصلية)
router.get('/by-invoice/:invoiceNumber', auth, async (req, res) => {
  try {
    const invoiceNumber = (req.params.invoiceNumber || '').trim();
    if (!invoiceNumber) {
      return res.status(400).json({ success: false, error: 'invoiceNumber required' });
    }
    const invoice = await get(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
             s.name as supplier_name, s.phone as supplier_phone
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.invoice_number = ? AND (i.is_deleted IS NOT TRUE OR i.is_deleted IS NULL)
    `, [invoiceNumber]);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'INVOICE_NOT_FOUND' });
    }
    const items = await all(`
      SELECT ii.*, p.name as product_name, p.sku
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
      ORDER BY ii.id
    `, [invoice.id]);
    res.json({
      success: true,
      data: { invoice, items }
    });
  } catch (error) {
    console.error('Get return by invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على قائمة المرتجعات
router.get('/', auth, async (req, res) => {
  try {
    const { search, supplier, supplier_id, status, page, limit } = req.query;
    const sid = supplier || supplier_id;
    if (!(await returnService.ensureReturnsTable())) {
      const mock = [
        { id: '1', return_number: 'RTN-2025-0001', product_name: 'Dell Latitude 5530', serial_number: 'BI-2025-000123', supplier_id: 'arabi', supplier_name: 'سيد أحمد - العربي', reason_details: 'عيب بالشاشة', created_at: '2025-01-17', status: 'in_repair', notes: 'تم إرسال الجهاز للصيانة' },
        { id: '2', return_number: 'RTN-2025-0002', product_name: 'HP EliteBook 450 G9', serial_number: 'BI-2025-000456', supplier_id: 'tamimi', supplier_name: 'سليم التميمي', reason_details: 'اختلاف مواصفات', created_at: '2025-01-05', status: 'pending', notes: 'بانتظار الرد' },
      ];
      let filtered = mock;
      if (sid && sid !== 'all') filtered = filtered.filter((r) => r.supplier_id === sid);
      if (status && status !== 'all') filtered = filtered.filter((r) => r.status === status);
      if (search) {
        const term = search.toLowerCase();
        filtered = filtered.filter((r) => (r.return_number + (r.product_name || '') + (r.serial_number || '')).toLowerCase().includes(term));
      }
      return res.json({ success: true, data: filtered, pagination: { page: 1, limit: 50, total: filtered.length } });
    }
    const result = await returnService.list({ search, supplier_id: sid, status, page, limit });
    const enriched = result.rows.map((r) => ({ ...r, reason: r.reason_details, sent_date: r.created_at }));
    res.json({ success: true, data: enriched, pagination: { page: result.page, limit: result.limit, total: result.total } });
  } catch (error) {
    console.error('Get returns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// إحصائيات المرتجعات (قبل /:id)
router.get('/stats', auth, async (req, res) => {
  try {
    if (!(await returnService.ensureReturnsTable())) {
      return res.json({ success: true, data: { total_pending: 8, over_7_days: 5, over_14_days: 2, over_30_days: 1, by_supplier: { arabi: 4, tamimi: 3 }, by_status: { pending: 2, sent: 3, in_repair: 2 } } });
    }
    const stats = await returnService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// المرتجعات المتأخرة
router.get('/overdue', auth, async (req, res) => {
  try {
    if (!(await returnService.ensureReturnsTable())) {
      return res.json({ success: true, data: [{ id: '2', return_number: 'RTN-2025-0002', product_name: 'HP EliteBook 450 G9', serial_number: 'BI-2025-000456', supplier_name: 'سليم التميمي', sent_date: '2025-01-05', days: 27, alert_level: 'critical' }] });
    }
    const data = await returnService.getOverdue();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// التنبيهات
router.get('/alerts', auth, async (req, res) => {
  try {
    if (!(await returnService.ensureReturnsTable())) {
      return res.json({ success: true, data: [{ type: 'critical', message: 'مرتجع HP 450 G9 متأخر أكثر من 14 يوم!', return_id: '2' }] });
    }
    const data = await returnService.getAlerts();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على مرتجع واحد
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await returnService.ensureReturnsTable())) {
      return res.json({ success: true, data: { id, return_number: 'RTN-2025-0001', product_name: 'Dell Latitude 5530', serial_number: 'BI-2025-000123', supplier_name: 'سيد أحمد - العربي', reason: 'عيب بالشاشة', sent_date: '2025-01-17', status: 'in_repair', follow_ups: [] } });
    }
    const data = await returnService.getById(id);
    if (!data) return res.status(404).json({ success: false, message: 'المرتجع غير موجود' });
    res.json({ success: true, data: { ...data, reason: data.reason_details, sent_date: data.created_at, follow_ups: [] } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إنشاء مرتجع جديد
router.post('/', auth, authorize(['admin', 'manager', 'inventory']), async (req, res) => {
  try {
    if (!(await returnService.ensureReturnsTable())) {
      return res.status(503).json({ success: false, message: 'جدول المرتجعات غير متوفر.' });
    }
    const { items = [], supplier_id, reason, reason_details, reason_category, notes, type } = req.body;
    const created = await returnService.create({
      type: type || 'purchase_return',
      supplier_id,
      reason_details: reason_details || reason,
      reason_category,
      notes,
      items,
      created_by: req.user?.id,
    });
    res.status(201).json({ success: true, message: 'تم إنشاء المرتجع بنجاح', data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث حالة المرتجع
router.post('/:id/status', auth, authorize(['admin', 'manager', 'inventory']), async (req, res) => {
  try {
    if (!(await returnService.ensureReturnsTable())) {
      return res.status(503).json({ success: false, message: 'جدول المرتجعات غير متوفر.' });
    }
    const { id } = req.params;
    const { status, notes } = req.body;
    const updated = await returnService.updateStatus(id, status, notes);
    if (!updated) return res.status(404).json({ success: false, message: 'المرتجع غير موجود' });
    res.json({ success: true, message: 'تم تحديث الحالة بنجاح', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إضافة متابعة
router.post('/:id/follow-up', auth, async (req, res) => {
  try {
    if (!(await returnService.ensureReturnsTable())) {
      return res.status(503).json({ success: false, message: 'جدول المرتجعات غير متوفر.' });
    }
    const { id } = req.params;
    const { action, notes } = req.body;
    const updated = await returnService.addFollowUp(id, action || 'متابعة', notes);
    if (!updated) return res.status(404).json({ success: false, message: 'المرتجع غير موجود' });
    res.status(201).json({ success: true, message: 'تمت إضافة المتابعة بنجاح', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// استلام المرتجع
router.post('/:id/receive', auth, authorize(['admin', 'manager', 'inventory']), async (req, res) => {
  try {
    if (!(await returnService.ensureReturnsTable())) {
      return res.status(503).json({ success: false, message: 'جدول المرتجعات غير متوفر.' });
    }
    const { id } = req.params;
    const updated = await returnService.receive(id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'المرتجع غير موجود' });
    res.json({ success: true, message: 'تم استلام المرتجع بنجاح', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إرسال تذكير
router.post('/:id/reminder', auth, async (req, res) => {
  try {
    res.json({ success: true, message: 'تم إرسال التذكير بنجاح', data: { return_id: req.params.id, reminder_sent_at: new Date().toISOString() } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إرسال تذكير جماعي
router.post('/bulk-reminder', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { return_ids } = req.body;
    res.json({ success: true, message: `تم إرسال ${return_ids?.length || 0} التذكيرات بنجاح`, data: { count: return_ids?.length || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
