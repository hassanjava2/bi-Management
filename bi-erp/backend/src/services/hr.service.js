/**
 * BI Management - HR Service
 * خدمة الموارد البشرية — أقسام، إجازات، سلف، رواتب، جداول عمل
 */
const { all, get, run } = require('../config/database');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

// ════════════════════════════════════════════
//  DEPARTMENTS — الأقسام
// ════════════════════════════════════════════

async function listDepartments() {
    return all(`
    SELECT d.*, u.full_name as manager_name,
      (SELECT COUNT(*) FROM users WHERE department_id = d.id AND is_active = TRUE) as employee_count
    FROM departments d
    LEFT JOIN users u ON d.manager_id = u.id
    ORDER BY d.name
  `);
}

async function getDepartmentById(id) {
    const dept = await get(`
    SELECT d.*, u.full_name as manager_name
    FROM departments d LEFT JOIN users u ON d.manager_id = u.id
    WHERE d.id = $1
  `, [id]);
    if (!dept) return null;
    const employees = await all(
        `SELECT id, full_name, email, phone, role, avatar_url FROM users WHERE department_id = $1 AND is_active = TRUE ORDER BY full_name`, [id]
    );
    return { ...dept, employees };
}

async function createDepartment(data) {
    const id = generateId();
    await run(
        `INSERT INTO departments (id, name, name_en, description, manager_id, parent_id) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, data.name, data.name_en || null, data.description || null, data.manager_id || null, data.parent_id || null]
    );
    return get('SELECT * FROM departments WHERE id = $1', [id]);
}

async function updateDepartment(id, data) {
    await run(
        `UPDATE departments SET name = COALESCE($1,name), name_en = COALESCE($2,name_en), description = COALESCE($3,description), manager_id = $4, parent_id = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`,
        [data.name, data.name_en, data.description, data.manager_id || null, data.parent_id || null, id]
    );
    return get('SELECT * FROM departments WHERE id = $1', [id]);
}

async function deleteDepartment(id) {
    const empCount = await get('SELECT COUNT(*) as c FROM users WHERE department_id = $1 AND is_active = TRUE', [id]);
    if (empCount?.c > 0) return { error: 'HAS_EMPLOYEES', message: 'لا يمكن حذف قسم يحتوي موظفين' };
    await run('DELETE FROM departments WHERE id = $1', [id]);
    return { success: true };
}

// ════════════════════════════════════════════
//  LEAVES — الإجازات
// ════════════════════════════════════════════

const LEAVE_TYPES = {
    annual: 'سنوية', sick: 'مرضية', personal: 'شخصية',
    unpaid: 'بدون راتب', emergency: 'طارئة', maternity: 'أمومة',
};

async function listLeaves(filters = {}) {
    let query = `
    SELECT l.*, u.full_name as employee_name, u.avatar_url,
      a.full_name as approved_by_name
    FROM leaves l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN users a ON l.approved_by = a.id
    WHERE 1=1
  `;
    const params = [];
    if (filters.user_id) { params.push(filters.user_id); query += ` AND l.user_id = $${params.length}`; }
    if (filters.status) { params.push(filters.status); query += ` AND l.status = $${params.length}`; }
    if (filters.leave_type) { params.push(filters.leave_type); query += ` AND l.leave_type = $${params.length}`; }
    query += ' ORDER BY l.created_at DESC LIMIT 200';
    return all(query, params);
}

async function createLeave(data, userId) {
    const id = generateId();
    const days = Math.max(1, Math.ceil((new Date(data.end_date) - new Date(data.start_date)) / 86400000) + 1);
    await run(
        `INSERT INTO leaves (id, user_id, leave_type, start_date, end_date, days, reason, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)`,
        [id, data.user_id || userId, data.leave_type || 'annual', data.start_date, data.end_date, days, data.reason || null, userId]
    );
    return get('SELECT * FROM leaves WHERE id = $1', [id]);
}

async function approveLeave(id, approverId) {
    await run(
        `UPDATE leaves SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [approverId, id]
    );
    return get('SELECT * FROM leaves WHERE id = $1', [id]);
}

