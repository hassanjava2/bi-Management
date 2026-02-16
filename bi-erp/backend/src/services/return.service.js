/**
 * BI ERP — Return Service (Phase 3 Enhanced)
 * إرجاع شراء / إرجاع بيع — مرتبط بفاتورة أصلية
 * PostgreSQL compatible + stock sync + balance updates
 */
const { run, get, all } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit.middleware');
const logger = require('../utils/logger');

const PREFIX = { purchase_return: 'RTP', sale_return: 'RTS' };

// ─── AUTO NUMBER ───────────────────────
async function nextReturnNumber(type) {
  const prefix = PREFIX[type] || 'RTN';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const r = await get(
    `SELECT return_number FROM returns WHERE return_type = $1 AND return_number LIKE $2 ORDER BY created_at DESC LIMIT 1`,
    [type, `${prefix}-${today}-%`]
  ).catch(() => null);
  let seq = 1;
  if (r?.return_number) {
    const m = r.return_number.match(/-(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `${prefix}-${today}-${String(seq).padStart(4, '0')}`;
}

// ─── CREATE PURCHASE RETURN ────────────
async function createPurchaseReturn(data, userId) {
  const id = generateId();
  const returnNumber = await nextReturnNumber('purchase_return');

  let originalInvoice = null;
  if (data.original_invoice_id) {
    originalInvoice = await get('SELECT * FROM invoices WHERE id = $1', [data.original_invoice_id]).catch(() => null);
  }

  const subtotal = parseFloat(data.subtotal) || 0;
  const discount = parseFloat(data.discount_amount) || 0;
  const total = subtotal - discount;

  await run(`
    INSERT INTO returns (
      id, return_number, return_type, type,
      original_invoice_id, original_invoice_number,
      supplier_id, customer_id,
      reason, subtotal, discount_amount, total,
      currency, exchange_rate,
      reason_category, reason_details, classification,
      status, notes,
      created_by, created_at, updated_at
    ) VALUES (
      $1, $2, 'purchase_return', 'purchase_return',
      $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12,
      $13, $14, $15,
      'pending', $16,
      $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `, [
    id, returnNumber,
    data.original_invoice_id || null, data.original_invoice_number || originalInvoice?.invoice_number || null,
    data.supplier_id || originalInvoice?.supplier_id || null, data.customer_id || null,
    data.reason || data.reason_details || null, subtotal, discount, total,
    data.currency || 'IQD', parseFloat(data.exchange_rate) || 1,
    data.reason_category || null, data.reason_details || null, data.classification || null,
    data.notes || null,
    userId
  ]);

  // Add return items
  if (data.items?.length > 0) {
    for (const item of data.items) {
      const itemId = generateId();
      const qty = parseInt(item.returned_quantity) || parseInt(item.quantity) || 1;
      const price = parseFloat(item.unit_price) || 0;
      await run(`
        INSERT INTO return_items (id, return_id, product_id, original_item_id, quantity, returned_quantity, unit_price, total_price, reason, condition)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        itemId, id, item.product_id || null, item.original_item_id || null,
        parseInt(item.quantity) || qty, qty, price, qty * price,
        item.reason || item.condition_notes || data.reason || null, item.condition || 'good'
      ]);
    }
  }

  await logAudit('return', id, 'create', null, { type: 'purchase_return', total }, { user: { id: userId } });
  return getById(id);
}

// ─── CREATE SALE RETURN ────────────────
async function createSaleReturn(data, userId) {
  const id = generateId();
  const returnNumber = await nextReturnNumber('sale_return');

  let originalInvoice = null;
  if (data.original_invoice_id) {
    originalInvoice = await get('SELECT * FROM invoices WHERE id = $1', [data.original_invoice_id]).catch(() => null);
  }

  const subtotal = parseFloat(data.subtotal) || 0;
  const discount = parseFloat(data.discount_amount) || 0;
  const total = subtotal - discount;

  await run(`
    INSERT INTO returns (
      id, return_number, return_type, type,
      original_invoice_id, original_invoice_number,
      supplier_id, customer_id,
      reason, subtotal, discount_amount, total,
      currency, exchange_rate,
      reason_category, reason_details, classification,
      status, notes,
      created_by, created_at, updated_at
    ) VALUES (
      $1, $2, 'sale_return', 'sale_return',
      $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12,
      $13, $14, $15,
      'pending', $16,
      $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `, [
    id, returnNumber,
    data.original_invoice_id || null, data.original_invoice_number || originalInvoice?.invoice_number || null,
    data.supplier_id || null, data.customer_id || originalInvoice?.customer_id || null,
    data.reason || data.reason_details || null, subtotal, discount, total,
    data.currency || 'IQD', parseFloat(data.exchange_rate) || 1,
    data.reason_category || null, data.reason_details || null, data.classification || null,
    data.notes || null,
    userId
  ]);

  if (data.items?.length > 0) {
    for (const item of data.items) {
      const itemId = generateId();
      const qty = parseInt(item.returned_quantity) || parseInt(item.quantity) || 1;
      const price = parseFloat(item.unit_price) || 0;
      await run(`
        INSERT INTO return_items (id, return_id, product_id, original_item_id, quantity, returned_quantity, unit_price, total_price, reason, condition)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        itemId, id, item.product_id || null, item.original_item_id || null,
        parseInt(item.quantity) || qty, qty, price, qty * price,
        item.reason || item.condition_notes || data.reason || null, item.condition || 'good'
      ]);
    }
  }

  await logAudit('return', id, 'create', null, { type: 'sale_return', total }, { user: { id: userId } });
  return getById(id);
}

// ─── GENERIC CREATE (backward compat) ──
async function create(data) {
  const type = data.type || 'purchase_return';
  if (type === 'sale_return') return createSaleReturn(data, data.created_by);
  return createPurchaseReturn(data, data.created_by);
}

// ─── CONFIRM / APPROVE ─────────────────
async function confirmReturn(id, userId) {
  const ret = await get('SELECT * FROM returns WHERE id = $1', [id]);
  if (!ret) return { error: 'NOT_FOUND' };
  if (ret.status === 'completed') return { error: 'ALREADY_CONFIRMED' };

  await run('UPDATE returns SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3', ['completed', userId, id]);

  // Sync stock
  const items = await all('SELECT * FROM return_items WHERE return_id = $1', [id]).catch(() => []);
  for (const item of items) {
    if (!item.product_id) continue;
    const qty = parseInt(item.returned_quantity) || parseInt(item.quantity) || 0;
    if (ret.return_type === 'purchase_return' || ret.type === 'purchase_return') {
      await run('UPDATE products SET quantity = COALESCE(quantity, 0) - $1 WHERE id = $2', [qty, item.product_id]).catch(() => { });
    } else {
      await run('UPDATE products SET quantity = COALESCE(quantity, 0) + $1 WHERE id = $2', [qty, item.product_id]).catch(() => { });
    }
  }

  // Update balance
  const total = parseFloat(ret.total) || 0;
  if ((ret.return_type === 'purchase_return' || ret.type === 'purchase_return') && ret.supplier_id) {
    await run('UPDATE suppliers SET balance = COALESCE(balance, 0) - $1 WHERE id = $2', [total, ret.supplier_id]).catch(() => { });
  }
  if ((ret.return_type === 'sale_return' || ret.type === 'sale_return') && ret.customer_id) {
    await run('UPDATE customers SET balance = COALESCE(balance, 0) - $1 WHERE id = $2', [total, ret.customer_id]).catch(() => { });
  }

  await logAudit('return', id, 'confirm', { status: ret.status }, { status: 'completed' }, { user: { id: userId } });
  return { data: await getById(id) };
}

// ─── CANCEL ────────────────────────────
async function cancelReturn(id, reason, userId) {
  const ret = await get('SELECT * FROM returns WHERE id = $1', [id]);
  if (!ret) return { error: 'NOT_FOUND' };
  if (ret.status === 'rejected' || ret.status === 'cancelled') return { error: 'ALREADY_CANCELLED' };

  // Reverse if was completed
  if (ret.status === 'completed') {
    const items = await all('SELECT * FROM return_items WHERE return_id = $1', [id]).catch(() => []);
    for (const item of items) {
      if (!item.product_id) continue;
      const qty = parseInt(item.returned_quantity) || parseInt(item.quantity) || 0;
      if (ret.return_type === 'purchase_return' || ret.type === 'purchase_return') {
        await run('UPDATE products SET quantity = COALESCE(quantity, 0) + $1 WHERE id = $2', [qty, item.product_id]).catch(() => { });
      } else {
        await run('UPDATE products SET quantity = COALESCE(quantity, 0) - $1 WHERE id = $2', [qty, item.product_id]).catch(() => { });
      }
    }
    const total = parseFloat(ret.total) || 0;
    if (ret.supplier_id) await run('UPDATE suppliers SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [total, ret.supplier_id]).catch(() => { });
    if (ret.customer_id) await run('UPDATE customers SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [total, ret.customer_id]).catch(() => { });
  }

  await run('UPDATE returns SET status = $1, notes = COALESCE(notes, $2) || $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', ['rejected', '', ` | إلغاء: ${reason || ''}`, id]);
  return { data: await getById(id) };
}

// ─── STATUS UPDATE (backward compat) ───
async function updateStatus(id, status, notes) {
  const existing = await get('SELECT id FROM returns WHERE id = $1', [id]);
  if (!existing) return null;
  await run('UPDATE returns SET status = $1, notes = COALESCE(notes, $2) || $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', [status, '', notes ? '\n' + notes : '', id]);
  return getById(id);
}

// ─── FOLLOW UP ─────────────────────────
async function addFollowUp(id, action, notesVal) {
  const existing = await get('SELECT id FROM returns WHERE id = $1', [id]);
  if (!existing) return null;
  const ts = new Date().toISOString();
  const followUpText = `[${ts}] ${action}: ${notesVal || ''}`;
  await run('UPDATE returns SET notes = COALESCE(notes, $1) || $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', ['', followUpText + '\n', id]);
  return getById(id);
}

// ─── RECEIVE ───────────────────────────
async function receive(id, data) {
  const existing = await get('SELECT id FROM returns WHERE id = $1', [id]);
  if (!existing) return null;
  await run('UPDATE returns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['completed', id]);
  return getById(id);
}

// ─── LIST ──────────────────────────────
async function list(filters = {}) {
  let q = `
    SELECT r.*, u.full_name as created_by_name,
      c.name as customer_name, s.name as supplier_name
    FROM returns r
    LEFT JOIN users u ON r.created_by = u.id
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN suppliers s ON r.supplier_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.return_type) { params.push(filters.return_type); q += ` AND (r.return_type = $${params.length} OR r.type = $${params.length})`; }
  if (filters.status && filters.status !== 'all') { params.push(filters.status); q += ` AND r.status = $${params.length}`; }
  if (filters.customer_id) { params.push(filters.customer_id); q += ` AND r.customer_id = $${params.length}`; }
  if (filters.supplier_id && filters.supplier_id !== 'all') { params.push(filters.supplier_id); q += ` AND r.supplier_id = $${params.length}`; }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    q += ` AND (r.return_number ILIKE $${params.length} OR r.reason ILIKE $${params.length} OR r.reason_details ILIKE $${params.length} OR r.notes ILIKE $${params.length})`;
  }
  if (filters.from) { params.push(filters.from); q += ` AND r.created_at::date >= $${params.length}`; }
  if (filters.to) { params.push(filters.to); q += ` AND r.created_at::date <= $${params.length}`; }

  q += ' ORDER BY r.created_at DESC';
  const limit = parseInt(filters.limit) || 50;
  const offset = ((parseInt(filters.page) || 1) - 1) * limit;
  params.push(limit); q += ` LIMIT $${params.length}`;
  params.push(offset); q += ` OFFSET $${params.length}`;

  const rows = await all(q, params);

  // Count
  let cq = 'SELECT COUNT(*) as total FROM returns r WHERE 1=1';
  const cp = [];
  if (filters.return_type) { cp.push(filters.return_type); cq += ` AND (r.return_type = $${cp.length} OR r.type = $${cp.length})`; }
  if (filters.status && filters.status !== 'all') { cp.push(filters.status); cq += ` AND r.status = $${cp.length}`; }
  const countResult = await get(cq, cp).catch(() => ({ total: 0 }));
  const total = countResult?.total || 0;

  return { rows, total, page: parseInt(filters.page) || 1, limit, pages: Math.ceil(total / limit) || 1 };
}

// ─── GET BY ID ─────────────────────────
async function getById(id) {
  const ret = await get(`
    SELECT r.*, u.full_name as created_by_name,
      c.name as customer_name, s.name as supplier_name
    FROM returns r
    LEFT JOIN users u ON r.created_by = u.id
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN suppliers s ON r.supplier_id = s.id
    WHERE r.id = $1
  `, [id]);

  if (ret) {
    ret.items = await all(`
      SELECT ri.*, p.name as product_name, p.barcode
      FROM return_items ri
      LEFT JOIN products p ON ri.product_id = p.id
      WHERE ri.return_id = $1
      ORDER BY ri.created_at
    `, [id]).catch(() => []);
  }

  return ret;
}

// ─── STATS ─────────────────────────────
async function getStats() {
  try {
    await get('SELECT 1 FROM returns LIMIT 1');
  } catch {
    return null;
  }
  const total = await get('SELECT COUNT(*) as total FROM returns').catch(() => ({ total: 0 }));
  const byStatus = await all('SELECT status, COUNT(*) as cnt FROM returns GROUP BY status').catch(() => []);
  const by_status = {};
  (byStatus || []).forEach(r => { by_status[r.status] = parseInt(r.cnt); });
  return { total: total?.total || 0, by_status, total_pending: by_status.pending || 0 };
}

// ─── OVERDUE ───────────────────────────
async function getOverdue() {
  const rows = await all(`SELECT r.*, s.name as supplier_name FROM returns r LEFT JOIN suppliers s ON r.supplier_id = s.id WHERE r.status NOT IN ('completed', 'rejected', 'cancelled', 'returned') ORDER BY r.created_at ASC`).catch(() => []);
  return rows.map(r => ({ ...r, days: r.created_at ? Math.floor((Date.now() - new Date(r.created_at)) / 86400000) : 0 }));
}

// ─── ALERTS ────────────────────────────
async function getAlerts() {
  const overdue = await getOverdue();
  return overdue
    .filter(r => r.days > 7)
    .map(r => ({
      type: r.days > 14 ? 'critical' : 'warning',
      message: `مرتجع ${r.return_number} متأخر ${r.days} يوم`,
      return_id: r.id
    }));
}

// ─── GET INVOICE FOR RETURN ────────────
async function getInvoiceForReturn(invoiceId) {
  const inv = await get('SELECT * FROM invoices WHERE id = $1', [invoiceId]).catch(() => null);
  if (!inv) return null;
  inv.items = await all(`
    SELECT ii.*, p.name as product_name, p.barcode
    FROM invoice_items ii LEFT JOIN products p ON ii.product_id = p.id
    WHERE ii.invoice_id = $1 ORDER BY ii.created_at
  `, [invoiceId]).catch(() => []);
  return inv;
}

function ensureReturnsTable() { return true; }

module.exports = {
  ensureReturnsTable, list, getById, create,
  createPurchaseReturn, createSaleReturn,
  confirmReturn, cancelReturn,
  updateStatus, addFollowUp, receive,
  getStats, getOverdue, getAlerts,
  getInvoiceForReturn, nextReturnNumber,
};
