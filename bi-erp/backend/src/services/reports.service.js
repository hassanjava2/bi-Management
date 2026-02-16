/**
 * BI Management - Reports Service
 * خدمة التقارير — جميع استعلامات SQL
 */
const { all, get } = require('../config/database');
const logger = require('../utils/logger');

const NOT_DELETED = "AND (is_deleted = 0 OR is_deleted IS NULL)";
const NOT_CANCELLED = "AND (status IS NULL OR status NOT IN ('cancelled'))";

// ─── Summary ───
async function getSummary() {
  const [users, customers, invoices, products] = await Promise.all([
    get('SELECT COUNT(*) as c FROM users WHERE is_active = 1').then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COUNT(*) as c FROM customers WHERE (is_deleted = 0 OR is_deleted IS NULL)`).then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COUNT(*) as c FROM invoices WHERE (is_deleted = 0 OR is_deleted IS NULL)`).then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COUNT(*) as c FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)`).then(r => r?.c || 0).catch(() => 0),
  ]);
  return { users, customers, invoices, products };
}

// ─── Executive Dashboard ───
async function getExecutiveDashboard() {
  const [totalSales, totalPurchases, totalCustomers, totalProducts, todaySales, monthlySales] = await Promise.all([
    get(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type = 'sale' ${NOT_CANCELLED} ${NOT_DELETED}`).catch(() => ({ count: 0, total: 0 })),
    get(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type = 'purchase' ${NOT_CANCELLED} ${NOT_DELETED}`).catch(() => ({ count: 0, total: 0 })),
    get(`SELECT COUNT(*) as c FROM customers WHERE (is_deleted = 0 OR is_deleted IS NULL)`).then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COUNT(*) as c FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)`).then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type = 'sale' ${NOT_CANCELLED} AND created_at::date = CURRENT_DATE ${NOT_DELETED}`).catch(() => ({ count: 0, total: 0 })),
    get(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE type = 'sale' ${NOT_CANCELLED} AND date_trunc('month', created_at) = date_trunc('month', CURRENT_TIMESTAMP) ${NOT_DELETED}`).catch(() => ({ count: 0, total: 0 })),
  ]);

  const salesTotal = Number(totalSales?.total) || 0;
  const purchasesTotal = Number(totalPurchases?.total) || 0;
  const profit = salesTotal - purchasesTotal;

  let cashFlow = [];
  try {
    cashFlow = await all(`
      SELECT created_at::date as date,
        COALESCE(SUM(CASE WHEN type = 'sale' THEN total ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN type = 'purchase' THEN total ELSE 0 END), 0) as purchases
      FROM invoices WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' ${NOT_CANCELLED} ${NOT_DELETED}
      GROUP BY created_at::date ORDER BY date ASC
    `);
    cashFlow = cashFlow.map(r => ({
      date: r.date,
      sales: Number(r.sales) || 0,
      purchases: Number(r.purchases) || 0,
      profit: (Number(r.sales) || 0) - (Number(r.purchases) || 0),
    }));
  } catch (_) { }

  let topSellers = [];
  try {
    topSellers = await all(`
      SELECT p.name as product_name, SUM(ii.quantity) as total_qty, SUM(ii.quantity * ii.unit_price) as total_revenue
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      JOIN products p ON p.id = ii.product_id
      WHERE i.type = 'sale'
        AND date_trunc('month', i.created_at) = date_trunc('month', CURRENT_TIMESTAMP)
        AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
        AND (i.status IS NULL OR i.status != 'cancelled')
      GROUP BY p.id, p.name ORDER BY total_qty DESC LIMIT 10
    `);
    topSellers = topSellers.map(r => ({ name: r.product_name, qty: Number(r.total_qty) || 0, revenue: Number(r.total_revenue) || 0 }));
  } catch (_) { }

  let lowStock = 0, overduePayments = 0;
  try { lowStock = (await get(`SELECT COUNT(*) as c FROM products WHERE quantity <= COALESCE(min_quantity, 5) AND quantity > 0 AND (is_deleted = 0 OR is_deleted IS NULL)`))?.c || 0; } catch (_) { }
  try { overduePayments = (await get(`SELECT COUNT(*) as c FROM invoices WHERE payment_type = 'credit' AND payment_status != 'paid' AND (is_deleted = 0 OR is_deleted IS NULL)`))?.c || 0; } catch (_) { }

  return {
    sales: { count: totalSales?.count || 0, total: salesTotal },
    purchases: { count: totalPurchases?.count || 0, total: purchasesTotal },
    total_customers: totalCustomers, total_products: totalProducts,
    today_sales: { count: todaySales?.count || 0, total: Number(todaySales?.total) || 0 },
    monthly_sales: { count: monthlySales?.count || 0, total: Number(monthlySales?.total) || 0 },
    revenue: { total_sales: salesTotal, total_purchases: purchasesTotal, net_profit: profit, profit_margin: salesTotal > 0 ? ((profit / salesTotal) * 100).toFixed(1) : 0 },
    cash_flow: cashFlow,
    top_sellers_month: topSellers,
    alerts: { low_stock: lowStock, overdue_payments: overduePayments, pending_approvals: 0 },
  };
}

