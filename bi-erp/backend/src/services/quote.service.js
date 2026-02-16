/**
 * BI ERP — Quote Invoice Service
 * فاتورة عرض سعر — لا تؤثر على المخزون
 */
const { run, get, all } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit.middleware');

// ─── AUTO NUMBER ───────────────────────
async function nextNumber() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const r = await get(
        `SELECT invoice_number FROM invoices WHERE type = 'quote' AND invoice_number LIKE $1 ORDER BY created_at DESC LIMIT 1`,
        [`QOT-${today}-%`]
    ).catch(() => null);
    let seq = 1;
    if (r?.invoice_number) {
        const m = r.invoice_number.match(/-(\d+)$/);
        if (m) seq = parseInt(m[1], 10) + 1;
    }
    return `QOT-${today}-${String(seq).padStart(4, '0')}`;
}

// ─── CREATE ────────────────────────────
async function create(data, userId) {
    const id = generateId();
    const invoiceNumber = await nextNumber();
    const items = data.items || [];

    let subtotal = 0;
    for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const discount = parseFloat(item.discount) || 0;
        subtotal += (qty * price) - discount;
    }

    const discountAmount = parseFloat(data.discount_amount) || 0;
    const total = subtotal - discountAmount;

    await run(`
    INSERT INTO invoices (
      id, invoice_number, type, status, payment_status,
      customer_id, warehouse_id,
      subtotal, discount_amount, total,
      paid_amount, remaining_amount,
      currency, exchange_rate,
      notes, valid_until,
      salesperson_id,
      created_by, created_at, updated_at
    ) VALUES (
      $1, $2, 'quote', 'draft', 'pending',
      $3, $4,
      $5, $6, $7,
      0, $8,
      $9, $10,
      $11, $12,
      $13,
      $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `, [
        id, invoiceNumber,
        data.customer_id || null, data.warehouse_id || null,
        subtotal, discountAmount, total,
        total,
        data.currency || 'IQD', parseFloat(data.exchange_rate) || 1,
        data.notes || null, data.valid_until || null,
        data.salesperson_id || null,
        userId
    ]);

    // Insert items — NO stock deduction
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = generateId();
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const discount = parseFloat(item.discount) || 0;

        await run(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, product_name,
        quantity, unit_price, discount, total,
        unit_id, barcode, sort_order, notes, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP
      )
    `, [
            itemId, id, item.product_id || null, item.product_name || null,
            qty, price, discount, (qty * price) - discount,
            item.unit_id || null, item.barcode || null, i, item.notes || null
        ]);
    }

    await logAudit('invoice', id, 'create', null, { type: 'quote', total }, { user: { id: userId } });
    return get('SELECT * FROM invoices WHERE id = $1', [id]);
}

// ─── CONVERT QUOTE TO SALE ─────────────
async function convertToSale(quoteId, userId) {
    const quote = await get('SELECT * FROM invoices WHERE id = $1 AND type = $2', [quoteId, 'quote']);
    if (!quote) return { error: 'NOT_FOUND' };

    // Change type from quote to sale
    await run(`
    UPDATE invoices SET type = 'sale', status = 'draft', updated_at = CURRENT_TIMESTAMP, converted_from_quote = $1
    WHERE id = $2
  `, [quoteId, quoteId]).catch(() => {
        // If converted_from_quote column doesn't exist, just update type
        return run('UPDATE invoices SET type = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', ['sale', 'draft', quoteId]);
    });

    await logAudit('invoice', quoteId, 'convert_to_sale', { type: 'quote' }, { type: 'sale' }, { user: { id: userId } });
    return { data: await get('SELECT * FROM invoices WHERE id = $1', [quoteId]) };
}

// ─── LIST ──────────────────────────────
async function list(filters = {}) {
    let q = `
    SELECT i.*, u.full_name as created_by_name, c.name as customer_name
    FROM invoices i
    LEFT JOIN users u ON i.created_by = u.id
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.type = 'quote' AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
  `;
    const params = [];
    if (filters.customer_id) { params.push(filters.customer_id); q += ` AND i.customer_id = $${params.length}`; }
    if (filters.from) { params.push(filters.from); q += ` AND i.created_at::date >= $${params.length}`; }
    if (filters.to) { params.push(filters.to); q += ` AND i.created_at::date <= $${params.length}`; }
    q += ' ORDER BY i.created_at DESC LIMIT 100';
    return all(q, params);
}

module.exports = { create, list, convertToSale, nextNumber };
