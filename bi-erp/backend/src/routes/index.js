/**
 * BI ERP - Route aggregator
 */

const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/dashboard', require('./dashboard.routes'));
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
router.use('/sales', require('./sales.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/delivery', require('./delivery.routes'));
router.use('/products', require('./products.routes'));
router.use('/devices', require('./device.routes'));
router.use('/shares', require('./shares.routes'));
router.use('/fixed-assets', require('./fixed-assets.routes'));
router.use('/approvals', require('./approval.routes'));
router.use('/permissions', require('./permissions.routes'));
router.use('/security', require('./security.routes'));
router.use('/bot', require('./bot.routes'));
router.use('/ai-distribution', require('./ai-distribution.routes'));
router.use('/hr', require('./hr.routes'));

router.get('/health', async (req, res) => {
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  let dbStatus = 'disconnected';
  try {
    const { getDatabase } = require('../config/database');
    const pool = getDatabase();
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (_) { /* skip */ }

  res.json({
    success: true,
    service: 'BI ERP API',
    version: '1.0.0',
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    database: dbStatus,
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
    },
    node: process.version,
  });
});

module.exports = router;
