/**
 * BI ERP — Enhanced Alerts Service (Phase 9)
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
        lowStock.forEach(p => alerts.push({ type: 'low_stock', severity: 'warning', title: `${p.name} تحت الحد الأدنى`, detail: `الكمية: ${p.quantity} / الحد: ${p.min_quantity}`, ref_id: p.id, ref_type: 'product' }));
    } catch (_) { }

    // 2. رصيد سالب
    try {
        const neg = await all(`SELECT id, name, quantity FROM products WHERE quantity < 0 ${ND} LIMIT 10`);
        neg.forEach(p => alerts.push({ type: 'negative_stock', severity: 'danger', title: `${p.name} رصيد سالب`, detail: `الكمية: ${p.quantity}`, ref_id: p.id, ref_type: 'product' }));
    } catch (_) { }

    // 3. ديون زبائن تجاوزت الحد
    try {
        const overDebt = await all(`SELECT id, name, balance, debt_limit FROM customers WHERE debt_limit > 0 AND balance > debt_limit ${ND} LIMIT 10`);
        overDebt.forEach(c => alerts.push({ type: 'debt_exceeded', severity: 'danger', title: `${c.name} تجاوز حد الدين`, detail: `الرصيد: ${c.balance} / الحد: ${c.debt_limit}`, ref_id: c.id, ref_type: 'customer' }));
    } catch (_) { }

    // 4. فواتير متأخرة الدفع
    try {
        const overdue = await all(`SELECT i.id, i.invoice_number, c.name as customer_name, i.remaining_amount, i.due_date 
      FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id 
      WHERE i.remaining_amount > 0 AND i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE AND i.status != 'cancelled' ${ND} LIMIT 10`);
        overdue.forEach(i => alerts.push({ type: 'overdue_invoice', severity: 'warning', title: `فاتورة ${i.invoice_number} متأخرة`, detail: `${i.customer_name} — المتبقي: ${i.remaining_amount}`, ref_id: i.id, ref_type: 'invoice' }));
    } catch (_) { }

    // 5. قوائم بالانتظار
    try {
        const waiting = await get(`SELECT COUNT(*)::int as c FROM invoices WHERE status = 'waiting' ${ND}`);
        if (waiting?.c > 0) alerts.push({ type: 'waiting_invoices', severity: 'info', title: `${waiting.c} قوائم بالانتظار`, detail: 'قوائم تنتظر الموافقة أو التجهيز' });
    } catch (_) { }

    // 6. مواد راكدة (30+ يوم)
    try {
        const stagnant = await get(`SELECT COUNT(*)::int as c FROM products WHERE quantity > 0 AND (last_sold_at IS NULL OR last_sold_at < NOW() - INTERVAL '30 days') ${ND}`);
        if (stagnant?.c > 5) alerts.push({ type: 'stagnant_products', severity: 'info', title: `${stagnant.c} مادة راكدة`, detail: 'لم تُباع منذ أكثر من 30 يوم' });
    } catch (_) { }

    // 7. قوائم خاسرة اليوم
    try {
        const losing = await all(`SELECT i.id, i.invoice_number, i.profit_total FROM invoices i WHERE i.type = 'sale' AND i.profit_total < 0 AND i.created_at::date = CURRENT_DATE ${ND} LIMIT 5`);
        losing.forEach(i => alerts.push({ type: 'losing_invoice', severity: 'danger', title: `فاتورة ${i.invoice_number} خاسرة`, detail: `الخسارة: ${Math.abs(i.profit_total)}`, ref_id: i.id, ref_type: 'invoice' }));
    } catch (_) { }

    // 8. سندات قبض معلقة
    try {
        const pending = await get(`SELECT COUNT(*)::int as c FROM vouchers WHERE type = 'receipt' AND (status = 'pending' OR status IS NULL) AND created_at::date = CURRENT_DATE`);
        if (pending?.c > 0) alerts.push({ type: 'pending_receipts', severity: 'info', title: `${pending.c} سندات قبض معلقة`, detail: 'سندات قبض لم تُعالج بعد' });
    } catch (_) { }

    // 9. تغيير سعر صرف
    try {
        const rateChanged = await get(`SELECT id FROM exchange_rates WHERE updated_at::date = CURRENT_DATE LIMIT 1`);
        if (rateChanged) alerts.push({ type: 'exchange_rate_changed', severity: 'info', title: 'تم تحديث سعر الصرف', detail: 'تحقق من الأسعار المحدثة اليوم' });
    } catch (_) { }

    // 10. مواد مجمدة
    try {
        const frozen = await get(`SELECT COUNT(*)::int as c FROM products WHERE is_frozen = TRUE ${ND}`);
        if (frozen?.c > 0) alerts.push({ type: 'frozen_products', severity: 'info', title: `${frozen.c} مادة مجمدة`, detail: 'مواد غير متاحة للبيع' });
    } catch (_) { }

    // 11. قوائم بقيمة عالية (أكثر من 5 مليون IQD)
    try {
        const highValue = await all(`SELECT i.id, i.invoice_number, i.total FROM invoices i WHERE i.total > 5000000 AND i.created_at::date = CURRENT_DATE ${ND} LIMIT 5`);
        highValue.forEach(i => alerts.push({ type: 'high_value_invoice', severity: 'warning', title: `فاتورة ${i.invoice_number} بقيمة عالية`, detail: `القيمة: ${i.total}`, ref_id: i.id, ref_type: 'invoice' }));
    } catch (_) { }

    // 12. مواد قاربت على الانتهاء
    try {
        const nearExpiry = await all(`SELECT pb.id, p.name, pb.expiry_date, pb.quantity 
      FROM product_batches pb JOIN products p ON pb.product_id = p.id 
      WHERE pb.expiry_date IS NOT NULL AND pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND pb.quantity > 0 LIMIT 10`);
        nearExpiry.forEach(b => alerts.push({ type: 'near_expiry', severity: 'warning', title: `${b.name} قارب انتهاء الصلاحية`, detail: `التاريخ: ${b.expiry_date} — الكمية: ${b.quantity}`, ref_id: b.id, ref_type: 'batch' }));
    } catch (_) { }

    // 13. ديون الموظفين
    try {
        const empDebts = await all(`SELECT u.id, u.full_name, COALESCE(SUM(v.amount),0) as debt 
      FROM vouchers v JOIN users u ON v.employee_id = u.id 
      WHERE v.type = 'payment' AND v.status != 'cancelled' AND v.employee_id IS NOT NULL 
      GROUP BY u.id, u.full_name HAVING SUM(v.amount) > 0 LIMIT 5`);
        empDebts.forEach(e => alerts.push({ type: 'employee_debt', severity: 'info', title: `${e.full_name} عليه مبلغ`, detail: `المبلغ: ${e.debt}`, ref_id: e.id, ref_type: 'user' }));
    } catch (_) { }

    // 14. استهلاك مواد مرتفع
    try {
        const highConsumed = await get(`SELECT COUNT(*)::int as c FROM invoices WHERE type = 'consumed' AND created_at::date = CURRENT_DATE ${ND}`);
        if (highConsumed?.c > 3) alerts.push({ type: 'high_consumption', severity: 'warning', title: `${highConsumed.c} سندات صرفيات اليوم`, detail: 'استهلاك مواد مرتفع' });
    } catch (_) { }

    // 15. قوائم غير مكتملة (تذكير)
    try {
        const incomplete = await get(`SELECT COUNT(*)::int as c FROM invoices WHERE status = 'draft' AND created_at < NOW() - INTERVAL '24 hours' ${ND}`);
        if (incomplete?.c > 0) alerts.push({ type: 'incomplete_invoices', severity: 'info', title: `${incomplete.c} قوائم مسودة قديمة`, detail: 'قوائم أنشئت قبل أكثر من 24 ساعة ولم تُكتمل' });
    } catch (_) { }

    return alerts.sort((a, b) => {
        const order = { danger: 0, warning: 1, info: 2 };
        return (order[a.severity] || 9) - (order[b.severity] || 9);
    });
}

// ─── GET ALERT COUNTS ──────────────────
async function getAlertCounts() {
    const [lowStock, negStock, overdue, waiting, frozen, nearExpiry] = await Promise.all([
        get(`SELECT COUNT(*)::int as c FROM products WHERE min_quantity > 0 AND quantity <= min_quantity ${ND}`).then(r => r?.c || 0).catch(() => 0),
        get(`SELECT COUNT(*)::int as c FROM products WHERE quantity < 0 ${ND}`).then(r => r?.c || 0).catch(() => 0),
        get(`SELECT COUNT(*)::int as c FROM invoices WHERE remaining_amount > 0 AND due_date < CURRENT_DATE AND status != 'cancelled' ${ND}`).then(r => r?.c || 0).catch(() => 0),
        get(`SELECT COUNT(*)::int as c FROM invoices WHERE status = 'waiting' ${ND}`).then(r => r?.c || 0).catch(() => 0),
        get(`SELECT COUNT(*)::int as c FROM products WHERE is_frozen = TRUE ${ND}`).then(r => r?.c || 0).catch(() => 0),
        get(`SELECT COUNT(*)::int as c FROM product_batches WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND quantity > 0`).then(r => r?.c || 0).catch(() => 0),
    ]);
    const total = lowStock + negStock + overdue + waiting + frozen + nearExpiry;
    return { low_stock: lowStock, negative_stock: negStock, overdue_invoices: overdue, waiting_invoices: waiting, frozen_products: frozen, near_expiry: nearExpiry, total };
}

module.exports = { getAlerts, getAlertCounts };
