/**
 * BI Management - Reports Routes
 * مسارات التقارير
 */

const router = require('express').Router();
const { run, get, all } = require('../config/database');
const { auth } = require('../middleware/auth');

router.use(auth);

function getGoalsService() {
    try {
        return require('../services/goals.service').goalsService;
    } catch (e) {
        return null;
    }
}

function getApprovalService() {
    try {
        return require('../services/approval.service');
    } catch (e) {
        return null;
    }
}

/**
 * GET /api/reports/executive-dashboard
 * لوحة المدير التنفيذية — إيرادات اليوم/الشهر، تدفق نقدي مبسط، أفضل البائعين، تنبيهات، روابط التقارير
 */
router.get('/executive-dashboard', async (req, res) => {
    try {
        const revenueToday = get(`
            SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
            FROM invoices
            WHERE type = 'sale' AND status NOT IN ('cancelled', 'voided', 'deleted')
            AND date(created_at) = date('now')
        `) || { total: 0, count: 0 };

        const revenueMonth = get(`
            SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
            FROM invoices
            WHERE type = 'sale' AND status NOT IN ('cancelled', 'voided', 'deleted')
            AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `) || { total: 0, count: 0 };

        const cashFlow = all(`
            SELECT COALESCE(payment_type, payment_method, 'other') as method,
                   COALESCE(SUM(total), 0) as total
            FROM invoices
            WHERE type = 'sale' AND status NOT IN ('cancelled', 'voided', 'deleted')
            AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
            GROUP BY COALESCE(payment_type, payment_method, 'other')
        `) || [];

        const topSellersMonth = all(`
            SELECT u.full_name as employee_name, COALESCE(SUM(i.total), 0) as total_sales, COUNT(i.id) as invoice_count
            FROM invoices i
            JOIN users u ON u.id = i.created_by
            WHERE i.type = 'sale' AND i.status NOT IN ('cancelled', 'voided', 'deleted')
            AND strftime('%Y-%m', i.created_at) = strftime('%Y-%m', 'now')
            GROUP BY u.id
            ORDER BY total_sales DESC
            LIMIT 5
        `) || [];

        let pendingInvoicesCount = 0;
        try {
            const r = get(`SELECT COUNT(*) as count FROM invoices WHERE payment_status IN ('pending', 'partial') AND status NOT IN ('cancelled', 'voided', 'deleted')`);
            pendingInvoicesCount = r?.count || 0;
        } catch (e) { /* ignore */ }

        let lowStockCount = 0;
        let lowStockItems = [];
        try {
            lowStockItems = all(`SELECT id, name, quantity, min_quantity FROM products WHERE min_quantity > 0 AND quantity < min_quantity LIMIT 10`);
            lowStockCount = (get(`SELECT COUNT(*) as count FROM products WHERE min_quantity > 0 AND quantity < min_quantity`))?.count || 0;
        } catch (e) { /* ignore */ }

        let pendingApprovalsCount = 0;
        try {
            const approvalSvc = getApprovalService();
            if (approvalSvc && approvalSvc.getPendingCount) pendingApprovalsCount = approvalSvc.getPendingCount() || 0;
        } catch (e) { /* ignore */ }

        let criticalAuditCount = 0;
        try {
            const r = get(`SELECT COUNT(*) as count FROM audit_logs WHERE severity = 'critical' AND created_at >= datetime('now', '-7 days')`);
            criticalAuditCount = r?.count || 0;
        } catch (e) { /* ignore */ }

        let returnsPendingCount = 0;
        try {
            const r = get(`SELECT COUNT(*) as count FROM returns WHERE status IN ('pending', 'processing')`);
            returnsPendingCount = r?.count || 0;
        } catch (e) { /* ignore */ }

        let warrantyExpiringCount = 0;
        try {
            const r = get(`SELECT COUNT(*) as count FROM warranty_claims WHERE status IN ('pending', 'sent_to_supplier')`);
            warrantyExpiringCount = r?.count || 0;
        } catch (e) {
            try {
                const r2 = get(`SELECT COUNT(*) as count FROM warranty WHERE status IN ('pending', 'open')`);
                warrantyExpiringCount = r2?.count || 0;
            } catch (e2) { /* ignore */ }
        }

        res.json({
            success: true,
            data: {
                revenue: {
                    today: revenueToday.total,
                    today_count: revenueToday.count,
                    month: revenueMonth.total,
                    month_count: revenueMonth.count
                },
                cash_flow: cashFlow,
                top_sellers_month: topSellersMonth,
                alerts: {
                    pending_invoices: pendingInvoicesCount,
                    low_stock: lowStockCount,
                    low_stock_items: lowStockItems,
                    pending_approvals: pendingApprovalsCount,
                    critical_audit_7d: criticalAuditCount,
                    returns_pending: returnsPendingCount,
                    warranty_pending: warrantyExpiringCount
                },
                quick_links: [
                    { label: 'تقرير المبيعات', path: '/api/reports/sales' },
                    { label: 'مبيعات بالموظف', path: '/api/reports/sales-by-employee' },
                    { label: 'أفضل البائعين', path: '/api/reports/top-sellers' },
                    { label: 'مبيعات حسب الدفع', path: '/api/reports/sales-by-payment' },
                    { label: 'الربحية والتدفق', path: '/api/reports/profitability' },
                    { label: 'أداء HR', path: '/api/reports/hr-summary' },
                    { label: 'سجل التدقيق', path: '/api/audit' },
                    { label: 'الموافقات', path: '/api/approvals' }
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/dashboard
 * تقارير لوحة التحكم
 */
router.get('/dashboard', async (req, res) => {
    try {
        // إحصائيات سريعة
        const customers = get(`SELECT COUNT(*) as count FROM customers`) || { count: 0 };
        const products = get(`SELECT COUNT(*) as count FROM products`) || { count: 0 };
        const invoices = get(`SELECT COUNT(*) as count FROM invoices`) || { count: 0 };
        const todaySales = get(`
            SELECT COALESCE(SUM(total), 0) as total 
            FROM invoices 
            WHERE type = 'sale' AND date(created_at) = date('now')
        `) || { total: 0 };

        res.json({
            success: true,
            data: {
                customers: customers.count,
                products: products.count,
                invoices: invoices.count,
                todaySales: todaySales.total
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/sales
 * تقارير المبيعات
 */
router.get('/sales', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                date(created_at) as date,
                COUNT(*) as count,
                SUM(total) as total
            FROM invoices 
            WHERE type = 'sale'
        `;
        const params = [];
        
        if (start_date) {
            query += ` AND created_at >= ?`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND created_at <= ?`;
            params.push(end_date);
        }
        
        query += ` GROUP BY date(created_at) ORDER BY date DESC LIMIT 30`;
        
        const sales = all(query, params);
        
        res.json({
            success: true,
            data: sales
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/inventory
 * تقارير المخزون
 */
router.get('/inventory', async (req, res) => {
    try {
        const lowStock = all(`
            SELECT * FROM products 
            WHERE quantity < min_quantity 
            LIMIT 20
        `);
        
        const totalValue = get(`
            SELECT SUM(quantity * cost_price) as value FROM products
        `) || { value: 0 };
        
        res.json({
            success: true,
            data: {
                lowStock,
                totalValue: totalValue.value
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/customers
 * تقارير العملاء
 */
router.get('/customers', async (req, res) => {
    try {
        const topCustomers = all(`
            SELECT c.*, 
                   COALESCE(SUM(i.total), 0) as total_purchases
            FROM customers c
            LEFT JOIN invoices i ON c.id = i.customer_id
            GROUP BY c.id
            ORDER BY total_purchases DESC
            LIMIT 10
        `);
        
        res.json({
            success: true,
            data: { topCustomers }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/sales-by-employee
 * مبيعات حسب الموظف — للمدير: إجمالي مبيعات كل موظف لفترة (ومقارنة أداء الفريق)
 * Query: start_date, end_date, limit (default 50)
 */
router.get('/sales-by-employee', async (req, res) => {
    try {
        const { start_date, end_date, limit = 50 } = req.query;
        let query = `
            SELECT 
                u.id as user_id,
                u.full_name as employee_name,
                u.username,
                COUNT(i.id) as invoice_count,
                COALESCE(SUM(i.total), 0) as total_sales
            FROM users u
            LEFT JOIN invoices i ON i.created_by = u.id 
                AND i.type = 'sale' 
                AND i.status NOT IN ('cancelled', 'voided', 'deleted')
        `;
        const params = [];
        if (start_date) {
            query += ` AND i.created_at >= ?`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND i.created_at <= ?`;
            params.push(end_date);
        }
        query += `
            GROUP BY u.id
            HAVING invoice_count > 0
            ORDER BY total_sales DESC
            LIMIT ?
        `;
        params.push(parseInt(limit) || 50);
        const byEmployee = all(query, params);
        res.json({ success: true, data: byEmployee });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/top-sellers
 * أفضل البائعين — أعلى N موظفين مبيعاً لفترة (يوم/أسبوع/شهر)
 * Query: period=today|week|month|custom, start_date, end_date, limit (default 10)
 */
router.get('/top-sellers', async (req, res) => {
    try {
        const { period = 'month', start_date, end_date, limit = 10 } = req.query;
        let dateFilter = '';
        const params = [];
        if (period === 'today') {
            dateFilter = ` AND date(i.created_at) = date('now')`;
        } else if (period === 'week') {
            dateFilter = ` AND i.created_at >= datetime('now', '-7 days')`;
        } else if (period === 'month') {
            dateFilter = ` AND strftime('%Y-%m', i.created_at) = strftime('%Y-%m', 'now')`;
        } else if (start_date && end_date) {
            dateFilter = ` AND i.created_at >= ? AND i.created_at <= ?`;
            params.push(start_date, end_date);
        } else {
            dateFilter = ` AND strftime('%Y-%m', i.created_at) = strftime('%Y-%m', 'now')`;
        }
        const q = `
            SELECT 
                u.id as user_id,
                u.full_name as employee_name,
                COUNT(i.id) as invoice_count,
                COALESCE(SUM(i.total), 0) as total_sales
            FROM invoices i
            JOIN users u ON u.id = i.created_by
            WHERE i.type = 'sale' AND i.status NOT IN ('cancelled', 'voided', 'deleted')
            ${dateFilter}
            GROUP BY u.id
            ORDER BY total_sales DESC
            LIMIT ?
        `;
        params.push(parseInt(limit) || 10);
        const top = all(q, params);
        res.json({ success: true, data: top });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/my-sales
 * مبيعاتي فقط — للموظف: إجمالي مبيعاته لفترة (تحفيز ذاتي ومتابعة شخصية)
 * Query: start_date, end_date
 */
router.get('/my-sales', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        const { start_date, end_date } = req.query;
        let query = `
            SELECT 
                COUNT(*) as invoice_count,
                COALESCE(SUM(total), 0) as total_sales
            FROM invoices
            WHERE type = 'sale' AND created_by = ?
            AND status NOT IN ('cancelled', 'voided', 'deleted')
        `;
        const params = [userId];
        if (start_date) { query += ` AND created_at >= ?`; params.push(start_date); }
        if (end_date) { query += ` AND created_at <= ?`; params.push(end_date); }
        const summary = get(query, params);
        let byDayQuery = `
            SELECT date(created_at) as date, COUNT(*) as count, SUM(total) as total
            FROM invoices
            WHERE type = 'sale' AND created_by = ? AND status NOT IN ('cancelled', 'voided', 'deleted')
        `;
        const byDayParams = [userId];
        if (start_date) { byDayQuery += ` AND created_at >= ?`; byDayParams.push(start_date); }
        if (end_date) { byDayQuery += ` AND created_at <= ?`; byDayParams.push(end_date); }
        byDayQuery += ` GROUP BY date(created_at) ORDER BY date DESC LIMIT 31`;
        const byDay = all(byDayQuery, byDayParams);
        res.json({
            success: true,
            data: {
                summary: summary || { invoice_count: 0, total_sales: 0 },
                by_day: byDay || []
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/sales-by-payment
 * مبيعات حسب طريقة الدفع — نقدي / آجل / أقساط (تحليل التدفق النقدي)
 */
router.get('/sales-by-payment', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let where = ` type = 'sale' AND status NOT IN ('cancelled', 'voided', 'deleted') `;
        const params = [];
        if (start_date) { where += ` AND created_at >= ?`; params.push(start_date); }
        if (end_date) { where += ` AND created_at <= ?`; params.push(end_date); }
        const q = `
            SELECT 
                COALESCE(payment_type, payment_method, 'other') as payment_method,
                COUNT(*) as count,
                COALESCE(SUM(total), 0) as total
            FROM invoices
            WHERE ${where}
            GROUP BY COALESCE(payment_type, payment_method, 'other')
            ORDER BY total DESC
        `;
        const data = all(q, params);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/sales-by-product
 * مبيعات حسب المنتج — أي منتجات تبيع أكثر (للجرد والعروض)
 * Query: start_date, end_date, limit (default 20)
 */
router.get('/sales-by-product', async (req, res) => {
    try {
        const { start_date, end_date, limit = 20 } = req.query;
        let filter = ` i.type = 'sale' AND i.status NOT IN ('cancelled', 'voided', 'deleted') `;
        const params = [];
        if (start_date) { filter += ` AND i.created_at >= ?`; params.push(start_date); }
        if (end_date) { filter += ` AND i.created_at <= ?`; params.push(end_date); }
        params.push(parseInt(limit) || 20);
        const q = `
            SELECT 
                p.id as product_id,
                p.name as product_name,
                p.sku,
                SUM(ii.quantity) as quantity_sold,
                COALESCE(SUM(ii.total), 0) as total_sales
            FROM invoice_items ii
            JOIN invoices i ON i.id = ii.invoice_id
            LEFT JOIN products p ON p.id = ii.product_id
            WHERE ${filter}
            GROUP BY ii.product_id
            ORDER BY total_sales DESC
            LIMIT ?
        `;
        const data = all(q, params);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/profitability
 * تقرير ربحية شهري — إيرادات، تكلفة تقديرية، هامش (من بيانات النظام)
 * Query: month (YYYY-MM) أو start_date, end_date
 */
router.get('/profitability', async (req, res) => {
    try {
        const { month, start_date, end_date } = req.query;
        let filter = ` i.type = 'sale' AND i.status NOT IN ('cancelled', 'voided', 'deleted') `;
        const params = [];
        if (month) {
            filter += ` AND strftime('%Y-%m', i.created_at) = ? `;
            params.push(month);
        } else if (start_date && end_date) {
            filter += ` AND i.created_at >= ? AND i.created_at <= ? `;
            params.push(start_date, end_date);
        } else {
            filter += ` AND strftime('%Y-%m', i.created_at) = strftime('%Y-%m', 'now') `;
        }
        const revenueRow = get(`
            SELECT COALESCE(SUM(i.total), 0) as revenue, COUNT(i.id) as invoice_count
            FROM invoices i
            WHERE ${filter}
        `, params);
        let costRow = { cost: null };
        try {
            costRow = get(`
                SELECT COALESCE(SUM(ii.quantity * p.cost_price), 0) as cost
                FROM invoice_items ii
                JOIN invoices i ON i.id = ii.invoice_id
                LEFT JOIN products p ON p.id = ii.product_id
                WHERE ${filter}
            `, params) || { cost: null };
        } catch (e) { /* cost_price قد لا يكون موجوداً */ }
        const revenue = revenueRow?.revenue || 0;
        const cost = costRow?.cost != null ? costRow.cost : null;
        const margin = cost != null ? revenue - cost : null;
        const margin_percent = (revenue > 0 && margin != null) ? ((margin / revenue) * 100).toFixed(2) : null;
        res.json({
            success: true,
            data: {
                period: month || (start_date && end_date ? `${start_date} to ${end_date}` : 'current_month'),
                revenue,
                cost,
                margin,
                margin_percent,
                invoice_count: revenueRow?.invoice_count || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/cash-flow
 * تدفق نقدي مبسط — مقبوض (نقدي) مقابل آجل/أقساط لفترة
 * Query: month أو start_date, end_date
 */
router.get('/cash-flow', async (req, res) => {
    try {
        const { month, start_date, end_date } = req.query;
        let filter = ` type = 'sale' AND status NOT IN ('cancelled', 'voided', 'deleted') `;
        const params = [];
        if (month) {
            filter += ` AND strftime('%Y-%m', created_at) = ? `;
            params.push(month);
        } else if (start_date && end_date) {
            filter += ` AND created_at >= ? AND created_at <= ? `;
            params.push(start_date, end_date);
        } else {
            filter += ` AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') `;
        }
        const byMethod = all(`
            SELECT COALESCE(payment_type, payment_method, 'other') as method,
                   COALESCE(SUM(paid_amount), 0) as received,
                   COALESCE(SUM(total), 0) as total,
                   COUNT(*) as count
            FROM invoices
            WHERE ${filter}
            GROUP BY COALESCE(payment_type, payment_method, 'other')
        `, params);
        const totals = get(`
            SELECT COALESCE(SUM(paid_amount), 0) as total_received,
                   COALESCE(SUM(remaining_amount), 0) as total_pending,
                   COALESCE(SUM(total), 0) as total_invoiced
            FROM invoices
            WHERE ${filter}
        `, params);
        res.json({
            success: true,
            data: {
                period: month || (start_date && end_date ? `${start_date} to ${end_date}` : 'current_month'),
                by_payment_method: byMethod || [],
                summary: {
                    total_received: totals?.total_received || 0,
                    total_pending: totals?.total_pending || 0,
                    total_invoiced: totals?.total_invoiced || 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/hr-summary
 * ملخص أداء HR — غياب/تأخر شهري، إنجاز المهام (نسبة إنجاز أو تأخر)
 * Query: month (YYYY-MM) أو start_date, end_date
 */
router.get('/hr-summary', async (req, res) => {
    try {
        const { month, start_date, end_date } = req.query;
        const periodStart = month ? `${month}-01` : new Date().toISOString().slice(0, 7) + '-01';
        const periodEnd = month ? `${month}-31` : new Date().toISOString().slice(0, 10);
        let attendanceSummary = { absent_count: 0, late_count: 0, present_count: 0 };
        try {
            const r = get(`
                SELECT 
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                    SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
                    SUM(CASE WHEN status IN ('present', 'on_time') THEN 1 ELSE 0 END) as present_count
                FROM attendance
                WHERE date >= ? AND date <= ?
            `, [periodStart, periodEnd]);
            if (r) attendanceSummary = { absent_count: r.absent_count || 0, late_count: r.late_count || 0, present_count: r.present_count || 0 };
        } catch (e) { /* جدول attendance قد يكون باسم آخر */ }
        let tasksSummary = { total: 0, completed: 0, overdue: 0 };
        try {
            const t = get(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'overdue' OR (due_date < datetime('now') AND status NOT IN ('completed', 'cancelled')) THEN 1 ELSE 0 END) as overdue
                FROM tasks
                WHERE created_at >= ? AND created_at <= ?
            `, [periodStart, periodEnd + ' 23:59:59']);
            if (t) tasksSummary = { total: t.total || 0, completed: t.completed || 0, overdue: t.overdue || 0 };
        } catch (e) { /* ignore */ }
        const completion_rate = tasksSummary.total > 0 ? ((tasksSummary.completed / tasksSummary.total) * 100).toFixed(1) : null;
        res.json({
            success: true,
            data: {
                period: month || 'current_month',
                attendance: attendanceSummary,
                tasks: {
                    ...tasksSummary,
                    completion_rate_percent: completion_rate
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/my-performance
 * أدائي — ربط المبيعات مع النقاط (للتحفيز ومقارنة تحقيق الأهداف)
 * يعيد مبيعات المستخدم الحالي + نقاطه من نظام الأهداف
 */
router.get('/my-performance', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        const { start_date, end_date } = req.query;
        let salesQuery = `
            SELECT COUNT(*) as invoice_count, COALESCE(SUM(total), 0) as total_sales
            FROM invoices
            WHERE type = 'sale' AND created_by = ? AND status NOT IN ('cancelled', 'voided', 'deleted')
        `;
        const salesParams = [userId];
        if (start_date) { salesQuery += ` AND created_at >= ?`; salesParams.push(start_date); }
        if (end_date) { salesQuery += ` AND created_at <= ?`; salesParams.push(end_date); }
        const salesSummary = get(salesQuery, salesParams);
        const goals = getGoalsService();
        const points = goals ? goals.getUserPoints(userId) : null;
        res.json({
            success: true,
            data: {
                sales: salesSummary || { invoice_count: 0, total_sales: 0 },
                points: points,
                period: { start_date: start_date || null, end_date: end_date || null }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/export/:reportType
 * تصدير تقارير (CSV) — مبيعات، مبيعات بالموظف، عملاء، مخزون
 * Query: start_date, end_date حسب نوع التقرير
 */
router.get('/export/:reportType', async (req, res) => {
    try {
        const { reportType } = req.params;
        const { start_date, end_date, limit = 1000 } = req.query;
        const safeLimit = Math.min(parseInt(limit) || 1000, 5000);
        let rows = [];
        let filename = 'report.csv';
        let headers = [];

        if (reportType === 'sales') {
            let where = ` WHERE type = 'sale' AND status NOT IN ('cancelled', 'voided', 'deleted') `;
            const params = [];
            if (start_date) { where += ` AND created_at >= ?`; params.push(start_date); }
            if (end_date) { where += ` AND created_at <= ?`; params.push(end_date); }
            params.push(safeLimit);
            rows = all(`SELECT date(created_at) as date, COUNT(*) as count, SUM(total) as total FROM invoices ${where} GROUP BY date(created_at) ORDER BY date DESC LIMIT ?`, params);
            headers = ['date', 'count', 'total'];
            filename = 'sales-report.csv';
        } else if (reportType === 'sales-by-employee') {
            let joinClause = ` FROM users u LEFT JOIN invoices i ON i.created_by = u.id AND i.type = 'sale' AND i.status NOT IN ('cancelled', 'voided', 'deleted') `;
            const params = [];
            if (start_date) { joinClause += ` AND i.created_at >= ?`; params.push(start_date); }
            if (end_date) { joinClause += ` AND i.created_at <= ?`; params.push(end_date); }
            params.push(safeLimit);
            rows = all(`SELECT u.full_name as employee_name, u.username, COUNT(i.id) as invoice_count, COALESCE(SUM(i.total), 0) as total_sales ${joinClause} GROUP BY u.id HAVING invoice_count > 0 ORDER BY total_sales DESC LIMIT ?`, params);
            headers = ['employee_name', 'username', 'invoice_count', 'total_sales'];
            filename = 'sales-by-employee.csv';
        } else if (reportType === 'customers') {
            rows = all(`
                SELECT c.id, c.name, c.phone, COALESCE(SUM(i.total), 0) as total_purchases, COUNT(i.id) as invoice_count
                FROM customers c
                LEFT JOIN invoices i ON c.id = i.customer_id
                GROUP BY c.id
                ORDER BY total_purchases DESC
                LIMIT ?
            `, [safeLimit]);
            headers = ['id', 'name', 'phone', 'total_purchases', 'invoice_count'];
            filename = 'customers-report.csv';
        } else if (reportType === 'inventory') {
            rows = all(`
                SELECT id, name, sku, quantity, min_quantity, COALESCE(cost_price, 0) as cost_price
                FROM products
                ORDER BY quantity ASC
                LIMIT ?
            `, [safeLimit]);
            headers = ['id', 'name', 'sku', 'quantity', 'min_quantity', 'cost_price'];
            filename = 'inventory-report.csv';
        } else {
            return res.status(400).json({ success: false, error: 'Invalid report type. Use: sales, sales-by-employee, customers, inventory' });
        }

        const escapeCsv = (v) => {
            if (v == null) return '';
            const s = String(v);
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csvLines = [headers.join(',')];
        for (const row of rows) {
            csvLines.push(headers.map(h => escapeCsv(row[h])).join(','));
        }
        const csv = '\uFEFF' + csvLines.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/inventory-report
 * Phase 7: تقارير مخزنية (أكثر بيعاً، راكد، دون الحد، سالب، قرب انتهاء)
 * query: report_type=most_sold|below_min|negative|expiring, start_date, end_date, limit
 */
router.get('/inventory-report', async (req, res) => {
    try {
        const { report_type = 'below_min', start_date, end_date, limit = 50 } = req.query;
        const safeLimit = Math.min(parseInt(limit) || 50, 200);
        let rows = [];
        if (report_type === 'below_min') {
            rows = all(`SELECT id, name, sku, quantity, min_quantity FROM products WHERE min_quantity > 0 AND quantity < min_quantity ORDER BY quantity ASC LIMIT ?`, [safeLimit]);
        } else if (report_type === 'negative') {
            rows = all(`SELECT id, name, sku, quantity FROM products WHERE quantity < 0 LIMIT ?`, [safeLimit]);
        } else if (report_type === 'most_sold') {
            const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            const end = end_date || new Date().toISOString().slice(0, 10);
            rows = all(`SELECT ii.product_id, p.name, SUM(ii.quantity) as qty FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id JOIN products p ON p.id = ii.product_id WHERE i.type = 'sale' AND i.status NOT IN ('cancelled', 'voided', 'deleted') AND date(i.created_at) BETWEEN date(?) AND date(?) GROUP BY ii.product_id ORDER BY qty DESC LIMIT ?`, [start, end, safeLimit]);
        } else {
            rows = all(`SELECT id, name, sku, quantity, min_quantity FROM products ORDER BY quantity ASC LIMIT ?`, [safeLimit]);
        }
        res.json({ success: true, data: rows, report_type });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/financial-report
 * Phase 7: تقارير مالية (أرصدة، سندات، تسديد قوائم)
 * query: report_type=summary|vouchers|settlement
 */
router.get('/financial-report', async (req, res) => {
    try {
        const { report_type = 'summary', from, to } = req.query;
        if (report_type === 'vouchers') {
            const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            const toDate = to || new Date().toISOString().slice(0, 10);
            const rows = all(`SELECT * FROM vouchers WHERE (is_deleted = 0 OR is_deleted IS NULL) AND date(created_at) BETWEEN date(?) AND date(?) ORDER BY created_at DESC LIMIT 100`, [fromDate, toDate]);
            return res.json({ success: true, data: rows, report_type: 'vouchers' });
        }
        const summary = {
            receivables: (get(`SELECT COALESCE(SUM(remaining_amount), 0) as v FROM invoices WHERE type = 'sale' AND payment_status IN ('pending', 'partial') AND status NOT IN ('cancelled', 'voided', 'deleted')`))?.v || 0,
            payables: (get(`SELECT COALESCE(SUM(remaining_amount), 0) as v FROM invoices WHERE type = 'purchase' AND payment_status IN ('pending', 'partial') AND status NOT IN ('cancelled', 'voided', 'deleted')`))?.v || 0
        };
        res.json({ success: true, data: summary, report_type: 'summary' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/analytics-widgets
 * Phase 6: كل عناصر لوحة التحليلات (ربح/خسارة، أحدث فواتير، متأخرة، أفضل زبائن، مواد راكدة، إلخ)
 */
router.get('/analytics-widgets', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const end = end_date || new Date().toISOString().slice(0, 10);
        const widgets = {};
        try {
            const rev = get(`SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE type = 'sale' AND status NOT IN ('cancelled', 'voided', 'deleted') AND date(created_at) BETWEEN date(?) AND date(?)`, [start, end]);
            const cost = get(`SELECT COALESCE(SUM(ii.quantity * COALESCE(ii.cost_price, 0)), 0) as total FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id WHERE i.type = 'sale' AND i.status NOT IN ('cancelled', 'voided', 'deleted') AND date(i.created_at) BETWEEN date(?) AND date(?)`, [start, end]);
            widgets.profit_loss = { revenue: rev?.total || 0, cost: cost?.total || 0, profit: (rev?.total || 0) - (cost?.total || 0) };
        } catch (e) { widgets.profit_loss = { revenue: 0, cost: 0, profit: 0 }; }
        try {
            widgets.latest_invoices = all(`SELECT id, invoice_number, type, total, created_at FROM invoices WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 10`);
        } catch (e) { widgets.latest_invoices = []; }
        try {
            widgets.overdue_invoices = all(`SELECT id, invoice_number, customer_id, total, due_date FROM invoices WHERE payment_status IN ('pending', 'partial') AND due_date < date('now') AND status NOT IN ('cancelled', 'voided', 'deleted') LIMIT 20`);
        } catch (e) { widgets.overdue_invoices = []; }
        try {
            widgets.best_customers = all(`SELECT i.customer_id, c.name as customer_name, SUM(i.total) as total FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE i.type = 'sale' AND i.status NOT IN ('cancelled', 'voided', 'deleted') AND date(i.created_at) BETWEEN date(?) AND date(?) GROUP BY i.customer_id ORDER BY total DESC LIMIT 10`, [start, end]);
        } catch (e) { widgets.best_customers = []; }
        try {
            widgets.low_stock = all(`SELECT id, name, quantity, min_quantity FROM products WHERE min_quantity > 0 AND quantity < min_quantity LIMIT 15`);
        } catch (e) { widgets.low_stock = []; }
        try {
            widgets.invoices_today = (get(`SELECT COUNT(*) as c FROM invoices WHERE date(created_at) = date('now') AND status NOT IN ('cancelled', 'voided', 'deleted')`))?.c || 0;
            widgets.invoices_week = (get(`SELECT COUNT(*) as c FROM invoices WHERE created_at >= datetime('now', '-7 days') AND status NOT IN ('cancelled', 'voided', 'deleted')`))?.c || 0;
            widgets.invoices_month = (get(`SELECT COUNT(*) as c FROM invoices WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') AND status NOT IN ('cancelled', 'voided', 'deleted')`))?.c || 0;
        } catch (e) { widgets.invoices_today = 0; widgets.invoices_week = 0; widgets.invoices_month = 0; }
        try {
            widgets.top_sellers = all(`SELECT u.full_name, SUM(i.total) as total FROM invoices i JOIN users u ON u.id = i.created_by WHERE i.type = 'sale' AND i.status NOT IN ('cancelled', 'voided', 'deleted') AND date(i.created_at) BETWEEN date(?) AND date(?) GROUP BY i.created_by ORDER BY total DESC LIMIT 5`, [start, end]);
        } catch (e) { widgets.top_sellers = []; }
        res.json({ success: true, data: widgets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/rep-dashboard
 * Phase 8: لوحة المندوب (مبيعاتي، قوائم متأخرة، آخر تسديد، سندات معلقة)
 */
router.get('/rep-dashboard', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const end = new Date().toISOString().slice(0, 10);
        const my_sales = get(`SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM invoices WHERE type = 'sale' AND created_by = ? AND status NOT IN ('cancelled', 'voided', 'deleted') AND date(created_at) BETWEEN date(?) AND date(?)`, [userId, start, end]);
        const overdue_invoices = all(`SELECT id, invoice_number, customer_id, total, due_date FROM invoices WHERE type = 'sale' AND created_by = ? AND payment_status IN ('pending', 'partial') AND due_date < date('now') AND status NOT IN ('cancelled', 'voided', 'deleted') LIMIT 20`, [userId]);
        res.json({
            success: true,
            data: {
                my_sales: my_sales?.total || 0,
                my_invoice_count: my_sales?.count || 0,
                overdue_invoices
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/price-compensation-sale
 * تعويض أسعار البيع: عملاء مشمولون حسب العدد المتبقي وآخر سعر شراء
 * query: product_id, new_price (السعر بعد النزول)
 */
router.get('/price-compensation-sale', async (req, res) => {
    try {
        const { product_id, new_price } = req.query;
        if (!product_id || new_price === undefined || new_price === '') {
            return res.status(400).json({ success: false, error: 'product_id and new_price required' });
        }
        const newPriceNum = parseFloat(new_price);
        if (isNaN(newPriceNum)) return res.status(400).json({ success: false, error: 'Invalid new_price' });

        const rows = all(`
            SELECT i.customer_id, c.name as customer_name, ii.quantity, ii.unit_price as last_price,
                   (ii.quantity * (ii.unit_price - ?)) as compensation_amount
            FROM invoice_items ii
            JOIN invoices i ON i.id = ii.invoice_id AND i.type = 'sale'
            LEFT JOIN customers c ON c.id = i.customer_id
            WHERE ii.product_id = ? AND i.status NOT IN ('cancelled', 'voided', 'deleted')
            AND ii.unit_price > ?
            ORDER BY i.created_at DESC
        `, [newPriceNum, product_id, newPriceNum]);
        res.json({ success: true, data: { product_id, new_price: newPriceNum, affected: rows } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reports/price-compensation-purchase
 * تعويض أسعار الشراء: عدد متبقي في الجرد مقارنة بآخر قائمة شراء
 * query: product_id, new_price
 */
router.get('/price-compensation-purchase', async (req, res) => {
    try {
        const { product_id, new_price } = req.query;
        if (!product_id || new_price === undefined || new_price === '') {
            return res.status(400).json({ success: false, error: 'product_id and new_price required' });
        }
        const newPriceNum = parseFloat(new_price);
        if (isNaN(newPriceNum)) return res.status(400).json({ success: false, error: 'Invalid new_price' });

        const rows = all(`
            SELECT ii.quantity, ii.unit_price as last_price,
                   (ii.quantity * (ii.unit_price - ?)) as compensation_amount
            FROM invoice_items ii
            JOIN invoices i ON i.id = ii.invoice_id AND i.type = 'purchase'
            WHERE ii.product_id = ? AND i.status NOT IN ('cancelled', 'voided', 'deleted')
            AND ii.unit_price > ?
            ORDER BY i.created_at DESC
            LIMIT 100
        `, [newPriceNum, product_id, newPriceNum]);
        const product = get('SELECT id, name, quantity as stock_quantity FROM products WHERE id = ?', [product_id]);
        res.json({ success: true, data: { product_id, new_price: newPriceNum, product, affected: rows } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
