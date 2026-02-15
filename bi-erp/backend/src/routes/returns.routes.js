/**
 * BI Management - Returns Routes (Complete)
 * مسارات المرتجعات — كاملة مع تتبع الحالة والمخزون
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { all, get, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

router.use(auth);

// ─── Stats ───
router.get('/stats', async (req, res) => {
  try {
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
    res.json({ success: true, data: stats || { total: 0, pending: 0, sent: 0, received: 0, completed: 0, rejected: 0 } });
  } catch (e) {
    res.json({ success: true, data: { total: 0, pending: 0, sent: 0, received: 0, completed: 0, rejected: 0 } });
  }
});

// ─── Overdue Returns ───
router.get('/overdue', async (req, res) => {
  try {
    const rows = await all(`
      SELECT r.*, c.name as customer_name, s.name as supplier_name
      FROM returns r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN suppliers s ON r.supplier_id = s.id
      WHERE r.status IN ('pending', 'sent')
        AND r.created_at < NOW() - INTERVAL '7 days'
        AND (r.is_deleted = 0 OR r.is_deleted IS NULL)
      ORDER BY r.created_at ASC LIMIT 50
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ─── Alerts ───
router.get('/alerts', async (req, res) => {
  try {
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
    const alerts = overdue.map(r => ({
      type: 'critical',
      message: `مرتجع متأخر أكثر من 14 يوم - ${r.return_number || r.id}`,
      return_id: r.id,
      customer_name: r.customer_name,
      supplier_name: r.supplier_name,
      days: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000),
    }));
    res.json({ success: true, data: alerts });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// ─── List All Returns ───
router.get('/', async (req, res) => {
  try {
    const { status, type, search } = req.query;
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

    const rows = await all(query, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Get Single Return ───
router.get('/:id', async (req, res) => {
  try {
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
    `, [req.params.id]);

    if (!row) {
      return res.status(404).json({ success: false, error: 'المرتجع غير موجود' });
    }

    // Get return items
    let items = [];
    try {
      items = await all(`
        SELECT ri.*, p.name as product_name, p.code as product_code
        FROM return_items ri
        LEFT JOIN products p ON ri.product_id = p.id
        WHERE ri.return_id = $1
      `, [req.params.id]);
    } catch (_) { /* table may not exist */ }

    // Get follow-ups
    let followUps = [];
    try {
      followUps = await all(`
        SELECT rf.*, u.full_name as user_name
        FROM return_follow_ups rf
        LEFT JOIN users u ON rf.created_by = u.id
        WHERE rf.return_id = $1
        ORDER BY rf.created_at DESC
      `, [req.params.id]);
    } catch (_) { /* table may not exist */ }

    res.json({
      success: true,
      data: { ...row, items, follow_ups: followUps }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Create Return ───
router.post('/', async (req, res) => {
  try {
    const { return_number, type, original_invoice_id, customer_id, supplier_id, status, reason_details, notes, items } = req.body;
    const id = generateId();
    const retNum = return_number || `RET-${Date.now().toString().slice(-8)}`;

    await run(`
      INSERT INTO returns (id, return_number, type, original_invoice_id, customer_id, supplier_id, status, reason_details, notes, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
    `, [id, retNum, type || 'sale_return', original_invoice_id || null, customer_id || null, supplier_id || null, status || 'pending', reason_details || null, notes || null, req.user?.id]);

    // Insert return items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        try {
          await run(`
            INSERT INTO return_items (id, return_id, product_id, quantity, price, reason)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [generateId(), id, item.product_id, item.quantity || 1, item.price || 0, item.reason || null]);
        } catch (_) { /* table may not exist yet */ }
      }
    }

    const row = await get('SELECT * FROM returns WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Update Return ───
router.put('/:id', async (req, res) => {
  try {
    const { type, reason_details, notes, customer_id, supplier_id } = req.body;

    await run(`
      UPDATE returns
      SET type = COALESCE($1, type),
          reason_details = COALESCE($2, reason_details),
          notes = COALESCE($3, notes),
          customer_id = COALESCE($4, customer_id),
          supplier_id = COALESCE($5, supplier_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [type, reason_details, notes, customer_id, supplier_id, req.params.id]);

    const row = await get('SELECT * FROM returns WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Update Status ───
router.post('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'sent', 'received', 'completed', 'rejected', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `الحالة غير صالحة. الحالات المتاحة: ${validStatuses.join(', ')}` });
    }

    // Update the main status
    await run(`
      UPDATE returns
      SET status = $1,
          status_notes = $2,
          status_updated_at = CURRENT_TIMESTAMP,
          status_updated_by = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [status, notes || null, req.user?.id, req.params.id]);

    // Log the status change as a follow-up
    try {
      await run(`
        INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
        VALUES ($1, $2, 'status_change', $3, $4, CURRENT_TIMESTAMP)
      `, [generateId(), req.params.id, `تم تغيير الحالة إلى: ${status}${notes ? ' - ' + notes : ''}`, req.user?.id]);
    } catch (_) { /* table may not exist */ }

    const row = await get('SELECT * FROM returns WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: row, message: 'تم تحديث الحالة بنجاح' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Add Follow-Up ───
router.post('/:id/follow-up', async (req, res) => {
  try {
    const { content, type } = req.body;
    const id = generateId();

    try {
      await run(`
        INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [id, req.params.id, type || 'note', content, req.user?.id]);
    } catch (tableErr) {
      // Create the table if it doesn't exist
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
      `, [id, req.params.id, type || 'note', content, req.user?.id]);
    }

    // Update the return's updated_at
    await run('UPDATE returns SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);

    res.status(201).json({ success: true, data: { id, content, type: type || 'note' }, message: 'تم إضافة المتابعة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Receive Return (+ Inventory Update) ───
router.post('/:id/receive', async (req, res) => {
  try {
    const { received_items, notes } = req.body;

    // Update status to received
    await run(`
      UPDATE returns
      SET status = 'received',
          received_at = CURRENT_TIMESTAMP,
          received_by = $1,
          status_notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [req.user?.id, notes || 'تم استلام المرتجع', req.params.id]);

    // Return items to inventory if provided
    if (received_items && Array.isArray(received_items)) {
      for (const item of received_items) {
        try {
          // Update product stock
          await run(`
            UPDATE products
            SET quantity = COALESCE(quantity, 0) + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [item.quantity || 1, item.product_id]);

          // Log inventory movement
          try {
            await run(`
              INSERT INTO inventory_movements (id, product_id, type, quantity, reason, reference_type, reference_id, created_by, created_at)
              VALUES ($1, $2, 'return_in', $3, $4, 'return', $5, $6, CURRENT_TIMESTAMP)
            `, [generateId(), item.product_id, item.quantity || 1, `مرتجع - ${item.reason || 'استلام'}`, req.params.id, req.user?.id]);
          } catch (_) { /* inventory_movements table may not exist */ }
        } catch (invErr) {
          console.error('[Returns] Inventory update error:', invErr.message);
        }
      }
    }

    // Log as follow-up
    try {
      await run(`
        INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
        VALUES ($1, $2, 'received', $3, $4, CURRENT_TIMESTAMP)
      `, [generateId(), req.params.id, `تم استلام المرتجع${notes ? ' - ' + notes : ''}`, req.user?.id]);
    } catch (_) { /* table may not exist */ }

    const row = await get('SELECT * FROM returns WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: row, message: 'تم استلام المرتجع وتحديث المخزون' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Send Reminder ───
router.post('/:id/reminder', async (req, res) => {
  try {
    const returnItem = await get(`
      SELECT r.*, s.name as supplier_name, s.phone as supplier_phone,
             c.name as customer_name, c.phone as customer_phone
      FROM returns r
      LEFT JOIN suppliers s ON r.supplier_id = s.id
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE r.id = $1
    `, [req.params.id]);

    if (!returnItem) {
      return res.status(404).json({ success: false, error: 'المرتجع غير موجود' });
    }

    // Log the reminder as a follow-up
    try {
      await run(`
        INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
        VALUES ($1, $2, 'reminder', $3, $4, CURRENT_TIMESTAMP)
      `, [generateId(), req.params.id, `تم إرسال تذكير بخصوص المرتجع ${returnItem.return_number || ''}`, req.user?.id]);
    } catch (_) { /* table may not exist */ }

    // Update last reminded
    await run('UPDATE returns SET last_reminded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);

    res.json({
      success: true,
      message: 'تم إرسال التذكير',
      data: {
        contact: returnItem.supplier_name || returnItem.customer_name,
        phone: returnItem.supplier_phone || returnItem.customer_phone,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Bulk Reminder ───
router.post('/bulk-reminder', async (req, res) => {
  try {
    const { return_ids } = req.body;
    if (!return_ids || !Array.isArray(return_ids)) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد المرتجعات' });
    }

    let sent = 0;
    for (const returnId of return_ids) {
      try {
        await run('UPDATE returns SET last_reminded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [returnId]);
        try {
          await run(`
            INSERT INTO return_follow_ups (id, return_id, type, content, created_by, created_at)
            VALUES ($1, $2, 'reminder', 'تذكير جماعي', $3, CURRENT_TIMESTAMP)
          `, [generateId(), returnId, req.user?.id]);
        } catch (_) { }
        sent++;
      } catch (_) { }
    }

    res.json({ success: true, message: `تم إرسال ${sent} تذكير`, data: { sent } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
