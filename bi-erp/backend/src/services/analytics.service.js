/**
 * BI ERP — Dashboard Analytics Service (Phase 10)
 * تحليلات لوحة التحكم المتقدمة
 */
const { get, all } = require('../config/database');

const ND = "AND (is_deleted = 0 OR is_deleted IS NULL)";

// ─── أعلى الزبائن أرباحاً ─────────────
async function topProfitCustomers({ from, to, limit = 10 } = {}) {
    let q = `SELECT c.id, c.name, c.phone, 
    COALESCE(SUM(i.profit_total), 0) as total_profit,
    COUNT(i.id)::int as invoice_count,
    COALESCE(SUM(i.total), 0) as total_sales
    FROM customers c
    LEFT JOIN invoices i ON i.customer_id = c.id AND i.type = 'sale' AND i.status != 'cancelled' ${ND}
    WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)`;
    const params = [];
    if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
    if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
    q += ' GROUP BY c.id, c.name, c.phone HAVING SUM(i.profit_total) > 0 ORDER BY total_profit DESC';
    params.push(parseInt(limit)); q += ` LIMIT $${params.length}`;
    return all(q, params);
}

// ─── المواد الأعلى استهلاكاً ──────────
async function topConsumed({ from, to, limit = 10 } = {}) {
    let q = `SELECT p.id, p.name, p.barcode, COALESCE(p.total_consumed,0) as consumed,
    COALESCE(SUM(ii.quantity), 0)::int as total_sold
    FROM products p
    LEFT JOIN invoice_items ii ON ii.product_id = p.id
    LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.type = 'sale' AND i.status != 'cancelled'
    WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL)`;
    const params = [];
    if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
    if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
    q += ' GROUP BY p.id, p.name, p.barcode, p.total_consumed ORDER BY consumed DESC';
    params.push(parseInt(limit)); q += ` LIMIT $${params.length}`;
    return all(q, params);
}

// ─── الزبون الأفضل تسديداً ────────────
async function bestPayingCustomers({ limit = 10 } = {}) {
    return all(`
    SELECT c.id, c.name, c.phone, c.balance,
      COALESCE(c.total_paid, 0) as total_paid,
      COALESCE(c.total_purchases, 0) as total_purchases,
      CASE WHEN c.total_purchases > 0 THEN ROUND((c.total_paid / c.total_purchases * 100)::numeric, 1) ELSE 0 END as payment_ratio
    FROM customers c
    WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL) AND c.total_paid > 0
    ORDER BY payment_ratio DESC, total_paid DESC
    LIMIT $1
  `, [parseInt(limit)]).catch(() => []);
}

// ─── المندوب الأكثر مبيعاً ─────────────
async function topSalespeople({ from, to, limit = 10 } = {}) {
    let q = `SELECT u.id, u.full_name, u.role,
    COUNT(i.id)::int as invoice_count,
    COALESCE(SUM(i.total), 0) as total_sales,
    COALESCE(SUM(i.profit_total), 0) as total_profit
    FROM users u
    LEFT JOIN invoices i ON i.salesperson_id = u.id AND i.type = 'sale' AND i.status != 'cancelled' ${ND}
    WHERE u.is_active = 1`;
    const params = [];
    if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
    if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
    q += ' GROUP BY u.id, u.full_name, u.role HAVING COUNT(i.id) > 0 ORDER BY total_sales DESC';
    params.push(parseInt(limit)); q += ` LIMIT $${params.length}`;
    return all(q, params);
}

// ─── المنطقة الأكثر مبيعاً ─────────────
async function topAreas({ from, to, limit = 10 } = {}) {
    let q = `SELECT c.area, COUNT(i.id)::int as invoice_count,
    COALESCE(SUM(i.total), 0) as total_sales,
    COALESCE(SUM(i.profit_total), 0) as total_profit,
    COUNT(DISTINCT c.id)::int as customer_count
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.type = 'sale' AND i.status != 'cancelled' AND c.area IS NOT NULL ${ND}`;
    const params = [];
    if (from) { params.push(from); q += ` AND i.created_at::date >= $${params.length}`; }
    if (to) { params.push(to); q += ` AND i.created_at::date <= $${params.length}`; }
    q += ' GROUP BY c.area ORDER BY total_sales DESC';
    params.push(parseInt(limit)); q += ` LIMIT $${params.length}`;
    return all(q, params);
}

