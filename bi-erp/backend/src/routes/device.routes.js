/**
 * BI Management - Device Routes
 * مسارات الأجهزة — thin controller
 */
const express = require('express');
const router = express.Router();
const { getAuditService, EVENT_CATEGORIES } = require('../services/audit.service');
const deviceService = require('../services/device.service');
const {
    preventDelete,
    protectQuantityChange,
    requirePermission,
    logSensitiveAccess
} = require('../middleware/protection');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(auth);

// ─── List Devices ───
router.get('/', requirePermission('devices.read'), logSensitiveAccess('device'), async (req, res) => {
    try {
        const { rows, pagination } = await deviceService.listDevices(req.db, req.query);
        res.json({ success: true, data: rows, pagination });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Scan by Barcode / Serial ───
router.get('/scan/:code', auth, async (req, res) => {
    try {
        const result = await deviceService.scanDevice(req.db, req.params.code);
        if (!result) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'لم يتم العثور على منتج بهذا الكود' });
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Get Single Device ───
router.get('/:id', requirePermission('devices.read'), logSensitiveAccess('device'), async (req, res) => {
    try {
        const data = await deviceService.getById(req.db, req.params.id);
        if (!data) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'الجهاز غير موجود' });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Create Device ───
router.post('/', requirePermission('devices.create'), async (req, res) => {
    try {
        const device = await deviceService.createDevice(req.db, req.body, req.user);
        const auditService = getAuditService(req.db);
        await auditService.logDeviceCreated(device, req.user);
        res.status(201).json({ success: true, data: device, message: `تم إنشاء الجهاز ${device.serial_number}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Update Device ───
router.patch('/:id', requirePermission('devices.update'), protectQuantityChange('device'), async (req, res) => {
    try {
        const result = await deviceService.updateDevice(req.db, req.params.id, req.body, req.user);
        if (!result) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'الجهاز غير موجود' });

        const auditService = getAuditService(req.db);
        await auditService.log({
            eventType: 'device_updated',
            eventCategory: EVENT_CATEGORIES.INVENTORY,
            userId: req.user.id,
            userName: req.user.name,
            entityType: 'device',
            entityId: req.params.id,
            entityName: result.currentDevice.serial_number,
            oldValue: result.currentDevice,
            newValue: result.filteredUpdates,
            action: `تحديث جهاز: ${result.currentDevice.serial_number}`
        });

        res.json({ success: true, data: { ...result.currentDevice, ...result.filteredUpdates }, message: 'تم تحديث الجهاز' });
    } catch (error) {
        const code = error.statusCode || 500;
        res.status(code).json({ success: false, error: error.code || error.message, message: error.message });
    }
});

// ─── Transfer Device ───
router.post('/:id/transfer', requirePermission('devices.transfer'), async (req, res) => {
    try {
        const { to_warehouse_id, reason } = req.body;
        if (!to_warehouse_id) return res.status(400).json({ success: false, error: 'MISSING_WAREHOUSE', message: 'يجب تحديد المخزن الهدف' });

        const result = await deviceService.transferDevice(req.db, req.params.id, to_warehouse_id, reason, req.user);
        if (!result) return res.status(404).json({ success: false, error: 'NOT_FOUND' });

        const auditService = getAuditService(req.db);
        await auditService.logDeviceTransfer(result.device, result.fromWarehouse, to_warehouse_id, reason, req.user);

        res.json({ success: true, message: 'تم نقل الجهاز' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Custody ───
router.post('/:id/custody', requirePermission('devices.custody'), async (req, res) => {
    try {
        const message = await deviceService.updateCustody(req.db, req.params.id, req.body.action, req.body.reason, req.user);
        if (!message) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Delete (blocked — needs approval) ───
router.delete('/:id', preventDelete('device'));

// ─── Request Deletion ───
router.post('/:id/request-deletion', requirePermission('devices.delete_request'), async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ success: false, error: 'MISSING_REASON', message: 'يجب تحديد سبب الحذف' });

        const approval = await deviceService.requestDeletion(req.db, req.params.id, reason, req.user);
        if (!approval) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        res.json({ success: true, data: approval, message: 'تم إرسال طلب الحذف للموافقة' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Device History ───
router.get('/:id/history', requirePermission('devices.read'), async (req, res) => {
    try {
        const data = await deviceService.getHistory(req.db, req.params.id);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
