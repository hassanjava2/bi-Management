/**
 * Bi Management - Accounting Routes
 * مسارات المحاسبة والمالية - من قاعدة البيانات
 */
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const accountingService = require('../services/accounting.service');

// ============================================
// Overview - النظرة العامة
// ============================================

router.get('/overview', auth, authorize(['admin']), async (req, res) => {
  try {
    const overview = accountingService.getOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Vouchers - السندات (Phase 5 - بيانات حقيقية)
// ============================================
const voucherService = require('../services/voucher.service');

router.get('/vouchers', auth, authorize(['admin']), async (req, res) => {
  try {
    const { type, from, to, page = 1, limit = 50 } = req.query;
    const vouchers = voucherService.list({ type, from, to, page, limit });
    res.json({ success: true, data: vouchers });
  } catch (error) {
    if (error.message && (error.message.includes('no such table') || error.message.includes('vouchers'))) {
      return res.json({ success: true, data: [] });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/vouchers', auth, authorize(['admin']), async (req, res) => {
  try {
    const body = { ...req.body, created_by: req.user?.id };
    const voucher = voucherService.create(body);
    res.status(201).json({ success: true, data: voucher });
  } catch (error) {
    if (error.message && (error.message.includes('no such table') || error.message.includes('vouchers'))) {
      return res.status(503).json({ success: false, error: 'جدول السندات غير موجود. شغّل schema_additional.sql أولاً.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Receivables - ذمم العملاء
// ============================================

router.get('/receivables', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = accountingService.getReceivables();
    res.json({ success: true, data: { items: data.items, total: data.total, aging: data.aging } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/receivables/customer/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = accountingService.getReceivableByCustomer(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Payables - ذمم الموردين
// ============================================

router.get('/payables', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = accountingService.getPayables();
    res.json({ success: true, data: { items: data.items, total: data.total, due_this_week: data.due_this_week, overdue: data.overdue } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Cash Boxes - الصناديق
// ============================================

router.get('/cash-boxes', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = accountingService.getCashBoxes();
    res.json({ success: true, data: data.length ? data : [{ id: 'main', name: 'الصندوق الرئيسي', balance: 0, employee_id: null }] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cash-boxes/transfer', auth, authorize(['admin']), async (req, res) => {
  try {
    const { from_box, to_box, amount, description } = req.body;
    const result = accountingService.transferCash(from_box, to_box, amount, description, req.user?.id);
    if (!result) return res.status(400).json({ success: false, message: 'تحويل غير صالح أو رصيد غير كافٍ' });
    res.json({ success: true, message: 'تم التحويل بنجاح', data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Expenses - المصاريف
// ============================================

router.get('/expenses', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = accountingService.getExpenses({ from: req.query.from, to: req.query.to, category: req.query.category });
    res.json({ success: true, data: { items: data.items, by_category: data.by_category, total: data.total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/expenses', auth, authorize(['admin']), async (req, res) => {
  try {
    const created = accountingService.createExpense({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Reports - التقارير
// ============================================

router.get('/reports/profit-loss', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = accountingService.getProfitLossReport(req.query.from, req.query.to);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/cash-flow', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = accountingService.getCashFlowReport(req.query.from, req.query.to);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/debts', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = accountingService.getDebtsReport();
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
