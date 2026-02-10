/**
 * BI Management - Suppliers Routes
 * مسارات إدارة الموردين - من قاعدة البيانات
 */
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const supplierService = require('../services/supplier.service');

const demoSuppliers = [
  { id: 'arabi', name: 'العربي للحاسبات', contact_person: 'سيد أحمد', type: 'company', phone: '07701234567', phone2: '07809876543', address: 'بغداد - الكرادة', balance: -3500000, rating: 4.5, total_purchases: 85000000, is_active: 1 },
  { id: 'tamimi', name: 'سليم التميمي', contact_person: 'سليم', type: 'individual', phone: '07702345678', address: 'بغداد - البياع', balance: -2000000, rating: 4.2, total_purchases: 45000000, is_active: 1 },
  { id: 'alamia', name: 'العالمية للحاسبات', contact_person: 'أبو منتظر', type: 'company', phone: '07703456789', address: 'بغداد - الشعب', balance: 0, rating: 4.0, total_purchases: 25000000, is_active: 1 },
  { id: 'repair1', name: 'مركز النور للصيانة', contact_person: 'حيدر', type: 'repair', phone: '07704567890', address: 'بغداد - الكرادة داخل', balance: -150000, rating: 4.3, total_purchases: 0, is_active: 1 },
];

router.get('/', auth, async (req, res) => {
  try {
    if (!supplierService.ensureSuppliersTable()) {
      let list = [...demoSuppliers];
      const { search, type } = req.query;
      if (search) {
        const term = search.toLowerCase();
        list = list.filter((s) => (s.name || '').toLowerCase().includes(term) || (s.contact_person || '').toLowerCase().includes(term) || (s.phone || '').includes(term));
      }
      if (type && type !== 'all') list = list.filter((s) => s.type === type);
      return res.json({ success: true, data: list });
    }
    const { search, type, page, limit } = req.query;
    const suppliers = await supplierService.list({ search, type, page, limit });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!supplierService.ensureSuppliersTable()) {
      const s = demoSuppliers.find((x) => x.id === id);
      if (!s) return res.status(404).json({ success: false, message: 'المورد غير موجود' });
      return res.json({ success: true, data: { ...s, pending_returns: 4 } });
    }
    const supplier = await supplierService.getById(id);
    if (!supplier) return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    if (!supplierService.ensureSuppliersTable()) {
      return res.status(503).json({ success: false, message: 'جدول الموردين غير متوفر. قم بتشغيل تهيئة قاعدة البيانات أولاً.' });
    }
    const created = await supplierService.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    if (!supplierService.ensureSuppliersTable()) {
      return res.status(503).json({ success: false, message: 'جدول الموردين غير متوفر.' });
    }
    const updated = await supplierService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    if (!supplierService.ensureSuppliersTable()) {
      return res.status(503).json({ success: false, message: 'جدول الموردين غير متوفر.' });
    }
    const ok = await supplierService.remove(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    res.json({ success: true, message: 'تم حذف المورد بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/transactions', auth, async (req, res) => {
  try {
    if (!supplierService.ensureSuppliersTable()) {
      return res.json({ success: true, data: [{ date: '2025-01-28', type: 'purchase', amount: 5000000, reference: 'PUR-2025-0015', balance: -3500000 }] });
    }
    const data = await supplierService.getTransactions(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/returns', auth, async (req, res) => {
  try {
    if (!supplierService.ensureSuppliersTable()) {
      return res.json({ success: true, data: [{ id: '1', status: 'in_repair', serial: 'BI-2025-000123', product: 'Dell 5530', days: 14 }] });
    }
    const data = await supplierService.getReturns(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/stats', auth, async (req, res) => {
  try {
    if (!supplierService.ensureSuppliersTable()) {
      return res.json({ success: true, data: { total_purchases: 85000000, total_returns: 15, resolved_returns: 11, pending_returns: 4, avg_return_time: 10, last_purchase: '2025-01-28', quality_score: 4.5 } });
    }
    const data = await supplierService.getStats(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
