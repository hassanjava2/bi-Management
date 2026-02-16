/**
 * BI Management - Approval Service
 * خدمة الموافقات - متوافق مع SQLite
 */

const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');
const logger = require('../utils/logger');

// أنواع الموافقات
const APPROVAL_TYPES = {
    DELETION: 'deletion',
    INVOICE_VOID: 'invoice_void',
    QUANTITY_CORRECTION: 'quantity_correction',
    PRICE_CHANGE: 'price_change',
    LARGE_DISCOUNT: 'large_discount',
    REFUND: 'refund',
    DATA_EXPORT: 'data_export',
    BULK_OPERATION: 'bulk_operation'
};

// حالات الموافقة
const APPROVAL_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    EXPIRED: 'expired'
};

// مدة انتهاء الطلب (24 ساعة)
const EXPIRY_HOURS = 24;

/**
 * إنشاء طلب موافقة جديد
 */
async function createRequest(data) {
    const {
        approvalType,
        entityType,
        entityId,
        entityName,
        requestedBy,
        reason,
        requestData,
        priority = 'normal'
    } = data;

    const approvalNumber = generateApprovalNumber();
    const id = uuidv4();
    const createdAt = now();
    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    try {
        await run(`
            INSERT INTO approvals 
            (id, approval_number, type, entity_type, entity_id,
             requested_by, request_reason, request_data, status, priority, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            approvalNumber,
            approvalType,
            entityType,
            entityId,
            requestedBy?.id,
            reason,
            JSON.stringify(requestData || {}),
            APPROVAL_STATUS.PENDING,
            priority,
            expiresAt,
            createdAt
        ]);

        const approval = {
            id,
            approval_number: approvalNumber,
            type: approvalType,
            entity_type: entityType,
            entity_id: entityId,
            entity_name: entityName,
            requested_by: requestedBy?.id,
            request_reason: reason,
            status: APPROVAL_STATUS.PENDING,
            priority,
            expires_at: expiresAt,
            created_at: createdAt
        };

        // Log notification
        logger.info(`🔔 New approval request: ${approvalType} by ${requestedBy?.name}`);

        return approval;
    } catch (error) {
        logger.error('Error creating approval request:', error);
        throw error;
    }
}

/**
 * طلب حذف
 */
function requestDeletion(entityType, entityId, entityName, reason, requestedBy) {
    return createRequest({
        approvalType: APPROVAL_TYPES.DELETION,
        entityType,
        entityId,
        entityName,
        requestedBy,
        reason,
        requestData: { action: 'delete' },
        priority: 'high'
    });
}

/**
 * طلب إلغاء فاتورة
 */
async function requestInvoiceVoid(invoiceId, reason, requestedBy) {
    const invoice = await get('SELECT id, invoice_number, type, status FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoice) throw new Error('الفاتورة غير موجودة');
    if (invoice.status === 'cancelled' || invoice.status === 'voided') throw new Error('الفاتورة ملغاة مسبقاً');
    return createRequest({
        approvalType: APPROVAL_TYPES.INVOICE_VOID,
        entityType: 'invoice',
        entityId: invoiceId,
        entityName: invoice.invoice_number,
        requestedBy,
        reason: reason || 'طلب إلغاء فاتورة',
        requestData: { reason: reason || null },
        priority: 'high'
    });
}

/**
 * طلب تعديل كمية
 */
function requestQuantityCorrection(entityType, entityId, entityName, oldQty, newQty, reason, requestedBy) {
    return createRequest({
        approvalType: APPROVAL_TYPES.QUANTITY_CORRECTION,
        entityType,
        entityId,
        entityName,
        requestedBy,
        reason,
        requestData: {
            action: 'quantity_correction',
            old_quantity: oldQty,
            new_quantity: newQty,
            difference: newQty - oldQty
        },
        priority: 'high'
    });
}

/**
 * الموافقة على الطلب
 */
async function approve(approvalId, decidedBy, notes = '') {
    const approval = await getById(approvalId);
    
    if (!approval) {
        throw new Error('طلب الموافقة غير موجود');
    }

    if (approval.status !== APPROVAL_STATUS.PENDING) {
        throw new Error('الطلب ليس في حالة انتظار');
    }

    // التحقق من صلاحية المالك
    if (decidedBy?.role !== 'owner' && decidedBy?.role !== 'admin') {
        throw new Error('فقط المالك أو المدير يمكنه الموافقة');
    }

    const decidedAt = now();

    await run(`
        UPDATE approvals 
        SET status = ?, decided_by = ?, decision_reason = ?, decided_at = ?
        WHERE id = ?
    `, [APPROVAL_STATUS.APPROVED, decidedBy?.id, notes, decidedAt, approvalId]);

    // تنفيذ العملية
    await executeApproval(approval);

    logger.info(`✅ Approval granted: ${approval.approval_number} by ${decidedBy?.name}`);

    return { ...approval, status: APPROVAL_STATUS.APPROVED, decided_at: decidedAt };
}

/**
 * رفض الطلب
 */
async function reject(approvalId, decidedBy, reason) {
    const approval = await getById(approvalId);
    
    if (!approval) {
        throw new Error('طلب الموافقة غير موجود');
    }

    if (approval.status !== APPROVAL_STATUS.PENDING) {
        throw new Error('الطلب ليس في حالة انتظار');
    }

    const decidedAt = now();

    await run(`
        UPDATE approvals 
        SET status = ?, decided_by = ?, decision_reason = ?, decided_at = ?
        WHERE id = ?
    `, [APPROVAL_STATUS.REJECTED, decidedBy?.id, reason, decidedAt, approvalId]);

    logger.info(`❌ Approval rejected: ${approval.approval_number} by ${decidedBy?.name}`);

    return { ...approval, status: APPROVAL_STATUS.REJECTED, decided_at: decidedAt };
}

/**
 * تنفيذ الموافقة
 */
function executeApproval(approval) {
    const requestData = typeof approval.request_data === 'string' 
        ? JSON.parse(approval.request_data) 
        : approval.request_data;

    switch (approval.type) {
        case APPROVAL_TYPES.DELETION:
            executeDeletion(approval.entity_type, approval.entity_id);
            break;

        case APPROVAL_TYPES.INVOICE_VOID:
            executeInvoiceVoid(approval.entity_id, requestData?.reason);
            break;

        case APPROVAL_TYPES.QUANTITY_CORRECTION:
            executeQuantityCorrection(
                approval.entity_type, 
                approval.entity_id, 
                requestData?.new_quantity
            );
            break;

        default:
            logger.info(`Approval type ${approval.type} execution not implemented`);
    }
}

/**
 * تنفيذ الحذف (Soft Delete)
 */
async function executeDeletion(entityType, entityId) {
    if (entityType === 'invoice') {
        try {
            await run(`
                UPDATE invoices 
                SET status = 'deleted', updated_at = ?, is_deleted = 1, deleted_at = ?
                WHERE id = ?
            `, [now(), now(), entityId]);
        } catch (e) {
            try {
                await run(`
                    UPDATE invoices 
                    SET status = 'deleted', updated_at = ?
                    WHERE id = ?
                `, [now(), entityId]);
            } catch (err) {
                logger.error('Error executing invoice deletion:', err);
            }
        }
        return;
    }

    const tableMap = {
        'device': 'serial_numbers',
        'product': 'products',
        'customer': 'customers',
        'supplier': 'suppliers'
    };

    const table = tableMap[entityType];
    if (!table) return;

    try {
        await run(`
            UPDATE ${table} 
            SET is_deleted = 1, deleted_at = ?
            WHERE id = ?
        `, [now(), entityId]);
    } catch (error) {
        logger.error('Error executing deletion:', error);
    }
}

/**
 * تنفيذ إلغاء الفاتورة
 */
async function executeInvoiceVoid(invoiceId, reason) {
    try {
        await run(`
            UPDATE invoices 
            SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP,
                cancelled_reason = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [reason || null, invoiceId]);
    } catch (e) {
        try {
            await run(`
                UPDATE invoices 
                SET status = 'cancelled', voided_at = ?, void_reason = ?, updated_at = ?
                WHERE id = ?
            `, [now(), reason || null, now(), invoiceId]);
        } catch (err) {
            logger.error('Error executing invoice void:', err);
        }
    }
}

