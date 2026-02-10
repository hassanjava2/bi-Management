const { get, all, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

function today() {
  return new Date().toISOString().split('T')[0];
}
function now() {
  return new Date().toISOString();
}

async function list(filters = {}) {
  let sql = `SELECT ar.*, u.full_name as user_name FROM attendance ar LEFT JOIN users u ON ar.user_id = u.id WHERE 1=1`;
  const params = [];
  if (filters.user_id) params.push(filters.user_id), sql += ` AND ar.user_id = ?`;
  if (filters.start_date) params.push(filters.start_date), sql += ` AND ar.date >= ?`;
  if (filters.end_date) params.push(filters.end_date), sql += ` AND ar.date <= ?`;
  sql += ` ORDER BY ar.date DESC, ar.check_in DESC LIMIT 100`;
  return all(sql, params);
}

async function checkIn(userId, data = {}) {
  const todayDate = today();
  const currentTime = now();
  const existing = await get('SELECT id, check_in FROM attendance WHERE user_id = ? AND date = ?', [userId, todayDate]);
  if (existing && existing.check_in) {
    return { error: 'ALREADY_CHECKED_IN', message: 'Already checked in today', check_in: existing.check_in };
  }
  const id = existing?.id || generateId();
  const lateMinutes = 0;
  const status = 'present';
  if (existing) {
    await run(
      `UPDATE attendance SET check_in = ?, check_in_location = ?, check_in_method = ?, status = ?, late_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [currentTime, data.location ? JSON.stringify(data.location) : null, data.method || 'app', status, lateMinutes, id]
    );
  } else {
    await run(
      `INSERT INTO attendance (id, user_id, date, check_in, check_in_location, check_in_method, status, late_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, todayDate, currentTime, data.location ? JSON.stringify(data.location) : null, data.method || 'app', status, lateMinutes]
    );
  }
  return get('SELECT * FROM attendance WHERE id = ?', [id]);
}

async function checkOut(userId, data = {}) {
  const todayDate = today();
  const currentTime = now();
  const record = await get('SELECT id, check_in FROM attendance WHERE user_id = ? AND date = ?', [userId, todayDate]);
  if (!record || !record.check_in) {
    return { error: 'NOT_CHECKED_IN', message: 'Check in first' };
  }
  await run(
    `UPDATE attendance SET check_out = ?, check_out_location = ?, check_out_method = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [currentTime, data.location ? JSON.stringify(data.location) : null, data.method || 'app', record.id]
  );
  return get('SELECT * FROM attendance WHERE id = ?', [record.id]);
}

async function getToday(userId) {
  const todayDate = today();
  return get('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [userId, todayDate]);
}

module.exports = { list, checkIn, checkOut, getToday };
