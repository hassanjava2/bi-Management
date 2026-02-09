/**
 * BI Management - Scheduler Service
 * جدولة المهام التلقائية
 */

const { all, run, get } = require('../config/database');
const notificationService = require('./notification.service');
const attendanceJobs = require('../jobs/attendance.job');

// Track if scheduler is running
let isRunning = false;
let intervalId = null;

/**
 * Check for overdue tasks and send reminders
 */
async function checkOverdueTasks() {
    console.log('[Scheduler] Checking overdue tasks...');
    
    let overdueTasks;
    try {
        // Get tasks that are overdue and not completed
        overdueTasks = all(`
            SELECT t.*, u.full_name as assigned_to_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.due_date < datetime('now')
            AND t.status NOT IN ('completed', 'cancelled')
            AND t.assigned_to IS NOT NULL
        `);
    } catch (e) {
        console.log('[Scheduler] Tasks table not ready yet, skipping...');
        return;
    }

    console.log(`[Scheduler] Found ${overdueTasks.length} overdue tasks`);

    for (const task of overdueTasks) {
        // Check if we already sent a reminder in the last 24 hours
        // Note: task.id is sanitized since it comes from database UUID
        const taskIdPattern = '%"task_id":"' + String(task.id).replace(/[%_\\]/g, '') + '"%';
        const recentReminder = all(`
            SELECT id FROM notifications
            WHERE user_id = ?
            AND type = 'reminder'
            AND data LIKE ?
            AND created_at > datetime('now', '-24 hours')
        `, [task.assigned_to, taskIdPattern]);

        if (recentReminder.length === 0) {
            // Send reminder
            notificationService.create({
                user_id: task.assigned_to,
                title: 'تذكير: مهمة متأخرة',
                body: `المهمة "${task.title}" متأخرة عن موعدها. يرجى تحديث الحالة أو إضافة سبب التأخير.`,
                type: 'reminder',
                data: { task_id: task.id, priority: 'urgent' }
            });

            // Update task to mark as notified
            run(`
                UPDATE tasks 
                SET status = CASE WHEN status = 'pending' THEN 'overdue' ELSE status END
                WHERE id = ?
            `, [task.id]);

            console.log(`[Scheduler] Sent reminder for task: ${task.title}`);
        }
    }

    return { checked: overdueTasks.length };
}

/**
 * Check for tasks due today and send morning reminders
 */
async function sendDailyTaskReminders() {
    console.log('[Scheduler] Sending daily task reminders...');
    
    // Get tasks due today grouped by user
    const tasksByUser = all(`
        SELECT 
            u.id as user_id,
            u.full_name,
            COUNT(t.id) as task_count
        FROM tasks t
        JOIN users u ON t.assigned_to = u.id
        WHERE date(t.due_date) = date('now')
        AND t.status NOT IN ('completed', 'cancelled')
        GROUP BY u.id
    `);

    for (const user of tasksByUser) {
        notificationService.create({
            user_id: user.user_id,
            title: 'مهام اليوم',
            body: `لديك ${user.task_count} مهام مطلوب إنجازها اليوم. حظاً موفقاً!`,
            type: 'task',
            data: { type: 'daily_reminder' }
        });
    }

    console.log(`[Scheduler] Sent daily reminders to ${tasksByUser.length} users`);
    return { notified: tasksByUser.length };
}

/**
 * Clean old notifications (older than 30 days)
 */
function cleanOldNotifications() {
    console.log('[Scheduler] Cleaning old notifications...');
    
    try {
        const result = run(`
            DELETE FROM notifications 
            WHERE created_at < datetime('now', '-30 days')
        `);

        console.log(`[Scheduler] Deleted ${result?.changes || 0} old notifications`);
        return { deleted: result?.changes || 0 };
    } catch (error) {
        console.log('[Scheduler] Could not clean notifications:', error.message);
        return { deleted: 0 };
    }
}

/**
 * Clean old audit logs (older than 90 days, keep critical ones)
 */
function cleanOldAuditLogs() {
    console.log('[Scheduler] Cleaning old audit logs...');
    
    try {
        const result = run(`
            DELETE FROM audit_logs 
            WHERE created_at < datetime('now', '-90 days')
            AND severity != 'critical'
        `);

        console.log(`[Scheduler] Deleted ${result?.changes || 0} old audit logs`);
        return { deleted: result?.changes || 0 };
    } catch (error) {
        console.log('[Scheduler] Could not clean audit logs:', error.message);
        return { deleted: 0 };
    }
}

