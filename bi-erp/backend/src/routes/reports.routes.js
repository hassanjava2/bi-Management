/**
 * BI Management - Reports Routes
 * مسارات التقارير — thin controller
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const reportsService = require('../services/reports.service');
const logger = require('../utils/logger');

router.use(auth);

// ─── Summary ───
router.get('/summary', async (req, res) => {
  try {
    const data = await reportsService.getSummary();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: { users: 0, customers: 0, invoices: 0, products: 0 } });
  }
});

// ─── Executive Dashboard ───
router.get('/executive-dashboard', async (req, res) => {
  try {
    const data = await reportsService.getExecutiveDashboard();
    res.json({ success: true, data });
  } catch (e) {
    logger.error('[Reports] Executive error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Sales Report ───
router.get('/sales', async (req, res) => {
  try {
    const data = await reportsService.getSalesReport();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ─── Inventory Report ───
router.get('/inventory', async (req, res) => {
  try {
    const data = await reportsService.getInventoryReport();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ─── Top Customers ───
router.get('/top-customers', async (req, res) => {
  try {
    const data = await reportsService.getTopCustomers();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ─── Sales by Employee ───
router.get('/sales-by-employee', async (req, res) => {
  try {
    const data = await reportsService.getSalesByEmployee();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ─── Profit by Product ───
router.get('/profit-by-product', async (req, res) => {
  try {
    const data = await reportsService.getProfitByProduct();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ─── Aging Report ───
router.get('/aging-report', async (req, res) => {
  try {
    const data = await reportsService.getAgingReport();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: { customers: [], totals: {} } });
  }
});

// ─── Employee Performance ───
router.get('/employee-performance', async (req, res) => {
  try {
    const data = await reportsService.getEmployeePerformance(req.query.month);
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: { employees: [] } });
  }
});

// ─── CSV Export ───
router.get('/export/:type', async (req, res) => {
  try {
    const result = await reportsService.getExportData(req.params.type);
    if (!result) return res.status(400).json({ success: false, error: 'Unsupported export type' });

    const BOM = '\uFEFF';
    const csv = BOM + [result.headers.join(','), ...result.rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.type}-report.csv`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══ Phase 5: Advanced Inventory Reports ═══

router.get('/adv/top-selling', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.topSelling(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/top-purchased', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.topPurchased(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/stagnant', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.stagnant(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/near-expiry', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.nearExpiry(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/below-min', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.belowMin() }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/negative-stock', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.negativeStock() }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/frozen', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.frozen() }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/damaged-products', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.damagedProducts(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/consumed-products', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.consumedProducts(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/profit-ranking', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.profitRanking(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/product-movement/:productId', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.productMovement(req.params.productId, req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/inventory-summary', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.inventorySummary() }); }
  catch (e) { res.json({ success: true, data: {} }); }
});

// ═══ Phase 5: Advanced Financial Reports ═══

router.get('/adv/sales-detail', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.salesReportAdvanced(req.query) }); }
  catch (e) { res.json({ success: true, data: { rows: [], totals: {}, count: 0 } }); }
});

router.get('/adv/purchases-detail', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.purchasesReportAdvanced(req.query) }); }
  catch (e) { res.json({ success: true, data: { rows: [], totals: {}, count: 0 } }); }
});

router.get('/adv/profit-by-period', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.profitByPeriod(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/overdue', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.overdueInvoices(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/top-customers', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.topCustomersAdvanced(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/salesperson', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.salespersonReport(req.query) }); }
  catch (e) { res.json({ success: true, data: [] }); }
});

router.get('/adv/vouchers', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.voucherReport(req.query) }); }
  catch (e) { res.json({ success: true, data: { rows: [], totals: {}, count: 0 } }); }
});

router.get('/adv/expenses', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.expenseReport(req.query) }); }
  catch (e) { res.json({ success: true, data: { rows: [], total: 0, count: 0 } }); }
});

router.get('/adv/financial-summary', async (req, res) => {
  try { res.json({ success: true, data: await reportsService.financialSummary() }); }
  catch (e) { res.json({ success: true, data: {} }); }
});

module.exports = router;
