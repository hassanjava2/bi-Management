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

// ============================================
// Vacations - الإجازات
// ============================================

/**
 * GET /api/attendance/vacations
 * قائمة الإجازات
 */
router.get('/vacations', async (req, res) => {
    try {
        const { user_id, status } = req.query;
        let query = `
            SELECT v.*, u.full_name as user_name
            FROM vacations v
            LEFT JOIN users u ON v.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        if (user_id) { query += ` AND v.user_id = ?`; params.push(user_id); }
        if (status) { query += ` AND v.status = ?`; params.push(status); }
        query += ` ORDER BY v.created_at DESC LIMIT 100`;
        const vacations = all(query, params);
        res.json({ success: true, data: vacations });
    } catch (error) {
        if (error.message?.includes('no such table')) return res.json({ success: true, data: [] });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/attendance/vacations
 * طلب إجازة
 */
router.post('/vacations', async (req, res) => {
    try {
        const { type, start_date, end_date, reason } = req.body;
        if (!start_date || !end_date) return res.status(400).json({ success: false, error: 'التواريخ مطلوبة' });
        const id = generateId();
        run(`INSERT INTO vacations (id, user_id, type, start_date, end_date, reason, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
            [id, req.user?.id, type || 'annual', start_date, end_date, reason || null]);
        res.status(201).json({ success: true, data: { id, status: 'pending' } });
    } catch (error) {
        if (error.message?.includes('no such table')) return res.status(501).json({ success: false, error: 'جدول الإجازات غير موجود' });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/attendance/vacations/:id
 * الموافقة/الرفض على إجازة
 */
router.put('/vacations/:id', async (req, res) => {
    try {
        const { status } = req.body; // approved, rejected
        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, error: 'الحالة غير صحيحة' });
        const existing = get(`SELECT id FROM vacations WHERE id = ?`, [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, error: 'الإجازة غير موجودة' });
        run(`UPDATE vacations SET status = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?`,
            [status, req.user?.id, req.params.id]);
        res.json({ success: true, data: get(`SELECT * FROM vacations WHERE id = ?`, [req.params.id]) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Salary Management - الرواتب
// ============================================

/**
 * GET /api/attendance/salaries
 * كشف رواتب الشهر
 */
router.get('/salaries', async (req, res) => {
    try {
        const month = req.query.month || new Date().toISOString().slice(0, 7);
        
        // جلب الموظفين مع بيانات الحضور
        const employees = all(`
            SELECT u.id, u.full_name, u.role, u.department_id, u.salary_encrypted,
                   (SELECT COUNT(*) FROM attendance a WHERE a.user_id = u.id AND strftime('%Y-%m', a.date) = ? AND a.status = 'present') as present_days,
                   (SELECT COUNT(*) FROM attendance a WHERE a.user_id = u.id AND strftime('%Y-%m', a.date) = ? AND a.status = 'late') as late_days,
                   (SELECT COUNT(*) FROM attendance a WHERE a.user_id = u.id AND strftime('%Y-%m', a.date) = ? AND a.status = 'absent') as absent_days,
                   (SELECT SUM(late_minutes) FROM attendance a WHERE a.user_id = u.id AND strftime('%Y-%m', a.date) = ?) as total_late_minutes,
                   (SELECT SUM(overtime_minutes) FROM attendance a WHERE a.user_id = u.id AND strftime('%Y-%m', a.date) = ?) as total_overtime_minutes
            FROM users u
            WHERE u.is_active = 1
            ORDER BY u.full_name
        `, [month, month, month, month, month]);

        // جلب المكافآت والغرامات
        let adjustments = [];
        try {
            adjustments = all(`
                SELECT ea.*, u.full_name as employee_name
                FROM employee_adjustments ea
                LEFT JOIN users u ON ea.employee_id = u.id
                WHERE strftime('%Y-%m', ea.created_at) = ?
                ORDER BY ea.created_at DESC
            `, [month]);
        } catch (_) {}

        res.json({
            success: true,
            data: {
                month,
                employees,
                adjustments,
                summary: {
                    total_employees: employees.length,
                    total_present: employees.reduce((s, e) => s + (e.present_days || 0), 0),
                    total_late: employees.reduce((s, e) => s + (e.late_days || 0), 0),
                    total_absent: employees.reduce((s, e) => s + (e.absent_days || 0), 0),
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/attendance/adjustments
 * إضافة مكافأة/غرامة
 */
router.post('/adjustments', async (req, res) => {
    try {
        const { employee_id, type, amount, reason, description } = req.body;
        if (!employee_id || !type || !amount) {
            return res.status(400).json({ success: false, error: 'الحقول المطلوبة: employee_id, type, amount' });
        }
        const id = generateId();
        run(`INSERT INTO employee_adjustments (id, employee_id, type, amount, reason, description, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [id, employee_id, type, parseFloat(amount), reason || null, description || null, req.user?.id]);
        res.status(201).json({ success: true, data: { id } });
    } catch (error) {
        if (error.message?.includes('no such table')) return res.status(501).json({ success: false, error: 'جدول المكافآت/الغرامات غير موجود' });
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