/**
 * تنفيذ تعديل الكمية
 */
async function executeQuantityCorrection(entityType, entityId, newQuantity) {
    if (entityType === 'product') {
        try {
            await run(`
                UPDATE products SET quantity = ?, updated_at = ?
                WHERE id = ?
            `, [newQuantity, now(), entityId]);
        } catch (error) {
            logger.error('Error executing quantity correction:', error);
        }
    }
}

/**
 * جلب طلب بالـ ID
 */
async function getById(id) {
    return await get('SELECT * FROM approvals WHERE id = ?', [id]);
}

/**
 * جلب الطلبات المعلقة
 */
async function getPending() {
    return await all(`
        SELECT a.*, u.full_name as requester_name
        FROM approvals a
        LEFT JOIN users u ON a.requested_by = u.id
        WHERE a.status = ?
        AND a.expires_at > CURRENT_TIMESTAMP
        ORDER BY 
            CASE a.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'normal' THEN 3 
                ELSE 4 
            END,
            a.created_at ASC
    `, [APPROVAL_STATUS.PENDING]);
}

/**
 * جلب جميع الطلبات
 */
async function getAll(filters = {}) {
    let query = `
        SELECT a.*, u.full_name as requester_name, d.full_name as decider_name
        FROM approvals a
        LEFT JOIN users u ON a.requested_by = u.id
        LEFT JOIN users d ON a.decided_by = d.id
        WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
        query += ' AND a.status = ?';
        params.push(filters.status);
    }

    if (filters.type) {
        query += ' AND a.type = ?';
        params.push(filters.type);
    }

    if (filters.requested_by) {
        query += ' AND a.requested_by = ?';
        params.push(filters.requested_by);
    }

    query += ' ORDER BY a.created_at DESC';

    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
    }

    return await all(query, params);
}

/**
 * جلب طلبات مستخدم
 */
async function getByUser(userId) {
    return await all(`
        SELECT * FROM approvals 
        WHERE requested_by = ?
        ORDER BY created_at DESC
    `, [userId]);
}

/**
 * فحص الطلبات المنتهية
 */
async function expireOldRequests() {
    try {
        await run(`
            UPDATE approvals 
            SET status = ?
            WHERE status = ? AND expires_at < CURRENT_TIMESTAMP
        `, [APPROVAL_STATUS.EXPIRED, APPROVAL_STATUS.PENDING]);
    } catch (error) {
        logger.error('Error expiring old requests:', error);
    }
}

/**
 * توليد رقم الموافقة
 */
function generateApprovalNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `APR-${year}${month}-${random}`;
}

/**
 * عدد الطلبات المعلقة
 */
async function getPendingCount() {
    const result = await get(`
        SELECT COUNT(*) as count FROM approvals 
        WHERE status = ? AND expires_at > CURRENT_TIMESTAMP
    `, [APPROVAL_STATUS.PENDING]);
    return result?.count || 0;
}

/**
 * إحصائيات الموافقات
 */
async function getStats(days = 30) {
    return await all(`
        SELECT 
            type,
            status,
            COUNT(*) as count
        FROM approvals
        WHERE created_at >= CURRENT_TIMESTAMP - (? * INTERVAL '1 day')
        GROUP BY type, status
    `, [days]);
}

/**
 * أنواع الموافقات المتاحة
 */
function getTypes() {
    return Object.entries(APPROVAL_TYPES).map(([key, value]) => ({
        key,
        value,
        label: getTypeLabel(value)
    }));
}

/**
 * عنوان نوع الموافقة
 */
function getTypeLabel(type) {
    const labels = {
        [APPROVAL_TYPES.DELETION]: 'طلب حذف',
        [APPROVAL_TYPES.INVOICE_VOID]: 'إلغاء فاتورة',
        [APPROVAL_TYPES.QUANTITY_CORRECTION]: 'تعديل كمية',
        [APPROVAL_TYPES.PRICE_CHANGE]: 'تغيير سعر',
        [APPROVAL_TYPES.LARGE_DISCOUNT]: 'خصم كبير',
        [APPROVAL_TYPES.REFUND]: 'استرداد',
        [APPROVAL_TYPES.DATA_EXPORT]: 'تصدير بيانات',
        [APPROVAL_TYPES.BULK_OPERATION]: 'عملية مجمعة'
    };
    return labels[type] || type;
}

function getApprovalService(/* db - ignored, service uses config/database */) {
    return {
        getById,
        getPending,
        getAll,
        getByUser,
        requestDeletion,
        requestInvoiceVoid,
        requestQuantityCorrection,
        approve,
        reject,
        getPendingCount,
        getStats,
        getTypes
    };
}

module.exports = {
    createRequest,
    requestDeletion,
    requestInvoiceVoid,
    requestQuantityCorrection,
    approve,
    reject,
    executeApproval,
    getById,
    getPending,
    getAll,
    getByUser,
    expireOldRequests,
    getPendingCount,
    getStats,
    getTypes,
    getTypeLabel,
    getApprovalService,
    APPROVAL_TYPES,
    APPROVAL_STATUS
};
