/**
 * BI Management - Invoice Routes (Complete)
 * الفواتير — كل العمليات: CRUD + cancel + transition + prepare + typed creates
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/invoice.controller');
const { auth } = require('../middleware/auth');
const { get, all, run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

router.use(auth);

// ═══════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const nd = "AND (is_deleted = 0 OR is_deleted IS NULL)";
    const [total, today, pending, totalAmount, todayAmount] = await Promise.all([
      get(`SELECT COUNT(*) as c FROM invoices WHERE 1=1 ${nd}`).then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*) as c FROM invoices WHERE created_at::date = CURRENT_DATE ${nd}`).then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COUNT(*) as c FROM invoices WHERE payment_status = 'pending' ${nd}`).then(r => r?.c || 0).catch(() => 0),
      get(`SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE 1=1 ${nd}`).then(r => r?.s || 0).catch(() => 0),
      get(`SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE type = 'sale' AND created_at::date = CURRENT_DATE ${nd}`).then(r => r?.s || 0).catch(() => 0),
    ]);
    res.json({ success: true, data: { total, today, pending, total_amount: totalAmount, today_amount: todayAmount } });
  } catch (e) {
    res.json({ success: true, data: { total: 0, today: 0, pending: 0, total_amount: 0, today_amount: 0 } });
  }
});

// ═══════════════════════════════════════════════
// WAITING INVOICES
// ═══════════════════════════════════════════════
router.get('/waiting', async (req, res) => {
  try {
    const rows = await all("SELECT * FROM invoices WHERE status = 'waiting' AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at DESC LIMIT 50").catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ═══════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════
router.get('/', controller.list);

// ═══════════════════════════════════════════════
// PRINT — MUST be before /:id
// ═══════════════════════════════════════════════
router.get('/:id/print', async (req, res) => {
  try {
    const invoice = await get(`
      SELECT i.*,
        c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
        s.name as supplier_name, s.phone as supplier_phone,
        u.full_name as created_by_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = $1
    `, [req.params.id]);

    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });

    const items = await all(`
      SELECT ii.*, p.name as product_name, p.code as product_code, p.serial_number
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.created_at ASC
    `, [req.params.id]);

    let company = { name: 'BI Company', name_en: 'BI Company', address: 'بغداد، العراق', phone: '' };
    try {
      const settings = await all("SELECT key, value FROM settings WHERE key IN ('company_name', 'company_name_en', 'company_address', 'company_phone', 'company_logo')");
      for (const s of settings) {
        if (s.key === 'company_name') company.name = s.value;
        if (s.key === 'company_name_en') company.name_en = s.value;
        if (s.key === 'company_address') company.address = s.value;
        if (s.key === 'company_phone') company.phone = s.value;
        if (s.key === 'company_logo') company.logo_url = s.value;
      }
    } catch (_) { }

    res.json({ success: true, data: { invoice, items, company } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// GET ONE
// ═══════════════════════════════════════════════
router.get('/:id', controller.getOne);

// ═══════════════════════════════════════════════
// CREATE — generic
// ═══════════════════════════════════════════════
router.post('/', controller.create);

// ═══════════════════════════════════════════════
// TYPED CREATES — /sale, /purchase, /return, /exchange, /installment
// ═══════════════════════════════════════════════
const typedCreate = (invoiceType) => async (req, res) => {
  try {
    const invoiceService = require('../services/invoice.service');
    const created = await invoiceService.create({
      ...req.body,
      type: invoiceType,
      created_by: req.user?.id,
    });
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

// ═══════════════════════════════════════════════
// UPDATE INVOICE
// ═══════════════════════════════════════════════
router.put('/:id', async (req, res) => {
  try {
    const { type, customer_id, supplier_id, payment_method, payment_type,
      discount_amount, discount_type, tax_amount, notes,
      subtotal, total, paid_amount, remaining_amount } = req.body;

    const sets = [];
    const params = [];
    let i = 1;

    const addField = (name, val) => {
      if (val !== undefined) { sets.push(`${name} = $${i++}`); params.push(val); }
    };

    addField('type', type);
    addField('customer_id', customer_id);
    addField('supplier_id', supplier_id);
    addField('payment_method', payment_method);
    addField('payment_type', payment_type);
    addField('discount_amount', discount_amount);
    addField('discount_type', discount_type);
    addField('tax_amount', tax_amount);
    addField('notes', notes);
    addField('subtotal', subtotal);
    addField('total', total);
    addField('paid_amount', paid_amount);
    addField('remaining_amount', remaining_amount);

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد تحديثات' });
    }

    sets.push(`updated_at = $${i++}`);
    params.push(new Date());
    params.push(req.params.id);

    await run(`UPDATE invoices SET ${sets.join(', ')} WHERE id = $${i}`, params);

    const invoice = await get('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: invoice });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// CANCEL INVOICE
// ═══════════════════════════════════════════════
router.post('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const invoice = await get('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    if (invoice.status === 'cancelled') return res.status(400).json({ success: false, error: 'الفاتورة ملغاة بالفعل' });

    await run(
      `UPDATE invoices SET status = 'cancelled', cancel_reason = $1, cancelled_at = CURRENT_TIMESTAMP, cancelled_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [reason || null, req.user?.id, req.params.id]
    );

    // Restore inventory if it was a sale
    if (invoice.type === 'sale') {
      try {
        const items = await all('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
        for (const item of items) {
          if (item.product_id) {
            await run('UPDATE products SET quantity = quantity + $1 WHERE id = $2', [item.quantity || 1, item.product_id]).catch(() => { });
          }
        }
      } catch (_) { }
    }

    const updated = await get('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: updated, message: 'تم إلغاء الفاتورة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// TRANSITION — change workflow status
// ═══════════════════════════════════════════════
router.post('/:id/transition', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['draft', 'waiting', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `حالة غير صحيحة: ${status}` });
    }

    const invoice = await get('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });

    await run(
      `UPDATE invoices SET status = $1, status_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [status, notes || null, req.params.id]
    );

    const updated = await get('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: updated, message: `تم تحويل الحالة إلى ${status}` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// PREPARE — mark as preparing
// ═══════════════════════════════════════════════
router.post('/:id/prepare', async (req, res) => {
  try {
    await run(
      `UPDATE invoices SET status = 'preparing', prepared_by = $1, prepared_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [req.user?.id, req.params.id]
    );
    const updated = await get('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: updated, message: 'تم بدء التحضير' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// CONVERT TO ACTIVE — from draft/waiting → confirmed
// ═══════════════════════════════════════════════
router.post('/:id/convert-to-active', async (req, res) => {
  try {
    const invoice = await get('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });

    await run(
      `UPDATE invoices SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, confirmed_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [req.user?.id, req.params.id]
    );

    // Deduct inventory for sales
    if (invoice.type === 'sale') {
      try {
        const items = await all('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
        for (const item of items) {
          if (item.product_id) {
            await run('UPDATE products SET quantity = quantity - $1 WHERE id = $2', [item.quantity || 1, item.product_id]).catch(() => { });
          }
        }
      } catch (_) { }
    }

    const updated = await get('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: updated, message: 'تم تفعيل الفاتورة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════
// ADD ITEMS / PAYMENTS / STATUS (existing)
// ═══════════════════════════════════════════════
router.post('/:id/items', controller.addItem);
router.post('/:id/payments', controller.addPayment);
router.put('/:id/status', controller.updateStatus);

module.exports = router;
