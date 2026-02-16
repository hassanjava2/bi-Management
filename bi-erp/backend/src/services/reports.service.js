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
};