// ─── Sales Report ───
async function getSalesReport() {
  const rows = await all(`
    SELECT created_at::date as date, COUNT(*) as count, COALESCE(SUM(total), 0) as total,
      COALESCE(SUM(total - COALESCE(cost_total, 0)), 0) as profit
    FROM invoices WHERE type = 'sale' AND (is_deleted = 0 OR is_deleted IS NULL)
    GROUP BY created_at::date ORDER BY date DESC LIMIT 30
  `);
  return rows.map(r => ({ ...r, total: Number(r.total), profit: Number(r.profit) }));
}

// ─── Inventory Report ───
async function getInventoryReport() {
  return all(`
    SELECT id, name, quantity, min_quantity, cost_price, selling_price, category_id
    FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)
    ORDER BY quantity ASC LIMIT 50
  `);
}

// ─── Top Customers ───
async function getTopCustomers() {
  const rows = await all(`
    SELECT c.id, c.name, c.phone, COUNT(i.id) as invoice_count, COALESCE(SUM(i.total), 0) as total_spent
    FROM customers c
    LEFT JOIN invoices i ON i.customer_id = c.id AND i.type = 'sale' AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
    WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)
    GROUP BY c.id, c.name, c.phone ORDER BY total_spent DESC LIMIT 20
  `);
  return rows.map(r => ({ ...r, total_spent: Number(r.total_spent) }));
}

// ─── Sales by Employee ───
async function getSalesByEmployee() {
  const rows = await all(`
    SELECT u.id, u.full_name, COUNT(i.id)::int as invoice_count,
      COALESCE(SUM(i.total), 0) as total_sales,
      COALESCE(SUM(i.total - COALESCE(i.cost_total, 0)), 0) as total_profit
    FROM users u
    LEFT JOIN invoices i ON i.created_by = u.id AND i.type = 'sale'
      AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
      AND (i.status IS NULL OR i.status != 'cancelled')
    WHERE u.is_active = 1 AND u.role IN ('sales', 'admin', 'manager', 'owner')
    GROUP BY u.id, u.full_name ORDER BY total_sales DESC
  `);
  return rows.map(r => ({ ...r, total_sales: Number(r.total_sales), total_profit: Number(r.total_profit) }));
}

// ─── Profit by Product ───
async function getProfitByProduct() {
  const rows = await all(`
    SELECT p.id, p.name, SUM(ii.quantity)::int as total_sold,
      COALESCE(SUM(ii.quantity * ii.unit_price), 0) as total_revenue,
      COALESCE(SUM(ii.quantity * COALESCE(p.cost_price, 0)), 0) as total_cost,
      COALESCE(SUM(ii.quantity * ii.unit_price), 0) - COALESCE(SUM(ii.quantity * COALESCE(p.cost_price, 0)), 0) as profit
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id AND i.type = 'sale'
      AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
      AND (i.status IS NULL OR i.status != 'cancelled')
    JOIN products p ON p.id = ii.product_id
    GROUP BY p.id, p.name ORDER BY profit DESC LIMIT 50
  `);
  return rows.map(r => ({ ...r, total_revenue: Number(r.total_revenue), total_cost: Number(r.total_cost), profit: Number(r.profit) }));
}