async function rejectLeave(id, approverId, reason) {
    await run(
        `UPDATE leaves SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [approverId, reason || null, id]
    );
    return get('SELECT * FROM leaves WHERE id = $1', [id]);
}

async function getLeaveBalance(userId) {
    const year = new Date().getFullYear();
    const used = await get(
        `SELECT COALESCE(SUM(days),0) as total FROM leaves WHERE user_id = $1 AND status = 'approved' AND EXTRACT(YEAR FROM start_date) = $2`,
        [userId, year]
    );
    const annual = 21; // default annual leave days
    return {
        annual_total: annual,
        used: parseInt(used?.total || 0),
        remaining: annual - parseInt(used?.total || 0),
        year,
    };
}

async function getLeaveStats() {
    const pending = await get("SELECT COUNT(*) as c FROM leaves WHERE status = 'pending'");
    const approved = await get("SELECT COUNT(*) as c FROM leaves WHERE status = 'approved' AND end_date >= CURRENT_DATE");
    const today = await get("SELECT COUNT(*) as c FROM leaves WHERE status = 'approved' AND CURRENT_DATE BETWEEN start_date AND end_date");
    return {
        pending: parseInt(pending?.c || 0),
        on_leave_today: parseInt(today?.c || 0),
        approved_upcoming: parseInt(approved?.c || 0),
    };
}

// ════════════════════════════════════════════
//  SALARY ADVANCES — السلف
// ════════════════════════════════════════════

async function listAdvances(filters = {}) {
    let query = `
    SELECT sa.*, u.full_name as employee_name, a.full_name as approved_by_name
    FROM salary_advances sa
    LEFT JOIN users u ON sa.user_id = u.id
    LEFT JOIN users a ON sa.approved_by = a.id
    WHERE 1=1
  `;
    const params = [];
    if (filters.user_id) { params.push(filters.user_id); query += ` AND sa.user_id = $${params.length}`; }
    if (filters.status) { params.push(filters.status); query += ` AND sa.status = $${params.length}`; }
    query += ' ORDER BY sa.created_at DESC LIMIT 200';
    return all(query, params);
}

async function createAdvance(data, userId) {
    const id = generateId();
    const months = data.deduction_months || 1;
    const monthly = parseFloat(data.amount) / months;
    await run(
        `INSERT INTO salary_advances (id, user_id, amount, reason, status, deduction_months, monthly_deduction, remaining_amount, created_by) VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8)`,
        [id, data.user_id, data.amount, data.reason || null, months, monthly.toFixed(2), data.amount, userId]
    );
    return get('SELECT * FROM salary_advances WHERE id = $1', [id]);
}

async function approveAdvance(id, approverId) {
    await run(
        `UPDATE salary_advances SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [approverId, id]
    );
    return get('SELECT * FROM salary_advances WHERE id = $1', [id]);
}

