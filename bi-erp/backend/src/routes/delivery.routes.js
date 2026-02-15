/**
 * BI Management - Delivery Routes (Complete)
 * مسارات التوصيل — مع تتبع + تعديل + method مطابق للفرونت
 */
const router = require('express').Router();
const { run, get, all } = require('../config/database');
const { auth } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

router.use(auth);

// Stats MUST be before /:id to avoid conflict
router.get('/stats', async (req, res) => {
    try {
        const stats = await get(`
            SELECT 
                COUNT(*)::int as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int as pending,
                SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END)::int as preparing,
                SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END)::int as in_transit,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)::int as delivered,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int as failed
            FROM deliveries
        `);
        res.json({ success: true, data: stats || { total: 0, pending: 0, preparing: 0, in_transit: 0, delivered: 0, failed: 0 } });
    } catch (error) {
        res.json({ success: true, data: { total: 0, pending: 0, preparing: 0, in_transit: 0, delivered: 0, failed: 0 } });
    }
});

router.get('/pending', async (req, res) => {
    try {
        const rows = await all("SELECT * FROM deliveries WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50");
        res.json({ success: true, data: rows });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

router.get('/drivers', async (req, res) => {
    try {
        const rows = await all("SELECT id, full_name as name, phone FROM users WHERE role = 'driver' AND is_active = 1");
        res.json({ success: true, data: rows });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

// Track by tracking number
router.get('/track/:trackingNumber', async (req, res) => {
    try {
        const delivery = await get(`
            SELECT d.*, 
                   i.invoice_number, i.total as invoice_total,
                   c.name as customer_name, c.phone as customer_phone
            FROM deliveries d
            LEFT JOIN invoices i ON d.invoice_id = i.id
            LEFT JOIN customers c ON d.customer_id = c.id
            WHERE d.tracking_number = $1
        `, [req.params.trackingNumber]);

        if (!delivery) {
            return res.status(404).json({ success: false, error: 'التوصيل غير موجود' });
        }

        res.json({ success: true, data: delivery });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/delivery
 * قائمة التوصيلات
 */
router.get('/', async (req, res) => {
    try {
        const { status, driver_id } = req.query;

        let query = `
            SELECT d.*, 
                   i.invoice_number,
                   c.name as customer_name, c.phone as customer_phone
            FROM deliveries d
            LEFT JOIN invoices i ON d.invoice_id = i.id
            LEFT JOIN customers c ON d.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND d.status = $${params.length + 1}`;
            params.push(status);
        }

        if (driver_id) {
            query += ` AND d.driver_id = $${params.length + 1}`;
            params.push(driver_id);
        }

        query += ` ORDER BY d.created_at DESC LIMIT 50`;

        const deliveries = await all(query, params);

        res.json({ success: true, data: deliveries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/delivery
 * إنشاء توصيل جديد
 */
router.post('/', async (req, res) => {
    try {
        const { invoice_id, customer_id, address, notes, scheduled_date, delivery_method, driver_id } = req.body;
        const id = generateId();
        const trackingNumber = `DEL-${Date.now().toString().slice(-8)}`;

        await run(`
            INSERT INTO deliveries (id, tracking_number, invoice_id, customer_id, address, notes, scheduled_date, delivery_method, driver_id, status, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, CURRENT_TIMESTAMP)
        `, [id, trackingNumber, invoice_id, customer_id, address, notes, scheduled_date, delivery_method || null, driver_id || null, req.user?.id]);

        res.status(201).json({
            success: true,
            data: { id, trackingNumber }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/delivery/:id
 * تفاصيل توصيل
 */
router.get('/:id', async (req, res) => {
    try {
        const delivery = await get(`
            SELECT d.*, 
                   i.invoice_number, i.total as invoice_total,
                   c.name as customer_name, c.phone as customer_phone
            FROM deliveries d
            LEFT JOIN invoices i ON d.invoice_id = i.id
            LEFT JOIN customers c ON d.customer_id = c.id
            WHERE d.id = $1 OR d.tracking_number = $1
        `, [req.params.id]);

        if (!delivery) {
            return res.status(404).json({ success: false, error: 'التوصيل غير موجود' });
        }

        res.json({ success: true, data: delivery });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/delivery/:id
 * تعديل التوصيل
 */
router.put('/:id', async (req, res) => {
    try {
        const { address, notes, scheduled_date, delivery_method, driver_id } = req.body;

        await run(`
            UPDATE deliveries 
            SET address = COALESCE($1, address),
                notes = COALESCE($2, notes),
                scheduled_date = COALESCE($3, scheduled_date),
                delivery_method = COALESCE($4, delivery_method),
                driver_id = COALESCE($5, driver_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
        `, [address, notes, scheduled_date, delivery_method, driver_id, req.params.id]);

        const delivery = await get('SELECT * FROM deliveries WHERE id = $1', [req.params.id]);
        res.json({ success: true, data: delivery });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/delivery/:id/status  (frontend sends POST)
 * PUT /api/delivery/:id/status   (also support PUT)
 * تحديث حالة التوصيل
 */
const updateDeliveryStatus = async (req, res) => {
    try {
        const { status, notes } = req.body;

        await run(`
            UPDATE deliveries 
            SET status = $1, 
                status_notes = $2, 
                delivered_at = CASE WHEN $1 = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `, [status, notes, req.params.id]);

        res.json({ success: true, message: 'تم تحديث الحالة' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Support both POST and PUT for status updates (frontend uses POST)
router.post('/:id/status', updateDeliveryStatus);
router.put('/:id/status', updateDeliveryStatus);

module.exports = router;
