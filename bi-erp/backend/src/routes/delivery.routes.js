/**
 * BI Management - Delivery Routes
 * مسارات التوصيل — thin controller
 */
const router = require('express').Router();
const { auth } = require('../middleware/auth');
const deliveryService = require('../services/delivery.service');

router.use(auth);

// ─── Stats ───
router.get('/stats', async (req, res) => {
    try {
        const data = await deliveryService.getStats();
        res.json({ success: true, data });
    } catch (error) {
        res.json({ success: true, data: { total: 0, pending: 0, preparing: 0, in_transit: 0, delivered: 0, failed: 0 } });
    }
});

// ─── Pending ───
router.get('/pending', async (req, res) => {
    try {
        const data = await deliveryService.getPending();
        res.json({ success: true, data });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

// ─── Drivers ───
router.get('/drivers', async (req, res) => {
    try {
        const data = await deliveryService.getDrivers();
        res.json({ success: true, data });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

// ─── Track ───
router.get('/track/:trackingNumber', async (req, res) => {
    try {
        const data = await deliveryService.trackByNumber(req.params.trackingNumber);
        if (!data) return res.status(404).json({ success: false, error: 'التوصيل غير موجود' });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── List ───
router.get('/', async (req, res) => {
    try {
        const data = await deliveryService.listDeliveries(req.query);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Create ───
router.post('/', async (req, res) => {
    try {
        const data = await deliveryService.create(req.body, req.user?.id);
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Get by ID ───
router.get('/:id', async (req, res) => {
    try {
        const data = await deliveryService.getById(req.params.id);
        if (!data) return res.status(404).json({ success: false, error: 'التوصيل غير موجود' });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Update ───
router.put('/:id', async (req, res) => {
    try {
        const data = await deliveryService.update(req.params.id, req.body);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Update Status (POST + PUT for frontend compat) ───
const updateStatus = async (req, res) => {
    try {
        await deliveryService.updateStatus(req.params.id, req.body.status, req.body.notes);
        res.json({ success: true, message: 'تم تحديث الحالة' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
router.post('/:id/status', updateStatus);
router.put('/:id/status', updateStatus);

module.exports = router;
