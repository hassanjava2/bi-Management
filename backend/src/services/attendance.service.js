/**
 * BI Management - Attendance Service
 * خدمة الحضور والانصراف
 */

const { run, get, all } = require('../config/database');
const { generateId, now, today, calculateLateMinutes, calculateWorkMinutes } = require('../utils/helpers');
const notificationService = require('./notification.service');

// Lazy load goals service to avoid circular dependency
let goalsService = null;
function getGoalsService() {
    if (!goalsService) {
        goalsService = require('./goals.service').goalsService;
    }
    return goalsService;
}

/**
 * Check in
 */
async function checkIn(userId, data = {}) {
    const todayDate = today();
    const currentTime = now();

    // Check if already checked in
    const existing = await get(`
        SELECT id, check_in FROM attendance 
        WHERE user_id = ? AND date = ?
    `, [userId, todayDate]);

    if (existing && existing.check_in) {
        return { 
            error: 'ALREADY_CHECKED_IN', 
            message: 'You have already checked in today',
            check_in: existing.check_in
        };
    }

    // Get work start time from settings
    const settings = await get(`SELECT value FROM settings WHERE key = 'work_start_time'`);
    const workStartTime = settings?.value || '09:00';

    // Calculate late minutes
    const lateMinutes = calculateLateMinutes(currentTime, workStartTime);
    const status = lateMinutes > 15 ? 'late' : 'present';

    const id = existing?.id || generateId();

    if (existing) {
        // Update existing record
        await run(`
            UPDATE attendance SET
                check_in = ?,
                check_in_location = ?,
                check_in_method = ?,
                status = ?,
                late_minutes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            currentTime,
            data.location ? JSON.stringify(data.location) : null,
            data.method || 'app',
            status,
            lateMinutes,
            id
        ]);
    } else {
        // Create new record
        await run(`
            INSERT INTO attendance (
                id, user_id, date, check_in, check_in_location,
                check_in_method, status, late_minutes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            userId,
            todayDate,
            currentTime,
            data.location ? JSON.stringify(data.location) : null,
            data.method || 'app',
            status,
            lateMinutes
        ]);
    }

    // Send welcome notification
    const user = await get(`SELECT full_name FROM users WHERE id = ?`, [userId]);
    if (status === 'late') {
        notificationService.create({
            user_id: userId,
            title: 'Late Check-in',
            body: `You are ${lateMinutes} minutes late today.`,
            type: 'warning'
        });
    }

    // Award points for attendance (Bi Goals integration)
    try {
        const goals = getGoalsService();
        if (status === 'present') {
            // Check if arrived early (before work start time)
            if (lateMinutes < 0) {
                goals.awardPoints(userId, 'attendance_early');
            } else {
                goals.awardPoints(userId, 'attendance_on_time');
            }
        } else if (status === 'late') {
            // Deduct points for being late
            goals.deductPoints(userId, 'late_arrival');
        }
    } catch (e) {
        console.error('[Attendance Service] Failed to award/deduct points:', e.message);
    }

    return getAttendance(id);
}

/**
 * Check out
 */