// ─── Aging Report ───
async function getAgingReport() {
  const customers = await all(`
    SELECT c.id, c.name, c.phone, COUNT(i.id)::int as pending_invoices,
      COALESCE(SUM(i.total - COALESCE(i.paid, 0)), 0) as total_remaining,
      COALESCE(SUM(CASE WHEN i.created_at < CURRENT_TIMESTAMP - INTERVAL '30 days' THEN (i.total - COALESCE(i.paid, 0)) ELSE 0 END), 0) as overdue_amount,
      COALESCE(SUM(CASE WHEN i.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN (i.total - COALESCE(i.paid, 0)) ELSE 0 END), 0) as due_30_days
    FROM customers c
    JOIN invoices i ON i.customer_id = c.id AND i.payment_type = 'credit'
      AND (i.payment_status IS NULL OR i.payment_status != 'paid')
      AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
    WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)
    GROUP BY c.id, c.name, c.phone
    HAVING SUM(i.total - COALESCE(i.paid, 0)) > 0
    ORDER BY total_remaining DESC
  `);

  const mapped = customers.map(c => ({ ...c, total_remaining: Number(c.total_remaining), overdue_amount: Number(c.overdue_amount), due_30_days: Number(c.due_30_days) }));
  return {
    customers: mapped,
    totals: {
      total_receivable: mapped.reduce((s, c) => s + c.total_remaining, 0),
      total_overdue: mapped.reduce((s, c) => s + c.overdue_amount, 0),
      total_due_30: mapped.reduce((s, c) => s + c.due_30_days, 0),
      customers_count: mapped.length
    }
  };
}

// ─── Employee Performance ───
async function getEmployeePerformance(month) {
  month = month || new Date().toISOString().slice(0, 7);
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  const employees = await all(`
    SELECT u.id, u.full_name,
      (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE created_by = u.id AND type = 'sale' AND created_at::date BETWEEN $1 AND $2 AND (is_deleted = 0 OR is_deleted IS NULL)) as sales_total,
      (SELECT COUNT(*) FROM invoices WHERE created_by = u.id AND type = 'sale' AND created_at::date BETWEEN $1 AND $2 AND (is_deleted = 0 OR is_deleted IS NULL))::int as invoices_created,
      (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status = 'completed' AND updated_at::date BETWEEN $1 AND $2)::int as tasks_completed,
      (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND created_at::date BETWEEN $1 AND $2)::int as tasks_total,
      (SELECT COUNT(*) FROM attendance WHERE user_id = u.id AND date BETWEEN $1 AND $2 AND status = 'present')::int as present_days,
      (SELECT COUNT(*) FROM attendance WHERE user_id = u.id AND date BETWEEN $1 AND $2 AND status = 'late')::int as late_days
    FROM users u WHERE u.is_active = 1 ORDER BY sales_total DESC
  `, [startDate, endDate]);

  return { employees: employees.map(e => ({ ...e, sales_total: Number(e.sales_total) })) };
}

