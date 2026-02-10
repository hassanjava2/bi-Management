/**
 * BI ERP - User repository (data access only)
 */

const { get, all, run } = require('../config/database');

async function findById(userId) {
  return get(
    `SELECT u.*, d.name as department_name, p.name as position_title
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     LEFT JOIN positions p ON u.position_id = p.id
     WHERE u.id = ?`,
    [userId]
  );
}

async function findByEmailOrUsername(emailOrUsername) {
  return get(
    `SELECT id, username, email, password_hash, full_name, role, role_id, security_level, is_active,
            failed_login_attempts, locked_until
     FROM users WHERE email = ? OR username = ?`,
    [emailOrUsername, emailOrUsername]
  );
}

async function findAll(filters = {}) {
  let sql = `
    SELECT u.id, u.employee_code, u.email, u.full_name, u.phone, u.department_id, u.position_id,
           u.role, u.security_level, u.hire_date, u.is_active, u.last_login_at,
           d.name as department_name, p.name as position_title
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN positions p ON u.position_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (filters.department_id) params.push(filters.department_id), sql += ' AND u.department_id = ?';
  if (filters.role) params.push(filters.role), sql += ' AND u.role = ?';
  if (filters.is_active !== undefined) params.push(filters.is_active), sql += ' AND u.is_active = ?';
  if (filters.search) params.push(`%${filters.search}%`), sql += ' AND (u.full_name ILIKE ? OR u.email ILIKE ?)';
  sql += ' ORDER BY u.full_name';
  if (filters.limit) params.push(filters.limit), sql += ' LIMIT ?';
  if (filters.offset) params.push(filters.offset), sql += ' OFFSET ?';
  return all(sql, params);
}

async function count(filters = {}) {
  let sql = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
  const params = [];
  if (filters.is_active !== undefined) params.push(filters.is_active), sql += ' AND is_active = ?';
  if (filters.department_id) params.push(filters.department_id), sql += ' AND department_id = ?';
  const row = await get(sql, params);
  return parseInt(row?.count || 0, 10);
}

async function create(data) {
  const cols = data.columns;
  const vals = data.values;
  const placeholders = vals.map(() => '?').join(', ');
  await run(`INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders})`, vals);
  return findById(data.id);
}

async function update(userId, updates) {
  const set = [];
  const params = [];
  const allowed = ['full_name', 'phone', 'department_id', 'position_id', 'role', 'role_id', 'security_level', 'is_active', 'salary_encrypted', 'avatar_url'];
  for (const [k, v] of Object.entries(updates)) {
    if (!allowed.includes(k)) continue;
    set.push(`${k} = ?`);
    params.push(v);
  }
  if (set.length === 0) return findById(userId);
  set.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);
  await run(`UPDATE users SET ${set.join(', ')} WHERE id = ?`, params);
  return findById(userId);
}

async function updateLoginSuccess(userId) {
  await run(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [userId]
  );
}

async function updateLoginFailed(userId, attempts, lockedUntil) {
  await run(
    `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`,
    [attempts, lockedUntil, userId]
  );
}

async function updatePassword(userId, passwordHash) {
  await run(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [passwordHash, userId]);
}

module.exports = {
  findById,
  findByEmailOrUsername,
  findAll,
  count,
  create,
  update,
  updateLoginSuccess,
  updateLoginFailed,
  updatePassword,
};
