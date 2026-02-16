/**
 * BI ERP — Consumed Invoice Service
 * فاتورة مواد مستهلكة — سحب من المخزن دون بيع
 * Used for internal consumption (office supplies, employee materials, etc.)
 */
const { run, get, all } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit.middleware');

// ─── AUTO NUMBER ───────────────────────
async function nextNumber() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const r = await get(
        `SELECT invoice_number FROM invoices WHERE type = 'consumed' AND invoice_number LIKE $1 ORDER BY created_at DESC LIMIT 1`,
        [`CON-${today}-%`]
    ).catch(() => null);
    let seq = 1;
    if (r?.invoice_number) {
        const m = r.invoice_number.match(/-(\d+)$/);
        if (m) seq = parseInt(m[1], 10) + 1;
    }
    return `CON-${today}-${String(seq).padStart(4, '0')}`;
}

// ─── CREATE ────────────────────────────
async function create(data, userId) {
    const id = generateId();
    const invoiceNumber = await nextNumber();
    const items = data.items || [];

    let subtotal = 0;
    for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.cost_price) || parseFloat(item.unit_price) || 0;
        subtotal += qty * price;
    }

    await run(`
    INSERT INTO invoices (
      id, invoice_number, type, status, payment_status,
      customer_id, warehouse_id,
      subtotal, total, paid_amount, remaining_amount,
      currency, exchange_rate,
      notes, deduct_from_capital,
      consumed_by, consumed_reason,
      created_by, created_at, updated_at
    ) VALUES (
      $1, $2, 'consumed', 'confirmed', 'paid',
      $3, $4,
      $5, $6, $7, 0,
      $8, $9,
      $10, $11,
      $12, $13,
      $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `, [
        id, invoiceNumber,
        data.consumer_id || null, data.warehouse_id || null,
        subtotal, subtotal, subtotal,
        data.currency || 'IQD', parseFloat(data.exchange_rate) || 1,
        data.notes || null, data.deduct_from_capital !== false,
        data.consumed_by || null, data.consumed_reason || null,
        userId
    ]);

    // Insert items at cost price + deduct stock
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = generateId();
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.cost_price) || parseFloat(item.unit_price) || 0;

        await run(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, product_name,
        quantity, unit_price, cost_price, total,
        unit_id, barcode, sort_order, notes, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP
      )
    `, [
            itemId, id, item.product_id || null, item.product_name || null,
            qty, price, price, qty * price,
            item.unit_id || null, item.barcode || null, i, item.notes || null
        ]);

        // Deduct from stock
        if (item.product_id) {
            await run('UPDATE products SET quantity = COALESCE(quantity, 0) - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [qty, item.product_id]).catch(() => { });
        }
    }

    await logAudit('invoice', id, 'create', null, { type: 'consumed', total: subtotal }, { user: { id: userId } });
    return get('SELECT * FROM invoices WHERE id = $1', [id]);
}

// ─── LIST ──────────────────────────────
async function list(filters = {}) {
    let q = `
    SELECT i.*, u.full_name as created_by_name
    FROM invoices i
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.type = 'consumed' AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
  `;
    const params = [];
    if (filters.from) { params.push(filters.from); q += ` AND i.created_at::date >= $${params.length}`; }
    if (filters.to) { params.push(filters.to); q += ` AND i.created_at::date <= $${params.length}`; }
    q += ' ORDER BY i.created_at DESC LIMIT 100';
    return all(q, params);
}

module.exports = { create, list, nextNumber };
