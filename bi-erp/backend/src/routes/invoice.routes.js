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
      get("SELECT COUNT(*) as c FROM invoices WHERE (is_deleted = FALSE OR is_deleted IS NULL)").then(r => r?.c || 0).catch(() => 0),
      get("SELECT COUNT(*) as c FROM invoices WHERE created_at::date = CURRENT_DATE AND (is_deleted = FALSE OR is_deleted IS NULL)").then(r => r?.c || 0).catch(() => 0),
      get("SELECT COUNT(*) as c FROM invoices WHERE payment_status = 'pending' AND (is_deleted = FALSE OR is_deleted IS NULL)").then(r => r?.c || 0).catch(() => 0),
      get("SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE (is_deleted = FALSE OR is_deleted IS NULL)").then(r => r?.s || 0).catch(() => 0),
    ]);
    res.json({ success: true, data: { total, today, pending, total_amount: totalAmount } });
  } catch (e) {
    res.json({ success: true, data: { total: 0, today: 0, pending: 0, total_amount: 0 } });
  }
});

router.get('/waiting', async (req, res) => {
  try {
    const { all } = require('../config/database');
    const rows = await all("SELECT * FROM invoices WHERE status = 'waiting' AND (is_deleted = FALSE OR is_deleted IS NULL) ORDER BY created_at DESC LIMIT 50").catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.post('/:id/items', controller.addItem);
router.post('/:id/payments', controller.addPayment);
router.put('/:id/status', controller.updateStatus);

module.exports = router;
