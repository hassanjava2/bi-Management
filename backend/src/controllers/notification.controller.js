/**
 * BI Management - Notification Controller
 */

const notificationService = require('../services/notification.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/notifications
 */
const list = asyncHandler(async (req, res) => {
    const { unread_only, type, limit = 50 } = req.query;

    const notifications = notificationService.getUserNotifications(req.user.id, {
        unread_only: unread_only === 'true',
        type,
        limit: parseInt(limit)
    });

    const unreadCount = notificationService.getUnreadCount(req.user.id);

    res.json({
        success: true,
        data: notifications,
        unread_count: unreadCount
    });
});

/**
 * PUT /api/notifications/:id/read
 */
const markAsRead = asyncHandler(async (req, res) => {
    const success = notificationService.markAsRead(req.params.id, req.user.id);

    if (!success) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Notification not found'
        });
    }

    res.json({
        success: true,
        message: 'Notification marked as read'
    });
});

/**
 * PUT /api/notifications/read-all
 */
const markAllAsRead = asyncHandler(async (req, res) => {
    const result = notificationService.markAllAsRead(req.user.id);

    res.json({
        success: true,
        message: `${result.marked} notifications marked as read`
    });
});

/**
 * GET /api/notifications/unread-count
 */
const unreadCount = asyncHandler(async (req, res) => {
    const count = notificationService.getUnreadCount(req.user.id);

    res.json({
        success: true,
        data: { count }
    });
});

/**
 * DELETE /api/notifications/:id
 */
const remove = asyncHandler(async (req, res) => {
    const success = notificationService.deleteNotification(req.params.id, req.user.id);

    if (!success) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Notification not found'
        });
    }

    res.json({
        success: true,
        message: 'Notification deleted'
    });
});

module.exports = {
    list,
    markAsRead,
    markAllAsRead,
    unreadCount,
    remove
};