// ─── CSV Export Data ───
async function getExportData(type) {
  const exporters = {
    sales: async () => ({
      headers: ['التاريخ', 'عدد الفواتير', 'المجموع'],
      rows: (await all(`SELECT created_at::date as date, COUNT(*)::int as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE type = 'sale' AND (is_deleted = 0 OR is_deleted IS NULL) GROUP BY created_at::date ORDER BY date DESC LIMIT 60`)).map(r => [r.date, r.count, r.total]),
    }),
    'sales-by-employee': async () => ({
      headers: ['الموظف', 'عدد الفواتير', 'المجموع'],
      rows: (await all(`SELECT u.full_name, COUNT(i.id)::int as invoices, COALESCE(SUM(i.total), 0) as total FROM users u LEFT JOIN invoices i ON i.created_by = u.id AND i.type = 'sale' AND (i.is_deleted = 0 OR i.is_deleted IS NULL) WHERE u.is_active = 1 GROUP BY u.id, u.full_name ORDER BY total DESC`)).map(r => [r.full_name, r.invoices, r.total]),
    }),
    customers: async () => ({
      headers: ['العميل', 'الهاتف', 'الفواتير', 'المجموع'],
      rows: (await all(`SELECT c.name, c.phone, COUNT(i.id)::int as invoices, COALESCE(SUM(i.total), 0) as total FROM customers c LEFT JOIN invoices i ON i.customer_id = c.id AND (i.is_deleted = 0 OR i.is_deleted IS NULL) WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL) GROUP BY c.id, c.name, c.phone ORDER BY total DESC LIMIT 100`)).map(r => [r.name, r.phone || '', r.invoices, r.total]),
    }),
    inventory: async () => ({
      headers: ['المنتج', 'الكمية', 'الحد الأدنى', 'التكلفة', 'السعر'],
      rows: (await all(`SELECT name, quantity, COALESCE(min_quantity, 0) as min_qty, COALESCE(cost_price, 0) as cost, COALESCE(selling_price, 0) as price FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL) ORDER BY quantity ASC LIMIT 100`)).map(r => [r.name, r.quantity, r.min_qty, r.cost, r.price]),
    }),
    'profit-by-product': async () => ({
      headers: ['المنتج', 'المباع', 'الإيرادات', 'التكلفة', 'الربح'],
      rows: (await all(`SELECT p.name, SUM(ii.quantity)::int as sold, COALESCE(SUM(ii.quantity * ii.unit_price), 0) as revenue, COALESCE(SUM(ii.quantity * COALESCE(p.cost_price, 0)), 0) as cost FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id AND i.type = 'sale' AND (i.is_deleted = 0 OR i.is_deleted IS NULL) JOIN products p ON p.id = ii.product_id GROUP BY p.id, p.name ORDER BY revenue DESC LIMIT 50`)).map(r => [r.name, r.sold, r.revenue, r.cost, Number(r.revenue) - Number(r.cost)]),
    }),
    'aging-report': async () => ({
      headers: ['العميل', 'الهاتف', 'المتبقي'],
      rows: (await all(`SELECT c.name, c.phone, COALESCE(SUM(i.total - COALESCE(i.paid, 0)), 0) as remaining FROM customers c JOIN invoices i ON i.customer_id = c.id AND i.payment_type = 'credit' AND (i.is_deleted = 0 OR i.is_deleted IS NULL) WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL) GROUP BY c.id, c.name, c.phone HAVING SUM(i.total - COALESCE(i.paid, 0)) > 0 ORDER BY remaining DESC`)).map(r => [r.name, r.phone || '', r.remaining]),
    }),
  };

  if (!exporters[type]) return null;
  return exporters[type]();
}

module.exports = {
  getSummary,
  getExecutiveDashboard,
  getSalesReport,
  getInventoryReport,
  getTopCustomers,
  getSalesByEmployee,
  getProfitByProduct,
  getAgingReport,
  getEmployeePerformance,
  getExportData,
  // ═══ Phase 5 Advanced Reports ═══
  topSelling, topPurchased, stagnant, nearExpiry, belowMin,
  negativeStock, frozen, damagedProducts, consumedProducts,
  profitRanking, productMovement, inventorySummary,
  salesReportAdvanced, purchasesReportAdvanced, profitByPeriod, overdueInvoices,
  topCustomersAdvanced, salespersonReport, voucherReport, expenseReport,
  financialSummary,
};

// ═══════════════════════════════════════════════
// INVENTORY REPORTS — Phase 5
// ═══════════════════════════════════════════════

