/**
 * Sales routes - إحصائيات وتقارير المبيعات
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { get, all } = require('../config/database');

router.use(auth);

// GET /api/sales/stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const totalSales = await get(
      "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' AND (is_deleted = 0 OR is_deleted IS NULL)",
      []
    ).then(r => Number(r?.v) || 0);
    const todaySales = await get(
      "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' AND (is_deleted = 0 OR is_deleted IS NULL) AND (created_at::date) = ?",
      [today]
    ).then(r => Number(r?.v) || 0);
    const totalInvoices = await get(
      "SELECT COUNT(*) as c FROM invoices WHERE type = 'sale' AND (is_deleted = 0 OR is_deleted IS NULL)",
      []
    ).then(r => Number(r?.c) || 0);
    const pendingInvoices = await get(
      "SELECT COUNT(*) as c FROM invoices WHERE type = 'sale' AND payment_status = 'pending' AND (is_deleted = 0 OR is_deleted IS NULL)",
      []
    ).then(r => Number(r?.c) || 0);
    res.json({
      success: true,
      data: {
        total_sales: totalSales,
        today_sales: todaySales,
        total_invoices: totalInvoices,
        pending_invoices: pendingInvoices,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/sales/daily-report
router.get('/daily-report', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const rows = await all(
      "SELECT * FROM invoices WHERE type = 'sale' AND (created_at::date) = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at DESC",
      [date]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/sales/monthly-report
router.get('/monthly-report', async (req, res) => {
  try {
    const month = req.query.month || (new Date().getMonth() + 1);
    const year = req.query.year || new Date().getFullYear();
    const rows = await all(
      "SELECT * FROM invoices WHERE type = 'sale' AND EXTRACT(MONTH FROM created_at) = ? AND EXTRACT(YEAR FROM created_at) = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at DESC",
      [month, year]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/sales/installments/stats
router.get('/installments/stats', async (req, res) => {
  try {
    const total = await get(
      "SELECT COUNT(*) as c FROM invoices WHERE payment_type = 'installment' AND (is_deleted = 0 OR is_deleted IS NULL)",
      []
    ).then(r => Number(r?.c) || 0);
    res.json({ success: true, data: { total_installments: total } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/sales/installments/pending-transfers
router.get('/installments/pending-transfers', async (req, res) => {
  try {
    const rows = await all(
      "SELECT * FROM invoices WHERE payment_type = 'installment' AND payment_status = 'pending' AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at DESC",
      []
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/sales/installments/:id/confirm-transfer
router.post('/installments/:id/confirm-transfer', async (req, res) => {
  try {
    const { amount, payment_method, notes } = req.body;
    const invoiceId = req.params.id;

    // Update invoice payment
    await run(
      `UPDATE invoices 
       SET paid_amount = COALESCE(paid_amount, 0) + $1,
           remaining_amount = GREATEST(COALESCE(total, 0) - COALESCE(paid_amount, 0) - $1, 0),
           payment_status = CASE 
             WHEN COALESCE(paid_amount, 0) + $1 >= COALESCE(total, 0) THEN 'paid'
             ELSE 'partial'
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [amount || 0, invoiceId]
    );

    // Log as payment
    try {
      const { v4: uuidv4 } = require('uuid');
      await run(
        `INSERT INTO invoice_payments (id, invoice_id, amount, payment_method, notes, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [uuidv4(), invoiceId, amount, payment_method || 'transfer', notes || 'تأكيد حوالة قسط', req.user?.id]
      );
    } catch (_) { /* table may not exist */ }

    const invoice = await get('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
    res.json({ success: true, data: invoice, message: 'تم تأكيد الحوالة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
