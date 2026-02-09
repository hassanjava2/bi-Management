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
function create(data) {
    const id = generateId();

    try {
        run(`
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
function getById(notificationId) {
    try {
        const notification = get(`SELECT * FROM notifications WHERE id = ?`, [notificationId]);
        
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
function getUserNotifications(userId, filters = {}) {
    try {
        let query = `SELECT * FROM notifications WHERE recipient_id = ?`;
        const params = [userId];

        if (filters.unread_only) {
            query += ` AND is_read = 0`;
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

        const notifications = all(query, params);

        return notifications.map(formatNotification);
    } catch (error) {
        console.error('[Notification] GetUserNotifications error:', error.message);
        return [];
    }
}

/**
 * Mark as read
 */
function markAsRead(notificationId, userId) {
    try {
        const result = run(`
            UPDATE notifications 
            SET is_read = 1, read_at = datetime('now')
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
function markAllAsRead(userId) {
    try {
        const result = run(`
            UPDATE notifications 
            SET is_read = 1, read_at = datetime('now')
            WHERE recipient_id = ? AND is_read = 0
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
function getUnreadCount(userId) {
    try {
        const result = get(`
            SELECT COUNT(*) as count 
            FROM notifications 
            WHERE recipient_id = ? AND is_read = 0
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
function deleteNotification(notificationId, userId) {
    try {
        const result = run(`
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
function deleteOldNotifications(days = 30) {
    try {
        const result = run(`
            DELETE FROM notifications 
            WHERE created_at < datetime('now', ?)
        `, [`-${days} days`]);

        return { deleted: result.changes };
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
function sendToDepartment(departmentId, data) {
    try {
        const users = all(`SELECT id FROM users WHERE department_id = ? AND is_active = 1`, [departmentId]);
        return sendBulk(users.map(u => u.id), data);
    } catch (error) {
        console.error('[Notification] SendToDepartment error:', error.message);
        return [];
    }
}

/**
 * Send to all users
 */
function sendToAll(data) {
    try {
        const users = all(`SELECT id FROM users WHERE is_active = 1`);
        return sendBulk(users.map(u => u.id), data);
    } catch (error) {
        console.error('[Notification] SendToAll error:', error.message);
        return [];
    }
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
    sendToAll
};
