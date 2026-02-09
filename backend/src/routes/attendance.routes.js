/**
 * BI Management - Attendance Routes
 * مسارات الحضور والانصراف
 */

const router = require('express').Router();
const { run, get, all } = require('../config/database');
const { auth } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

router.use(auth);

/**
 * GET /api/attendance
 * سجل الحضور
 */
router.get('/', async (req, res) => {
    try {
        const { user_id, start_date, end_date } = req.query;
        
        let query = `
            SELECT ar.*, u.full_name as user_name
            FROM attendance ar
            LEFT JOIN users u ON ar.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        
        if (user_id) {
            query += ` AND ar.user_id = ?`;
            params.push(user_id);
        }
        
        if (start_date) {
            query += ` AND ar.date >= ?`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND ar.date <= ?`;
            params.push(end_date);
        }
        
        query += ` ORDER BY ar.date DESC, ar.check_in DESC LIMIT 100`;
        
        const records = all(query, params);
        
        res.json({
            success: true,
            data: records
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/attendance/today
 * حضور اليوم
 */
router.get('/today', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const myRecord = get(`
            SELECT * FROM attendance 
            WHERE user_id = ? AND date = ?
        `, [req.user.id, today]);
        
        const summary = get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN check_in IS NOT NULL THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
            FROM attendance
            WHERE date = ?
        `, [today]);
        
        res.json({
            success: true,
            data: {
                myRecord,
                summary
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/attendance/check-in
 * تسجيل الحضور
 */
router.post('/check-in', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();
        const id = generateId();
        
        // Check if already checked in
        const existing = get(`
            SELECT * FROM attendance 
            WHERE user_id = ? AND date = ?
        `, [req.user.id, today]);
        
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'ALREADY_CHECKED_IN',
                message: 'تم تسجيل الحضور مسبقاً'
            });
        }
        
        run(`
            INSERT INTO attendance (id, user_id, date, check_in, status, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `, [id, req.user.id, today, now, 'present']);
        
        res.status(201).json({
            success: true,
            message: 'تم تسجيل الحضور'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/attendance/check-out
 * تسجيل الانصراف
 */
router.post('/check-out', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();
        
        const result = run(`
            UPDATE attendance 
            SET check_out = ?, updated_at = datetime('now')
            WHERE user_id = ? AND date = ? AND check_out IS NULL
        `, [now, req.user.id, today]);
        
        if (result.changes === 0) {
            return res.status(400).json({
                success: false,
                error: 'NOT_CHECKED_IN',
                message: 'لم يتم تسجيل الحضور أولاً'
            });
        }
        
        res.json({
            success: true,
            message: 'تم تسجيل الانصراف'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/attendance/stats
 * إحصائيات الحضور
 */
router.get('/stats', async (req, res) => {
    try {
        const thisMonth = new Date().toISOString().slice(0, 7);
        
        const stats = get(`
            SELECT 
                COUNT(DISTINCT date) as work_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days
            FROM attendance
            WHERE user_id = ? AND strftime('%Y-%m', date) = ?
        `, [req.user.id, thisMonth]);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
