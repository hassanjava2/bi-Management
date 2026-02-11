const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const notificationController = require('../controllers/notification.controller');

router.use(auth);

// Controller functions are already wrapped with asyncHandler
router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.remove);

module.exports = router;