// ─── الفواتير لآخر أسبوع/شهر ──────────
async function recentInvoiceTrend({ period = 'week' } = {}) {
    const interval = period === 'month' ? '30 days' : '7 days';
    return all(`
    SELECT created_at::date as date, type,
      COUNT(*)::int as count, COALESCE(SUM(total), 0) as total,
      COALESCE(SUM(profit_total), 0) as profit
    FROM invoices
    WHERE created_at >= NOW() - INTERVAL '${interval}' AND status != 'cancelled' ${ND}
    GROUP BY created_at::date, type
    ORDER BY date ASC, type
  `).catch(() => []);
}

// ─── المندوبين دون المستوى ──────────────
async function underperformingSalespeople({ threshold = 5 } = {}) {
    return all(`
    SELECT u.id, u.full_name,
      COUNT(i.id)::int as invoice_count,
      COALESCE(SUM(i.total), 0) as total_sales
    FROM users u
    LEFT JOIN invoices i ON i.salesperson_id = u.id AND i.type = 'sale' AND i.status != 'cancelled'
      AND i.created_at >= NOW() - INTERVAL '30 days' ${ND}
    WHERE u.is_active = 1 AND (u.role = 'sales' OR u.role = 'salesperson')
    GROUP BY u.id, u.full_name
    HAVING COUNT(i.id) < $1
    ORDER BY invoice_count ASC
  `, [parseInt(threshold)]).catch(() => []);
}

// ─── ملخص شامل (لوحة تحكم) ────────────
async function dashboardSummary() {
    const [todaySales, todayPurchases, todayReceipts, todayPayments, pendingInvoices, cashboxTotal] = await Promise.all([
        get(`SELECT COUNT(*)::int as c, COALESCE(SUM(total),0) as t, COALESCE(SUM(profit_total),0) as p FROM invoices WHERE type='sale' AND status!='cancelled' AND created_at::date=CURRENT_DATE ${ND}`).catch(() => ({})),
        get(`SELECT COUNT(*)::int as c, COALESCE(SUM(total),0) as t FROM invoices WHERE type='purchase' AND status!='cancelled' AND created_at::date=CURRENT_DATE ${ND}`).catch(() => ({})),
        get(`SELECT COALESCE(SUM(amount),0) as t FROM vouchers WHERE type='receipt' AND status!='cancelled' AND created_at::date=CURRENT_DATE`).catch(() => ({})),
        get(`SELECT COALESCE(SUM(amount),0) as t FROM vouchers WHERE type='payment' AND status!='cancelled' AND created_at::date=CURRENT_DATE`).catch(() => ({})),
        get(`SELECT COUNT(*)::int as c FROM invoices WHERE status='waiting' ${ND}`).catch(() => ({})),
        get(`SELECT COALESCE(SUM(balance),0) as t FROM cashboxes WHERE is_active = TRUE`).catch(() => ({})),
    ]);

    return {
        today: {
            sales: { count: todaySales?.c || 0, total: +todaySales?.t || 0, profit: +todaySales?.p || 0 },
            purchases: { count: todayPurchases?.c || 0, total: +todayPurchases?.t || 0 },
            receipts: +todayReceipts?.t || 0,
            payments: +todayPayments?.t || 0,
            net_cash: (+todayReceipts?.t || 0) - (+todayPayments?.t || 0),
        },
        pending_invoices: pendingInvoices?.c || 0,
        cashbox_total: +cashboxTotal?.t || 0,
    };
}

module.exports = {
    topProfitCustomers, topConsumed, bestPayingCustomers,
    topSalespeople, topAreas, recentInvoiceTrend,
    underperformingSalespeople, dashboardSummary,
};