async function topSelling({ from, to, limit = 20 } = {}) {
  let q = `SELECT p.id, p.name, p.barcode, p.quantity as stock, COALESCE(SUM(ii.quantity), 0)::int as total_sold, COALESCE(SUM(ii.total), 0) as total_revenue
    FROM products p LEFT JOIN invoice_items ii ON ii.product_id = p.id LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.type = 'sale' AND (i.status != 'cancelled')
    WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL)`;
  const params = [];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  q += ` GROUP BY p.id, p.name, p.barcode, p.quantity ORDER BY total_sold DESC`;
  params.push(limit); q += ` LIMIT $${params.length}`;
  return all(q, params);
}

async function topPurchased({ from, to, limit = 20 } = {}) {
  let q = `SELECT p.id, p.name, p.barcode, p.quantity as stock, COALESCE(SUM(ii.quantity), 0)::int as total_purchased, COALESCE(SUM(ii.total), 0) as total_cost
    FROM products p LEFT JOIN invoice_items ii ON ii.product_id = p.id LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.type = 'purchase' AND (i.status != 'cancelled')
    WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL)`;
  const params = [];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  q += ` GROUP BY p.id, p.name, p.barcode, p.quantity ORDER BY total_purchased DESC`;
  params.push(limit); q += ` LIMIT $${params.length}`;
  return all(q, params);
}

async function stagnant({ days = 30 } = {}) {
  return all(`SELECT p.id, p.name, p.barcode, p.quantity, p.sell_price, p.buy_price, p.last_sold_at,
    EXTRACT(DAY FROM NOW() - COALESCE(p.last_sold_at, p.created_at))::int as days_stagnant
    FROM products p WHERE p.quantity > 0 AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
    AND (p.last_sold_at IS NULL OR p.last_sold_at < NOW() - INTERVAL '${parseInt(days)} days')
    ORDER BY days_stagnant DESC LIMIT 100`);
}

async function nearExpiry({ days = 30 } = {}) {
  return all(`SELECT pb.*, p.name as product_name, p.barcode FROM product_batches pb
    LEFT JOIN products p ON pb.product_id = p.id
    WHERE pb.expiry_date IS NOT NULL AND pb.expiry_date <= CURRENT_DATE + INTERVAL '${parseInt(days)} days'
    AND pb.quantity > 0 ORDER BY pb.expiry_date ASC LIMIT 100`).catch(() => []);
}

async function belowMin() {
  return all(`SELECT p.id, p.name, p.barcode, p.quantity, p.min_quantity, (p.min_quantity - p.quantity) as deficit
    FROM products p WHERE p.min_quantity > 0 AND p.quantity < p.min_quantity AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
    ORDER BY deficit DESC LIMIT 100`);
}

async function negativeStock() {
  return all(`SELECT p.id, p.name, p.barcode, p.quantity, p.buy_price, p.sell_price
    FROM products p WHERE p.quantity < 0 AND (p.is_deleted = 0 OR p.is_deleted IS NULL) ORDER BY p.quantity ASC LIMIT 100`);
}

async function frozen() {
  return all(`SELECT p.id, p.name, p.barcode, p.quantity, p.is_frozen, p.frozen_type, p.frozen_at
    FROM products p WHERE p.is_frozen = TRUE AND (p.is_deleted = 0 OR p.is_deleted IS NULL) ORDER BY p.frozen_at DESC LIMIT 100`).catch(() => []);
}

async function damagedProducts({ from, to } = {}) {
  let q = `SELECT p.id, p.name, p.barcode, COALESCE(SUM(ii.quantity), 0)::int as total_damaged, COALESCE(SUM(ii.total), 0) as total_loss
    FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id AND i.type = 'damaged' JOIN products p ON ii.product_id = p.id WHERE 1=1`;
  const params = [];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  q += ' GROUP BY p.id, p.name, p.barcode ORDER BY total_damaged DESC LIMIT 100';
  return all(q, params);
}

