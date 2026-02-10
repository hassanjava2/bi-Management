/**
 * BI Management - Security Routes
 * مسارات الأمان والمراجعة
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { hasSecurityLevel } = require('../middleware/rbac');
const { sensitiveDataMiddleware } = require('../middleware/sensitiveData');
const { auditService } = require('../services/audit.service');
const { encryptionService } = require('../services/encryption.service');
const { asyncHandler } = require('../middleware/errorHandler');

// ========== Audit Logs ==========

/**
 * GET /api/security/audit-logs
 * جلب سجلات العمليات
 */
router.get('/audit-logs', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const { user_id, action, table_name, from_date, to_date, limit = 50, offset = 0 } = req.query;

    const logs = await auditService.getLogs({
        user_id,
        action,
        table_name,
        from_date,
        to_date,
        limit: parseInt(limit),
        offset: parseInt(offset)
    });

    res.json({
        success: true,
        data: logs
    });
}));

/**
 * GET /api/security/audit-logs/record/:table/:id
 * تاريخ تغييرات record معين
 */
router.get('/audit-logs/record/:table/:id', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const { table, id } = req.params;

    const history = await auditService.getRecordHistory(table, id);

    res.json({
        success: true,
        data: history
    });
}));

// ========== Security Events ==========

/**
 * GET /api/security/events
 * جلب الأحداث الأمنية
 */
router.get('/events', auth, hasSecurityLevel(5), asyncHandler(async (req, res) => {
    const { user_id, event_type, severity, unresolved_only, limit = 50, offset = 0 } = req.query;

    const events = await auditService.getSecurityEvents({
        user_id,
        event_type,
        severity,
        unresolved_only: unresolved_only === 'true',
        limit: parseInt(limit),
        offset: parseInt(offset)
    });

    res.json({
        success: true,
        data: events
    });
}));

/**
 * POST /api/security/events/:id/resolve
 * حل حدث أمني
 */
router.post('/events/:id/resolve', auth, hasSecurityLevel(5), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    await auditService.resolveSecurityEvent(id, req.user.id, notes);

    // Log the resolution
    auditService.log({
        user_id: req.user.id,
        action: 'RESOLVE_SECURITY_EVENT',
        table_name: 'security_events',
        record_id: id,
        details: { notes }
    });

    res.json({
        success: true,
        message: 'تم حل الحدث الأمني'
    });
}));

/**
 * GET /api/security/stats
 * إحصائيات الأمان
 */
router.get('/stats', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;

    const stats = await auditService.getSecurityStats(parseInt(days));

    res.json({
        success: true,
        data: stats
    });
}));

// ========== Encryption Tools (Admin Only) ==========

/**
 * POST /api/security/encrypt
 * تشفير نص (للاختبار)
 */
router.post('/encrypt', auth, hasSecurityLevel(5), asyncHandler(async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_DATA',
            message: 'text مطلوب'
        });
    }

    const encrypted = await encryptionService.encryptField(text);

    res.json({
        success: true,
        data: {
            encrypted,
            note: 'هذا للاختبار فقط'
        }
    });
}));

/**
 * POST /api/security/decrypt
 * فك تشفير نص (للاختبار)
 */
router.post('/decrypt', auth, hasSecurityLevel(5), asyncHandler(async (req, res) => {
    const { encrypted } = req.body;

    if (!encrypted) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_DATA',
            message: 'encrypted مطلوب'
        });
    }

    const decrypted = await encryptionService.decryptField(encrypted);

    res.json({
        success: true,
        data: { decrypted }
    });
}));

/**
 * POST /api/security/generate-key
 * توليد مفتاح جديد
 */
router.post('/generate-key', auth, hasSecurityLevel(5), asyncHandler(async (req, res) => {
    const { bytes = 32 } = req.body;

    const key = await encryptionService.generateKey(parseInt(bytes));

    // Log this action
    auditService.logSecurityEvent({
        user_id: req.user.id,
        event_type: 'KEY_GENERATED',
        severity: 'info',
        details: { bytes }
    });

    res.json({
        success: true,
        data: {
            key,
            bytes: parseInt(bytes),
            warning: 'احتفظ بهذا المفتاح في مكان آمن!'
        }
    });
}));

// ========== User Security ==========

/**
 * GET /api/security/user/:id/activity
 * نشاط مستخدم معين
 */
router.get('/user/:id/activity', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { days = 7 } = req.query;

    const logs = await auditService.getLogs({
        user_id: id,
        limit: 100
    });

    const securityEvents = await auditService.getSecurityEvents({
        user_id: id,
        limit: 50
    });

    res.json({
        success: true,
        data: {
            audit_logs: logs,
            security_events: securityEvents
        }
    });
}));

/**
 * POST /api/security/cleanup
 * تنظيف السجلات القديمة
 */
router.post('/cleanup', auth, hasSecurityLevel(5), asyncHandler(async (req, res) => {
    const { days_to_keep = 90 } = req.body;

    const deleted = await auditService.cleanOldLogs(parseInt(days_to_keep));

    auditService.log({
        user_id: req.user.id,
        action: 'CLEANUP_LOGS',
        table_name: 'audit_logs',
        details: { days_to_keep, deleted_count: deleted }
    });

    res.json({
        success: true,
        message: `تم حذف ${deleted} سجل قديم`
    });
}));

module.exports = router;
