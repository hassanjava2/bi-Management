/**
 * BI Management - Alerts Job
 * تنبيهات مجدولة: مخزون منخفض، ضمان يقارب الانتهاء، دفعات متأخرة
 * يُشغّل يومياً أو عند الطلب
 */

const { all, get } = require('../config/database');
let notificationService;
try { notificationService = require('../services/notification.service'); } catch (_) {}
let eventBus;
try { eventBus = require('../services/ai-distribution/event-bus'); } catch (_) {}

/**
 * فحص المخزون المنخفض وإرسال تنبيهات
 */
async function checkLowStock() {
    console.log('[Alerts Job] Checking low stock...');
    try {
        const lowStock = await all(`
            SELECT id, name, quantity, min_quantity
            FROM products
            WHERE quantity <= min_quantity AND (is_deleted IS NOT TRUE OR is_deleted IS NULL)
        `);

        for (const product of lowStock) {
            if (notificationService?.notifyEvent) {
                const NT = notificationService.NOTIFICATION_TYPES;
                const type = product.quantity === 0 ? NT.STOCK_OUT : NT.STOCK_LOW;
                notificationService.notifyEvent(type, {
                    product_name: product.name,
                    quantity: product.quantity,
                    send_to_admins: true,
                    entity_type: 'product',
                    entity_id: product.id,
                    action_url: '/inventory',
                });
            }
            if (eventBus) {
                eventBus.emit(eventBus.EVENT_TYPES.STOCK_LOW, { product_id: product.id, productId: product.id, product_name: product.name, quantity: product.quantity, min_quantity: product.min_quantity });
            }
        }
        console.log(`[Alerts Job] Found ${lowStock.length} low-stock products`);
        return lowStock.length;
    } catch (error) {
        console.error('[Alerts Job] Low stock check error:', error.message);
        return 0;
    }
}

/**
 * فحص الضمانات القاربة على الانتهاء (7 أيام)
 */
async function checkExpiringWarranties() {
    console.log('[Alerts Job] Checking expiring warranties...');
    try {
        const expiring = await all(`
            SELECT sn.id, sn.serial_number, sn.warranty_expires, p.name as product_name,
                   c.name as customer_name, c.id as customer_id
            FROM serial_numbers sn
            LEFT JOIN products p ON sn.product_id = p.id
            LEFT JOIN customers c ON sn.customer_id = c.id
            WHERE sn.warranty_expires IS NOT NULL
              AND sn.warranty_expires > CURRENT_DATE
              AND sn.warranty_expires <= CURRENT_DATE + INTERVAL '7 days'
              AND sn.status = 'sold'
        `);

        for (const device of expiring) {
            if (!notificationService?.notifyEvent) continue;
            const daysLeft = Math.ceil((new Date(device.warranty_expires) - new Date()) / (1000 * 60 * 60 * 24));
            notificationService.notifyEvent(notificationService.NOTIFICATION_TYPES.WARRANTY_EXPIRING, {
                serial_number: device.serial_number,
                days_remaining: daysLeft,
                send_to_admins: true,
                entity_type: 'device',
                entity_id: device.id,
                action_url: '/warranty',
            });
        }
        console.log(`[Alerts Job] Found ${expiring.length} expiring warranties`);
        return expiring.length;
    } catch (error) {
        console.error('[Alerts Job] Warranty check error:', error.message);
        return 0;
    }
}

/**
 * فحص الدفعات المتأخرة
 */
async function checkOverduePayments() {
    console.log('[Alerts Job] Checking overdue payments...');
    try {
        const overdue = await all(`
            SELECT i.id, i.invoice_number, i.total, i.remaining_amount, i.due_date,
                   c.name as customer_name, c.id as customer_id
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.payment_status IN ('pending', 'partial')
              AND i.due_date IS NOT NULL
              AND i.due_date < CURRENT_DATE
              AND i.status != 'cancelled'
              AND (i.is_deleted IS NOT TRUE OR i.is_deleted IS NULL)
        `);

        for (const invoice of overdue) {
            if (!notificationService?.notifyEvent) continue;
            notificationService.notifyEvent(notificationService.NOTIFICATION_TYPES.PAYMENT_OVERDUE, {
                invoice_number: invoice.invoice_number,
                amount: invoice.remaining_amount || invoice.total,
                customer_name: invoice.customer_name,
                send_to_admins: true,
                entity_type: 'invoice',
                entity_id: invoice.id,
                action_url: `/sales?invoice=${invoice.id}`,
            });
        }
        console.log(`[Alerts Job] Found ${overdue.length} overdue payments`);
        return overdue.length;
    } catch (error) {
        console.error('[Alerts Job] Overdue check error:', error.message);
        return 0;
    }
}

/**
 * فحص المهام المتأخرة
 */
async function checkOverdueTasks() {
    console.log('[Alerts Job] Checking overdue tasks...');
    try {
        const overdue = await all(`
            SELECT t.id, t.title, t.assigned_to, t.due_date, u.full_name as assignee_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.status IN ('pending', 'in_progress')
              AND t.due_date IS NOT NULL
              AND t.due_date < CURRENT_TIMESTAMP
        `);

        for (const task of overdue) {
            if (!notificationService?.notifyEvent) continue;
            // تنبيه للموظف
            if (task.assigned_to) {
                notificationService.notifyEvent(notificationService.NOTIFICATION_TYPES.TASK_OVERDUE, {
                    recipient_id: task.assigned_to,
                    task_title: task.title,
                    entity_type: 'task',
                    entity_id: task.id,
                    action_url: '/tasks',
                });
            }
            // تنبيه للمدير
            notificationService.notifyEvent(notificationService.NOTIFICATION_TYPES.TASK_OVERDUE, {
                task_title: `${task.title} (${task.assignee_name || 'غير معين'})`,
                send_to_admins: true,
                entity_type: 'task',
                entity_id: task.id,
            });
        }
        console.log(`[Alerts Job] Found ${overdue.length} overdue tasks`);
        return overdue.length;
    } catch (error) {
        console.error('[Alerts Job] Task check error:', error.message);
        return 0;
    }
}

/**
 * تشغيل كل الفحوصات
 */
async function runAllAlerts() {
    console.log('[Alerts Job] === Running all alert checks ===');
    const results = {
        lowStock: await checkLowStock(),
        expiringWarranties: await checkExpiringWarranties(),
        overduePayments: await checkOverduePayments(),
        overdueTasks: await checkOverdueTasks(),
    };
    console.log('[Alerts Job] === Done ===', results);
    return results;
}

module.exports = {
    checkLowStock,
    checkExpiringWarranties,
    checkOverduePayments,
    checkOverdueTasks,
    runAllAlerts,
};
