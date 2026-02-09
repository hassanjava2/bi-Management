/**
 * BI Management - Alert Service (Phase 8)
 * قواعد التنبيهات وتشغيل الفحوصات
 */
const { get, all } = require('../config/database');
const notificationService = require('./notification.service');

function getRules() {
    try {
        return all('SELECT * FROM alert_rules WHERE is_enabled = 1');
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return [];
        throw e;
    }
}

async function runChecks() {
    const sent = [];
    try {
        const rules = getRules();
        for (const rule of rules) {
            if (rule.code === 'low_stock') {
                const rows = all(`SELECT id, name, quantity, min_quantity FROM products WHERE min_quantity > 0 AND quantity < min_quantity LIMIT 20`);
                if (rows.length > 0) {
                    try {
                        const admin = get('SELECT id FROM users WHERE role IN ("owner", "admin") LIMIT 1');
                        if (admin) {
                            notificationService.create({
                                user_id: admin.id,
                                title: 'تنبيه: مخزون تحت الحد',
                                body: `${rows.length} صنف تحت الحد الأدنى.`,
                                type: 'alert',
                                data: { code: 'low_stock', count: rows.length }
                            });
                            sent.push('low_stock');
                        }
                    } catch (e) { /* ignore */ }
                }
            }
            if (rule.code === 'overdue_invoices') {
                const rows = all(`SELECT COUNT(*) as c FROM invoices WHERE payment_status IN ('pending', 'partial') AND due_date < date('now') AND status NOT IN ('cancelled', 'voided', 'deleted')`);
                if ((rows[0]?.c || 0) > 0) {
                    try {
                        const admin = get('SELECT id FROM users WHERE role IN ("owner", "admin") LIMIT 1');
                        if (admin) {
                            notificationService.create({
                                user_id: admin.id,
                                title: 'تنبيه: فواتير متأخرة التسديد',
                                body: `عدد ${rows[0].c} فاتورة متأخرة.`,
                                type: 'alert',
                                data: { code: 'overdue_invoices', count: rows[0].c }
                            });
                            sent.push('overdue_invoices');
                        }
                    } catch (e) { /* ignore */ }
                }
            }
            if (rule.code === 'negative_stock') {
                try {
                    const rows = all(`SELECT id, name, quantity FROM products WHERE quantity < 0 LIMIT 20`);
                    if (rows.length > 0) {
                        const admin = get('SELECT id FROM users WHERE role IN ("owner", "admin") LIMIT 1');
                        if (admin) {
                            notificationService.create({
                                user_id: admin.id,
                                title: 'تنبيه: رصيد سالب',
                                body: `${rows.length} صنف برصيد سالب.`,
                                type: 'alert',
                                data: { code: 'negative_stock', count: rows.length }
                            });
                            sent.push('negative_stock');
                        }
                    }
                } catch (e) { /* ignore */ }
            }
        }
    } catch (e) {
        console.error('[Alert] runChecks error:', e.message);
    }
    return sent;
}

module.exports = { getRules, runChecks };
