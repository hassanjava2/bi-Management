/**
 * BI Management - User Service
 * خدمة إدارة المستخدمين
 */

const bcrypt = require('bcryptjs');
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');
const { encrypt, decrypt } = require('../utils/encryption');
const { SECURITY_LEVELS } = require('../config/constants');

/**
 * Create user
 */
async function createUser(data, createdBy) {
    const id = generateId();
    
    // Generate employee code
    const countResult = get(`SELECT COUNT(*) as count FROM users`);
    const employeeCode = `EMP${String((countResult?.count || 0) + 1).padStart(3, '0')}`;

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Encrypt salary if provided
    const salaryEncrypted = data.salary ? encrypt(String(data.salary)) : null;

    // Username: from data or derive from email (required by schema)
    const username = data.username || (data.email ? data.email.replace(/@.*$/, '').replace(/\s+/g, '_') : `user_${id.slice(0, 8)}`);

    // Check which columns exist
    let hasEmployeeCode = false;
    let hasDepartmentId = false;
    let hasPositionId = false;
    let hasSalaryEncrypted = false;
    let hasHireDate = false;
    let hasSecurityLevel = false;
    let hasCreatedBy = false;
    try {
        const cols = get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`);
        const sql = cols?.sql || '';
        hasEmployeeCode = sql.includes('employee_code');
        hasDepartmentId = sql.includes('department_id');
        hasPositionId = sql.includes('position_id');
        hasSalaryEncrypted = sql.includes('salary_encrypted');
        hasHireDate = sql.includes('hire_date');
        hasSecurityLevel = sql.includes('security_level');
        hasCreatedBy = sql.includes('created_by');
    } catch(_) {}

    // Build dynamic insert
    const cols = ['id', 'username', 'email', 'password_hash', 'full_name', 'phone', 'role', 'is_active'];
    const vals = [id, username, data.email, passwordHash, data.full_name, data.phone || null, data.role || 'employee', 1];
    
    if (hasEmployeeCode) { cols.push('employee_code'); vals.push(employeeCode); }
    if (hasDepartmentId) { cols.push('department_id'); vals.push(data.department_id || null); }
    if (hasPositionId) { cols.push('position_id'); vals.push(data.position_id || null); }
    if (hasSalaryEncrypted) { cols.push('salary_encrypted'); vals.push(salaryEncrypted); }
    if (hasHireDate) { cols.push('hire_date'); vals.push(data.hire_date || now().split('T')[0]); }
    if (hasSecurityLevel) { cols.push('security_level'); vals.push(data.security_level || 1); }
    if (hasCreatedBy) { cols.push('created_by'); vals.push(createdBy); }

    const placeholders = cols.map(() => '?').join(', ');
    run(`INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders})`, vals);

    return getUser(id, SECURITY_LEVELS.ADMIN);
}

/**
 * Get user by ID
 */
function getUser(userId, requesterLevel = 1) {
    // Try with departments/positions join first, fall back to simple query
    let user;
    try {
        user = get(`
            SELECT u.*, 
                   d.name as department_name,
                   p.name as position_title
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN positions p ON u.position_id = p.id
            WHERE u.id = ?
        `, [userId]);
    } catch(_) {
        user = get(`SELECT * FROM users WHERE id = ?`, [userId]);
    }

    if (!user) return null;

    // Format response
    const response = {
        id: user.id,
        employee_code: user.employee_code || null,
        username: user.username || null,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        department_id: user.department_id || null,
        department_name: user.department_name || null,
        position_id: user.position_id || null,
        position_title: user.position_title || null,
        role: user.role,
        security_level: user.security_level || 1,
        hire_date: user.hire_date || null,
        is_active: !!user.is_active,
        last_login: user.last_login || null,
        created_at: user.created_at
    };

    // Include salary only for level 4+
    if (requesterLevel >= SECURITY_LEVELS.HR_ACCOUNTANT && user.salary_encrypted) {
        try { response.salary = decrypt(user.salary_encrypted); } catch(_) {}
    }

    return response;
}

/**
 * Get users list
 */
function getUsers(filters = {}, requesterLevel = 1) {
    // Check if join columns exist
    let useJoins = true;
    try {
        const colCheck = get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`);
        useJoins = colCheck?.sql?.includes('department_id') || false;
    } catch(_) { useJoins = false; }

    let query;
    if (useJoins) {
        query = `
            SELECT u.id, u.employee_code, u.email, u.full_name, u.phone,
                   u.department_id, u.position_id, u.role, u.security_level,
                   u.hire_date, u.is_active, u.last_login,
                   d.name as department_name, p.name as position_title
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN positions p ON u.position_id = p.id
            WHERE 1=1
        `;
    } else {
        query = `
            SELECT u.id, u.username, u.email, u.full_name, u.phone,
                   u.role, u.is_active, u.last_login, u.created_at
            FROM users u
            WHERE 1=1
        `;
    }
    const params = [];

    if (useJoins && filters.department_id) {
        query += ` AND u.department_id = ?`;
        params.push(filters.department_id);
    }

    if (filters.role) {
        query += ` AND u.role = ?`;
        params.push(filters.role);
    }

    if (filters.is_active !== undefined) {
        query += ` AND u.is_active = ?`;
        params.push(filters.is_active ? 1 : 0);
    }

    if (filters.search) {
        query += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY u.full_name`;

    if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
        
        if (filters.offset) {
            query += ` OFFSET ?`;
            params.push(filters.offset);
        }
    }

    const users = all(query, params);

    return users.map(user => ({
        id: user.id,
        employee_code: user.employee_code,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        department_id: user.department_id,
        department_name: user.department_name,
        position_id: user.position_id,
        position_title: user.position_title,
        role: user.role,
        security_level: user.security_level,
        hire_date: user.hire_date,
        is_active: !!user.is_active,
        last_login: user.last_login
    }));
}

/**
 * Update user
 */
function updateUser(userId, data, updatedBy) {
    const updates = [];
    const params = [];

    if (data.full_name !== undefined) {
        updates.push('full_name = ?');
        params.push(data.full_name);
    }

    if (data.phone !== undefined) {
        updates.push('phone = ?');
        params.push(data.phone);
    }

    if (data.department_id !== undefined) {
        updates.push('department_id = ?');
        params.push(data.department_id);
    }

    if (data.position_id !== undefined) {
        updates.push('position_id = ?');
        params.push(data.position_id);
    }

    if (data.role !== undefined) {
        updates.push('role = ?');
        params.push(data.role);
    }

    if (data.security_level !== undefined) {
        updates.push('security_level = ?');
        params.push(data.security_level);
    }

    if (data.is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(data.is_active ? 1 : 0);
    }

    if (data.salary !== undefined) {
        updates.push('salary_encrypted = ?');
        params.push(encrypt(String(data.salary)));
    }

    if (updates.length === 0) {
        return getUser(userId);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    return getUser(userId, SECURITY_LEVELS.ADMIN);
}

/**
 * Delete user (soft delete)
 */
function deleteUser(userId) {
    run(`UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [userId]);
    return { success: true };
}

/**
 * Get user count
 */
function getUserCount(filters = {}) {
    let query = `SELECT COUNT(*) as count FROM users WHERE 1=1`;
    const params = [];

    if (filters.is_active !== undefined) {
        query += ` AND is_active = ?`;
        params.push(filters.is_active ? 1 : 0);
    }

    if (filters.department_id) {
        query += ` AND department_id = ?`;
        params.push(filters.department_id);
    }

    const result = get(query, params);
    return result?.count || 0;
}

module.exports = {
    createUser,
    getUser,
    getUsers,
    updateUser,
    deleteUser,
    getUserCount
};
