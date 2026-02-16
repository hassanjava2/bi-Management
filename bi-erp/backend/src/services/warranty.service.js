/**
 * BI Management - Warranty Service
 * خدمة تتبع الضمان - متوافق مع SQLite
 */

const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../config/database');
const logger = require('../utils/logger');

// حالات طلب الضمان
const WARRANTY_STATUS = {
    PENDING: 'pending',
    SENT_TO_SUPPLIER: 'sent_to_supplier',
    AT_SUPPLIER: 'at_supplier',
    RETURNED_APPROVED: 'returned_approved',
    RETURNED_REJECTED: 'returned_rejected',
    REPLACED: 'replaced',
    REFUNDED: 'refunded',
    CLOSED: 'closed'
};

// قرارات المورد
const SUPPLIER_DECISIONS = {
    APPROVED: 'approved',
    REJECTED: 'rejected',
    PARTIAL: 'partial',
    REPLACED: 'replaced',
    REFUNDED: 'refunded'
};

/**
 * إنشاء طلب ضمان جديد
 */
async function createClaim(data) {
    const {
        device,
        supplier,
        customer,
        issueDescription,
        issueCategory,
        issueImages = [],
        createdBy
    } = data;

    const claimNumber = generateClaimNumber();
    const warrantyValid = isWarrantyValid(device);
    const now = new Date().toISOString();
    const id = uuidv4();

    try {
        await run(`
            INSERT INTO warranty_claims
            (id, claim_number, device_id, device_serial, supplier_id, supplier_name,
             customer_id, customer_name, customer_phone, customer_address,
             issue_description, issue_category, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, claimNumber, device?.id, device?.serial_number,
            supplier?.id, supplier?.name,
            customer?.id || null, customer?.name || '', customer?.phone || '', customer?.address || '',
            issueDescription, issueCategory,
            WARRANTY_STATUS.PENDING, createdBy?.id, now
        ]);

        addTracking(id, 'claim_created', { warranty_valid: warrantyValid }, createdBy);

        return {
            id,
            claim_number: claimNumber,
            status: WARRANTY_STATUS.PENDING,
            warranty_valid: warrantyValid
        };
    } catch (error) {
        logger.error('Error creating warranty claim:', error);
        throw error;
    }
}

/**
 * إرسال للمورد
 */
async function sendToSupplier(claimId, sentBy, notes = '') {
    const claim = getById(claimId);
    if (!claim) throw new Error('طلب الضمان غير موجود');

    const now = new Date().toISOString();

    await run(`
        UPDATE warranty_claims 
        SET status = ?, sent_to_supplier_at = ?, updated_at = ?
        WHERE id = ?
    `, [WARRANTY_STATUS.SENT_TO_SUPPLIER, now, now, claimId]);

    addTracking(claimId, 'sent_to_supplier', {
        supplier: claim.supplier_name,
        notes
    }, sentBy);

    updateDeviceStatus(claim.device_id, 'in_warranty');

    return { ...claim, status: WARRANTY_STATUS.SENT_TO_SUPPLIER };
}

/**
 * تسجيل استلام المورد
 */
async function markReceivedBySupplier(claimId, receivedBy) {
    const claim = getById(claimId);
    if (!claim) throw new Error('طلب الضمان غير موجود');

    const now = new Date().toISOString();

    await run(`
        UPDATE warranty_claims 
        SET status = ?, supplier_received_at = ?, updated_at = ?
        WHERE id = ?
    `, [WARRANTY_STATUS.AT_SUPPLIER, now, now, claimId]);

    addTracking(claimId, 'received_by_supplier', {}, receivedBy);

    return { ...claim, status: WARRANTY_STATUS.AT_SUPPLIER };
}

/**
 * تسجيل رد المورد
 */
async function recordSupplierResponse(claimId, response, recordedBy) {
    const {
        decision,
        notes,
        repairCost = 0,
        partsCost = 0,
        replacementDeviceId = null,
        paidBy = 'supplier'
    } = response;

    const claim = getById(claimId);
    if (!claim) throw new Error('طلب الضمان غير موجود');

    let newStatus;
    switch (decision) {
        case SUPPLIER_DECISIONS.APPROVED:
            newStatus = WARRANTY_STATUS.RETURNED_APPROVED;
            break;
        case SUPPLIER_DECISIONS.REJECTED:
            newStatus = WARRANTY_STATUS.RETURNED_REJECTED;
            break;
        case SUPPLIER_DECISIONS.REPLACED:
            newStatus = WARRANTY_STATUS.REPLACED;
            break;
        case SUPPLIER_DECISIONS.REFUNDED:
            newStatus = WARRANTY_STATUS.REFUNDED;
            break;
        default:
            newStatus = WARRANTY_STATUS.RETURNED_APPROVED;
    }

    const now = new Date().toISOString();

    await run(`
        UPDATE warranty_claims 
        SET status = ?, supplier_response_at = ?, supplier_decision = ?,
            supplier_notes = ?, repair_cost = ?, parts_cost = ?,
            replacement_device_id = ?, paid_by = ?, returned_at = ?, updated_at = ?
        WHERE id = ?
    `, [
        newStatus, now, decision, notes, repairCost, partsCost,
        replacementDeviceId, paidBy, now, now, claimId
    ]);

    addTracking(claimId, 'supplier_response', {
        decision,
        notes,
        repair_cost: repairCost,
        parts_cost: partsCost,
        paid_by: paidBy
    }, recordedBy);

    return { ...claim, status: newStatus, supplier_decision: decision };
}

/**
 * إشعار الزبون
 */
async function notifyCustomer(claimId, method, message, notifiedBy) {
    const claim = getById(claimId);
    if (!claim) throw new Error('طلب الضمان غير موجود');

    const now = new Date().toISOString();

    await run(`
        UPDATE warranty_claims 
        SET customer_notified = 1, customer_notified_at = ?,
            customer_notification_method = ?, customer_notification_notes = ?,
            updated_at = ?
        WHERE id = ?
    `, [now, method, message, now, claimId]);

    addTracking(claimId, 'customer_notified', {
        method,
        message,
        customer_phone: claim.customer_phone
    }, notifiedBy);

    return { ...claim, customer_notified: true };
}

/**
 * إغلاق طلب الضمان
 */
async function closeClaim(claimId, closedBy, notes = '') {
    const claim = getById(claimId);
    if (!claim) throw new Error('طلب الضمان غير موجود');

    const now = new Date().toISOString();

    await run(`
        UPDATE warranty_claims 
        SET status = ?, closed_at = ?, updated_at = ?
        WHERE id = ?
    `, [WARRANTY_STATUS.CLOSED, now, now, claimId]);

    addTracking(claimId, 'claim_closed', { notes }, closedBy);

    if (claim.supplier_decision === SUPPLIER_DECISIONS.APPROVED) {
        updateDeviceStatus(claim.device_id, 'ready_to_sell');
    } else if (claim.supplier_decision === SUPPLIER_DECISIONS.REJECTED) {
        updateDeviceStatus(claim.device_id, 'in_repair');
    }

    return { ...claim, status: WARRANTY_STATUS.CLOSED };
}

/**
 * إضافة تتبع
 */
async function addTracking(claimId, action, details, performedBy) {
    try {
        await run(`
            INSERT INTO warranty_tracking
            (id, claim_id, action, action_details, performed_by, performed_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            uuidv4(),
            claimId,
            action,
            JSON.stringify(details),
            performedBy?.id || null,
            new Date().toISOString()
        ]);
    } catch (error) {
        logger.warn('Could not add warranty tracking:', error.message);
    }
}