async function rejectAdvance(id, approverId) {
    await run(
        `UPDATE salary_advances SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [approverId, id]
    );
    return get('SELECT * FROM salary_advances WHERE id = $1', [id]);
}

// ════════════════════════════════════════════
//  PAYROLL — كشوف الرواتب
// ════════════════════════════════════════════

async function listPayroll(filters = {}) {
    let query = `
    SELECT p.*, u.full_name as employee_name, u.employee_code
    FROM payroll p LEFT JOIN users u ON p.user_id = u.id WHERE 1=1
  `;
    const params = [];
    if (filters.period) { params.push(filters.period); query += ` AND p.period = $${params.length}`; }
    if (filters.status) { params.push(filters.status); query += ` AND p.status = $${params.length}`; }
    if (filters.user_id) { params.push(filters.user_id); query += ` AND p.user_id = $${params.length}`; }
    query += ' ORDER BY p.period DESC, u.full_name';
    return all(query, params);
}

async function generatePayroll(period, createdBy) {
    // period = "2026-02"
    const employees = await all(
        `SELECT id, full_name, salary, salary_currency FROM users WHERE is_active = TRUE AND salary IS NOT NULL AND salary > 0`
    );
    const results = [];
    for (const emp of employees) {
        // Check if already generated
        const existing = await get('SELECT id FROM payroll WHERE user_id = $1 AND period = $2', [emp.id, period]);
        if (existing) continue;

        // Count attendance
        const [yr, mo] = period.split('-');
        const startDate = `${period}-01`;
        const endOfMonth = new Date(parseInt(yr), parseInt(mo), 0);
        const endDate = `${period}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

        const attendance = await get(
            `SELECT COUNT(*) as present FROM attendance WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND check_in IS NOT NULL`,
            [emp.id, startDate, endDate]
        );
        const lateCount = await get(
            `SELECT COUNT(*) as c FROM attendance WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND late_minutes > 0`,
            [emp.id, startDate, endDate]
        );
        const absentDays = await get(
            `SELECT COALESCE(SUM(days),0) as c FROM leaves WHERE user_id = $1 AND status = 'approved' AND leave_type = 'unpaid' AND start_date BETWEEN $2 AND $3`,
            [emp.id, startDate, endDate]
        );

        // Advance deductions
        const advances = await all(
            `SELECT id, monthly_deduction, remaining_amount FROM salary_advances WHERE user_id = $1 AND status = 'approved' AND remaining_amount > 0`,
            [emp.id]
        );
        let advanceDeduction = 0;
        for (const adv of advances) {
            const ded = Math.min(parseFloat(adv.monthly_deduction || 0), parseFloat(adv.remaining_amount || 0));
            advanceDeduction += ded;
        }

        const baseSalary = parseFloat(emp.salary);
        const deductions = parseFloat(absentDays?.c || 0) * (baseSalary / 30); // per-day deduction
        const netSalary = baseSalary - deductions - advanceDeduction;

        const id = generateId();
        await run(
            `INSERT INTO payroll (id, user_id, period, base_salary, deductions, advance_deduction, net_salary, working_days, absent_days, late_days, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [id, emp.id, period, baseSalary, deductions.toFixed(2), advanceDeduction.toFixed(2), netSalary.toFixed(2),
                parseInt(attendance?.present || 0), parseInt(absentDays?.c || 0), parseInt(lateCount?.c || 0), createdBy]
        );

        // Deduct from advances
        for (const adv of advances) {
            const ded = Math.min(parseFloat(adv.monthly_deduction || 0), parseFloat(adv.remaining_amount || 0));
            if (ded > 0) {
                const newRemaining = parseFloat(adv.remaining_amount) - ded;
                await run(
                    `UPDATE salary_advances SET remaining_amount = $1, status = CASE WHEN $1 <= 0 THEN 'deducted' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                    [newRemaining.toFixed(2), adv.id]
                );
            }
        }

        results.push({ employee: emp.full_name, net_salary: netSalary.toFixed(2) });
    }
    return { generated: results.length, period, details: results };
}

async function approvePayroll(id) {
    await run(`UPDATE payroll SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    return get('SELECT * FROM payroll WHERE id = $1', [id]);
}

async function markPayrollPaid(id, method) {
    await run(
        `UPDATE payroll SET status = 'paid', paid_date = CURRENT_DATE, payment_method = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [method || 'cash', id]
    );
    return get('SELECT * FROM payroll WHERE id = $1', [id]);
}

async function getPayrollSummary(period) {
    const summary = await get(`
    SELECT COUNT(*) as total_employees, SUM(base_salary) as total_base, SUM(bonuses) as total_bonuses,
      SUM(deductions) as total_deductions, SUM(advance_deduction) as total_advance_deductions,
      SUM(net_salary) as total_net,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
      SUM(CASE WHEN status = 'paid' THEN net_salary ELSE 0 END) as paid_amount
    FROM payroll WHERE period = $1
  `, [period]);
    return summary || {};
}

// ════════════════════════════════════════════
//  WORK SCHEDULES — جداول العمل
// ════════════════════════════════════════════

async function listSchedules() {
    return all('SELECT * FROM work_schedules WHERE is_active = TRUE ORDER BY name');
}

