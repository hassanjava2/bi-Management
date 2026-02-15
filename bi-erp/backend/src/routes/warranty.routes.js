/**
 * BI Management - Warranty Routes (Complete)
 * مسارات الضمان والصيانة — كاملة مع أوامر الإصلاح
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
        SUM(CASE WHEN status = 'in_repair' THEN 1 ELSE 0 END)::int as in_repair,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END)::int as resolved,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END)::int as closed
      FROM warranty_claims
    `);
    res.json({ success: true, data: stats || { total: 0, pending: 0, in_repair: 0, resolved: 0, closed: 0 } });
  } catch (e) {
    res.json({ success: true, data: { total: 0, pending: 0, in_repair: 0, resolved: 0, closed: 0 } });
  }
});

// ─── List Claims ───
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT wc.*,
        p.name as product_name, p.code as product_code,
        c.name as customer_name, c.phone as customer_phone,
        s.name as supplier_name
      FROM warranty_claims wc
      LEFT JOIN products p ON wc.product_id = p.id
      LEFT JOIN customers c ON wc.customer_id = c.id
      LEFT JOIN suppliers s ON wc.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND wc.status = $${params.length + 1}`;
      params.push(status);
    }
    if (search) {
      query += ` AND (wc.claim_number ILIKE $${params.length + 1} OR p.name ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY wc.created_at DESC LIMIT 200';

    const rows = await all(query, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Get Single Claim ───
router.get('/:id', async (req, res) => {
  try {
    const row = await get(`
      SELECT wc.*,
        p.name as product_name, p.code as product_code, p.serial_number as product_serial,
        c.name as customer_name, c.phone as customer_phone,
        s.name as supplier_name, s.phone as supplier_phone,
        u.full_name as created_by_name
      FROM warranty_claims wc
      LEFT JOIN products p ON wc.product_id = p.id
      LEFT JOIN customers c ON wc.customer_id = c.id
      LEFT JOIN suppliers s ON wc.supplier_id = s.id
      LEFT JOIN users u ON wc.created_by = u.id
      WHERE wc.id = $1
    `, [req.params.id]);

    if (!row) {
      return res.status(404).json({ success: false, error: 'مطالبة الضمان غير موجودة' });
    }

    // Get repair orders for this claim
    let repairs = [];
    try {
      repairs = await all(`
        SELECT ro.*, u.full_name as technician_name
        FROM repair_orders ro
        LEFT JOIN users u ON ro.technician_id = u.id
        WHERE ro.claim_id = $1
        ORDER BY ro.created_at DESC
      `, [req.params.id]);
    } catch (_) { /* table may not exist */ }

    res.json({ success: true, data: { ...row, repairs } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Create Claim ───
router.post('/claims', async (req, res) => {
  try {
    const { claim_number, product_id, customer_id, supplier_id, status, description, serial_number, warranty_end_date } = req.body;
    const id = generateId();
    const claimNum = claim_number || `WC-${Date.now().toString().slice(-8)}`;

    await run(`
      INSERT INTO warranty_claims (id, claim_number, product_id, customer_id, supplier_id, status, description, serial_number, warranty_end_date, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
    `, [id, claimNum, product_id || null, customer_id || null, supplier_id || null, status || 'pending', description || null, serial_number || null, warranty_end_date || null, req.user?.id]);

    const row = await get('SELECT * FROM warranty_claims WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Also support POST / for backward compatibility
router.post('/', async (req, res) => {
  try {
    const { claim_number, product_id, customer_id, supplier_id, status, description, serial_number } = req.body;
    const id = generateId();
    const claimNum = claim_number || `WC-${Date.now().toString().slice(-8)}`;

    await run(`
      INSERT INTO warranty_claims (id, claim_number, product_id, customer_id, supplier_id, status, description, serial_number, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    `, [id, claimNum, product_id || null, customer_id || null, supplier_id || null, status || 'pending', description || null, serial_number || null, req.user?.id]);

    const row = await get('SELECT * FROM warranty_claims WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Update Claim ───
router.put('/claims/:id', async (req, res) => {
  try {
    const { status, description, resolution, notes } = req.body;

    await run(`
      UPDATE warranty_claims
      SET status = COALESCE($1, status),
          description = COALESCE($2, description),
          resolution = COALESCE($3, resolution),
          notes = COALESCE($4, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [status, description, resolution, notes, req.params.id]);

    const row = await get('SELECT * FROM warranty_claims WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Close Claim ───
router.post('/claims/:id/close', async (req, res) => {
  try {
    const { resolution, notes } = req.body;

    await run(`
      UPDATE warranty_claims
      SET status = 'closed',
          resolution = $1,
          notes = COALESCE($2, notes),
          closed_at = CURRENT_TIMESTAMP,
          closed_by = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [resolution || 'تم الإغلاق', notes, req.user?.id, req.params.id]);

    const row = await get('SELECT * FROM warranty_claims WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: row, message: 'تم إغلاق المطالبة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Repair Orders ───

// List repairs
router.get('/repairs', async (req, res) => {
  try {
    let rows = [];
    try {
      rows = await all(`
        SELECT ro.*,
          wc.claim_number, wc.description as claim_description,
          p.name as product_name,
          c.name as customer_name,
          u.full_name as technician_name
        FROM repair_orders ro
        LEFT JOIN warranty_claims wc ON ro.claim_id = wc.id
        LEFT JOIN products p ON wc.product_id = p.id
        LEFT JOIN customers c ON wc.customer_id = c.id
        LEFT JOIN users u ON ro.technician_id = u.id
        ORDER BY ro.created_at DESC LIMIT 100
      `);
    } catch (_) {
      // Create the table if it doesn't exist
      await run(`
        CREATE TABLE IF NOT EXISTS repair_orders (
          id VARCHAR(36) PRIMARY KEY,
          claim_id VARCHAR(36),
          repair_number VARCHAR(50),
          technician_id VARCHAR(36),
          status VARCHAR(50) DEFAULT 'pending',
          diagnosis TEXT,
          repair_notes TEXT,
          cost DECIMAL(12,2) DEFAULT 0,
          parts_used TEXT,
          estimated_completion DATE,
          completed_at TIMESTAMP,
          created_by VARCHAR(36),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create repair order
router.post('/repairs', async (req, res) => {
  try {
    const { claim_id, technician_id, diagnosis, repair_notes, cost, estimated_completion } = req.body;
    const id = generateId();
    const repairNum = `REP-${Date.now().toString().slice(-8)}`;

    // Create table if needed
    try {
      await run(`
        CREATE TABLE IF NOT EXISTS repair_orders (
          id VARCHAR(36) PRIMARY KEY,
          claim_id VARCHAR(36),
          repair_number VARCHAR(50),
          technician_id VARCHAR(36),
          status VARCHAR(50) DEFAULT 'pending',
          diagnosis TEXT,
          repair_notes TEXT,
          cost DECIMAL(12,2) DEFAULT 0,
          parts_used TEXT,
          estimated_completion DATE,
          completed_at TIMESTAMP,
          created_by VARCHAR(36),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (_) { }

    await run(`
      INSERT INTO repair_orders (id, claim_id, repair_number, technician_id, status, diagnosis, repair_notes, cost, estimated_completion, created_by, created_at)
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    `, [id, claim_id, repairNum, technician_id || null, diagnosis || null, repair_notes || null, cost || 0, estimated_completion || null, req.user?.id]);

    // Update claim status to in_repair
    if (claim_id) {
      await run(`UPDATE warranty_claims SET status = 'in_repair', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [claim_id]);
    }

    const row = await get('SELECT * FROM repair_orders WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Update repair order
router.put('/repairs/:id', async (req, res) => {
  try {
    const { status, diagnosis, repair_notes, cost, parts_used } = req.body;

    await run(`
      UPDATE repair_orders
      SET status = COALESCE($1, status),
          diagnosis = COALESCE($2, diagnosis),
          repair_notes = COALESCE($3, repair_notes),
          cost = COALESCE($4, cost),
          parts_used = COALESCE($5, parts_used),
          completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [status, diagnosis, repair_notes, cost, parts_used, req.params.id]);

    // If repair completed, update the claim
    if (status === 'completed') {
      const repair = await get('SELECT claim_id FROM repair_orders WHERE id = $1', [req.params.id]);
      if (repair?.claim_id) {
        await run(`UPDATE warranty_claims SET status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [repair.claim_id]);
      }
    }

    const row = await get('SELECT * FROM repair_orders WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
