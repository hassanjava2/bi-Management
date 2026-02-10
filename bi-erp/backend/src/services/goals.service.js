const { get, all, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

async function getUserPoints(userId) {
  const user = await get('SELECT total_points, monthly_points, current_level FROM users WHERE id = ?', [userId]);
  if (!user) return { total_points: 0, monthly_points: 0, current_level: 1 };
  return {
    total_points: parseInt(user.total_points, 10) || 0,
    monthly_points: parseInt(user.monthly_points, 10) || 0,
    current_level: parseInt(user.current_level, 10) || 1,
  };
}

async function getPointsHistory(userId, limit = 20, offset = 0) {
  return all(
    'SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, limit, offset]
  );
}

async function addPoints(userId, points, reason, description, adminNote) {
  const id = generateId();
  await run('INSERT INTO point_transactions (id, user_id, points, reason, description, admin_note) VALUES (?, ?, ?, ?, ?, ?)', [id, userId, points, reason || null, description || null, adminNote || null]);
  await run('UPDATE users SET total_points = COALESCE(total_points, 0) + ?, monthly_points = COALESCE(monthly_points, 0) + ? WHERE id = ?', [points, points, userId]);
  return getUserPoints(userId);
}

async function getStats(userId) {
  const points = await getUserPoints(userId);
  const count = await get('SELECT COUNT(*) as c FROM point_transactions WHERE user_id = ?', [userId]).then(r => r?.c || 0);
  return { ...points, transaction_count: count };
}

module.exports = { getUserPoints, getPointsHistory, addPoints, getStats };