async function createSchedule(data) {
    const id = generateId();
    await run(
        `INSERT INTO work_schedules (id, name, name_en, start_time, end_time, break_minutes, working_days) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, data.name, data.name_en || null, data.start_time || '08:00', data.end_time || '17:00', data.break_minutes || 60, data.working_days || '0,1,2,3,4']
    );
    return get('SELECT * FROM work_schedules WHERE id = $1', [id]);
}

async function updateSchedule(id, data) {
    await run(
        `UPDATE work_schedules SET name = COALESCE($1,name), start_time = COALESCE($2,start_time), end_time = COALESCE($3,end_time),
     break_minutes = COALESCE($4,break_minutes), working_days = COALESCE($5,working_days), updated_at = CURRENT_TIMESTAMP WHERE id = $6`,
        [data.name, data.start_time, data.end_time, data.break_minutes, data.working_days, id]
    );
    return get('SELECT * FROM work_schedules WHERE id = $1', [id]);
}

async function deleteSchedule(id) {
    await run('UPDATE work_schedules SET is_active = FALSE WHERE id = $1', [id]);
    return { success: true };
}

// ════════════════════════════════════════════
//  EMPLOYEE PROFILE — بيانات الموظف الشاملة
// ════════════════════════════════════════════

async function getEmployeeProfile(userId) {
    const user = await get(`
    SELECT u.id, u.full_name, u.email, u.phone, u.role, u.avatar_url, u.employee_code,
      u.salary, u.salary_currency, u.employment_type, u.hire_date, u.national_id,
      u.address, u.emergency_contact, u.birth_date, u.gender, u.notes,
      u.total_points, u.monthly_points, u.current_level, u.is_active, u.created_at,
      d.name as department_name, d.id as department_id,
      p.name as position_name, p.id as position_id,
      ws.name as schedule_name, ws.start_time, ws.end_time
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN positions p ON u.position_id = p.id
    LEFT JOIN work_schedules ws ON u.work_schedule_id = ws.id
    WHERE u.id = $1
  `, [userId]);
    if (!user) return null;

    const leaveBalance = await getLeaveBalance(userId);
    const recentAttendance = await all(
        `SELECT * FROM attendance WHERE user_id = $1 ORDER BY date DESC LIMIT 30`, [userId]
    );
    const activeAdvances = await all(
        `SELECT * FROM salary_advances WHERE user_id = $1 AND status IN ('approved','pending') ORDER BY created_at DESC`, [userId]
    );

    return { ...user, leave_balance: leaveBalance, recent_attendance: recentAttendance, active_advances: activeAdvances };
}

async function updateEmployeeHR(userId, data) {
    const fields = ['salary', 'salary_currency', 'employment_type', 'hire_date', 'employee_code',
        'department_id', 'position_id', 'work_schedule_id', 'national_id', 'address',
        'emergency_contact', 'birth_date', 'gender', 'notes'];
    const sets = [];
    const params = [];
    let i = 1;
    for (const f of fields) {
        if (data[f] !== undefined) { sets.push(`${f} = $${i++}`); params.push(data[f] || null); }
    }
    if (sets.length === 0) return null;
    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(userId);
    await run(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, params);
    return getEmployeeProfile(userId);
}

// ════════════════════════════════════════════
//  HR DASHBOARD STATS
// ════════════════════════════════════════════

async function getHRStats() {
    const [totalEmployees, activeEmployees, departments, pendingLeaves, onLeaveToday] = await Promise.all([
        get('SELECT COUNT(*) as c FROM users').then(r => parseInt(r?.c || 0)).catch(() => 0),
        get('SELECT COUNT(*) as c FROM users WHERE is_active = TRUE').then(r => parseInt(r?.c || 0)).catch(() => 0),
        get('SELECT COUNT(*) as c FROM departments').then(r => parseInt(r?.c || 0)).catch(() => 0),
        get("SELECT COUNT(*) as c FROM leaves WHERE status = 'pending'").then(r => parseInt(r?.c || 0)).catch(() => 0),
        get("SELECT COUNT(*) as c FROM leaves WHERE status = 'approved' AND CURRENT_DATE BETWEEN start_date AND end_date").then(r => parseInt(r?.c || 0)).catch(() => 0),
    ]);
    return { total_employees: totalEmployees, active_employees: activeEmployees, departments, pending_leaves: pendingLeaves, on_leave_today: onLeaveToday };
}

module.exports = {
    // Departments
    listDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment,
    // Leaves
    listLeaves, createLeave, approveLeave, rejectLeave, getLeaveBalance, getLeaveStats,
    LEAVE_TYPES,
    // Advances
    listAdvances, createAdvance, approveAdvance, rejectAdvance,
    // Payroll
    listPayroll, generatePayroll, approvePayroll, markPayrollPaid, getPayrollSummary,
    // Schedules
    listSchedules, createSchedule, updateSchedule, deleteSchedule,
    // Employee
    getEmployeeProfile, updateEmployeeHR,
    // Stats
    getHRStats,
};
