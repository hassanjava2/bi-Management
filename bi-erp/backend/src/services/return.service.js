/**
 * BI Management - Return Service
 * إدارة المرتجعات من قاعدة البيانات
 */
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

async function ensureReturnsTable() {
  try {
    await get('SELECT 1 FROM returns LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

async function nextReturnNumber() {
  const year = new Date().getFullYear();
  const r = await get('SELECT return_number FROM returns WHERE return_number LIKE ? ORDER BY created_at DESC LIMIT 1', [`RTN-${year}-%`]);
  let seq = 1;
  if (r && r.return_number) {
    const m = r.return_number.match(/-(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `RTN-${year}-${String(seq).padStart(4, '0')}`;
}

async function list(filters = {}) {
  const { search, supplier_id, status, page = 1, limit = 50 } = filters;
  let query = `
    SELECT r.*, s.name as supplier_name
    FROM returns r
    LEFT JOIN suppliers s ON r.supplier_id = s.id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    query += ` AND (r.return_number LIKE ? OR r.reason_details LIKE ? OR r.notes LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (supplier_id && supplier_id !== 'all') {
    query += ` AND r.supplier_id = ?`;
    params.push(supplier_id);
  }
  if (status && status !== 'all') {
    query += ` AND r.status = ?`;
    params.push(status);
  }
  query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
  const limitNum = parseInt(limit, 10) || 50;
  const offset = (parseInt(page, 10) - 1) * limitNum;
  params.push(limitNum, offset);
  const rows = await all(query, params);
  const countParams = [];
  let countQuery = `SELECT COUNT(*) as total FROM returns r WHERE 1=1`;
  if (search) { countQuery += ` AND (r.return_number LIKE ? OR r.reason_details LIKE ? OR r.notes LIKE ?)`; countParams.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (supplier_id && supplier_id !== 'all') { countQuery += ` AND r.supplier_id = ?`; countParams.push(supplier_id); }
  if (status && status !== 'all') { countQuery += ` AND r.status = ?`; countParams.push(status); }
  const countResult = await get(countQuery, countParams);
  const total = countResult?.total || 0;
  return { rows, total, page: parseInt(page, 10), limit: limitNum, pages: Math.ceil(total / limitNum) || 1 };
}

async function getById(id) {
  const r = await get('SELECT r.*, s.name as supplier_name FROM returns r LEFT JOIN suppliers s ON r.supplier_id = s.id WHERE r.id = ?', [String(id)]);
  if (!r) return null;
  let items = [];
  try {
    items = await all('SELECT * FROM return_items WHERE return_id = ?', [String(id)]);
  } catch (_) {}
  return { ...r, items };
}

async function create(data) {
  const id = data.id || generateId();
  const return_number = nextReturnNumber();
  const {
    type = 'purchase_return',
    supplier_id,
    customer_id,
    original_invoice_id,
    classification,
    reason_category,
    reason_details,
    notes,
    images,
    created_by,
    items = [],
  } = data;
  const createdAt = now();
  await run(
    `INSERT INTO returns (id, return_number, type, original_invoice_id, customer_id, supplier_id, classification, reason_category, reason_details, status, notes, images, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [id, return_number, type, original_invoice_id || null, customer_id || null, supplier_id || null, classification || null, reason_category || null, reason_details || null, notes || null, images ? JSON.stringify(images) : null, created_by || null, createdAt]
  );
  for (const it of items) {
    const itemId = generateId();
    await run(
      `INSERT INTO return_items (id, return_id, product_id, serial_id, quantity, unit_price, item_classification, condition_notes, decision)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, id, it.product_id || null, it.serial_id || null, parseInt(it.quantity, 10) || 1, it.unit_price != null ? parseFloat(it.unit_price) : null, it.item_classification || it.classification || null, it.condition_notes || it.reason || null, it.decision || null]
    );
  }
  return getById(id);
}

async function updateStatus(id, status, notes) {
  const existing = await get('SELECT id FROM returns WHERE id = ?', [String(id)]);
  if (!existing) return null;
  await run(`UPDATE returns SET status = ?, notes = COALESCE(notes, '') || ? WHERE id = ?`, [status, notes ? '\n' + notes : '', String(id)]);
  return getById(id);
}

async function addFollowUp(id, action, notesVal) {
  const existing = await get('SELECT id, notes FROM returns WHERE id = ?', [String(id)]);
  if (!existing) return null;
  const followUpText = `[${now()}] ${action}: ${notesVal || ''}`;
  await run(`UPDATE returns SET notes = COALESCE(notes, '') || ? WHERE id = ?`, [followUpText + '\n', String(id)]);
  return getById(id);
}

async function receive(id, data) {
  const existing = await get('SELECT id FROM returns WHERE id = ?', [String(id)]);
  if (!existing) return null;
  await run(`UPDATE returns SET status = 'completed', destination_warehouse_id = ?, processed_at = ?, notes = COALESCE(notes, '') || ? WHERE id = ?`, [data.warehouse_id || null, now(), data.notes ? '\nاستلام: ' + data.notes : '', String(id)]);
  return getById(id);
}

async function getStats() {
  if (!ensureReturnsTable()) return null;
  const total = await get('SELECT COUNT(*) as total FROM returns');
  const byStatus = await all('SELECT status, COUNT(*) as cnt FROM returns GROUP BY status');
  const bySupplier = await all('SELECT supplier_id, COUNT(*) as cnt FROM returns WHERE supplier_id IS NOT NULL GROUP BY supplier_id');
  const by_status = {};
  (byStatus || []).forEach((r) => { by_status[r.status] = r.cnt; });
  const by_supplier = {};
  (bySupplier || []).forEach((r) => { by_supplier[r.supplier_id] = r.cnt; });
  return {
    total_pending: by_status.pending || 0,
    over_7_days: 0,
    over_14_days: 0,
    over_30_days: 0,
    by_supplier,
    by_status,
  };
}

async function getOverdue() {
  const rows = await all(`SELECT r.*, s.name as supplier_name FROM returns r LEFT JOIN suppliers s ON r.supplier_id = s.id WHERE r.status NOT IN ('completed', 'rejected', 'returned') ORDER BY r.created_at ASC`);
  return rows.map((r) => ({ ...r, sent_date: r.created_at, days: r.created_at ? Math.floor((Date.now() - new Date(r.created_at)) / (1000 * 60 * 60 * 24)) : 0 }));
}

function getAlerts() {
  const overdue = getOverdue();
  const alerts = [];
  overdue.forEach((r) => {
    const days = r.created_at ? Math.floor((Date.now() - new Date(r.created_at)) / (1000 * 60 * 60 * 24)) : 0;
    if (days > 14) alerts.push({ type: 'critical', message: `مرتجع ${r.return_number} متأخر أكثر من 14 يوم`, return_id: r.id });
    else if (days > 7) alerts.push({ type: 'warning', message: `مرتجع ${r.return_number} قارب على 7 أيام`, return_id: r.id });
  });
  return alerts;
}

module.exports = {
  ensureReturnsTable,
  nextReturnNumber,
  list,
  getById,
  create,
  updateStatus,
  addFollowUp,
  receive,
  getStats,
  getOverdue,
  getAlerts,
};
