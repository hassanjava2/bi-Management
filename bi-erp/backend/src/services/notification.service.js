/**
 * BI Management - Notification Service
 * خدمة الإشعارات
 * 
 * Updated to match schema_v3_sqlite.sql structure
 */

const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

// Socket.io instance (set from app.js)
let io = null;

function setSocketIO(socketIO) {
    io = socketIO;
}

/**
 * Create notification
 */
async function create(data) {
    const id = generateId();

    try {
        await run(`
            INSERT INTO notifications (id, recipient_id, recipient_type, type, priority, title, message, entity_type, entity_id, action_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            data.user_id || data.recipient_id,
            data.recipient_type || 'user',
            data.type || 'info',
            data.priority || 'normal',
            data.title,
            data.body || data.message,
            data.entity_type || null,
            data.entity_id || null,
            data.action_url || null
        ]);

        const notification = getById(id);

        // Send real-time notification via Socket.io
        if (io && notification) {
            io.to(`user:${data.user_id || data.recipient_id}`).emit('notification', notification);
        }

        return notification;
    } catch (error) {
        console.error('[Notification] Create error:', error.message);
        return null;
    }
}

/**
 * Get notification by ID
 */
async function getById(notificationId) {
    try {
        const notification = await get(`SELECT * FROM notifications WHERE id = ?`, [notificationId]);
        
        if (!notification) return null;

        return formatNotification(notification);
    } catch (error) {
        console.error('[Notification] GetById error:', error.message);
        return null;
    }
}

/**
 * Format notification for response
 */
function formatNotification(n) {
    return {
        id: n.id,
        user_id: n.recipient_id,
        recipient_id: n.recipient_id,
        recipient_type: n.recipient_type,
        type: n.type,
        priority: n.priority,
        title: n.title,
        body: n.message,
        message: n.message,
        entity_type: n.entity_type,
        entity_id: n.entity_id,
        action_url: n.action_url,
        is_read: !!n.is_read,
        read_at: n.read_at,
        created_at: n.created_at
    };
}

/**
 * Get user notifications
 */
async function getUserNotifications(userId, filters = {}) {
    try {
        let query = `SELECT * FROM notifications WHERE recipient_id = ?`;
        const params = [userId];

        if (filters.unread_only) {
            query += ` AND is_read = FALSE`;
        }

        if (filters.type) {
            query += ` AND type = ?`;
            params.push(filters.type);
        }

        query += ` ORDER BY created_at DESC`;

        if (filters.limit) {
            query += ` LIMIT ?`;
            params.push(filters.limit);
        } else {
            query += ` LIMIT 50`;
        }

        const notifications = await all(query, params);

        return notifications.map(formatNotification);
    } catch (error) {
        console.error('[Notification] GetUserNotifications error:', error.message);
        return [];
    }
}

/**
 * Mark as read
 */
async function markAsRead(notificationId, userId) {
    try {
        const result = await run(`
            UPDATE notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE id = ? AND recipient_id = ?
        `, [notificationId, userId]);

        return result.changes > 0;
    } catch (error) {
        console.error('[Notification] MarkAsRead error:', error.message);
        return false;
    }
}

/**
 * Mark all as read
 */
async function markAllAsRead(userId) {
    try {
        const result = await run(`
            UPDATE notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE recipient_id = ? AND is_read = FALSE
        `, [userId]);

        return { marked: result.changes };
    } catch (error) {
        console.error('[Notification] MarkAllAsRead error:', error.message);
        return { marked: 0 };
    }
}

/**
 * Get unread count
 */
async function getUnreadCount(userId) {
    try {
        const result = await get(`
            SELECT COUNT(*) as count 
            FROM notifications 
            WHERE recipient_id = ? AND is_read = FALSE
        `, [userId]);

        return result?.count || 0;
    } catch (error) {
        console.error('[Notification] GetUnreadCount error:', error.message);
        return 0;
    }
}

/**
 * Delete notification
 */
async function deleteNotification(notificationId, userId) {
    try {
        const result = await run(`
            DELETE FROM notifications WHERE id = ? AND recipient_id = ?
        `, [notificationId, userId]);

        return result.changes > 0;
    } catch (error) {
        console.error('[Notification] Delete error:', error.message);
        return false;
    }
}

/**
 * Delete old notifications (cleanup)
 */
async function deleteOldNotifications(days = 30) {
    try {
        const result = await run(`
            DELETE FROM notifications 
            WHERE created_at < CURRENT_TIMESTAMP - (? * INTERVAL '1 day')
        `, [days]);

        return { deleted: (result && result.changes) || 0 };
    } catch (error) {
        console.error('[Notification] DeleteOld error:', error.message);
        return { deleted: 0 };
    }
}

/**
 * Send bulk notification
 */
function sendBulk(userIds, data) {
    const notifications = [];

    for (const userId of userIds) {
        const notification = create({
            ...data,
            user_id: userId,
            recipient_id: userId
        });
        if (notification) {
            notifications.push(notification);
        }
    }

    return notifications;
}

/**
 * Send to department
 */
async function sendToDepartment(departmentId, data) {
    try {
        const users = await all(`SELECT id FROM users WHERE department_id = ? AND is_active = TRUE`, [departmentId]);
        return sendBulk(users.map(u => u.id), data);
    } catch (error) {
        console.error('[Notification] SendToDepartment error:', error.message);
        return [];
    }
}

/**
 * Send to all users
 */
async function sendToAll(data) {
    try {
        const users = await all(`SELECT id FROM users WHERE is_active = TRUE`);
        return sendBulk(users.map(u => u.id), data);
    } catch (error) {
        console.error('[Notification] SendToAll error:', error.message);
        return [];
    }
}

// ============================================
// أنواع التنبيهات الـ 25 - Notification Types
// ============================================

const NOTIFICATION_TYPES = {
    // فواتير
    INVOICE_CREATED: 'invoice_created',
    INVOICE_WAITING_PRICES: 'invoice_waiting_prices',
    INVOICE_CONFIRMED: 'invoice_confirmed',
    INVOICE_AUDIT_NEEDED: 'invoice_audit_needed',
    INVOICE_READY_TO_DELIVER: 'invoice_ready_to_deliver',
    INVOICE_CANCELLED: 'invoice_cancelled',
    INVOICE_OVERDUE: 'invoice_overdue',
    
    // مخزون
    STOCK_LOW: 'stock_low',
    STOCK_OUT: 'stock_out',
    DEVICE_INSPECTION_NEEDED: 'device_inspection_needed',
    DEVICE_READY_FOR_PREP: 'device_ready_for_prep',
    DEVICE_READY_TO_SELL: 'device_ready_to_sell',
    
    // مالية
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_OVERDUE: 'payment_overdue',
    VOUCHER_CREATED: 'voucher_created',
    
    // مهام
    TASK_ASSIGNED: 'task_assigned',
    TASK_COMPLETED: 'task_completed',
    TASK_OVERDUE: 'task_overdue',
    
    // HR
    ATTENDANCE_LATE: 'attendance_late',
    ATTENDANCE_ABSENT: 'attendance_absent',
    VACATION_REQUEST: 'vacation_request',
    
    // ضمان
    WARRANTY_EXPIRING: 'warranty_expiring',
    WARRANTY_CLAIM: 'warranty_claim',
    
    // عام
    SYSTEM_ALERT: 'system_alert',
    APPROVAL_NEEDED: 'approval_needed',
};

/**
 * إنشاء تنبيه لحدث معين
 * @param {string} type - نوع التنبيه (من NOTIFICATION_TYPES)
 * @param {Object} context - بيانات السياق
 */
async function notifyEvent(type, context = {}) {
    const templates = {
        [NOTIFICATION_TYPES.INVOICE_CREATED]: {
            title: 'فاتورة جديدة',
            message: `تم إنشاء فاتورة ${context.invoice_number || ''} بمبلغ ${context.total || 0}`,
            priority: 'normal',
        },
        [NOTIFICATION_TYPES.INVOICE_WAITING_PRICES]: {
            title: 'فاتورة بانتظار الأسعار',
            message: `فاتورة شراء ${context.invoice_number || ''} من ${context.supplier_name || ''} بانتظار إضافة الأسعار`,
            priority: 'important',
        },
        [NOTIFICATION_TYPES.INVOICE_AUDIT_NEEDED]: {
            title: 'فاتورة بحاجة تدقيق',
            message: `فاتورة ${context.invoice_number || ''} بحاجة تدقيق من المدير`,
            priority: 'important',
        },
        [NOTIFICATION_TYPES.INVOICE_OVERDUE]: {
            title: 'فاتورة متأخرة',
            message: `فاتورة ${context.invoice_number || ''} متأخرة عن موعد السداد`,
            priority: 'urgent',
        },
        [NOTIFICATION_TYPES.STOCK_LOW]: {
            title: 'مخزون منخفض',
            message: `المنتج "${context.product_name || ''}" وصل الحد الأدنى (${context.quantity || 0} متبقي)`,
            priority: 'important',
        },
        [NOTIFICATION_TYPES.STOCK_OUT]: {
            title: 'نفاد المخزون',
            message: `المنتج "${context.product_name || ''}" نفد من المخزون!`,
            priority: 'urgent',
        },
        [NOTIFICATION_TYPES.DEVICE_INSPECTION_NEEDED]: {
            title: 'جهاز بحاجة فحص',
            message: `الجهاز ${context.serial_number || ''} جاهز للفحص`,
            priority: 'normal',
        },
        [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: {
            title: 'دفعة مستلمة',
            message: `تم استلام ${context.amount || 0} من ${context.customer_name || context.party_name || ''}`,
            priority: 'normal',
        },
        [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: {
            title: 'دفعة متأخرة',
            message: `دفعة بمبلغ ${context.amount || 0} من ${context.customer_name || ''} متأخرة`,
            priority: 'urgent',
        },
        [NOTIFICATION_TYPES.TASK_ASSIGNED]: {
            title: 'مهمة جديدة',
            message: `تم تعيين مهمة "${context.task_title || ''}" لك`,
            priority: 'normal',
        },
        [NOTIFICATION_TYPES.TASK_OVERDUE]: {
            title: 'مهمة متأخرة',
            message: `المهمة "${context.task_title || ''}" تجاوزت الموعد المحدد`,
            priority: 'important',
        },
        [NOTIFICATION_TYPES.ATTENDANCE_LATE]: {
            title: 'تأخر عن الدوام',
            message: `${context.employee_name || ''} تأخر ${context.late_minutes || 0} دقيقة`,
            priority: 'normal',
        },
        [NOTIFICATION_TYPES.WARRANTY_EXPIRING]: {
            title: 'ضمان يقارب الانتهاء',
            message: `ضمان الجهاز ${context.serial_number || ''} ينتهي خلال ${context.days_remaining || 7} أيام`,
            priority: 'important',
        },
        [NOTIFICATION_TYPES.APPROVAL_NEEDED]: {
            title: 'طلب موافقة',
            message: `${context.request_type || 'طلب'} بحاجة موافقتك`,
            priority: 'important',
        },
    };

    const template = templates[type] || {
        title: context.title || 'إشعار',
        message: context.message || '',
        priority: context.priority || 'normal',
    };

    // إرسال للمستخدم أو المدير
    const recipientId = context.recipient_id || context.user_id;
    if (!recipientId && !context.send_to_admins) return null;

    if (context.send_to_admins) {
        try {
            const admins = await all(`SELECT id FROM users WHERE role IN ('owner', 'admin') AND is_active = TRUE`);
            return sendBulk(admins.map(a => a.id), {
                type,
                ...template,
                entity_type: context.entity_type,
                entity_id: context.entity_id,
                action_url: context.action_url,
            });
        } catch (e) {
            console.error('[Notification] notifyEvent admin error:', e.message);
            return [];
        }
    }

    return create({
        user_id: recipientId,
        type,
        ...template,
        entity_type: context.entity_type,
        entity_id: context.entity_id,
        action_url: context.action_url,
    });
}

module.exports = {
    setSocketIO,
    create,
    getById,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    deleteNotification,
    deleteOldNotifications,
    sendBulk,
    sendToDepartment,
    sendToAll,
    notifyEvent,
    NOTIFICATION_TYPES,
};
