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
    const overview = await accountingService.getOverview();
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
    const vouchers = await voucherService.list({ type, from, to, page, limit });
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
    const voucher = await voucherService.create(body);
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
    const data = await accountingService.getReceivables();
    res.json({ success: true, data: { items: data.items, total: data.total, aging: data.aging } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/receivables/customer/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = await accountingService.getReceivableByCustomer(req.params.id);
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
    const data = await accountingService.getPayables();
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
    const data = await accountingService.getCashBoxes();
    res.json({ success: true, data: data.length ? data : [{ id: 'main', name: 'الصندوق الرئيسي', balance: 0, employee_id: null }] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cash-boxes/transfer', auth, authorize(['admin']), async (req, res) => {
  try {
    const { from_box, to_box, amount, description } = req.body;
    const result = await accountingService.transferCash(from_box, to_box, amount, description, req.user?.id);
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
    const data = await accountingService.getExpenses({ from: req.query.from, to: req.query.to, category: req.query.category });
    res.json({ success: true, data: { items: data.items, by_category: data.by_category, total: data.total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/expenses', auth, authorize(['admin']), async (req, res) => {
  try {
    const created = await accountingService.createExpense({ ...req.body, created_by: req.user?.id });
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
    const data = await accountingService.getProfitLossReport(req.query.from, req.query.to);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/cash-flow', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = await accountingService.getCashFlowReport(req.query.from, req.query.to);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/debts', auth, authorize(['admin']), async (req, res) => {
  try {
    const data = await accountingService.getDebtsReport();
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Account Statements - كشوفات الحسابات
// ============================================

router.get('/statement/customer/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const { run, get, all } = require('../config/database');
    const cust = await get('SELECT id, name, phone, balance FROM customers WHERE id = ?', [req.params.id]);
    if (!cust) return res.status(404).json({ success: false, error: 'العميل غير موجود' });

    // فواتير العميل
    const invoices = await all(`
      SELECT id, invoice_number, type, total, paid_amount, remaining_amount, payment_status, created_at
      FROM invoices WHERE customer_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
      Order BY created_at DESC
    `, [req.params.id]);

    // سندات القبض/الدفع المرتبطة
    let vouchers = [];
    try {
      vouchers = await all(`
        Select id, voucher_number, type, amount, description, created_at
        FROM vouchers WHERE customer_id = ? ORDER BY created_at DESC
      `, [req.params.id]);
    } catch (_) { /* vouchers table might not exist */ }

    // بناء كشف الحساب
    const movements = [];
    for (const inv of invoices) {
      movements.push({
        date: inv.created_at,
        description: `فاتورة ${inv.invoice_number} (${inv.type === 'sale' ? 'بيع' : inv.type === 'sale_return' ? 'مرتجع' : inv.type})`,
        debit: inv.type.includes('return') ? 0 : inv.total,
        credit: inv.type.includes('return') ? inv.total : 0,
        reference: inv.invoice_number,
      });
    }
    for (const v of vouchers) {
      movements.push({
        date: v.created_at,
        description: `سند ${v.type === 'receipt' ? 'قبض' : 'دفع'} ${v.voucher_number}`,
        debit: v.type === 'payment' ? v.amount : 0,
        credit: v.type === 'receipt' ? v.amount : 0,
        reference: v.voucher_number,
      });
    }
    movements.sort((a, b) => new Date(a.date) - new Date(b.date));

    // حساب الرصيد التراكمي
    let balance = 0;
    for (const m of movements) {
      balance += (m.debit || 0) - (m.credit || 0);
      m.balance = balance;
    }

    res.json({
      success: true,
      data: {
        customer: cust,
        movements,
        total_debit: movements.reduce((s, m) => s + (m.debit || 0), 0),
        total_credit: movements.reduce((s, m) => s + (m.credit || 0), 0),
        final_balance: balance,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/statement/supplier/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const { run, get, all } = require('../config/database');
    const sup = await get('SELECT id, name, phone, balance FROM suppliers WHERE id = ?', [req.params.id]);
    if (!sup) return res.status(404).json({ success: false, error: 'المورد غير موجود' });

    const invoices = await all(`
      SELECT id, invoice_number, type, total, paid_amount, remaining_amount, payment_status, created_at
      FROM invoices WHERE supplier_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY created_at DESC
    `, [req.params.id]);

    let vouchers = [];
    try {
      vouchers = await all(`
        SELECT id, voucher_number, type, amount, description, created_at
        FROM vouchers WHERE supplier_id = ? ORDER BY created_at DESC
      `, [req.params.id]);
    } catch (_) { /* vouchers table might not exist */ }

    const movements = [];
    for (const inv of invoices) {
      movements.push({
        date: inv.created_at,
        description: `فاتورة ${inv.invoice_number} (${inv.type === 'purchase' ? 'شراء' : inv.type === 'purchase_return' ? 'مرتجع شراء' : inv.type})`,
        debit: inv.type.includes('return') ? inv.total : 0,
        credit: inv.type.includes('return') ? 0 : inv.total,
        reference: inv.invoice_number,
      });
    }
    for (const v of vouchers) {
      movements.push({
        date: v.created_at,
        description: `سند ${v.type === 'receipt' ? 'قبض' : 'دفع'} ${v.voucher_number}`,
        debit: v.type === 'receipt' ? v.amount : 0,
        credit: v.type === 'payment' ? v.amount : 0,
        reference: v.voucher_number,
      });
    }
    movements.sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    for (const m of movements) {
      balance += (m.debit || 0) - (m.credit || 0);
      m.balance = balance;
    }

    res.json({
      success: true,
      data: {
        supplier: sup,
        movements,
        total_debit: movements.reduce((s, m) => s + (m.debit || 0), 0),
        total_credit: movements.reduce((s, m) => s + (m.credit || 0), 0),
        final_balance: balance,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Daily Reconciliation - المطابقة اليومية
// ============================================

router.get('/reconciliation', auth, authorize(['admin']), async (req, res) => {
  try {
    const { run, get, all } = require('../config/database');
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // مبيعات اليوم
    const sales = await get(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total, COALESCE(SUM(paid_amount), 0) as paid
      FROM invoices WHERE type IN ('sale', 'sale_credit', 'sale_installment') AND date(created_at) = ?
    `, [date]);

    // مشتريات اليوم
    const purchases = await get(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM invoices WHERE type = 'purchase' AND date(created_at) = ?
    `, [date]);

    // سندات القبض
    let receipts = { count: 0, total: 0 };
    try {
      receipts = await get(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM vouchers WHERE type = 'receipt' AND date(created_at) = ?
      `, [date]) || receipts;
    } catch (_) {}

    // سندات الدفع
    let payments = { count: 0, total: 0 };
    try {
      payments = await get(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM vouchers WHERE type = 'payment' AND date(created_at) = ?
      `, [date]) || payments;
    } catch (_) {}

    // مصاريف اليوم
    let expenses = { count: 0, total: 0 };
    try {
      expenses = await get(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM expenses WHERE date(expense_date) = ? OR date(created_at) = ?
      `, [date, date]) || expenses;
    } catch (_) {}

    // صافي اليوم
    const netCash = (sales?.paid || 0) + (receipts?.total || 0) - (payments?.total || 0) - (expenses?.total || 0);

    res.json({
      success: true,
      data: {
        date,
        sales: { count: sales?.count || 0, total: sales?.total || 0, paid: sales?.paid || 0 },
        purchases: { count: purchases?.count || 0, total: purchases?.total || 0 },
        receipts: { count: receipts?.count || 0, total: receipts?.total || 0 },
        payments: { count: payments?.count || 0, total: payments?.total || 0 },
        expenses: { count: expenses?.count || 0, total: expenses?.total || 0 },
        net_cash: netCash,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
