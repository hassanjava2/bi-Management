/**
 * BI Management - Approval Routes
 * مسارات الموافقات
 */

const express = require('express');
const router = express.Router();
const { getApprovalService, APPROVAL_TYPES, APPROVAL_STATUS } = require('../services/approval.service');
const { getAuditService, EVENT_CATEGORIES } = require('../services/audit.service');
const { requirePermission } = require('../middleware/protection');
const { auth } = require('../middleware/auth');

router.use(auth);

/**
 * GET /api/approvals
 * جلب الموافقات المعلقة
 */
router.get('/', requirePermission('approvals.read'), async (req, res) => {
    try {
        const status = req.query.status || 'pending';
        let approvals = [];

        if (!req.db) {
            return res.json({ success: true, data: [], count: 0 });
        }

        try {
            if (status === 'all') {
                const result = await req.db.query(`
                    SELECT a.*, u.full_name as requester_name
                    FROM approvals a
                    LEFT JOIN users u ON a.requested_by = u.id
                    ORDER BY a.created_at DESC
                    LIMIT 100
                `);
                approvals = result.rows;
            } else {
                const result = await req.db.query(`
                    SELECT a.*, u.full_name as requester_name
                    FROM approvals a
                    LEFT JOIN users u ON a.requested_by = u.id
                    WHERE a.status = $1
                    ORDER BY a.created_at DESC
                    LIMIT 100
                `, [status]);
                approvals = result.rows;
            }
        } catch (dbErr) {
            // Table might not exist
            console.warn('[Approvals] Query error:', dbErr.message);
            approvals = [];
        }

        res.json({
            success: true,
            data: approvals,
            count: approvals.length
        });
    } catch (error) {
        res.json({ success: true, data: [], count: 0 });
    }
});

/**
 * GET /api/approvals/:id
 * جلب موافقة محددة
 */
router.get('/:id', requirePermission('approvals.read'), async (req, res) => {
    try {
        const approvalService = getApprovalService(req.db);
        const approval = await approvalService.getById(req.params.id);

        if (!approval) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'طلب الموافقة غير موجود'
            });
        }

        res.json({
            success: true,
            data: approval
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/approvals/deletion
 * طلب حذف جديد
 */
router.post('/deletion', requirePermission('approvals.request'), async (req, res) => {
    try {
        const { entity_type, entity_id, entity_name, reason } = req.body;

        if (!entity_type || !entity_id || !reason) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'الحقول المطلوبة: entity_type, entity_id, reason'
            });
        }

        const approvalService = getApprovalService(req.db);
        
        const approval = await approvalService.requestDeletion(
            entity_type,
            entity_id,
            entity_name || entity_id,
            reason,
            req.user
        );

        res.status(201).json({
            success: true,
            data: approval,
            message: 'تم إرسال طلب الحذف للموافقة'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/approvals/invoice-void
 * طلب إلغاء فاتورة
 */
router.post('/invoice-void', requirePermission('approvals.request'), async (req, res) => {
    try {
        const { invoice_id, reason } = req.body;
        if (!invoice_id) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'الحقول المطلوبة: invoice_id, reason (اختياري)'
            });
        }
        const approvalService = getApprovalService(req.db);
        const approval = await approvalService.requestInvoiceVoid(invoice_id, reason, req.user);
        getAuditService().log({
            eventType: 'approval_requested',
            eventCategory: EVENT_CATEGORIES.APPROVAL,
            entityType: 'approval',
            entityId: approval.id,
            entityName: approval.approval_number,
            userId: req.user?.id,
            userName: req.user?.name || req.user?.full_name,
            userRole: req.user?.role,
            ipAddress: req.ip,
            newValue: { approval_type: 'invoice_void', invoice_id, reason }
        });
        res.status(201).json({
            success: true,
            data: approval,
            message: 'تم إرسال طلب إلغاء الفاتورة للموافقة'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/approvals/quantity
 * طلب تعديل كمية
 */
router.post('/quantity', requirePermission('approvals.request'), async (req, res) => {
    try {
        const { entity_type, entity_id, entity_name, old_quantity, new_quantity, reason } = req.body;

        if (!entity_type || !entity_id || old_quantity === undefined || new_quantity === undefined || !reason) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'الحقول المطلوبة: entity_type, entity_id, old_quantity, new_quantity, reason'
            });
        }

        const approvalService = getApprovalService(req.db);
        
        const approval = await approvalService.requestQuantityCorrection(
            entity_type,
            entity_id,
            entity_name || entity_id,
            old_quantity,
            new_quantity,
            reason,
            req.user
        );

        res.status(201).json({
            success: true,
            data: approval,
            message: 'تم إرسال طلب تعديل الكمية للموافقة'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/approvals/:id/approve
 * الموافقة على طلب
 */
router.post('/:id/approve', requirePermission('approvals.decide'), async (req, res) => {
    try {
        // التحقق من أن المستخدم هو المالك
        if (req.user.role !== 'owner') {
            return res.status(403).json({
                success: false,
                error: 'OWNER_ONLY',
                message: 'فقط المالك يمكنه الموافقة'
            });
        }

        const approvalService = getApprovalService(req.db);
        const { notes } = req.body;

        const approval = await approvalService.approve(
            req.params.id,
            req.user,
            notes
        );

        getAuditService().log({
            eventType: 'approval_granted',
            eventCategory: EVENT_CATEGORIES.APPROVAL,
            entityType: 'approval',
            entityId: approval.id,
            entityName: approval.approval_number,
            userId: req.user?.id,
            userName: req.user?.name || req.user?.full_name,
            userRole: req.user?.role,
            ipAddress: req.ip,
            newValue: { approval_id: req.params.id, status: 'approved', notes }
        });

        res.json({
            success: true,
            data: approval,
            message: 'تمت الموافقة بنجاح'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/approvals/:id/reject
 * رفض طلب
 */
router.post('/:id/reject', requirePermission('approvals.decide'), async (req, res) => {
    try {
        const approvalService = getApprovalService(req.db);
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_REASON',
                message: 'يجب تحديد سبب الرفض'
            });
        }

        const approval = await approvalService.reject(
            req.params.id,
            req.user,
            reason
        );

        getAuditService().log({
            eventType: 'approval_denied',
            eventCategory: EVENT_CATEGORIES.APPROVAL,
            entityType: 'approval',
            entityId: approval.id,
            entityName: approval.approval_number,
            userId: req.user?.id,
            userName: req.user?.name || req.user?.full_name,
            userRole: req.user?.role,
            ipAddress: req.ip,
            newValue: { approval_id: req.params.id, status: 'rejected', reason }
        });

        res.json({
            success: true,
            data: approval,
            message: 'تم الرفض'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/approvals/types
 * أنواع الموافقات
 */
router.get('/meta/types', (req, res) => {
    res.json({
        success: true,
        data: {
            types: APPROVAL_TYPES,
            statuses: APPROVAL_STATUS
        }
    });
});

/**
 * GET /api/approvals/my-requests
 * طلباتي
 */
router.get('/my/requests', async (req, res) => {
    try {
        const result = await req.db.query(`
            SELECT * FROM approvals 
            WHERE requested_by = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.user.id]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
