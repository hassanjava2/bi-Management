/**
 * BI Management - Attendance Job
 * مهام الحضور المجدولة
 */

const { all, run, get } = require('../config/database');
const notificationService = require('../services/notification.service');
const { generateId, today } = require('../utils/helpers');

/**
 * Check for late employees and send reminders
 * يعمل الساعة 9:30 صباحاً
 */
async function checkLateEmployees() {
    console.log('[Attendance Job] Checking for late employees...');
    
    const todayDate = today();
    
    // Get active employees who haven't checked in
    const lateEmployees = all(`
        SELECT u.id, u.full_name, u.department_id, d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
        WHERE u.is_active = 1
        AND a.id IS NULL
        AND u.role != 'admin'
    `, [todayDate]);

    console.log(`[Attendance Job] Found ${lateEmployees.length} employees who haven't checked in`);

    for (const employee of lateEmployees) {
        // Send reminder notification
        notificationService.create({
            user_id: employee.id,
            title: 'تذكير بتسجيل الحضور',
            body: 'لم تقم بتسجيل حضورك اليوم بعد. يرجى تسجيل الحضور.',
            type: 'reminder',
            data: { type: 'attendance_reminder' }
        });
    }

    return { reminded: lateEmployees.length };
}

/**
 * Mark absent employees
 * يعمل الساعة 10:00 صباحاً
 */
async function markAbsentEmployees() {
    console.log('[Attendance Job] Marking absent employees...');
    
    const todayDate = today();
    
    // Get employees who still haven't checked in
    const absentEmployees = all(`
        SELECT u.id, u.full_name
        FROM users u
        LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
        WHERE u.is_active = 1
        AND a.id IS NULL
        AND u.role != 'admin'
    `, [todayDate]);

    let markedCount = 0;

    for (const employee of absentEmployees) {
        // Check if they have an approved vacation
        const vacation = get(`
            SELECT id FROM vacations 
            WHERE user_id = ? 
            AND ? BETWEEN start_date AND end_date
            AND status = 'approved'
        `, [employee.id, todayDate]);

        const status = vacation ? 'vacation' : 'absent';

        // Create attendance record
        run(`
            INSERT INTO attendance (id, user_id, date, status, notes)
            VALUES (?, ?, ?, ?, ?)
        `, [
            generateId(),
            employee.id,
            todayDate,
            status,
            vacation ? 'إجازة معتمدة' : 'غياب - لم يسجل حضور'
        ]);

        if (status === 'absent') {
            // Send notification
            notificationService.create({
                user_id: employee.id,
                title: 'تم تسجيلك غائباً',
                body: 'تم تسجيلك كغائب اليوم لعدم تسجيل الحضور قبل الساعة 10:00.',
                type: 'warning',
                data: { type: 'marked_absent' }
            });
            markedCount++;
        }
    }

    console.log(`[Attendance Job] Marked ${markedCount} employees as absent`);
    return { marked: markedCount };
}

/**
 * Generate daily attendance report
 * يعمل الساعة 6:00 مساءً
 */
async function generateDailyReport() {
    console.log('[Attendance Job] Generating daily report...');
    
    const todayDate = today();
    
    const stats = get(`
        SELECT 
            COUNT(*) as total_records,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN status = 'vacation' THEN 1 ELSE 0 END) as vacation,
            SUM(COALESCE(work_minutes, 0)) as total_work_minutes,
            SUM(COALESCE(overtime_minutes, 0)) as total_overtime_minutes
        FROM attendance WHERE date = ?
    `, [todayDate]);

    const totalEmployees = get(`SELECT COUNT(*) as count FROM users WHERE is_active = 1`);

    const report = {
        date: todayDate,
        total_employees: totalEmployees?.count || 0,
        present: (stats?.present || 0) + (stats?.late || 0),
        late: stats?.late || 0,
        absent: stats?.absent || 0,
        vacation: stats?.vacation || 0,
        total_work_hours: Math.round((stats?.total_work_minutes || 0) / 60 * 100) / 100,
        total_overtime_hours: Math.round((stats?.total_overtime_minutes || 0) / 60 * 100) / 100,
        attendance_rate: totalEmployees?.count > 0 
            ? Math.round(((stats?.present || 0) + (stats?.late || 0)) / totalEmployees.count * 100) 
            : 0
    };

    console.log('[Attendance Job] Daily report:', report);

    // Send report to HR/Admin
    const hrUsers = all(`SELECT id FROM users WHERE role IN ('admin', 'hr') AND is_active = 1`);
    
    for (const user of hrUsers) {
        notificationService.create({
            user_id: user.id,
            title: 'تقرير الحضور اليومي',
            body: `الحضور: ${report.present}/${report.total_employees} | نسبة الحضور: ${report.attendance_rate}%`,
            type: 'info',
            data: { type: 'daily_report', report }
        });
    }

    return report;
}

/**
 * Check for incomplete tasks at end of day
 */
async function checkIncompleteTasks() {
    console.log('[Attendance Job] Checking incomplete tasks...');
    
    const todayDate = today();
    
    // Get users who checked out today with incomplete tasks
    const usersWithIncompleteTasks = all(`
        SELECT DISTINCT u.id, u.full_name,
            (SELECT COUNT(*) FROM tasks t 
             WHERE t.assigned_to = u.id 
             AND date(t.due_date) = ?
             AND t.status NOT IN ('completed', 'cancelled')) as incomplete_count
        FROM users u
        JOIN attendance a ON u.id = a.user_id AND a.date = ? AND a.check_out IS NOT NULL
        WHERE incomplete_count > 0
    `, [todayDate, todayDate]);

    for (const user of usersWithIncompleteTasks) {
        notificationService.create({
            user_id: user.id,
            title: 'مهام غير مكتملة',
            body: `لديك ${user.incomplete_count} مهام لم تكتمل اليوم. سيتم نقلها لليوم التالي.`,
            type: 'warning',
            data: { type: 'incomplete_tasks', count: user.incomplete_count }
        });

        // Move incomplete tasks to tomorrow
        run(`
            UPDATE tasks 
            SET due_date = date(due_date, '+1 day'),
                notes = COALESCE(notes, '') || ' [نُقلت من ${todayDate}]'
            WHERE assigned_to = ?
            AND date(due_date) = ?
            AND status NOT IN ('completed', 'cancelled')
        `, [user.id, todayDate]);
    }

    return { notified: usersWithIncompleteTasks.length };
}

/**
 * Run scheduled attendance jobs based on time
 */
function runAttendanceJobs() {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();

    console.log(`[Attendance Job] Running at ${hour}:${minute}`);

    // 9:30 AM - Send reminders
    if (hour === 9 && minute >= 30 && minute < 45) {
        checkLateEmployees();
    }

    // 10:00 AM - Mark absent
    if (hour === 10 && minute < 15) {
        markAbsentEmployees();
    }

    // 6:00 PM - Daily report
    if (hour === 18 && minute < 15) {
        generateDailyReport();
        checkIncompleteTasks();
    }
}

module.exports = {
    checkLateEmployees,
    markAbsentEmployees,
    generateDailyReport,
    checkIncompleteTasks,
    runAttendanceJobs
};
