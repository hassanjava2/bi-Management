/**
 * BI Management - Customers Routes
 * مسارات إدارة العملاء - من قاعدة البيانات
 */
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const customerService = require('../services/customer.service');

// بيانات تجريبية عند عدم وجود جدول
const demoCustomers = [
  { id: '1', name: 'أحمد محمد علي', type: 'retail', phone: '07801234567', phone2: null, email: 'ahmed@example.com', balance: 1200000, credit_limit: 5000000, total_purchases: 12500000, purchase_count: 8, last_purchase_at: '2025-01-28', is_active: 1 },
  { id: '2', name: 'شركة الأمل للتجارة', type: 'wholesale', phone: '07802345678', phone2: '07712345678', email: 'alamal@company.com', balance: 2800000, credit_limit: 20000000, total_purchases: 45000000, purchase_count: 25, last_purchase_at: '2025-01-25', is_active: 1 },
  { id: '3', name: 'علي حسين كريم', type: 'retail', phone: '07803456789', email: null, balance: 0, credit_limit: 2000000, total_purchases: 3500000, purchase_count: 3, last_purchase_at: '2025-01-15', is_active: 1 },
  { id: '4', name: 'مؤسسة النجاح', type: 'wholesale', phone: '07804567890', email: 'najah@org.com', balance: 500000, credit_limit: 10000000, total_purchases: 28000000, purchase_count: 15, last_purchase_at: '2025-01-30', is_active: 1 },
];

// الحصول على قائمة العملاء
router.get('/', auth, async (req, res) => {
  try {
    if (!(await customerService.ensureCustomersTable())) {
      return res.json({ success: true, data: demoCustomers });
    }
    const { search, type, page, limit } = req.query;
    const customers = await customerService.list({ search, type, page, limit });
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إحصائيات العملاء (يجب أن يكون قبل /:id)
router.get('/stats', auth, async (req, res) => {
  try {
    if (!(await customerService.ensureCustomersTable())) {
      return res.json({
        success: true,
        data: { total: 156, with_balance: 23, total_receivables: 25000000, vip_count: 8, new_this_month: 12, by_type: { retail: 128, wholesale: 28 }, by_tier: { bronze: 95, silver: 38, gold: 15, platinum: 8 } },
      });
    }
    const stats = await customerService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على عميل واحد
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await customerService.ensureCustomersTable())) {
      const c = demoCustomers.find((x) => x.id === id);
      if (!c) return res.status(404).json({ success: false, message: 'العميل غير موجود' });
      return res.json({ success: true, data: { ...c, addresses: [{ label: 'المنزل', address: 'بغداد - المنصور', is_default: true }] } });
    }
    const customer = await customerService.getById(id);
    if (!customer) return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    let addresses = [];
    try {
      addresses = typeof customer.addresses === 'string' ? JSON.parse(customer.addresses || '[]') : (customer.addresses || []);
    } catch (_) {}
    res.json({ success: true, data: { ...customer, addresses } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إنشاء عميل جديد
router.post('/', auth, async (req, res) => {
  try {
    if (!(await customerService.ensureCustomersTable())) {
      return res.status(503).json({ success: false, message: 'جدول العملاء غير متوفر. قم بتشغيل تهيئة قاعدة البيانات أولاً.' });
    }
    const created = await customerService.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث عميل
router.put('/:id', auth, async (req, res) => {
  try {
    if (!(await customerService.ensureCustomersTable())) {
      return res.status(503).json({ success: false, message: 'جدول العملاء غير متوفر.' });
    }
    const updated = await customerService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// حذف عميل
router.delete('/:id', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    if (!(await customerService.ensureCustomersTable())) {
      return res.status(503).json({ success: false, message: 'جدول العملاء غير متوفر.' });
    }
    const ok = await customerService.remove(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    res.json({ success: true, message: 'تم حذف العميل بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// سجل التعاملات
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    if (!(await customerService.ensureCustomersTable())) {
      return res.json({ success: true, data: [{ date: '2025-01-28', type: 'invoice', amount: 1500000, reference: 'INV-2025-0025', balance: 1200000 }] });
    }
    const data = await customerService.getTransactions(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// فواتير العميل
router.get('/:id/invoices', auth, async (req, res) => {
  try {
    if (!(await customerService.ensureCustomersTable())) {
      return res.json({ success: true, data: [{ id: '1', number: 'INV-2025-0025', date: '2025-01-28', total: 1500000, status: 'completed', type: 'sale' }] });
    }
    const data = await customerService.getInvoices(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تعديل الرصيد
router.post('/:id/adjust-balance', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    if (!(await customerService.ensureCustomersTable())) {
      return res.status(503).json({ success: false, message: 'جدول العملاء غير متوفر.' });
    }
    const { id } = req.params;
    const { amount, reason, reference } = req.body;
    const updated = await customerService.adjustBalance(id, amount, reason, reference, req.user?.id);
    if (!updated) return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    res.json({ success: true, message: 'تم تعديل الرصيد بنجاح', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
