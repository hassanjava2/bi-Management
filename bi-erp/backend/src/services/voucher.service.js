/**
 * BI Management - Voucher Service (Phase 5)
 * سندات القبض والدفع والقيد والتحويلات
 */
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

const PREFIX = { receipt: 'RCV', payment: 'PAY', journal: 'JRN', exchange: 'EXC', transfer: 'TRF' };

async function nextVoucherNumber(type) {
    const prefix = PREFIX[type] || 'VCH';
    const year = new Date().getFullYear();
    const r = await get(`SELECT voucher_number FROM vouchers WHERE type = ? AND voucher_number LIKE ? ORDER BY created_at DESC LIMIT 1`, [type, `${prefix}-${year}-%`]);
    let seq = 1;
    if (r && r.voucher_number) {
        const m = r.voucher_number.match(/-(\d+)$/);
        if (m) seq = parseInt(m[1], 10) + 1;
    }
    return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

async function create(data) {
    const {
        type,
        amount,
        currency = 'IQD',
        customer_id,
        supplier_id,
        employee_id,
        from_account_id,
        to_account_id,
        reference_type,
        reference_id,
        payment_method,
        description,
        notes,
        created_by
    } = data;
    if (!type || amount == null) throw new Error('type and amount required');
    const id = generateId();
    const voucher_number = nextVoucherNumber(type);
    const createdAt = now();
    await run(`
        INSERT INTO vouchers (id, voucher_number, type, amount, currency, customer_id, supplier_id, employee_id, from_account_id, to_account_id, reference_type, reference_id, payment_method, description, notes, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, voucher_number, type, parseFloat(amount), currency, customer_id || null, supplier_id || null, employee_id || null, from_account_id || null, to_account_id || null, reference_type || null, reference_id || null, payment_method || null, description || null, notes || null, created_by || null, createdAt]);
    return await get('SELECT * FROM vouchers WHERE id = ?', [id]);
}

async function list(filters = {}) {
    const { type, from, to, page = 1, limit = 50 } = filters;
    let query = `SELECT v.*, u.full_name as created_by_name FROM vouchers v LEFT JOIN users u ON v.created_by = u.id WHERE (v.is_deleted = 0 OR v.is_deleted IS NULL)`;
    const params = [];
    if (type) { query += ` AND v.type = ?`; params.push(type); }
    if (from) { query += ` AND date(v.created_at) >= ?`; params.push(from); }
    if (to) { query += ` AND date(v.created_at) <= ?`; params.push(to); }
    query += ` ORDER BY v.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    return await all(query, params);
}

async function getById(id) {
    return await get('SELECT * FROM vouchers WHERE id = ?', [id]);
}

module.exports = { create, list, getById, nextVoucherNumber };
