const { get, all, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

async function list(filters) {
  let sql = 'SELECT t.*, u1.full_name as assigned_to_name, u2.full_name as assigned_by_name FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id LEFT JOIN users u2 ON t.assigned_by = u2.id WHERE 1=1';
  const params = [];
  if (filters && filters.assigned_to) { params.push(filters.assigned_to); sql += ' AND t.assigned_to = ?'; }
  if (filters && filters.status) { params.push(filters.status); sql += ' AND t.status = ?'; }
  sql += ' ORDER BY t.created_at DESC LIMIT 100';
  return all(sql, params);
}

async function getById(id) {
  const task = await get('SELECT t.*, u1.full_name as assigned_to_name, u2.full_name as assigned_by_name FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id LEFT JOIN users u2 ON t.assigned_by = u2.id WHERE t.id = ?', [id]);
  if (!task) return null;
  const comments = await all('SELECT tc.*, u.full_name as user_name FROM task_comments tc LEFT JOIN users u ON tc.user_id = u.id WHERE tc.task_id = ? ORDER BY tc.created_at', [id]);
  return { ...task, comments };
}

async function create(data, assignedBy) {
  const id = generateId();
  await run(
    'INSERT INTO tasks (id, title, description, assigned_to, assigned_by, department_id, priority, status, category, source, due_date, estimated_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.title, data.description || null, data.assigned_to || null, assignedBy, data.department_id || null, data.priority || 'medium', data.status || 'pending', data.category || null, data.source || 'manual', data.due_date || null, data.estimated_minutes || null]
  );
  return getById(id);
}

async function update(id, data) {
  const allowed = ['title', 'description', 'assigned_to', 'priority', 'status', 'due_date', 'estimated_minutes', 'completed_at'];
  const set = [];
  const params = [];
  for (const k of allowed) {
    if (data[k] === undefined) continue;
    set.push(k + ' = ?');
    params.push(data[k]);
  }
  if (set.length === 0) return getById(id);
  set.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  await run('UPDATE tasks SET ' + set.join(', ') + ' WHERE id = ?', params);
  return getById(id);
}

async function addComment(taskId, userId, comment) {
  const cid = generateId();
  await run('INSERT INTO task_comments (id, task_id, user_id, comment) VALUES (?, ?, ?, ?)', [cid, taskId, userId, comment]);
  return getById(taskId);
}

async function myTasks(userId) {
  return list({ assigned_to: userId });
}

async function getTaskStats(filters = {}) {
  const { get } = require('../config/database');
  const today = new Date().toISOString().split('T')[0];
  const parts = [];
  const params = [];
  if (filters.assigned_to) {
    params.push(filters.assigned_to);
    parts.push('assigned_to = ?');
  }
  if (filters.department_id) {
    params.push(filters.department_id);
    parts.push('department_id = ?');
  }
  const where = parts.length ? 'AND ' + parts.join(' AND ') : '';
  const total = (await get('SELECT COUNT(*) as c FROM tasks WHERE 1=1 ' + where, params))?.c ?? 0;
  const pending = (await get("SELECT COUNT(*) as c FROM tasks WHERE status = 'pending' " + where, params))?.c ?? 0;
  const in_progress = (await get("SELECT COUNT(*) as c FROM tasks WHERE status = 'in_progress' " + where, params))?.c ?? 0;
  const completed = (await get("SELECT COUNT(*) as c FROM tasks WHERE status = 'completed' " + where, params))?.c ?? 0;
  const overdue = (await get("SELECT COUNT(*) as c FROM tasks WHERE status NOT IN ('completed','cancelled') AND due_date IS NOT NULL AND (due_date::date) < ? " + where, [today, ...params]))?.c ?? 0;
  const todayCount = (await get('SELECT COUNT(*) as c FROM tasks WHERE (due_date::date) = ? ' + where, [today, ...params]))?.c ?? 0;
  return { total, pending, in_progress, completed, overdue, today: todayCount };
}

module.exports = { list, getById, create, update, addComment, myTasks, getTaskStats };
