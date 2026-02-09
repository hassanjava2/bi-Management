/**
 * BI Management - Audit Routes
 * مسارات سجل التدقيق
 */

const express = require('express');
const router = express.Router();
const { getAuditService, EVENT_CATEGORIES, SEVERITY } = require('../services/audit.service');
const { requirePermission } = require('../middleware/protection');
const { auth } = require('../middleware/auth');

// كل المسارات تحتاج authentication
router.use(auth);

/**
 * GET /api/audit
 * جلب سجلات التدقيق مع الفلترة
 */
router.get('/', requirePermission('audit.read'), async (req, res) => {
    try {
        const auditService = getAuditService(req.db);
        
        const filters = {
            startDate: req.query.start_date,
            endDate: req.query.end_date,
            eventType: req.query.event_type,
            eventCategory: req.query.category,
            severity: req.query.severity,
            userId: req.query.user_id,
            entityType: req.query.entity_type,
            entityId: req.query.entity_id,
            searchText: req.query.search,
            page: parseInt(req.query.page) || 1,
            limit: Math.min(parseInt(req.query.limit) || 50, 100)
        };

        const logs = await auditService.search(filters);

        // تسجيل وصول للسجلات
        await auditService.log({
            eventType: 'audit_logs_viewed',
            eventCategory: EVENT_CATEGORIES.SENSITIVE,
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            ipAddress: req.ip,
            action: 'عرض سجلات التدقيق',
            changes: { filters }
        });

        res.json({
            success: true,
            data: logs,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                hasMore: logs.length === filters.limit
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/audit/stats
 * إحصائيات السجل
 */
router.get('/stats', requirePermission('audit.read'), async (req, res) => {
    try {
        const auditService = getAuditService(req.db);
        const days = parseInt(req.query.days) || 7;
        
        const stats = await auditService.getStats(days);

        res.json({
            success: true,
            data: stats,
            period_days: days
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/audit/entity/:type/:id
 * سجل كيان محدد
 */
router.get('/entity/:type/:id', requirePermission('audit.read'), async (req, res) => {
    try {
        const auditService = getAuditService(req.db);
        
        const logs = await auditService.search({
            entityType: req.params.type,
            entityId: req.params.id,
            limit: 100
        });

        res.json({
            success: true,
            data: logs,
            entity: {
                type: req.params.type,
                id: req.params.id
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/audit/user/:id
 * سجل مستخدم محدد
 */
router.get('/user/:id', requirePermission('audit.read'), async (req, res) => {
    try {
        const auditService = getAuditService(req.db);
        
        const logs = await auditService.search({
            userId: req.params.id,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        });

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/audit/critical
 * الأحداث الحرجة فقط
 */
router.get('/critical', requirePermission('audit.read'), async (req, res) => {
    try {
        const auditService = getAuditService(req.db);
        
        const logs = await auditService.search({
            severity: SEVERITY.CRITICAL,
            limit: 50
        });

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/audit/export
 * تصدير السجلات
 */
router.get('/export', requirePermission('audit.export'), async (req, res) => {
    try {
        const auditService = getAuditService(req.db);
        
        // تسجيل التصدير
        await auditService.log({
            eventType: 'audit_logs_exported',
            eventCategory: EVENT_CATEGORIES.SENSITIVE,
            severity: SEVERITY.WARNING,
            userId: req.user.id,
            userName: req.user.name,
            ipAddress: req.ip,
            action: 'تصدير سجلات التدقيق'
        });

        const logs = await auditService.search({
            startDate: req.query.start_date,
            endDate: req.query.end_date,
            limit: 10000
        });

        // CSV format
        const headers = ['التاريخ', 'النوع', 'المستخدم', 'الكيان', 'الإجراء', 'IP'];
        const rows = logs.map(l => [
            l.created_at,
            l.event_type,
            l.user_name,
            l.entity_name,
            l.action,
            l.ip_address
        ]);

        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
        res.send('\uFEFF' + csv);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/audit/categories
 * قائمة التصنيفات المتاحة
 */
router.get('/categories', (req, res) => {
    res.json({
        success: true,
        data: {
            categories: Object.values(EVENT_CATEGORIES),
            severities: Object.values(SEVERITY)
        }
    });
});

module.exports = router;
