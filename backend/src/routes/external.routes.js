/**
 * BI Management - External API Routes
 * للربط مع bi-comp ونظم خارجية
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { hasRole } = require('../middleware/rbac');
const { all, run, get } = require('../config/database');
const { generateId, now } = require('../utils/helpers');
const { logAudit } = require('../services/audit.service');

// API Key Authentication for external systems
function apiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    // Check if API key is valid (stored in settings)
    const validKey = get(`SELECT value FROM settings WHERE key = 'external_api_key'`);
    
    if (!apiKey || apiKey !== validKey?.value) {
        return res.status(401).json({
            success: false,
            error: 'INVALID_API_KEY',
            message: 'Invalid or missing API key'
        });
    }

    next();
}

/**
 * GET /api/external/attendance/sync
 * Get attendance data for sync with bi-comp
 */
router.get('/attendance/sync', apiKeyAuth, (req, res) => {
    const { date, from_date, to_date } = req.query;

    let query = `
        SELECT 
            a.id,
            a.user_id,
            u.employee_code,
            u.full_name,
            a.date,
            a.check_in,
            a.check_out,
            a.status,
            a.work_minutes,
            a.late_minutes,
            a.overtime_minutes
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (date) {
        query += ` AND a.date = ?`;
        params.push(date);
    } else if (from_date && to_date) {
        query += ` AND a.date BETWEEN ? AND ?`;
        params.push(from_date, to_date);
    } else {
        // Default: last 7 days
        query += ` AND a.date >= date('now', '-7 days')`;
    }

    query += ` ORDER BY a.date DESC, a.check_in ASC`;

    const records = all(query, params);

    res.json({
        success: true,
        data: records,
        count: records.length
    });
});

/**
 * POST /api/external/attendance/import
 * Import attendance data from bi-comp
 */
router.post('/attendance/import', apiKeyAuth, (req, res) => {
    const { records } = req.body;

    if (!Array.isArray(records)) {
        return res.status(400).json({
            success: false,
            error: 'INVALID_DATA',
            message: 'Records must be an array'
        });
    }

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (const record of records) {
        try {
            // Find user by employee_code
            const user = get(`SELECT id FROM users WHERE employee_code = ?`, [record.employee_code]);
            
            if (!user) {
                errors.push({ employee_code: record.employee_code, error: 'User not found' });
                skipped++;
                continue;
            }

            // Check if record already exists
            const existing = get(`
                SELECT id FROM attendance WHERE user_id = ? AND date = ?
            `, [user.id, record.date]);

            if (existing) {
                // Update existing record
                run(`
                    UPDATE attendance SET
                        check_in = COALESCE(?, check_in),
                        check_out = COALESCE(?, check_out),
                        status = COALESCE(?, status),
                        check_in_method = 'biometric',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [record.check_in, record.check_out, record.status, existing.id]);
            } else {
                // Insert new record
                run(`
                    INSERT INTO attendance (id, user_id, date, check_in, check_out, status, check_in_method)
                    VALUES (?, ?, ?, ?, ?, ?, 'biometric')
                `, [
                    generateId(),
                    user.id,
                    record.date,
                    record.check_in,
                    record.check_out,
                    record.status || 'present'
                ]);
            }

            imported++;
        } catch (e) {
            errors.push({ employee_code: record.employee_code, error: e.message });
            skipped++;
        }
    }

    // Log the import
    logAudit({
        action: 'EXTERNAL_IMPORT',
        table_name: 'attendance',
        new_values: { imported, skipped, total: records.length }
    });

    res.json({
        success: true,
        data: {
            total: records.length,
            imported,
            skipped,
            errors: errors.length > 0 ? errors : undefined
        }
    });
});

/**
 * GET /api/external/employees
 * Get employees for external systems
 */
router.get('/employees', apiKeyAuth, (req, res) => {
    const employees = all(`
        SELECT 
            id,
            employee_code,
            full_name,
            email,
            phone,
            department_id,
            position_id,
            role,
            hire_date,
            is_active
        FROM users
        WHERE is_active = 1
        ORDER BY full_name
    `);

    res.json({
        success: true,
        data: employees
    });
});

/**
 * POST /api/external/webhook
 * Receive webhook events from external systems
 */
router.post('/webhook', apiKeyAuth, (req, res) => {
    const { event, data } = req.body;

    console.log(`[External Webhook] Received: ${event}`, data);

    // Handle different event types
    switch (event) {
        case 'attendance.check_in':
        case 'attendance.check_out':
            // Process attendance event
            // ... implementation
            break;
        
        case 'employee.updated':
            // Process employee update
            // ... implementation
            break;

        default:
            console.log(`[External Webhook] Unknown event: ${event}`);
    }

    res.json({ success: true, received: event });
});

module.exports = router;
