/**
 * BI Management - Audit Service
 * خدمة سجل التدقيق - متوافق مع SQLite
 */

const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

// Event categories
const EVENT_CATEGORIES = {
    AUTH: 'auth',
    INVENTORY: 'inventory',
    INVOICE: 'invoice',
    WARRANTY: 'warranty',
    SENSITIVE: 'sensitive',
    APPROVAL: 'approval',
    SYSTEM: 'system',
    SECURITY: 'security'
};

// Severity levels
const SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical'
};

// Events that require owner notification
const CRITICAL_EVENTS = [
    'delete_requested',
    'quantity_manual_change',
    'price_change',
    'cost_price_viewed',
    'data_exported',
    'suspicious_activity',
    'permission_denied',
    'bulk_operation'
];

/**
 * تسجيل حدث في سجل التدقيق
 */
function log(event) {
    const {
        eventType,
        eventCategory = EVENT_CATEGORIES.SYSTEM,
        severity = SEVERITY.INFO,
        userId,
        userName,
        userRole,
        ipAddress,
        userAgent,
        deviceFingerprint,
        entityType,
        entityId,
        entityName,
        oldValue,
        newValue,
        changes,
        requestId,
        sessionId,
        module,
        action,
        metadata
    } = event;

    try {
        run(`
            INSERT INTO audit_logs 
            (id, event_type, event_category, severity, user_id, user_name, user_role,
             ip_address, user_agent, device_fingerprint, entity_type, entity_id, entity_name,
             old_value, new_value, changes, request_id, session_id, module, action, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            uuidv4(),
            eventType,
            eventCategory,
            severity,
            userId || null,
            userName || null,
            userRole || null,
            ipAddress || null,
            userAgent || null,
            deviceFingerprint || null,
            entityType || null,
            entityId || null,
            entityName || null,
            oldValue ? JSON.stringify(oldValue) : null,
            newValue ? JSON.stringify(newValue) : null,
            changes ? JSON.stringify(changes) : null,
            requestId || null,
            sessionId || null,
            module || null,
            action || null,
            metadata ? JSON.stringify(metadata) : null,
            now()
        ]);

        // إشعار المالك للأحداث الحرجة
        if (CRITICAL_EVENTS.includes(eventType)) {
            notifyOwner(eventType, userName, action);
        }

        return { success: true };
    } catch (error) {
        console.error('[Audit] Log error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * تسجيل حدث بسيط (للتوافق)
 */
function logAudit(data) {
    try {
        run(`
            INSERT INTO audit_logs (id, user_id, event_type, action, entity_type, entity_id,
                old_value, new_value, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            generateId(),
            data.user_id || null,
            data.event_type || data.action,
            data.action,
            data.table_name || data.entity_type || null,
            data.record_id || data.entity_id || null,
            data.old_values ? JSON.stringify(data.old_values) : null,
            data.new_values ? JSON.stringify(data.new_values) : null,
            data.ip_address || null,
            data.user_agent || null,
            now()
        ]);
    } catch (err) {
        console.error('[Audit] Failed to log:', err.message);
    }
}

/**
 * تسجيل الدخول
 */
function logLogin(userId, userName, ipAddress, userAgent, success = true) {
    return log({
        eventType: success ? 'login' : 'login_failed',
        eventCategory: EVENT_CATEGORIES.AUTH,
        severity: success ? SEVERITY.INFO : SEVERITY.WARNING,
        userId,
        userName,
        ipAddress,
        userAgent,
        action: success ? 'تسجيل دخول ناجح' : 'فشل تسجيل الدخول'
    });
}

/**
 * إنشاء جهاز
 */
function logDeviceCreated(device, user) {
    return log({
        eventType: 'device_created',
        eventCategory: EVENT_CATEGORIES.INVENTORY,
        userId: user?.id,
        userName: user?.name,
        userRole: user?.role,
        entityType: 'device',
        entityId: device?.id,
        entityName: device?.serial_number,
        newValue: device,
        action: `إنشاء جهاز جديد: ${device?.serial_number}`
    });
}

/**
 * نقل جهاز
 */
