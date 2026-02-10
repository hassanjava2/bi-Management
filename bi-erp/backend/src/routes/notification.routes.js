/**
 * BI Management - Notification Routes
 */

const router = require('express').Router();
const notificationController = require('../controllers/notification.controller');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get notifications
router.get('/', notificationController.list);

// Get unread count
router.get('/unread-count', notificationController.unreadCount);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Mark as read
router.put('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.remove);

// Register push notification device
router.post('/register-device', (req, res) => {
    const { push_token, platform } = req.body;
    const userId = req.user.id;
    
    // TODO: Store in database for push notifications
    console.log(`[Notifications] Device registered: ${platform} for user ${userId}`);
    
    res.json({
        success: true,
        message: 'Device registered successfully'
    });
});

module.exports = router;
