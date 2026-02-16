/**
 * BI Management - Returns Service
 * خدمة المرتجعات — جميع عمليات SQL والمنطق
 */
const { all, get, run } = require('../config/database');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

// ─── Stats ───
async function getStats() {
    const stats = await get(`
    SELECT
      COUNT(*)::int as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int as pending,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::int as sent,
      SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::int as received,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)::int as rejected
    FROM returns
    WHERE is_deleted = 0 OR is_deleted IS NULL
  `);
    return stats || { total: 0, pending: 0, sent: 0, received: 0, completed: 0, rejected: 0 };
}

// ─── Overdue ───
async function getOverdue() {
    return all(`
    SELECT r.*, c.name as customer_name, s.name as supplier_name
    FROM returns r
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN suppliers s ON r.supplier_id = s.id
    WHERE r.status IN ('pending', 'sent')
      AND r.created_at < NOW() - INTERVAL '7 days'
      AND (r.is_deleted = 0 OR r.is_deleted IS NULL)
    ORDER BY r.created_at ASC LIMIT 50
  `);
}

// ─── Alerts ───
async function getAlerts() {
    const overdue = await all(`
    SELECT r.*, c.name as customer_name, s.name as supplier_name
    FROM returns r
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN suppliers s ON r.supplier_id = s.id
    WHERE r.status IN ('pending', 'sent')
      AND r.created_at < NOW() - INTERVAL '14 days'
      AND (r.is_deleted = 0 OR r.is_deleted IS NULL)
    LIMIT 20
  `);
    return overdue.map(r => ({
        type: 'critical',
        message: `مرتجع متأخر أكثر من 14 يوم - ${r.return_number || r.id}`,
        return_id: r.id,
        customer_name: r.customer_name,
        supplier_name: r.supplier_name,
        days: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000),
    }));
}

// ─── List ───
async function listReturns(filters) {
    const { status, type, search } = filters;
    let query = `
    SELECT r.*,
      c.name as customer_name, c.phone as customer_phone,
      s.name as supplier_name, s.phone as supplier_phone,
      u.full_name as created_by_name
    FROM returns r
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN suppliers s ON r.supplier_id = s.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE (r.is_deleted = 0 OR r.is_deleted IS NULL)
  `;
    const params = [];

    if (status) {
        query += ` AND r.status = $${params.length + 1}`;
        params.push(status);
    }
    if (type) {
        query += ` AND r.type = $${params.length + 1}`;
        params.push(type);
    }
    if (search) {
        query += ` AND (r.return_number ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1} OR s.name ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }

    query += ' ORDER BY r.created_at DESC LIMIT 200';
    return all(query, params);
}

// ─── Get by ID ───
async function getById(id) {
    const row = await get(`
    SELECT r.*,
      c.name as customer_name, c.phone as customer_phone,
      s.name as supplier_name, s.phone as supplier_phone,
      u.full_name as created_by_name,
      i.invoice_number as original_invoice_number
    FROM returns r
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN suppliers s ON r.supplier_id = s.id
    LEFT JOIN users u ON r.created_by = u.id
    LEFT JOIN invoices i ON r.original_invoice_id = i.id
    WHERE r.id = $1
  `, [id]);
    if (!row) return null;

    let items = [];
    try {
        items = await all(`
      SELECT ri.*, p.name as product_name, p.code as product_code
      FROM return_items ri
      LEFT JOIN products p ON ri.product_id = p.id
      WHERE ri.return_id = $1
    `, [id]);
    } catch (_) { /* table may not exist */ }

    let follow_ups = [];
    try {
        follow_ups = await all(`
      SELECT rf.*, u.full_name as user_name
      FROM return_follow_ups rf
      LEFT JOIN users u ON rf.created_by = u.id
      WHERE rf.return_id = $1
      ORDER BY rf.created_at DESC
    `, [id]);
    } catch (_) { /* table may not exist */ }

    return { ...row, items, follow_ups };
}

// ─── Create ───
async function create(data, userId) {
    const id = generateId();
    const retNum = data.return_number || `RET-${Date.now().toString().slice(-8)}`;

    await run(`
    INSERT INTO returns (id, return_number, type, original_invoice_id, customer_id, supplier_id, status, reason_details, notes, created_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
  `, [id, retNum, data.type || 'sale_return', data.original_invoice_id || null, data.customer_id || null, data.supplier_id || null, data.status || 'pending', data.reason_details || null, data.notes || null, userId]);

    if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
            try {
                await run(`
          INSERT INTO return_items (id, return_id, product_id, quantity, price, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [generateId(), id, item.product_id, item.quantity || 1, item.price || 0, item.reason || null]);
            } catch (_) { /* table may not exist yet */ }
        }
    }

    return get('SELECT * FROM returns WHERE id = $1', [id]);
}

// ─── Update ───
async function update(id, data) {
    const { type, reason_details, notes, customer_id, supplier_id } = data;
    await run(`
    UPDATE returns
    SET type = COALESCE($1, type),
        reason_details = COALESCE($2, reason_details),
        notes = COALESCE($3, notes),
        customer_id = COALESCE($4, customer_id),
        supplier_id = COALESCE($5, supplier_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
  `, [type, reason_details, notes, customer_id, supplier_id, id]);

    return get('SELECT * FROM returns WHERE id = $1', [id]);
}

