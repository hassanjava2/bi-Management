/**
 * BI Management - Push Notification Service
 * خدمة الإشعارات للموبايل
 * 
 * ملاحظة: Firebase Cloud Messaging يحتاج إعداد خارجي
 * هذا الملف جاهز للتكامل عند الحاجة
 */

const { run, get, all } = require('../config/database');
const { generateId } = require('../utils/helpers');

// Firebase Admin SDK (uncomment when ready)
// const admin = require('firebase-admin');
const logger = require('../utils/logger');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

/**
 * Register device token
 */
async function registerDevice(userId, token, deviceType = 'android') {
    const id = generateId();
    
    // Remove existing token for this device
    await run(`DELETE FROM device_tokens WHERE token = ?`, [token]);
    
    // Insert new token
    await run(`
        INSERT INTO device_tokens (id, user_id, token, device_type)
        VALUES (?, ?, ?, ?)
    `, [id, userId, token, deviceType]);

    return { success: true, id };
}

/**
 * Unregister device token
 */
async function unregisterDevice(token) {
    await run(`DELETE FROM device_tokens WHERE token = ?`, [token]);
    return { success: true };
}

/**
 * Get user device tokens
 */
async function getUserDevices(userId) {
    return await all(`
        SELECT token, device_type FROM device_tokens WHERE user_id = ?
    `, [userId]);
}

/**
 * Send push notification to user
 * 
 * Note: Requires Firebase setup
 */
async function sendPushNotification(userId, notification) {
    const devices = getUserDevices(userId);
    
    if (devices.length === 0) {
        logger.info(`[Push] No devices registered for user ${userId}`);
        return { sent: 0 };
    }

    const tokens = devices.map(d => d.token);
    
    // Firebase message format
    const message = {
        notification: {
            title: notification.title,
            body: notification.body,
        },
        data: {
            type: notification.type || 'info',
            ...(notification.data || {})
        },
        tokens
    };

    logger.info(`[Push] Would send to ${tokens.length} devices:`, message);
    
    // Uncomment when Firebase is configured:
    // try {
    //     const response = await admin.messaging().sendMulticast(message);
    //     logger.info(`[Push] Sent: ${response.successCount}, Failed: ${response.failureCount}`);
    //     
    //     // Remove invalid tokens
    //     response.responses.forEach((resp, idx) => {
    //         if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
    //             unregisterDevice(tokens[idx]);
    //         }
    //     });
    //     
    //     return { sent: response.successCount, failed: response.failureCount };
    // } catch (error) {
    //     logger.error('[Push] Error:', error);
    //     return { sent: 0, error: error.message };
    // }

    return { sent: 0, message: 'Firebase not configured' };
}

/**
 * Send push to multiple users
 */
async function sendBulkPush(userIds, notification) {
    const results = [];
    
    for (const userId of userIds) {
        const result = await sendPushNotification(userId, notification);
        results.push({ userId, ...result });
    }
    
    return results;
}

module.exports = {
    registerDevice,
    unregisterDevice,
    getUserDevices,
    sendPushNotification,
    sendBulkPush
};
