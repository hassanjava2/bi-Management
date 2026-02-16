/**
 * BI ERP — Dashboard Routes (refactored)
 * Thin routing layer — business logic in dashboard.service.js
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const taskService = require('../services/task.service');
const attendanceService = require('../services/attendance.service');
const ds = require('../services/dashboard.service');

router.use(auth);

// Main stats
router.get('/stats', async (req, res) => {
  try {
    res.json({ success: true, data: await ds.getStats() });
  } catch (e) { res.json({ success: true, data: {} }); }
});

// 7-day chart
router.get('/chart', async (req, res) => {
  try {
    res.json({ success: true, data: await ds.getChart() });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// Tasks + Attendance overview
router.get('/', async (req, res) => {
  try {
    let taskStats = { total: 0, today: 0, overdue: 0 };
    let attendanceStats = { checked_in: 0, total_employees: 0 };
    try { taskStats = await taskService.getTaskStats({}); } catch (_) { }
    try { attendanceStats = await attendanceService.getStats(); } catch (_) { }
    res.json({
      success: true,
      data: {
        tasks: { total: taskStats?.total ?? 0, today: taskStats?.today ?? 0, overdue: taskStats?.overdue ?? 0 },
        attendance: { checked_in: attendanceStats?.checked_in ?? attendanceStats?.present ?? 0, total_employees: attendanceStats?.total_employees ?? 0 },
      },
    });
  } catch (e) {
    res.json({ success: true, data: { tasks: { total: 0, today: 0, overdue: 0 }, attendance: { checked_in: 0, total_employees: 0 } } });
  }
});

// ═══════════════════════════════════════════════
// ANALYTICS — 16 endpoints
// ═══════════════════════════════════════════════
const analytics = {
  'profit-loss': ds.profitLoss,
  'recent-invoices': ds.recentInvoices,
  'overdue-invoices': ds.overdueInvoices,
  'recent-payments': ds.recentPayments,
  'top-customers': ds.topCustomers,
  'most-profitable-customers': ds.mostProfitableCustomers,
  'top-selling-products': ds.topSellingProducts,
  'stagnant-products': ds.stagnantProducts,
  'below-minimum': ds.belowMinimum,
  'negative-stock': ds.negativeStock,
  'best-paying-customers': ds.bestPayingCustomers,
  'top-sales-reps': ds.topSalesReps,
  'top-regions': ds.topRegions,
  'invoices-today': ds.invoicesToday,
  'late-employees': ds.lateEmployees,
  'fastest-employees': ds.fastestEmployees,
};

for (const [path, handler] of Object.entries(analytics)) {
  router.get(`/analytics/${path}`, async (req, res) => {
    res.json({ success: true, data: await handler() });
  });
}

module.exports = router;
