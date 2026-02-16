/**
 * BI Management - Supplier Routes (Complete)
 * الموردين — CRUD + transactions + returns + stats
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/supplier.controller');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { supplierSchemas } = require('../utils/validators');
const { get, all } = require('../config/database');

router.use(auth);

// List all
router.get('/', controller.list);

// Get one
router.get('/:id', controller.getOne);

// Create
router.post('/', validate(supplierSchemas.create), controller.create);

// Update
router.put('/:id', validate(supplierSchemas.update), controller.update);

// Delete
router.delete('/:id', controller.remove);

// ═══════════════════════════════════════════════
// TRANSACTIONS — حركات المورد
// ═══════════════════════════════════════════════
router.get('/:id/transactions', async (req, res) => {
    try {
        const vouchers = await all(`
      SELECT v.id, v.voucher_number as reference, v.type, v.amount, v.notes, v.created_at,
        'voucher' as source
      FROM vouchers v
      WHERE v.supplier_id = $1 AND (v.is_deleted = 0 OR v.is_deleted IS NULL)
      ORDER BY v.created_at DESC LIMIT 100
    `, [req.params.id]).catch(() => []);

        const invoices = await all(`
      SELECT i.id, i.invoice_number as reference, i.type, i.total as amount, i.notes, i.created_at,
        'invoice' as source
      FROM invoices i
      WHERE i.supplier_id = $1 AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
      ORDER BY i.created_at DESC LIMIT 100
    `, [req.params.id]).catch(() => []);

        const transactions = [...vouchers, ...invoices].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json({ success: true, data: transactions });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════
// RETURNS — مرتجعات المورد
// ═══════════════════════════════════════════════
router.get('/:id/returns', async (req, res) => {
    try {
        const rows = await all(`
      SELECT r.*, u.full_name as created_by_name
      FROM returns r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.supplier_id = $1 AND (r.is_deleted = 0 OR r.is_deleted IS NULL)
      ORDER BY r.created_at DESC LIMIT 100
    `, [req.params.id]).catch(() => []);
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════
// STATS — إحصائيات المورد
// ═══════════════════════════════════════════════
router.get('/:id/stats', async (req, res) => {
    try {
        const nd = "AND (is_deleted = 0 OR is_deleted IS NULL)";
        const totalPurchases = await get(
            `SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE supplier_id = $1 AND type = 'purchase' ${nd}`, [req.params.id]
        ).then(r => Number(r?.v) || 0).catch(() => 0);

        const totalReturns = await get(
            `SELECT COUNT(*) as c FROM returns WHERE supplier_id = $1 ${nd}`, [req.params.id]
        ).then(r => r?.c || 0).catch(() => 0);

        const balance = await get(
            'SELECT COALESCE(balance, 0) as b FROM suppliers WHERE id = $1', [req.params.id]
        ).then(r => Number(r?.b) || 0).catch(() => 0);

        const invoiceCount = await get(
            `SELECT COUNT(*) as c FROM invoices WHERE supplier_id = $1 ${nd}`, [req.params.id]
        ).then(r => r?.c || 0).catch(() => 0);

        res.json({
            success: true,
            data: { total_purchases: totalPurchases, total_returns: totalReturns, balance, invoice_count: invoiceCount }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
