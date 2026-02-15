const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const notificationController = require('../controllers/notification.controller');
const { get, all } = require('../config/database');

router.use(auth);

// Controller functions are already wrapped with asyncHandler
router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.remove);

// ═══════════════════════════════════════════════
// SMART ALERTS — Auto-generated system alerts
// ═══════════════════════════════════════════════
router.get('/smart-alerts', async (req, res) => {
    try {
        const ND = '(is_deleted = 0 OR is_deleted IS NULL)';
        const alerts = [];

        // 1. Low stock products
        const lowStock = await all(
            `SELECT name, quantity, COALESCE(min_quantity, 5) as min_qty FROM products WHERE ${ND} AND quantity <= COALESCE(min_quantity, 5) AND quantity >= 0 ORDER BY quantity ASC LIMIT 10`
        ).catch(() => []);
        if (lowStock.length > 0) {
            alerts.push({
                id: 'low-stock', type: 'warning', category: 'inventory',
                title: `${lowStock.length} منتج بمخزون منخفض`,
                body: lowStock.slice(0, 3).map(p => `${p.name} (${p.quantity})`).join('، '),
                count: lowStock.length, priority: 'high',
            });
        }

        // 2. Negative stock
        const negStock = await all(
            `SELECT name, quantity FROM products WHERE ${ND} AND quantity < 0 LIMIT 5`
        ).catch(() => []);
        if (negStock.length > 0) {
            alerts.push({
                id: 'negative-stock', type: 'urgent', category: 'inventory',
                title: `${negStock.length} منتج برصيد سالب`,
                body: negStock.map(p => `${p.name} (${p.quantity})`).join('، '),
                count: negStock.length, priority: 'critical',
            });
        }

        // 3. Overdue invoices
        const overdue = await get(
            `SELECT COUNT(*)::int as c, COALESCE(SUM(total), 0) as total FROM invoices WHERE ${ND} AND payment_status != 'paid' AND due_date IS NOT NULL AND due_date::date < CURRENT_DATE`
        ).catch(() => ({ c: 0, total: 0 }));
        if (overdue?.c > 0) {
            alerts.push({
                id: 'overdue-invoices', type: 'alert', category: 'finance',
                title: `${overdue.c} فاتورة متأخرة الدفع`,
                body: `إجمالي المبالغ المتأخرة: ${Number(overdue.total || 0).toLocaleString()} د.ع`,
                count: overdue.c, priority: 'high',
            });
        }

        // 4. Pending credit invoices
        const pendingCredit = await get(
            `SELECT COUNT(*)::int as c FROM invoices WHERE ${ND} AND payment_type = 'credit' AND payment_status != 'paid'`
        ).catch(() => ({ c: 0 }));
        if (pendingCredit?.c > 0) {
            alerts.push({
                id: 'pending-credit', type: 'info', category: 'finance',
                title: `${pendingCredit.c} فاتورة آجلة غير مسددة`,
                body: 'يرجى متابعة التسديدات مع العملاء',
                count: pendingCredit.c, priority: 'medium',
            });
        }

        // 5. Pending tasks
        const pendingTasks = await get(
            `SELECT COUNT(*)::int as c FROM tasks WHERE status IN ('pending', 'in_progress') AND (is_deleted = 0 OR is_deleted IS NULL)`
        ).catch(() => ({ c: 0 }));
        if (pendingTasks?.c > 0) {
            alerts.push({
                id: 'pending-tasks', type: 'task', category: 'operations',
                title: `${pendingTasks.c} مهمة قيد التنفيذ`,
                body: 'تحقق من المهام المعلقة وتقدم الإنجاز',
                count: pendingTasks.c, priority: 'medium',
            });
        }

        // 6. Today's sales summary
        const todaySales = await get(
            `SELECT COUNT(*)::int as c, COALESCE(SUM(total), 0) as total FROM invoices WHERE ${ND} AND type = 'sale' AND created_at::date = CURRENT_DATE`
        ).catch(() => ({ c: 0, total: 0 }));
        alerts.push({
            id: 'today-sales', type: 'success', category: 'sales',
            title: `مبيعات اليوم: ${todaySales?.c || 0} فاتورة`,
            body: `إجمالي: ${Number(todaySales?.total || 0).toLocaleString()} د.ع`,
            count: todaySales?.c || 0, priority: 'low',
        });

        res.json({ success: true, data: alerts });
    } catch (e) {
        res.json({ success: true, data: [] });
    }
});

module.exports = router;
