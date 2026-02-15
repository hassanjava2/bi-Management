/**
 * BI Management - Device Routes
 * مسارات الأجهزة مع الحماية الكاملة
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getAuditService, EVENT_CATEGORIES } = require('../services/audit.service');
const { getApprovalService } = require('../services/approval.service');
const { 
    preventDelete, 
    protectQuantityChange, 
    requirePermission,
    logSensitiveAccess 
} = require('../middleware/protection');
const { auth } = require('../middleware/auth');

router.use(auth);

/**
 * GET /api/devices
 * جلب الأجهزة
 */
router.get('/', requirePermission('devices.read'), logSensitiveAccess('device'), async (req, res) => {
    try {
        const { 
            status, 
            warehouse_id, 
            supplier_id,
            customer_id,
            search,
            page = 1,
            limit = 50
        } = req.query;

        let query = `
            SELECT d.*, 
                   w.name as warehouse_name,
                   p.name as product_name,
                   s.name as supplier_name
            FROM devices d
            LEFT JOIN warehouses w ON d.warehouse_id = w.id
            LEFT JOIN products p ON d.product_id = p.id
            LEFT JOIN suppliers s ON d.supplier_id = s.id
            WHERE d.is_deleted = 0
        `;
        const params = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND d.status = $${paramIndex++}`;
            params.push(status);
        }

        if (warehouse_id) {
            query += ` AND d.warehouse_id = $${paramIndex++}`;
            params.push(warehouse_id);
        }

        if (supplier_id) {
            query += ` AND d.supplier_id = $${paramIndex++}`;
            params.push(supplier_id);
        }

        if (customer_id) {
            query += ` AND d.customer_id = $${paramIndex++}`;
            params.push(customer_id);
        }

        if (search) {
            query += ` AND (d.serial_number ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ' ORDER BY d.created_at DESC';
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const result = await req.db.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: result.rows.length === parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/devices/:id
 * جلب جهاز محدد
 */
router.get('/:id', requirePermission('devices.read'), logSensitiveAccess('device'), async (req, res) => {
    try {
        const result = await req.db.query(`
            SELECT d.*, 
                   w.name as warehouse_name,
                   p.name as product_name,
                   s.name as supplier_name,
                   c.name as customer_name
            FROM devices d
            LEFT JOIN warehouses w ON d.warehouse_id = w.id
            LEFT JOIN products p ON d.product_id = p.id
            LEFT JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN customers c ON d.customer_id = c.id
            WHERE (d.id = $1 OR d.serial_number = $1) AND d.is_deleted = 0
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'الجهاز غير موجود'
            });
        }

        // جلب السجل
        const historyResult = await req.db.query(`
            SELECT * FROM device_history
            WHERE device_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [result.rows[0].id]);

        res.json({
            success: true,
            data: {
                device: result.rows[0],
                history: historyResult.rows
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/devices
 * إنشاء جهاز جديد
 */
router.post('/', requirePermission('devices.create'), async (req, res) => {
    try {
        const auditService = getAuditService(req.db);
        
        const {
            product_id,
            product_name,
            actual_specs,
            purchase_cost,
            selling_price,
            warehouse_id,
            location_area,
            location_shelf,
            location_row,
            supplier_id,
            notes,
            has_problem
        } = req.body;

        // توليد السيريال
        const year = new Date().getFullYear();
        const countResult = await req.db.query(
            "SELECT COUNT(*) FROM devices WHERE serial_number LIKE $1",
            [`BI-${year}-%`]
        );
        const count = parseInt(countResult.rows[0].count) + 1;
        const serial_number = `BI-${year}-${String(count).padStart(6, '0')}`;

        const device = {
            id: uuidv4(),
            serial_number,
            product_id,
            actual_specs: actual_specs || {},
            selling_price,
            status: has_problem ? 'inspection_failed' : 'new',
            warehouse_id: warehouse_id || (has_problem ? await getInspectionWarehouse(req.db) : await getMainWarehouse(req.db)),
            location_area,
            location_shelf,
            location_row,
            supplier_id,
            notes,
            created_by: req.user.id,
            created_at: new Date()
        };

        // حفظ الجهاز
        await req.db.query(`
            INSERT INTO devices 
            (id, serial_number, product_id, actual_specs, selling_price, status,
             warehouse_id, location_area, location_shelf, location_row,
             supplier_id, notes, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
            device.id, device.serial_number, device.product_id, 
            JSON.stringify(device.actual_specs), device.selling_price, device.status,
            device.warehouse_id, device.location_area, device.location_shelf, device.location_row,
            device.supplier_id, device.notes, device.created_by, device.created_at
        ]);

        // إضافة للسجل
        await req.db.query(`
            INSERT INTO device_history (id, device_id, event_type, event_details, performed_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [uuidv4(), device.id, 'created', JSON.stringify({ product_name, has_problem }), req.user.id, new Date()]);

        // تسجيل في سجل التدقيق
        await auditService.logDeviceCreated(device, req.user);

        res.status(201).json({
            success: true,
            data: device,
            message: `تم إنشاء الجهاز ${serial_number}`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /api/devices/:id
 * تحديث جهاز (محمي)
 */
router.patch('/:id', requirePermission('devices.update'), protectQuantityChange('device'), async (req, res) => {
    try {
        const auditService = getAuditService(req.db);
        
        // جلب الجهاز الحالي
        const currentResult = await req.db.query(
            'SELECT * FROM devices WHERE id = $1 AND is_deleted = 0',
            [req.params.id]
        );

        if (currentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'الجهاز غير موجود'
            });
        }

        const currentDevice = currentResult.rows[0];
        const updates = req.body;
        const allowedFields = [
            'actual_specs', 'selling_price', 'status', 
            'warehouse_id', 'location_area', 'location_shelf', 'location_row',
            'notes', 'inspection_notes', 'preparation_notes'
        ];

        // فلترة الحقول المسموحة
        const filteredUpdates = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'NO_VALID_UPDATES',
                message: 'لا توجد تحديثات صالحة'
            });
        }

        // بناء الاستعلام
        const setClauses = [];
        const params = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(filteredUpdates)) {
            setClauses.push(`${key} = $${paramIndex++}`);
            params.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }

        setClauses.push(`updated_at = $${paramIndex++}`);
        params.push(new Date());

        params.push(req.params.id);

        await req.db.query(
            `UPDATE devices SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
            params
        );

        // إضافة للسجل
        await req.db.query(`
            INSERT INTO device_history (id, device_id, event_type, event_details, old_values, new_values, performed_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            uuidv4(), 
            req.params.id, 
            'updated', 
            JSON.stringify({ fields: Object.keys(filteredUpdates) }),
            JSON.stringify(currentDevice),
            JSON.stringify(filteredUpdates),
            req.user.id, 
            new Date()
        ]);

        // تسجيل في سجل التدقيق
        await auditService.log({
            eventType: 'device_updated',
            eventCategory: EVENT_CATEGORIES.INVENTORY,
            userId: req.user.id,
            userName: req.user.name,
            entityType: 'device',
            entityId: req.params.id,
            entityName: currentDevice.serial_number,
            oldValue: currentDevice,
            newValue: filteredUpdates,
            action: `تحديث جهاز: ${currentDevice.serial_number}`
        });

        res.json({
            success: true,
            data: { ...currentDevice, ...filteredUpdates },
            message: 'تم تحديث الجهاز'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/devices/:id/transfer
 * نقل جهاز بين المخازن
 */
router.post('/:id/transfer', requirePermission('devices.transfer'), async (req, res) => {
    try {
        const auditService = getAuditService(req.db);
        const { to_warehouse_id, reason } = req.body;

        if (!to_warehouse_id) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_WAREHOUSE',
                message: 'يجب تحديد المخزن الهدف'
            });
        }

        // جلب الجهاز
        const deviceResult = await req.db.query(
            'SELECT * FROM devices WHERE id = $1 AND is_deleted = 0',
            [req.params.id]
        );

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND'
            });
        }

        const device = deviceResult.rows[0];
        const fromWarehouse = device.warehouse_id;

        // تحديث الجهاز
        await req.db.query(`
            UPDATE devices 
            SET warehouse_id = $1, updated_at = $2
            WHERE id = $3
        `, [to_warehouse_id, new Date(), req.params.id]);

        // إضافة للسجل
        await req.db.query(`
            INSERT INTO device_history (id, device_id, event_type, event_details, performed_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            uuidv4(), 
            req.params.id, 
            'transferred',
            JSON.stringify({ from: fromWarehouse, to: to_warehouse_id, reason }),
            req.user.id, 
            new Date()
        ]);

        // تسجيل
        await auditService.logDeviceTransfer(device, fromWarehouse, to_warehouse_id, reason, req.user);

        res.json({
            success: true,
            message: 'تم نقل الجهاز'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/devices/:id/custody
 * تسجيل الذمة
 */
router.post('/:id/custody', requirePermission('devices.custody'), async (req, res) => {
    try {
        const { action, reason } = req.body;

        const deviceResult = await req.db.query(
            'SELECT * FROM devices WHERE id = $1',
            [req.params.id]
        );

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        }

        const device = deviceResult.rows[0];

        if (action === 'take') {
            // تسجيل بالذمة
            await req.db.query(`
                UPDATE devices 
                SET custody_user_id = $1, custody_since = $2, custody_reason = $3
                WHERE id = $4
            `, [req.user.id, new Date(), reason, req.params.id]);
        } else if (action === 'return') {
            // إرجاع من الذمة
            await req.db.query(`
                UPDATE devices 
                SET custody_user_id = NULL, custody_since = NULL, custody_reason = NULL
                WHERE id = $1
            `, [req.params.id]);
        }

        // إضافة للسجل
        await req.db.query(`
            INSERT INTO device_history (id, device_id, event_type, event_details, performed_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            uuidv4(), 
            req.params.id, 
            action === 'take' ? 'custody_taken' : 'custody_returned',
            JSON.stringify({ reason }),
            req.user.id, 
            new Date()
        ]);

        res.json({
            success: true,
            message: action === 'take' ? 'تم تسجيل الجهاز بذمتك' : 'تم إرجاع الجهاز'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/devices/:id
 * حذف جهاز - ممنوع! يحتاج موافقة
 */
router.delete('/:id', preventDelete('device'));

/**
 * POST /api/devices/:id/request-deletion
 * طلب حذف جهاز
 */
router.post('/:id/request-deletion', requirePermission('devices.delete_request'), async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_REASON',
                message: 'يجب تحديد سبب الحذف'
            });
        }

        const deviceResult = await req.db.query(
            'SELECT * FROM devices WHERE id = $1',
            [req.params.id]
        );

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        }

        const device = deviceResult.rows[0];
        const approvalService = getApprovalService(req.db);

        const approval = await approvalService.requestDeletion(
            'device',
            device.id,
            device.serial_number,
            reason,
            req.user
        );

        res.json({
            success: true,
            data: approval,
            message: 'تم إرسال طلب الحذف للموافقة'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/devices/:id/history
 * سجل الجهاز
 */
router.get('/:id/history', requirePermission('devices.read'), async (req, res) => {
    try {
        const result = await req.db.query(`
            SELECT dh.*, u.full_name as performed_by_name
            FROM device_history dh
            LEFT JOIN users u ON dh.performed_by = u.id
            WHERE dh.device_id = $1
            ORDER BY dh.created_at DESC
        `, [req.params.id]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper functions
async function getMainWarehouse(db) {
    const result = await db.query("SELECT id FROM warehouses WHERE code = 'MAIN'");
    return result.rows[0]?.id;
}

async function getInspectionWarehouse(db) {
    const result = await db.query("SELECT id FROM warehouses WHERE code = 'INSP'");
    return result.rows[0]?.id;
}

module.exports = router;
