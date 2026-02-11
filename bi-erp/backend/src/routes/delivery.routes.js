/**
 * BI Management - Delivery Routes
 * مسارات التوصيل
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
                SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END)::int as in_transit,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)::int as delivered,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int as failed
            FROM deliveries
        `);
        res.json({ success: true, data: stats || { total: 0, pending: 0, in_transit: 0, delivered: 0, failed: 0 } });
    } catch (error) {
        res.json({ success: true, data: { total: 0, pending: 0, in_transit: 0, delivered: 0, failed: 0 } });
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
        const rows = await all("SELECT id, full_name as name, phone FROM users WHERE role = 'driver' AND is_active = true");
        res.json({ success: true, data: rows });
    } catch (error) {
        res.json({ success: true, data: [] });
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
            query += ` AND d.status = ?`;
            params.push(status);
        }
        
        if (driver_id) {
            query += ` AND d.driver_id = ?`;
            params.push(driver_id);
        }
        
        query += ` ORDER BY d.created_at DESC LIMIT 50`;
        
        const deliveries = await all(query, params);
        
        res.json({
            success: true,
            data: deliveries
        });
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
        const { invoice_id, customer_id, address, notes, scheduled_date } = req.body;
        const id = generateId();
        const trackingNumber = `DEL-${Date.now().toString().slice(-8)}`;
        
        await run(`
            INSERT INTO deliveries (id, tracking_number, invoice_id, customer_id, address, notes, scheduled_date, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
        `, [id, trackingNumber, invoice_id, customer_id, address, notes, scheduled_date, req.user?.id]);
        
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
            WHERE d.id = ? OR d.tracking_number = ?
        `, [req.params.id, req.params.id]);
        
        if (!delivery) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            data: delivery
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/delivery/:id/status
 * تحديث حالة التوصيل
 */
router.put('/:id/status', async (req, res) => {
    try {
        const { status, notes } = req.body;
        
        await run(`
            UPDATE deliveries 
            SET status = ?, status_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, notes, req.params.id]);
        
        res.json({
            success: true,
            message: 'تم تحديث الحالة'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
