/**
 * BI Management - Invoice Workflow Service
 * خدمة سير عمل الفواتير (قوائم انتظار، مدقق، مجهز)
 * Phase 0 - World-Class Spec
 */

const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

// حالات القائمة المسموحة في السير
const INVOICE_STATUS = {
    DRAFT: 'draft',
    WAITING: 'waiting',
    PENDING_AUDIT: 'pending_audit',
    PENDING_PREPARATION: 'pending_preparation',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    VOIDED: 'voided'
};

// أحداث سجل السير
const WORKFLOW_EVENTS = {
    CREATED: 'created',
    SAVED_WAITING: 'saved_waiting',
    SENT_TO_PREPARER: 'sent_to_preparer',
    SENT_TO_AUDITOR: 'sent_to_auditor',
    AUDITED: 'audited',
    PREPARED: 'prepared',
    PRINTED: 'printed',
    EXPORTED_PDF: 'exported_pdf',
    CONVERTED_TO_ACTIVE: 'converted_to_active',
    STATUS_CHANGED: 'status_changed'
};

/**
 * تسجيل حدث في سجل سير العمل
 */
async function logWorkflow(invoiceId, event, userId, role, notes = null) {
    const id = generateId();
    const createdAt = now();
    try {
        await run(`
            INSERT INTO invoice_workflow_log (id, invoice_id, event, user_id, role, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, invoiceId, event, userId || null, role || null, notes || null, createdAt]);
        return { id, invoice_id: invoiceId, event, user_id: userId, role, notes, created_at: createdAt };
    } catch (err) {
        console.error('[invoiceWorkflow] logWorkflow error:', err.message);
        throw err;
    }
}

/**
 * تحويل حالة الفاتورة مع التسجيل
 * المسموح: draft -> waiting, waiting -> pending_audit, pending_audit -> pending_preparation, pending_preparation -> completed, waiting -> completed (تحويل لقائمة فعالة)
 */
async function transitionTo(invoiceId, newStatus, userId, role, notes = null) {
    const inv = await get('SELECT id, status FROM invoices WHERE id = ?', [invoiceId]);
    if (!inv) {
        throw new Error('INVOICE_NOT_FOUND');
    }
    const allowed = {
        [INVOICE_STATUS.DRAFT]: [INVOICE_STATUS.WAITING, INVOICE_STATUS.PENDING_AUDIT, INVOICE_STATUS.COMPLETED],
        [INVOICE_STATUS.WAITING]: [INVOICE_STATUS.PENDING_AUDIT, INVOICE_STATUS.PENDING_PREPARATION, INVOICE_STATUS.COMPLETED],
        [INVOICE_STATUS.PENDING_AUDIT]: [INVOICE_STATUS.PENDING_PREPARATION, INVOICE_STATUS.COMPLETED],
        [INVOICE_STATUS.PENDING_PREPARATION]: [INVOICE_STATUS.COMPLETED]
    };
    const nextAllowed = allowed[inv.status];
    if (!nextAllowed || !nextAllowed.includes(newStatus)) {
        throw new Error('INVALID_TRANSITION');
    }

    const updates = { status: newStatus, updated_at: now() };
    if (newStatus === INVOICE_STATUS.PENDING_PREPARATION) {
        updates.prepared_at = null;
    }
    if (newStatus === INVOICE_STATUS.COMPLETED) {
        // يمكن تحديث auditor_id / preparer_id من الطلب الخارجي
    }

    await run(`UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?`, [newStatus, updates.updated_at, invoiceId]);
    logWorkflow(invoiceId, WORKFLOW_EVENTS.STATUS_CHANGED, userId, role, notes || `status: ${inv.status} -> ${newStatus}`);
    return { invoice_id: invoiceId, previous_status: inv.status, new_status: newStatus };
}

/**
 * تعيين مدقق وتحديث حالة إلى تم التدقيق
 */
async function setAudited(invoiceId, auditorId) {
    const at = now();
    await run(`UPDATE invoices SET auditor_id = ?, audited_at = ?, updated_at = ? WHERE id = ?`, [auditorId, at, at, invoiceId]);
    logWorkflow(invoiceId, WORKFLOW_EVENTS.AUDITED, auditorId, 'auditor', null);
    return { invoice_id: invoiceId, auditor_id: auditorId, audited_at: at };
}

/**
 * تعيين مجهز وتحديث حالة إلى تم التجهيز
 */
async function setPrepared(invoiceId, preparerId) {
    const at = now();
    await run(`UPDATE invoices SET preparer_id = ?, prepared_at = ?, updated_at = ? WHERE id = ?`, [preparerId, at, at, invoiceId]);
    logWorkflow(invoiceId, WORKFLOW_EVENTS.PREPARED, preparerId, 'preparer', null);
    return { invoice_id: invoiceId, preparer_id: preparerId, prepared_at: at };
}

/**
 * جلب سجل سير عمل فاتورة
 */
async function getWorkflowLog(invoiceId, limit = 50) {
    return await all(
        `SELECT id, invoice_id, event, user_id, role, notes, created_at 
         FROM invoice_workflow_log 
         WHERE invoice_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [invoiceId, limit]
    );
}

/**
 * إنشاء تذكير لقائمة بالانتظار/غير مكتملة
 */
async function createReminder(invoiceId, remindAt, notifyCreator = 1, notifySupervisor = 1) {
    const id = generateId();
    await run(`
        INSERT INTO pending_invoice_reminders (id, invoice_id, remind_at, remind_count, notify_creator, notify_supervisor, created_at)
        VALUES (?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP)
    `, [id, invoiceId, remindAt, notifyCreator ? 1 : 0, notifySupervisor ? 1 : 0]);
    return { id, invoice_id: invoiceId, remind_at: remindAt };
}

/**
 * جلب التذكيرات المستحقة (للسcheduler)
 */
async function getRemindersDue() {
    return await all(`
        SELECT r.id, r.invoice_id, r.remind_at, r.remind_count, r.notify_creator, r.notify_supervisor
        FROM pending_invoice_reminders r
        JOIN invoices i ON i.id = r.invoice_id
        WHERE r.remind_at <= CURRENT_TIMESTAMP AND i.status IN ('draft', 'waiting')
    `);
}

/**
 * زيادة عداد التذكير وتحديث موعد التذكير التالي (مثلاً بعد 24 ساعة)
 */
async function markReminderSent(reminderId, nextRemindAt = null) {
    const r = await get('SELECT id, remind_count FROM pending_invoice_reminders WHERE id = ?', [reminderId]);
    if (!r) return null;
    const count = (r.remind_count || 0) + 1;
    if (nextRemindAt) {
        await run('UPDATE pending_invoice_reminders SET remind_count = ?, remind_at = ?, created_at = created_at WHERE id = ?', [count, nextRemindAt, reminderId]);
    } else {
        await run('UPDATE pending_invoice_reminders SET remind_count = ? WHERE id = ?', [count, reminderId]);
    }
    return { id: reminderId, remind_count: count };
}

/**
 * حذف تذكير (عند تحويل القائمة لفعالة أو حذفها)
 */
async function deleteRemindersForInvoice(invoiceId) {
    await run('DELETE FROM pending_invoice_reminders WHERE invoice_id = ?', [invoiceId]);
    return true;
}

module.exports = {
    INVOICE_STATUS,
    WORKFLOW_EVENTS,
    logWorkflow,
    transitionTo,
    setAudited,
    setPrepared,
    getWorkflowLog,
    createReminder,
    getRemindersDue,
    markReminderSent,
    deleteRemindersForInvoice
};