/**
 * التحقق من صلاحية الضمان
 */
function isWarrantyValid(device) {
    if (!device?.supplier_warranty_end) return false;
    const warrantyEnd = new Date(device.supplier_warranty_end);
    return warrantyEnd > new Date();
}

/**
 * جلب طلب بالـ ID
 */
async function getById(id) {
    return await get('SELECT * FROM warranty_claims WHERE id = ?', [id]);
}

/**
 * جلب طلبات جهاز معين
 */
async function getByDevice(deviceId) {
    return await all(`
        SELECT * FROM warranty_claims 
        WHERE device_id = ?
        ORDER BY created_at DESC
    `, [deviceId]);
}

/**
 * جلب طلبات مورد معين
 */
async function getBySupplier(supplierId, status = null) {
    if (status) {
        return await all(`
            SELECT * FROM warranty_claims 
            WHERE supplier_id = ? AND status = ?
            ORDER BY created_at DESC
        `, [supplierId, status]);
    }
    return await all(`
        SELECT * FROM warranty_claims 
        WHERE supplier_id = ?
        ORDER BY created_at DESC
    `, [supplierId]);
}

/**
 * جلب الطلبات المعلقة
 */
async function getPending() {
    return await all(`
        SELECT wc.*, s.name as supplier_display_name
        FROM warranty_claims wc
        LEFT JOIN suppliers s ON wc.supplier_id = s.id
        WHERE wc.status IN (?, ?, ?)
        ORDER BY wc.created_at ASC
    `, [
        WARRANTY_STATUS.PENDING,
        WARRANTY_STATUS.SENT_TO_SUPPLIER,
        WARRANTY_STATUS.AT_SUPPLIER
    ]);
}

