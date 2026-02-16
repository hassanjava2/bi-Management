/**
 * BI ERP — Alerts Service (Phase 6)
 * التنبيهات والإشعارات التلقائية — 15+ نوع تنبيه
 */
const { get, all } = require('../config/database');

const ND = 'AND (is_deleted = 0 OR is_deleted IS NULL)';

// ─── GET ALL ACTIVE ALERTS ─────────────
async function getAlerts() {
    const alerts = [];

    // 1. مواد تحت الحد الأدنى
    try {
        const lowStock = await all(`SELECT id, name, quantity, min_quantity FROM products WHERE min_quantity > 0 AND quantity <= min_quantity ${ND} LIMIT 20`);
        lowStock.forEach(p => alerts.push({ type: 'low_stock', severity: 'warning', title: `${p.name} تحت الحد الأدنى`, detail: `الكمية: ${p.quantity} / الحد: ${p.min_quantity}`, ref_id: p.id }));
    } catch (_) { }

    // 2. رصيد سالب
    try {
        const neg = await all(`SELECT id, name, quantity FROM products WHERE quantity < 0 ${ND} LIMIT 10`);
        neg.forEach(p => alerts.push({ type: 'negative_stock', severity: 'danger', title: `${p.name} رصيد سالب`, detail: `الكمية: ${p.quantity}`, ref_id: p.id }));
    } catch (_) { }

    // 3. ديون زبائن تجاوزت الحد
    try {
        const overDebt = await all(`SELECT id, name, balance, debt_limit FROM customers WHERE debt_limit > 0 AND balance > debt_limit AND (is_deleted = 0 OR is_deleted IS NULL) LIMIT 10`);
        overDebt.forEach(c => alerts.push({ type: 'debt_exceeded', severity: 'danger', title: `${c.name} تجاوز حد الدين`, detail: `الرصيد: ${c.balance} / الحد: ${c.debt_limit}`, ref_id: c.id }));
    } catch (_) { }

    // 4. فواتير متأخرة الدفع
    try {
        const overdue = await get(`SELECT COUNT(*)::int as c FROM invoices WHERE remaining_amount > 0 AND due_date IS NOT NULL AND due_date < CURRENT_DATE AND status != 'cancelled' ${ND}`);
        if (overdue?.c > 0) alerts.push({ type: 'overdue_invoices', severity: 'warning', title: `${overdue.c} فاتورة متأخرة الدفع`, detail: 'يوجد فواتير تجاوزت موعد الاستحقاق' });
    } catch (_) { }

    // 5. قوائم بالانتظار
    try {
        const waiting = await get(`SELECT COUNT(*)::int as c FROM invoices WHERE status = 'waiting' ${ND}`);
        if (waiting?.c > 0) alerts.push({ type: 'waiting_invoices', severity: 'info', title: `${waiting.c} قوائم بالانتظار`, detail: 'يوجد قوائم تنتظر الموافقة' });
    } catch (_) { }

    // 6. مواد راكدة (30+ يوم)
    try {
        const stagnant = await get(`SELECT COUNT(*)::int as c FROM products WHERE quantity > 0 AND (last_sold_at IS NULL OR last_sold_at < NOW() - INTERVAL '30 days') ${ND}`);
        if (stagnant?.c > 5) alerts.push({ type: 'stagnant_products', severity: 'info', title: `${stagnant.c} مادة راكدة`, detail: 'لم تُباع منذ أكثر من 30 يوم' });
    } catch (_) { }

    // 7. قوائم خاسرة اليوم
    try {
        const losing = await get(`SELECT COUNT(*)::int as c FROM invoices WHERE type = 'sale' AND profit_total < 0 AND created_at::date = CURRENT_DATE ${ND}`);
        if (losing?.c > 0) alerts.push({ type: 'losing_invoices', severity: 'danger', title: `${losing.c} قائمة خاسرة اليوم`, detail: 'يوجد فواتير بيع بخسارة' });
    } catch (_) { }

    // 8. سندات قبض معلقة
    try {
        const pending = await get(`SELECT COUNT(*)::int as c FROM vouchers WHERE type = 'receipt' AND (status = 'pending' OR status IS NULL) AND created_at::date = CURRENT_DATE`);
        if (pending?.c > 0) alerts.push({ type: 'pending_receipts', severity: 'info', title: `${pending.c} سندات قبض معلقة`, detail: 'سندات قبض لم تُعالج بعد' });
    } catch (_) { }

    return alerts.sort((a, b) => {
        const order = { danger: 0, warning: 1, info: 2 };
        return (order[a.severity] || 9) - (order[b.severity] || 9);
    });
}

// ─── GET ALERT COUNTS ──────────────────
async function getAlertCounts() {
    const [lowStock, negStock, overdue, waiting] = await Promise.all([
        get(`SELECT COUNT(*)::int as c FROM products WHERE min_quantity > 0 AND quantity <= min_quantity ${ND}`).then(r => r?.c || 0).catch(() => 0),
        get(`SELECT COUNT(*)::int as c FROM products WHERE quantity < 0 ${ND}`).then(r => r?.c || 0).catch(() => 0),
        get(`SELECT COUNT(*)::int as c FROM invoices WHERE remaining_amount > 0 AND due_date < CURRENT_DATE AND status != 'cancelled' ${ND}`).then(r => r?.c || 0).catch(() => 0),
        get(`SELECT COUNT(*)::int as c FROM invoices WHERE status = 'waiting' ${ND}`).then(r => r?.c || 0).catch(() => 0),
    ]);
    return { low_stock: lowStock, negative_stock: negStock, overdue_invoices: overdue, waiting_invoices: waiting, total: lowStock + negStock + overdue + waiting };
}

module.exports = { getAlerts, getAlertCounts };
