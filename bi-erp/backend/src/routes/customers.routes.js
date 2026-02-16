/**
 * BI Management - Customer Routes (Complete)
 * العملاء — CRUD + transactions + invoices + balance adjust
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/customer.controller');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { customerSchemas } = require('../utils/validators');
const { get, all, run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

router.use(auth);

// Stats — MUST be before /:id
router.get('/stats', controller.stats);

// List all
router.get('/', controller.list);

// Get one
router.get('/:id', controller.getOne);

// Create
router.post('/', validate(customerSchemas.create), controller.create);

// Update
router.put('/:id', validate(customerSchemas.update), controller.update);

// Delete
router.delete('/:id', controller.remove);

// ═══════════════════════════════════════════════
// TRANSACTIONS — حركات العميل
// ═══════════════════════════════════════════════
router.get('/:id/transactions', async (req, res) => {
    try {
        // Combine vouchers + invoices as transactions
        const vouchers = await all(`
      SELECT v.id, v.voucher_number as reference, v.type, v.amount, v.notes, v.created_at,
        'voucher' as source,
        CASE WHEN v.type = 'receipt' THEN 'قبض' WHEN v.type = 'payment' THEN 'صرف' ELSE v.type END as description
      FROM vouchers v
      WHERE v.customer_id = $1 AND (v.is_deleted = 0 OR v.is_deleted IS NULL)
      ORDER BY v.created_at DESC LIMIT 100
    `, [req.params.id]).catch(() => []);

        const invoices = await all(`
      SELECT i.id, i.invoice_number as reference, i.type, i.total as amount, i.notes, i.created_at,
        'invoice' as source,
        CASE WHEN i.type = 'sale' THEN 'بيع' WHEN i.type = 'return' THEN 'مرتجع' ELSE i.type END as description
      FROM invoices i
      WHERE i.customer_id = $1 AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
      ORDER BY i.created_at DESC LIMIT 100
    `, [req.params.id]).catch(() => []);

        const transactions = [...vouchers, ...invoices].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json({ success: true, data: transactions });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════
// INVOICES — فواتير العميل
// ═══════════════════════════════════════════════
router.get('/:id/invoices', async (req, res) => {
    try {
        const rows = await all(`
      SELECT i.*, u.full_name as created_by_name
      FROM invoices i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.customer_id = $1 AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
      ORDER BY i.created_at DESC LIMIT 100
    `, [req.params.id]).catch(() => []);
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════
// ADJUST BALANCE — تعديل رصيد العميل
// ═══════════════════════════════════════════════
router.post('/:id/adjust-balance', async (req, res) => {
    try {
        const { amount, type, notes } = req.body;
        if (!amount) return res.status(400).json({ success: false, error: 'المبلغ مطلوب' });

        const adjustAmount = type === 'debit' ? Math.abs(amount) : -Math.abs(amount);

        await run(
            'UPDATE customers SET balance = COALESCE(balance, 0) + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [adjustAmount, req.params.id]
        );

        // Create voucher record
        const voucherId = uuidv4();
        const voucherNum = `ADJ-${Date.now().toString().slice(-8)}`;
        try {
            await run(
                `INSERT INTO vouchers (id, voucher_number, type, amount, customer_id, notes, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
                [voucherId, voucherNum, type === 'debit' ? 'receipt' : 'payment', Math.abs(amount), req.params.id, notes || 'تعديل رصيد', req.user?.id]
            );
        } catch (_) { }

        const customer = await get('SELECT * FROM customers WHERE id = $1', [req.params.id]);
        res.json({ success: true, data: customer, message: 'تم تعديل الرصيد' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