/**
 * جلب جميع الطلبات
 */
async function getAll(filters = {}) {
    let query = `
        SELECT wc.*, s.name as supplier_display_name
        FROM warranty_claims wc
        LEFT JOIN suppliers s ON wc.supplier_id = s.id
        WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
        query += ' AND wc.status = ?';
        params.push(filters.status);
    }

    if (filters.supplier_id) {
        query += ' AND wc.supplier_id = ?';
        params.push(filters.supplier_id);
    }

    query += ' ORDER BY wc.created_at DESC';

    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
    }

    return await all(query, params);
}

/**
 * جلب سجل التتبع
 */
async function getTracking(claimId) {
    return await all(`
        SELECT wt.*, u.full_name as performed_by_name
        FROM warranty_tracking wt
        LEFT JOIN users u ON wt.performed_by = u.id
        WHERE wt.claim_id = ?
        ORDER BY wt.performed_at ASC
    `, [claimId]);
}

/**
 * تحديث حالة الجهاز
 */
async function updateDeviceStatus(deviceId, status) {
    if (!deviceId) return;
    try {
        await run(`
            UPDATE serial_numbers SET status = ?, updated_at = ?
            WHERE id = ?
        `, [status, new Date().toISOString(), deviceId]);
    } catch (error) {
        logger.warn('Could not update device status:', error.message);
    }
}

/**
 * توليد رقم طلب الضمان
 */
function generateClaimNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `WC-${year}${month}-${random}`;
}

/**
 * نص الحالة بالعربي
 */
function getStatusText(status) {
    const statusTexts = {
        [WARRANTY_STATUS.PENDING]: 'بانتظار الإرسال',
        [WARRANTY_STATUS.SENT_TO_SUPPLIER]: 'تم الإرسال للمورد',
        [WARRANTY_STATUS.AT_SUPPLIER]: 'عند المورد',
        [WARRANTY_STATUS.RETURNED_APPROVED]: 'تم القبول - رجع من المورد',
        [WARRANTY_STATUS.RETURNED_REJECTED]: 'تم الرفض - لا يشمله الضمان',
        [WARRANTY_STATUS.REPLACED]: 'تم الاستبدال بجهاز جديد',
        [WARRANTY_STATUS.REFUNDED]: 'تم إرجاع المبلغ',
        [WARRANTY_STATUS.CLOSED]: 'مغلق'
    };
    return statusTexts[status] || status;
}

/**
 * إحصائيات الضمان
 */
async function getStats(supplierId = null, days = 30) {
    let query = `
        SELECT 
            supplier_name,
            status,
            supplier_decision,
            COUNT(*) as count,
            SUM(COALESCE(repair_cost, 0)) as total_repair_cost,
            SUM(COALESCE(parts_cost, 0)) as total_parts_cost
        FROM warranty_claims
        WHERE created_at >= CURRENT_TIMESTAMP - (? * INTERVAL '1 day')
    `;
    const params = [days];

    if (supplierId) {
        query += ' AND supplier_id = ?';
        params.push(supplierId);
    }

    query += ' GROUP BY supplier_name, status, supplier_decision';

    return await all(query, params);
}

module.exports = {
    createClaim,
    sendToSupplier,
    markReceivedBySupplier,
    recordSupplierResponse,
    notifyCustomer,
    closeClaim,
    addTracking,
    isWarrantyValid,
    getById,
    getByDevice,
    getBySupplier,
    getPending,
    getAll,
    getTracking,
    getStats,
    getStatusText,
    WARRANTY_STATUS,
    SUPPLIER_DECISIONS
};