// ─── Update Status ───
const VALID_STATUSES = ['pending', 'sent', 'received', 'completed', 'rejected', 'cancelled'];

async function updateStatus(id, status, notes, userId) {
    if (!VALID_STATUSES.includes(status)) {
        throw Object.assign(new Error(`الحالة غير صالحة. الحالات المتاحة: ${VALID_STATUSES.join(', ')}`), { statusCode: 400 });
    }

    await run(`
    UPDATE returns
    SET status = $1,
        status_notes = $2,
        status_updated_at = CURRENT_TIMESTAMP,
        status_updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [status, notes || null, userId, id]);

    try {
        await run(`
      INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
      VALUES ($1, $2, 'status_change', $3, $4, CURRENT_TIMESTAMP)
    `, [generateId(), id, `تم تغيير الحالة إلى: ${status}${notes ? ' - ' + notes : ''}`, userId]);
    } catch (_) { /* table may not exist */ }

    return get('SELECT * FROM returns WHERE id = $1', [id]);
}

// ─── Add Follow-Up ───
async function addFollowUp(returnId, content, type, userId) {
    const id = generateId();

    try {
        await run(`
      INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [id, returnId, type || 'note', content, userId]);
    } catch (tableErr) {
        await run(`
      CREATE TABLE IF NOT EXISTS return_follow_ups (
        id VARCHAR(36) PRIMARY KEY,
        return_id VARCHAR(36) REFERENCES returns(id),
        type VARCHAR(50) DEFAULT 'note',
        content TEXT,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await run(`
      INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [id, returnId, type || 'note', content, userId]);
    }

    await run('UPDATE returns SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [returnId]);
    return { id, content, type: type || 'note' };
}

// ─── Receive Return (+ Inventory) ───
async function receiveReturn(id, receivedItems, notes, userId) {
    await run(`
    UPDATE returns
    SET status = 'received',
        received_at = CURRENT_TIMESTAMP,
        received_by = $1,
        status_notes = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [userId, notes || 'تم استلام المرتجع', id]);

    if (receivedItems && Array.isArray(receivedItems)) {
        for (const item of receivedItems) {
            try {
                await run(`
          UPDATE products
          SET quantity = COALESCE(quantity, 0) + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [item.quantity || 1, item.product_id]);

                try {
                    await run(`
            INSERT INTO inventory_movements (id, product_id, type, quantity, reason, reference_type, reference_id, created_by, created_at)
            VALUES ($1, $2, 'return_in', $3, $4, 'return', $5, $6, CURRENT_TIMESTAMP)
          `, [generateId(), item.product_id, item.quantity || 1, `مرتجع - ${item.reason || 'استلام'}`, id, userId]);
                } catch (_) { /* inventory_movements table may not exist */ }
            } catch (invErr) {
                logger.error('[Returns] Inventory update error:', invErr.message);
            }
        }
    }

    try {
        await run(`
      INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
      VALUES ($1, $2, 'received', $3, $4, CURRENT_TIMESTAMP)
    `, [generateId(), id, `تم استلام المرتجع${notes ? ' - ' + notes : ''}`, userId]);
    } catch (_) { /* table may not exist */ }

    return get('SELECT * FROM returns WHERE id = $1', [id]);
}

// ─── Send Reminder ───
async function sendReminder(id, userId) {
    const returnItem = await get(`
    SELECT r.*, s.name as supplier_name, s.phone as supplier_phone,
           c.name as customer_name, c.phone as customer_phone
    FROM returns r
    LEFT JOIN suppliers s ON r.supplier_id = s.id
    LEFT JOIN customers c ON r.customer_id = c.id
    WHERE r.id = $1
  `, [id]);

    if (!returnItem) return null;

    try {
        await run(`
      INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
      VALUES ($1, $2, 'reminder', $3, $4, CURRENT_TIMESTAMP)
    `, [generateId(), id, `تم إرسال تذكير بخصوص المرتجع ${returnItem.return_number || ''}`, userId]);
    } catch (_) { /* table may not exist */ }

    await run('UPDATE returns SET last_reminded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

    return {
        contact: returnItem.supplier_name || returnItem.customer_name,
        phone: returnItem.supplier_phone || returnItem.customer_phone,
    };
}

// ─── Bulk Reminder ───
async function bulkReminder(returnIds, userId) {
    let sent = 0;
    for (const returnId of returnIds) {
        try {
            await run('UPDATE returns SET last_reminded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [returnId]);
            try {
                await run(`
          INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
          VALUES ($1, $2, 'reminder', 'تذكير جماعي', $3, CURRENT_TIMESTAMP)
        `, [generateId(), returnId, userId]);
            } catch (_) { }
            sent++;
        } catch (_) { }
    }
    return sent;
}

module.exports = {
    getStats,
    getOverdue,
    getAlerts,
    listReturns,
    getById,
    create,
    update,
    updateStatus,
    addFollowUp,
    receiveReturn,
    sendReminder,
    bulkReminder,
};