async function consumedProducts({ from, to } = {}) {
  let q = `SELECT p.id, p.name, p.barcode, COALESCE(SUM(ii.quantity), 0)::int as total_consumed, COALESCE(SUM(ii.total), 0) as total_cost
    FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id AND i.type = 'consumed' JOIN products p ON ii.product_id = p.id WHERE 1=1`;
  const params = [];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  q += ' GROUP BY p.id, p.name, p.barcode ORDER BY total_consumed DESC LIMIT 100';
  return all(q, params);
}

async function profitRanking({ order = 'DESC', from, to, limit = 20 } = {}) {
  let q = `SELECT p.id, p.name, p.barcode, COALESCE(SUM(ii.quantity), 0)::int as qty_sold, COALESCE(SUM(ii.profit), 0) as total_profit,
    CASE WHEN SUM(ii.quantity) > 0 THEN SUM(ii.profit) / SUM(ii.quantity) ELSE 0 END as profit_per_unit
    FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id AND i.type = 'sale' AND i.status != 'cancelled'
    JOIN products p ON ii.product_id = p.id WHERE 1=1`;
  const params = [];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  q += ` GROUP BY p.id, p.name, p.barcode ORDER BY total_profit ${order === 'ASC' ? 'ASC' : 'DESC'}`;
  params.push(limit); q += ` LIMIT $${params.length}`;
  return all(q, params);
}

async function productMovement(productId, { from, to } = {}) {
  let q = `SELECT i.id, i.invoice_number, i.type, i.created_at, ii.quantity, ii.unit_price, ii.total, ii.profit,
    c.name as customer_name, s.name as supplier_name
    FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id AND i.status != 'cancelled'
    LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN suppliers s ON i.supplier_id = s.id WHERE ii.product_id = $1`;
  const params = [productId];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  q += ' ORDER BY i.created_at DESC LIMIT 200';
  return all(q, params);
}

async function inventorySummary() {
  return get(`SELECT COUNT(*)::int as total_products,
    SUM(CASE WHEN quantity > 0 THEN 1 ELSE 0 END)::int as in_stock,
    SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END)::int as out_of_stock,
    SUM(CASE WHEN quantity < 0 THEN 1 ELSE 0 END)::int as negative_stock,
    SUM(CASE WHEN min_quantity > 0 AND quantity < min_quantity THEN 1 ELSE 0 END)::int as below_min,
    COALESCE(SUM(quantity * COALESCE(buy_price, 0)), 0) as total_cost_value,
    COALESCE(SUM(quantity * COALESCE(sell_price, 0)), 0) as total_sell_value
    FROM products WHERE is_deleted = 0 OR is_deleted IS NULL`).catch(() => ({}));
}

// ═══════════════════════════════════════════════
// FINANCIAL REPORTS — Phase 5
// ═══════════════════════════════════════════════

async function salesReportAdvanced({ from, to, customer_id, salesperson_id, currency } = {}) {
  let q = `SELECT i.id, i.invoice_number, i.created_at, i.total, i.paid_amount, i.remaining_amount, i.profit_total, i.currency, i.discount_amount,
    c.name as customer_name, u.full_name as salesperson_name
    FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN users u ON i.salesperson_id = u.id
    WHERE i.type = 'sale' AND i.status != 'cancelled' ${NOT_DELETED}`;
  const params = [];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  if (customer_id) { params.push(customer_id); q += ` AND i.customer_id = $${params.length}`; }
  if (salesperson_id) { params.push(salesperson_id); q += ` AND i.salesperson_id = $${params.length}`; }
  if (currency) { params.push(currency); q += ` AND i.currency = $${params.length}`; }
  q += ' ORDER BY i.created_at DESC LIMIT 500';
  const rows = await all(q, params);
  const totals = rows.reduce((a, r) => ({ total: a.total + (+r.total || 0), paid: a.paid + (+r.paid_amount || 0), remaining: a.remaining + (+r.remaining_amount || 0), profit: a.profit + (+r.profit_total || 0), discount: a.discount + (+r.discount_amount || 0) }), { total: 0, paid: 0, remaining: 0, profit: 0, discount: 0 });
  return { rows, totals, count: rows.length };
}