function logDeviceTransfer(device, fromWarehouse, toWarehouse, reason, user) {
    return log({
        eventType: 'device_transferred',
        eventCategory: EVENT_CATEGORIES.INVENTORY,
        userId: user?.id,
        userName: user?.name,
        entityType: 'device',
        entityId: device?.id,
        entityName: device?.serial_number,
        oldValue: { warehouse: fromWarehouse },
        newValue: { warehouse: toWarehouse },
        changes: { from: fromWarehouse, to: toWarehouse, reason },
        action: `نقل من ${fromWarehouse} إلى ${toWarehouse}`
    });
}

/**
 * تغيير كمية
 */
function logQuantityChange(entity, oldQty, newQty, reason, user) {
    return log({
        eventType: 'quantity_manual_change',
        eventCategory: EVENT_CATEGORIES.INVENTORY,
        severity: SEVERITY.WARNING,
        userId: user?.id,
        userName: user?.name,
        entityType: entity?.type,
        entityId: entity?.id,
        entityName: entity?.name,
        oldValue: { quantity: oldQty },
        newValue: { quantity: newQty },
        changes: { quantity_change: newQty - oldQty, reason },
        action: `تغيير كمية من ${oldQty} إلى ${newQty}`
    });
}

/**
 * طلب حذف
 */
function logDeleteRequest(entityType, entityId, entityName, reason, user) {
    return log({
        eventType: 'delete_requested',
        eventCategory: EVENT_CATEGORIES.APPROVAL,
        severity: SEVERITY.CRITICAL,
        userId: user?.id,
        userName: user?.name,
        entityType,
        entityId,
        entityName,
        changes: { reason },
        action: `طلب حذف: ${entityName}`
    });
}

/**
 * عرض سعر الشراء
 */
function logCostPriceViewed(entityType, entityId, entityName, user) {
    return log({
        eventType: 'cost_price_viewed',
        eventCategory: EVENT_CATEGORIES.SENSITIVE,
        severity: SEVERITY.WARNING,
        userId: user?.id,
        userName: user?.name,
        entityType,
        entityId,
        entityName,
        action: `عرض سعر الشراء: ${entityName}`
    });
}

/**
 * إنشاء فاتورة
 */
function logInvoiceCreated(invoice, user) {
    return log({
        eventType: 'invoice_created',
        eventCategory: EVENT_CATEGORIES.INVOICE,
        userId: user?.id,
        userName: user?.name,
        entityType: 'invoice',
        entityId: invoice?.id,
        entityName: invoice?.invoice_number,
        newValue: invoice,
        action: `إنشاء فاتورة ${invoice?.type}: ${invoice?.invoice_number}`
    });
}

/**
 * طلب ضمان
 */
function logWarrantyClaim(claim, action, user) {
    return log({
        eventType: `warranty_${action}`,
        eventCategory: EVENT_CATEGORIES.WARRANTY,
        userId: user?.id,
        userName: user?.name,
        entityType: 'warranty_claim',
        entityId: claim?.id,
        entityName: claim?.claim_number,
        newValue: claim,
        action: `طلب ضمان: ${action}`
    });
}

/**
 * تسجيل حدث أمني
 */
function logSecurityEvent(data) {
    return log({
        eventType: data.event_type,
        eventCategory: EVENT_CATEGORIES.SECURITY,
        severity: data.severity || SEVERITY.WARNING,
        userId: data.user_id,
        action: data.description,
        ipAddress: data.ip_address
    });
}

/**
 * البحث في السجلات
 */
