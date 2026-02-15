const express = require('express');
const router = express.Router();
const controller = require('../controllers/invoice.controller');
const { auth } = require('../middleware/auth');

router.use(auth);

// Stats endpoint - before /:id to avoid conflict
router.get('/stats', async (req, res) => {
  try {
    const { get } = require('../config/database');
    const [total, today, pending, totalAmount] = await Promise.all([
      get("SELECT COUNT(*) as c FROM invoices WHERE (is_deleted = 0 OR is_deleted IS NULL)").then(r => r?.c || 0).catch(() => 0),
      get("SELECT COUNT(*) as c FROM invoices WHERE created_at::date = CURRENT_DATE AND (is_deleted = 0 OR is_deleted IS NULL)").then(r => r?.c || 0).catch(() => 0),
      get("SELECT COUNT(*) as c FROM invoices WHERE payment_status = 'pending' AND (is_deleted = 0 OR is_deleted IS NULL)").then(r => r?.c || 0).catch(() => 0),
      get("SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE (is_deleted = 0 OR is_deleted IS NULL)").then(r => r?.s || 0).catch(() => 0),
    ]);
    res.json({ success: true, data: { total, today, pending, total_amount: totalAmount } });
  } catch (e) {
    res.json({ success: true, data: { total: 0, today: 0, pending: 0, total_amount: 0 } });
  }
});

router.get('/waiting', async (req, res) => {
  try {
    const { all } = require('../config/database');
    const rows = await all("SELECT * FROM invoices WHERE status = 'waiting' AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at DESC LIMIT 50").catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

router.get('/', controller.list);

// Print endpoint - MUST be before /:id
router.get('/:id/print', async (req, res) => {
  try {
    const { get, all } = require('../config/database');
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

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    }

    const items = await all(`
      SELECT ii.*, p.name as product_name, p.code as product_code, p.serial_number
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.created_at ASC
    `, [req.params.id]);

    // Company info from settings or defaults
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
    } catch (_) { /* settings table may not exist */ }

    res.json({ success: true, data: { invoice, items, company } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.post('/:id/items', controller.addItem);
router.post('/:id/payments', controller.addPayment);
router.put('/:id/status', controller.updateStatus);

module.exports = router;