async function purchasesReportAdvanced({ from, to, supplier_id, currency } = {}) {
  let q = `SELECT i.id, i.invoice_number, i.created_at, i.total, i.paid_amount, i.remaining_amount, i.currency, s.name as supplier_name
    FROM invoices i LEFT JOIN suppliers s ON i.supplier_id = s.id WHERE i.type = 'purchase' AND i.status != 'cancelled' ${NOT_DELETED}`;
  const params = [];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  if (supplier_id) { params.push(supplier_id); q += ` AND i.supplier_id = $${params.length}`; }
  if (currency) { params.push(currency); q += ` AND i.currency = $${params.length}`; }
  q += ' ORDER BY i.created_at DESC LIMIT 500';
  const rows = await all(q, params);
  const totals = rows.reduce((a, r) => ({ total: a.total + (+r.total || 0), paid: a.paid + (+r.paid_amount || 0), remaining: a.remaining + (+r.remaining_amount || 0) }), { total: 0, paid: 0, remaining: 0 });
  return { rows, totals, count: rows.length };
}

async function profitByPeriod({ from, to, group_by = 'day' } = {}) {
  const fmt = group_by === 'month' ? 'YYYY-MM' : group_by === 'week' ? 'IYYY-IW' : 'YYYY-MM-DD';
  let q = `SELECT TO_CHAR(i.created_at, '${fmt}') as period, COUNT(*)::int as invoice_count, COALESCE(SUM(i.total), 0) as revenue,
    COALESCE(SUM(i.profit_total), 0) as profit, COALESCE(SUM(i.discount_amount), 0) as discounts
    FROM invoices i WHERE i.type = 'sale' AND i.status != 'cancelled' ${NOT_DELETED}`;
  const params = [];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  q += ' GROUP BY period ORDER BY period DESC LIMIT 365';
  return all(q, params);
}

async function overdueInvoices({ days = 30 } = {}) {
  return all(`SELECT i.id, i.invoice_number, i.type, i.created_at, i.total, i.paid_amount, i.remaining_amount, i.due_date, i.currency,
    c.name as customer_name, c.phone as customer_phone, s.name as supplier_name,
    EXTRACT(DAY FROM NOW() - COALESCE(i.due_date, i.created_at))::int as days_overdue
    FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.remaining_amount > 0 AND i.status != 'cancelled' AND i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE
    ORDER BY days_overdue DESC LIMIT 200`);
}

async function topCustomersAdvanced({ from, to, limit = 20 } = {}) {
  let q = `SELECT c.id, c.name, c.phone, c.balance, COUNT(i.id)::int as invoice_count, COALESCE(SUM(i.total), 0) as total_purchases, COALESCE(SUM(i.profit_total), 0) as total_profit
    FROM customers c LEFT JOIN invoices i ON i.customer_id = c.id AND i.type = 'sale' AND i.status != 'cancelled' WHERE 1=1`;
  const params = [];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  q += ' GROUP BY c.id, c.name, c.phone, c.balance ORDER BY total_purchases DESC';
  params.push(limit); q += ` LIMIT $${params.length}`;
  return all(q, params);
}

async function salespersonReport({ from, to } = {}) {
  let q = `SELECT u.id, u.full_name, COUNT(i.id)::int as invoice_count, COALESCE(SUM(i.total), 0) as total_sales,
    COALESCE(SUM(i.profit_total), 0) as total_profit, COALESCE(SUM(i.commission_amount), 0) as total_commission
    FROM users u LEFT JOIN invoices i ON i.salesperson_id = u.id AND i.type = 'sale' AND i.status != 'cancelled' WHERE 1=1`;
  const params = [];
  if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
  q += ' GROUP BY u.id, u.full_name HAVING COUNT(i.id) > 0 ORDER BY total_sales DESC LIMIT 50';
  return all(q, params);
}