function search(filters) {
    const {
        startDate,
        endDate,
        eventType,
        eventCategory,
        severity,
        userId,
        entityType,
        entityId,
        searchText,
        page = 1,
        limit = 50
    } = filters;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
    }

    if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
    }

    if (eventType) {
        query += ' AND event_type = ?';
        params.push(eventType);
    }

    if (eventCategory) {
        query += ' AND event_category = ?';
        params.push(eventCategory);
    }

    if (severity) {
        query += ' AND severity = ?';
        params.push(severity);
    }

    if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
    }

    if (entityType) {
        query += ' AND entity_type = ?';
        params.push(entityType);
    }

    if (entityId) {
        query += ' AND entity_id = ?';
        params.push(entityId);
    }

    if (searchText) {
        query += ' AND (action LIKE ? OR entity_name LIKE ? OR user_name LIKE ?)';
        const searchPattern = `%${searchText}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    return all(query, params);
}

/**
 * عدد السجلات
 */
function getCount(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
    const params = [];

    if (filters.eventCategory) {
        query += ' AND event_category = ?';
        params.push(filters.eventCategory);
    }

    if (filters.severity) {
        query += ' AND severity = ?';
        params.push(filters.severity);
    }

    if (filters.userId) {
        query += ' AND user_id = ?';
        params.push(filters.userId);
    }

    const result = get(query, params);
    return result?.count || 0;
}

/**
 * إحصائيات السجل
 */
function getStats(days = 7) {
    return all(`
        SELECT 
            event_category,
            severity,
            COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY event_category, severity
        ORDER BY count DESC
    `, [days]);
}

/**
 * عد محاولات تسجيل الدخول الفاشلة
 */
function countFailedLogins(userId, minutes = 30) {
    try {
        const result = get(`
            SELECT COUNT(*) as count FROM audit_logs 
            WHERE user_id = ? 
            AND event_type = 'login_failed' 
            AND created_at > datetime('now', '-' || ? || ' minutes')
        `, [userId, minutes]);
        return result?.count || 0;
    } catch (err) {
        console.error('[Audit] Failed to count:', err.message);
        return 0;
    }
}

/**
 * كشف النشاط المشبوه
 */
function detectSuspiciousActivity(userId) {
    if (!userId) return false;

    const result = get(`
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE user_id = ?
        AND created_at > datetime('now', '-1 minutes')
    `, [userId]);

    if (result?.count > 100) {
        log({
            eventType: 'suspicious_activity',
            eventCategory: EVENT_CATEGORIES.SECURITY,
            severity: SEVERITY.CRITICAL,
            userId,
            action: 'نشاط مشبوه: أكثر من 100 عملية في دقيقة'
        });
        return true;
    }
    return false;
}

/**
 * إشعار المالك
 */
function notifyOwner(eventType, userName, action) {
    console.log(`🔔 Critical event [${eventType}] by ${userName}: ${action}`);
    // TODO: إرسال إشعار حقيقي للمالك
}

/**
 * جلب السجلات الأخيرة
 */
function getRecent(limit = 20) {
    return all(`
        SELECT * FROM audit_logs 
        ORDER BY created_at DESC 
        LIMIT ?
    `, [limit]);
}

/**
 * جلب سجلات مستخدم
 */
function getByUser(userId, limit = 50) {
    return all(`
        SELECT * FROM audit_logs 
        WHERE user_id = ?
        ORDER BY created_at DESC 
        LIMIT ?
    `, [userId, limit]);
}

/**
 * جلب الفئات المتاحة
 */
function getCategories() {
    return Object.values(EVENT_CATEGORIES);
}

// Singleton class for backward compatibility
class AuditService {
    log(event) { return log(event); }
    logLogin(...args) { return logLogin(...args); }
    logDeviceCreated(...args) { return logDeviceCreated(...args); }
    logDeviceTransfer(...args) { return logDeviceTransfer(...args); }
    logQuantityChange(...args) { return logQuantityChange(...args); }
    logDeleteRequest(...args) { return logDeleteRequest(...args); }
    logCostPriceViewed(...args) { return logCostPriceViewed(...args); }
    logInvoiceCreated(...args) { return logInvoiceCreated(...args); }
    logWarrantyClaim(...args) { return logWarrantyClaim(...args); }
    search(filters) { return search(filters); }
    getStats(days) { return getStats(days); }
}

let auditServiceInstance = null;

function getAuditService() {
    if (!auditServiceInstance) {
        auditServiceInstance = new AuditService();
    }
    return auditServiceInstance;
}

module.exports = {
    // Main functions
    log,
    logAudit,
    logLogin,
    logDeviceCreated,
    logDeviceTransfer,
    logQuantityChange,
    logDeleteRequest,
    logCostPriceViewed,
    logInvoiceCreated,
    logWarrantyClaim,
    logSecurityEvent,
    search,
    getCount,
    getStats,
    countFailedLogins,
    detectSuspiciousActivity,
    getRecent,
    getByUser,
    getCategories,
    // Constants
    EVENT_CATEGORIES,
    SEVERITY,
    CRITICAL_EVENTS,
    // Class
    AuditService,
    getAuditService
};