/**
 * Start the scheduler
 */
function startScheduler() {
    if (isRunning) {
        console.log('[Scheduler] Already running');
        return;
    }

    isRunning = true;
    console.log('[Scheduler] Starting...');

    // Run immediately
    runScheduledTasks();

    // Then every hour
    intervalId = setInterval(runScheduledTasks, 60 * 60 * 1000);

    console.log('[Scheduler] Started - running every hour');
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    isRunning = false;
    console.log('[Scheduler] Stopped');
}

/**
 * Check pending invoice reminders (Phase 0 - قوائم انتظار)
 */
async function checkPendingInvoiceReminders() {
    try {
        const invoiceWorkflow = require('./invoiceWorkflow.service');
        const due = invoiceWorkflow.getRemindersDue();
        if (!due || due.length === 0) return { sent: 0 };
        for (const r of due) {
            const inv = get('SELECT id, invoice_number, created_by FROM invoices WHERE id = ?', [r.invoice_id]);
            if (!inv) continue;
            if (r.notify_creator && inv.created_by) {
                notificationService.create({
                    user_id: inv.created_by,
                    title: 'تذكير: قائمة بالانتظار',
                    body: `القائمة ${inv.invoice_number || r.invoice_id} لا تزال في الانتظار. يرجى إكمالها أو حذفها.`,
                    type: 'reminder',
                    data: { invoice_id: r.invoice_id, type: 'pending_invoice' }
                });
            }
            const nextAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
            invoiceWorkflow.markReminderSent(r.id, nextAt);
        }
        return { sent: due.length };
    } catch (e) {
        if (e.code !== 'SQLITE_ERROR' && !e.message.includes('no such table')) {
            console.error('[Scheduler] Pending invoice reminders error:', e.message);
        }
        return { sent: 0 };
    }
}

/**
 * Run all scheduled tasks
 */
async function runScheduledTasks() {
    console.log('[Scheduler] Running scheduled tasks at', new Date().toISOString());

    try {
        const hour = new Date().getHours();
        const minute = new Date().getMinutes();

        // Check overdue tasks
        await checkOverdueTasks();

        // Pending invoice reminders (قوائم انتظار / غير مكتملة)
        await checkPendingInvoiceReminders();

        // Alert rules (تنبيهات: مخزون، فواتير متأخرة، إلخ)
        try {
            const alertService = require('./alert.service');
            if (alertService.runChecks) await alertService.runChecks();
        } catch (e) { /* optional */ }

        // 8:00 AM - Daily task reminders
        if (hour === 8 && minute < 15) {
            await sendDailyTaskReminders();
        }

        // 9:30 AM - Check late employees
        if (hour === 9 && minute >= 30 && minute < 45) {
            await attendanceJobs.checkLateEmployees();
        }

        // 10:00 AM - Mark absent employees
        if (hour === 10 && minute < 15) {
            await attendanceJobs.markAbsentEmployees();
        }

        // 6:00 PM - Daily attendance report
        if (hour === 18 && minute < 15) {
            await attendanceJobs.generateDailyReport();
            await attendanceJobs.checkIncompleteTasks();
        }

        // Midnight - Clean old data
        if (hour === 0 && minute < 15) {
            cleanOldNotifications();
            cleanOldAuditLogs();
        }

        // 2:00 AM - Daily backup (لوحة المدير: تأكيد النسخ التلقائي)
        if (hour === 2 && minute < 15) {
            try {
                const { getBackupService } = require('./backup.service');
                const svc = getBackupService();
                if (svc && typeof svc.createBackup === 'function') {
                    await svc.createBackup('Daily automatic backup');
                    console.log('[Scheduler] Daily backup completed');
                }
            } catch (backupErr) {
                console.error('[Scheduler] Daily backup failed:', backupErr.message);
            }
        }

    } catch (error) {
        console.error('[Scheduler] Error:', error);
    }
}

module.exports = {
    startScheduler,
    stopScheduler,
    checkOverdueTasks,
    checkPendingInvoiceReminders,
    sendDailyTaskReminders,
    cleanOldNotifications,
    cleanOldAuditLogs,
    runScheduledTasks
};
