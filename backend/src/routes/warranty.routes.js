/**
 * BI Management - Warranty Routes
 * مسارات الضمان
 */

const express = require('express');
const router = express.Router();
const { getWarrantyService, WARRANTY_STATUS, SUPPLIER_DECISIONS } = require('../services/warranty.service');
const { requirePermission } = require('../middleware/protection');
const { auth } = require('../middleware/auth');

router.use(auth);

/**
 * GET /api/warranty
 * جلب طلبات الضمان
 */
router.get('/', requirePermission('warranty.read'), async (req, res) => {
    try {
        const warrantyService = getWarrantyService(req.db);
        
        const { status, supplier_id, device_id } = req.query;
        let claims;

        if (device_id) {
            claims = await warrantyService.getByDevice(device_id);
        } else if (supplier_id) {
            claims = await warrantyService.getBySupplier(supplier_id, status);
        } else if (status === 'pending') {
            claims = await warrantyService.getPending();
        } else {
            // جلب الكل
            const result = await req.db.query(`
                SELECT wc.*, s.name as supplier_display_name, d.serial_number as device_display_serial
                FROM warranty_claims wc
                LEFT JOIN suppliers s ON wc.supplier_id = s.id
                LEFT JOIN devices d ON wc.device_id = d.id
                ORDER BY wc.created_at DESC
                LIMIT 100
            `);
            claims = result.rows;
        }

        res.json({
            success: true,
            data: claims,
            count: claims.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/warranty/:id
 * جلب طلب ضمان محدد مع التتبع
 */
router.get('/:id', requirePermission('warranty.read'), async (req, res) => {
    try {
        const warrantyService = getWarrantyService(req.db);
        
        const claim = await warrantyService.getById(req.params.id);
        if (!claim) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'طلب الضمان غير موجود'
            });
        }

        const tracking = await warrantyService.getTracking(req.params.id);

        res.json({
            success: true,
            data: {
                claim,
                tracking
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/warranty
 * إنشاء طلب ضمان جديد
 */
router.post('/', requirePermission('warranty.create'), async (req, res) => {
    try {
        const warrantyService = getWarrantyService(req.db);
        
        const {
            device_id,
            device_serial,
            supplier_id,
            supplier_name,
            customer_id,
            customer_name,
            customer_phone,
            customer_address,
            issue_description,
            issue_category,
            issue_images
        } = req.body;

        if (!device_id || !supplier_id || !issue_description) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'الحقول المطلوبة: device_id, supplier_id, issue_description'
            });
        }

        // جلب بيانات الجهاز والمورد إذا لم تُقدم
        let device = { id: device_id, serial_number: device_serial };
        let supplier = { id: supplier_id, name: supplier_name };
        let customer = customer_id ? {
            id: customer_id,
            name: customer_name,
            phone: customer_phone,
            address: customer_address
        } : null;

        if (!device_serial || !supplier_name) {
            // جلب من قاعدة البيانات
            if (!device_serial) {
                const deviceResult = await req.db.query('SELECT * FROM devices WHERE id = $1', [device_id]);
                if (deviceResult.rows[0]) {
                    device = deviceResult.rows[0];
                }
            }
            if (!supplier_name) {
                const supplierResult = await req.db.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
                if (supplierResult.rows[0]) {
                    supplier = supplierResult.rows[0];
                }
            }
        }

        const claim = await warrantyService.createClaim({
            device,
            supplier,
            customer,
            issueDescription: issue_description,
            issueCategory: issue_category,
            issueImages: issue_images || [],
            createdBy: req.user
        });

        res.status(201).json({
            success: true,
            data: claim,
            message: 'تم إنشاء طلب الضمان بنجاح'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/warranty/:id/send
 * إرسال للمورد
 */
router.post('/:id/send', requirePermission('warranty.manage'), async (req, res) => {
    try {
        const warrantyService = getWarrantyService(req.db);
        const { notes } = req.body;

        const claim = await warrantyService.sendToSupplier(
            req.params.id,
            req.user,
            notes
        );

        res.json({
            success: true,
            data: claim,
            message: 'تم إرسال الجهاز للمورد'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/warranty/:id/receive
 * تسجيل استلام المورد
 */
router.post('/:id/receive', requirePermission('warranty.manage'), async (req, res) => {
    try {
        const warrantyService = getWarrantyService(req.db);

        const claim = await warrantyService.markReceivedBySupplier(
            req.params.id,
            req.user
        );

        res.json({
            success: true,
            data: claim,
            message: 'تم تسجيل استلام المورد'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/warranty/:id/response
 * تسجيل رد المورد
 */
router.post('/:id/response', requirePermission('warranty.manage'), async (req, res) => {
    try {
        const warrantyService = getWarrantyService(req.db);
        
        const {
            decision,
            notes,
            repair_cost,
            parts_cost,
            replacement_device_id,
            paid_by
        } = req.body;

        if (!decision) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_DECISION',
                message: 'يجب تحديد قرار المورد'
            });
        }

        const claim = await warrantyService.recordSupplierResponse(
            req.params.id,
            {
                decision,
                notes,
                repairCost: repair_cost || 0,
                partsCost: parts_cost || 0,
                replacementDeviceId: replacement_device_id,
                paidBy: paid_by || 'supplier'
            },
            req.user
        );

        res.json({
            success: true,
            data: claim,
            message: 'تم تسجيل رد المورد'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/warranty/:id/notify-customer
 * إشعار الزبون
 */
router.post('/:id/notify-customer', requirePermission('warranty.manage'), async (req, res) => {
    try {
        const warrantyService = getWarrantyService(req.db);
        const { method, message } = req.body;

        if (!method || !message) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'الحقول المطلوبة: method, message'
            });
        }

        const claim = await warrantyService.notifyCustomer(
            req.params.id,
            method,
            message,
            req.user
        );

        res.json({
            success: true,
            data: claim,
            message: 'تم إشعار الزبون'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/warranty/:id/close
 * إغلاق طلب الضمان
 */
router.post('/:id/close', requirePermission('warranty.manage'), async (req, res) => {
    try {
        const warrantyService = getWarrantyService(req.db);
        const { notes } = req.body;

        const claim = await warrantyService.closeClaim(
            req.params.id,
            req.user,
            notes
        );

        res.json({
            success: true,
            data: claim,
            message: 'تم إغلاق طلب الضمان'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/warranty/:id/tracking
 * سجل التتبع
 */
router.get('/:id/tracking', requirePermission('warranty.read'), async (req, res) => {
    try {
        const warrantyService = getWarrantyService(req.db);
        const tracking = await warrantyService.getTracking(req.params.id);

        res.json({
            success: true,
            data: tracking
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/warranty/stats
 * إحصائيات الضمان
 */
router.get('/meta/stats', requirePermission('warranty.read'), async (req, res) => {
    try {
        const warrantyService = getWarrantyService(req.db);
        const { supplier_id, days } = req.query;

        const stats = await warrantyService.getStats(
            supplier_id,
            parseInt(days) || 30
        );

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/warranty/meta/options
 * الخيارات المتاحة
 */
router.get('/meta/options', (req, res) => {
    res.json({
        success: true,
        data: {
            statuses: WARRANTY_STATUS,
            decisions: SUPPLIER_DECISIONS,
            notification_methods: ['phone', 'whatsapp', 'sms', 'email']
        }
    });
});

module.exports = router;
