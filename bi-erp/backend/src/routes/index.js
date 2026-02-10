/**
 * BI ERP - Route aggregator
 */

const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/customers', require('./customers.routes'));
router.use('/suppliers', require('./suppliers.routes'));
router.use('/inventory', require('./inventory.routes'));
router.use('/invoices', require('./invoice.routes'));
router.use('/accounting', require('./accounting.routes'));
router.use('/returns', require('./returns.routes'));
router.use('/warranty', require('./warranty.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/tasks', require('./task.routes'));
router.use('/goals', require('./goals.routes'));
router.use('/training', require('./training.routes'));
router.use('/ai', require('./ai.routes'));
router.use('/cameras', require('./cameras.routes'));
router.use('/audit', require('./audit.routes'));
router.use('/notifications', require('./notifications.routes'));
router.use('/reports', require('./reports.routes'));
router.use('/backup', require('./backup.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/delivery', require('./delivery.routes'));
router.use('/products', require('./products.routes'));
router.use('/devices', require('./device.routes'));
router.use('/shares', require('./shares.routes'));
router.use('/fixed-assets', require('./fixed-assets.routes'));
router.use('/approvals', require('./approval.routes'));
router.use('/security', require('./security.routes'));
router.use('/bot', require('./bot.routes'));
router.use('/ai-distribution', require('./ai-distribution.routes'));

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'BI ERP API', timestamp: new Date().toISOString() });
});

module.exports = router;