async function checkOut(userId, data = {}) {
    const todayDate = today();
    const currentTime = now();

    // Get today's record
    const record = await get(`
        SELECT id, check_in FROM attendance 
        WHERE user_id = ? AND date = ?
    `, [userId, todayDate]);

    if (!record) {
        return { error: 'NOT_CHECKED_IN', message: 'You have not checked in today' };
    }

    if (!record.check_in) {
        return { error: 'NOT_CHECKED_IN', message: 'You have not checked in today' };
    }

    // Calculate work time
    const workMinutes = calculateWorkMinutes(record.check_in, currentTime);
    const overtimeMinutes = Math.max(0, workMinutes - 480); // 8 hours = 480 minutes

    // Update record
    await run(`
        UPDATE attendance SET
            check_out = ?,
            check_out_location = ?,
            check_out_method = ?,
            work_minutes = ?,
            overtime_minutes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [
        currentTime,
        data.location ? JSON.stringify(data.location) : null,
        data.method || 'app',
        workMinutes,
        overtimeMinutes,
        record.id
    ]);

    return getAttendance(record.id);
}

/**
 * Get attendance record
 */
async function getAttendance(attendanceId) {
    const record = await get(`
        SELECT a.*, u.full_name as user_name, d.name as department_name
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE a.id = ?
    `, [attendanceId]);

    if (!record) return null;

    return {
        ...record,
        check_in_location: record.check_in_location ? JSON.parse(record.check_in_location) : null,
        check_out_location: record.check_out_location ? JSON.parse(record.check_out_location) : null
    };
}

/**
 * Get today's attendance
 */
async function getTodayAttendance() {
    const records = await all(`
        SELECT a.*, u.full_name as user_name, u.employee_code, d.name as department_name
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE a.date = CURRENT_DATE
        ORDER BY a.check_in ASC
    `);

    return records.map(r => ({
        ...r,
        check_in_location: r.check_in_location ? JSON.parse(r.check_in_location) : null,
        check_out_location: r.check_out_location ? JSON.parse(r.check_out_location) : null
    }));
}

/**
 * Get attendance report
 */
async function getAttendanceReport(filters = {}) {
    let query = `
        SELECT a.*, u.full_name as user_name, u.employee_code, d.name as department_name
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE 1=1
    `;
    const params = [];

    if (filters.user_id) {
        query += ` AND a.user_id = ?`;
        params.push(filters.user_id);
    }

    if (filters.department_id) {
        query += ` AND u.department_id = ?`;
        params.push(filters.department_id);
    }

    if (filters.from_date) {
        query += ` AND a.date >= ?`;
        params.push(filters.from_date);
    }

    if (filters.to_date) {
        query += ` AND a.date <= ?`;
        params.push(filters.to_date);
    }

    if (filters.status) {
        query += ` AND a.status = ?`;
        params.push(filters.status);
    }

    query += ` ORDER BY a.date DESC, a.check_in ASC`;

    if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
    }

    return await all(query, params);
}

/**
 * Manual attendance entry (HR only)
 */
async function manualAttendance(data, enteredBy) {
    const id = generateId();

    await run(`
        INSERT INTO attendance (
            id, user_id, date, check_in, check_out,
            status, notes, approved_by, check_in_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')
    `, [
        id,
        data.user_id,
        data.date,
        data.check_in,
        data.check_out,
        data.status || 'present',
        data.notes,
        enteredBy
    ]);

    return getAttendance(id);
}

/**
 * Get attendance stats for dashboard
 */
async function getAttendanceStats(date = null) {
    const targetDate = date || today();
    
    const stats = await get(`
        SELECT 
            COUNT(*) as total_records,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN status = 'vacation' THEN 1 ELSE 0 END) as vacation,
            SUM(CASE WHEN status = 'sick' THEN 1 ELSE 0 END) as sick
        FROM attendance WHERE date = ?
    `, [targetDate]);

    const totalEmployees = await get(`SELECT COUNT(*) as count FROM users WHERE is_active = 1`);

    return {
        date: targetDate,
        total_employees: totalEmployees?.count || 0,
        checked_in: stats?.total_records || 0,
        present: stats?.present || 0,
        late: stats?.late || 0,
        absent: (totalEmployees?.count || 0) - (stats?.total_records || 0),
        vacation: stats?.vacation || 0,
        sick: stats?.sick || 0
    };
}

/**
 * Get today's record for a specific user
 */
async function getTodayRecordForUser(userId) {
    const todayDate = today();
    
    return await get(`
        SELECT * FROM attendance 
        WHERE user_id = ? AND date = ?
    `, [userId, todayDate]);
}

module.exports = {
    checkIn,
    checkOut,
    getAttendance,
    getTodayAttendance,
    getAttendanceReport,
    manualAttendance,
    getAttendanceStats,
    getTodayRecordForUser
};