async function voucherReport({ type, from, to, currency } = {}) {
  let q = `SELECT v.*, u.full_name as created_by_name, c.name as customer_name, s.name as supplier_name
    FROM vouchers v LEFT JOIN users u ON v.created_by = u.id LEFT JOIN customers c ON v.customer_id = c.id LEFT JOIN suppliers s ON v.supplier_id = s.id
    WHERE (v.status IS NULL OR v.status != 'cancelled')`;
  const params = [];
  if (type) { params.push(type); q += ` AND v.type = $${params.length}`; }
  if (from) { params.push(from); q += ` AND v.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND v.created_at::date <= $${params.length}`; }
  if (currency) { params.push(currency); q += ` AND v.currency = $${params.length}`; }
  q += ' ORDER BY v.created_at DESC LIMIT 500';
  const rows = await all(q, params);
  const totals = rows.reduce((a, r) => { a.total += +r.amount || 0; if (!a.by_type[r.type]) a.by_type[r.type] = 0; a.by_type[r.type] += +r.amount || 0; return a; }, { total: 0, by_type: {} });
  return { rows, totals, count: rows.length };
}

async function expenseReport({ from, to, category } = {}) {
  let q = `SELECT v.*, u.full_name as created_by_name FROM vouchers v LEFT JOIN users u ON v.created_by = u.id
    WHERE v.type = 'expense' AND (v.status IS NULL OR v.status != 'cancelled')`;
  const params = [];
  if (from) { params.push(from); q += ` AND v.created_at::date >= $${params.length}`; }
  if (to) { params.push(to); q += ` AND v.created_at::date <= $${params.length}`; }
  if (category) { params.push(category); q += ` AND v.expense_category = $${params.length}`; }
  q += ' ORDER BY v.created_at DESC LIMIT 500';
  const rows = await all(q, params);
  const total = rows.reduce((a, r) => a + (+r.amount || 0), 0);
  const byCategory = {};
  rows.forEach(r => { const c = r.expense_category || r.category || 'أخرى'; byCategory[c] = (byCategory[c] || 0) + (+r.amount || 0); });
  return { rows, total, byCategory, count: rows.length };
}

async function financialSummary() {
  const [sales, purchases, receipts, payments, expenses, receivables, payables] = await Promise.all([
    get(`SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0) as total, COALESCE(SUM(profit_total), 0) as profit FROM invoices WHERE type = 'sale' AND status != 'cancelled' ${NOT_DELETED}`).catch(() => ({})),
    get(`SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE type = 'purchase' AND status != 'cancelled' ${NOT_DELETED}`).catch(() => ({})),
    get(`SELECT COALESCE(SUM(amount), 0) as total FROM vouchers WHERE type = 'receipt' AND (status IS NULL OR status != 'cancelled')`).catch(() => ({})),
    get(`SELECT COALESCE(SUM(amount), 0) as total FROM vouchers WHERE type = 'payment' AND (status IS NULL OR status != 'cancelled')`).catch(() => ({})),
    get(`SELECT COALESCE(SUM(amount), 0) as total FROM vouchers WHERE type = 'expense' AND (status IS NULL OR status != 'cancelled')`).catch(() => ({})),
    get(`SELECT COALESCE(SUM(balance), 0) as total FROM customers WHERE balance > 0`).catch(() => ({})),
    get(`SELECT COALESCE(SUM(balance), 0) as total FROM suppliers WHERE balance > 0`).catch(() => ({})),
  ]);
  const r = +receipts?.total || 0, p = +payments?.total || 0, e = +expenses?.total || 0;
  return {
    sales: { count: sales?.count || 0, total: +sales?.total || 0, profit: +sales?.profit || 0 },
    purchases: { count: purchases?.count || 0, total: +purchases?.total || 0 },
    receipts: r, payments: p, expenses: e,
    receivables: +receivables?.total || 0, payables: +payables?.total || 0,
    net_cash: r - p - e,
  };
}
