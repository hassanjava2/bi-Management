/**
 * BI Management - Warranty Claims Service (Routes-level)
 * خدمة مطالبات الضمان وأوامر الإصلاح — للمسارات
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
      SUM(CASE WHEN status = 'in_repair' THEN 1 ELSE 0 END)::int as in_repair,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END)::int as resolved,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END)::int as closed
    FROM warranty_claims
  `);
    return stats || { total: 0, pending: 0, in_repair: 0, resolved: 0, closed: 0 };
}

// ─── List Claims ───
async function listClaims(filters) {
    const { status, search } = filters;
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
    return all(query, params);
}

// ─── Get Claim by ID ───
async function getClaimById(id) {
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
  `, [id]);
    if (!row) return null;

    let repairs = [];
    try {
        repairs = await all(`
      SELECT ro.*, u.full_name as technician_name
      FROM repair_orders ro
      LEFT JOIN users u ON ro.technician_id = u.id
      WHERE ro.claim_id = $1 ORDER BY ro.created_at DESC
    `, [id]);
    } catch (_) { }

    return { ...row, repairs };
}

// ─── Create Claim ───
async function createClaim(data, userId) {
    const id = generateId();
    const claimNum = data.claim_number || `WC-${Date.now().toString().slice(-8)}`;

    await run(`
    INSERT INTO warranty_claims (id, claim_number, product_id, customer_id, supplier_id, status, description, serial_number, warranty_end_date, created_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
  `, [id, claimNum, data.product_id || null, data.customer_id || null, data.supplier_id || null,
        data.status || 'pending', data.description || null, data.serial_number || null,
        data.warranty_end_date || null, userId]);

    return get('SELECT * FROM warranty_claims WHERE id = $1', [id]);
}

// ─── Update Claim ───
async function updateClaim(id, data) {
    await run(`
    UPDATE warranty_claims
    SET status = COALESCE($1, status), description = COALESCE($2, description),
        resolution = COALESCE($3, resolution), notes = COALESCE($4, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
  `, [data.status, data.description, data.resolution, data.notes, id]);
    return get('SELECT * FROM warranty_claims WHERE id = $1', [id]);
}

// ─── Close Claim ───
async function closeClaim(id, resolution, notes, userId) {
    await run(`
    UPDATE warranty_claims
    SET status = 'closed', resolution = $1, notes = COALESCE($2, notes),
        closed_at = CURRENT_TIMESTAMP, closed_by = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [resolution || 'تم الإغلاق', notes, userId, id]);
    return get('SELECT * FROM warranty_claims WHERE id = $1', [id]);
}

// ─── Ensure repair_orders table ───
async function ensureRepairOrdersTable() {
    try {
        await run(`CREATE TABLE IF NOT EXISTS repair_orders (
      id VARCHAR(36) PRIMARY KEY, claim_id VARCHAR(36), repair_number VARCHAR(50),
      technician_id VARCHAR(36), status VARCHAR(50) DEFAULT 'pending',
      diagnosis TEXT, repair_notes TEXT, cost DECIMAL(12,2) DEFAULT 0,
      parts_used TEXT, estimated_completion DATE, completed_at TIMESTAMP,
      created_by VARCHAR(36), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    } catch (_) { }
}

// ─── List Repairs ───
async function listRepairs() {
    let rows = [];
    try {
        rows = await all(`
      SELECT ro.*, wc.claim_number, wc.description as claim_description,
        p.name as product_name, c.name as customer_name, u.full_name as technician_name
      FROM repair_orders ro
      LEFT JOIN warranty_claims wc ON ro.claim_id = wc.id
      LEFT JOIN products p ON wc.product_id = p.id
      LEFT JOIN customers c ON wc.customer_id = c.id
      LEFT JOIN users u ON ro.technician_id = u.id
      ORDER BY ro.created_at DESC LIMIT 100
    `);
    } catch (_) {
        await ensureRepairOrdersTable();
    }
    return rows;
}

// ─── Create Repair ───
async function createRepair(data, userId) {
    await ensureRepairOrdersTable();
    const id = generateId();
    const repairNum = `REP-${Date.now().toString().slice(-8)}`;

    await run(`
    INSERT INTO repair_orders (id, claim_id, repair_number, technician_id, status, diagnosis, repair_notes, cost, estimated_completion, created_by, created_at)
    VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
  `, [id, data.claim_id, repairNum, data.technician_id || null, data.diagnosis || null,
        data.repair_notes || null, data.cost || 0, data.estimated_completion || null, userId]);

    if (data.claim_id) {
        await run(`UPDATE warranty_claims SET status = 'in_repair', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [data.claim_id]);
    }
    return get('SELECT * FROM repair_orders WHERE id = $1', [id]);
}

// ─── Update Repair ───
async function updateRepair(id, data) {
    await run(`
    UPDATE repair_orders
    SET status = COALESCE($1, status), diagnosis = COALESCE($2, diagnosis),
        repair_notes = COALESCE($3, repair_notes), cost = COALESCE($4, cost),
        parts_used = COALESCE($5, parts_used),
        completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
  `, [data.status, data.diagnosis, data.repair_notes, data.cost, data.parts_used, id]);

    if (data.status === 'completed') {
        const repair = await get('SELECT claim_id FROM repair_orders WHERE id = $1', [id]);
        if (repair?.claim_id) {
            await run(`UPDATE warranty_claims SET status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [repair.claim_id]);
        }
    }
    return get('SELECT * FROM repair_orders WHERE id = $1', [id]);
}

module.exports = {
    getStats, listClaims, getClaimById, createClaim, updateClaim, closeClaim,
    listRepairs, createRepair, updateRepair,
};
