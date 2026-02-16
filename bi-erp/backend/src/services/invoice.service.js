/**
 * BI ERP — Enhanced Invoice Service (Phase 2)
 * فواتير الشراء والبيع المتقدمة
 * Adds: full purchase workflow, expenses, audit, auto-numbering, batch items, profit calc, multi-currency
 */
const invoiceRepo = require('../repositories/invoice.repository');
const { get, all, run } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit.middleware');
const logger = require('../utils/logger');

const ND = "AND (is_deleted = 0 OR is_deleted IS NULL OR is_deleted = false)";

// ─── AUTO NUMBER ───────────────────────
async function generateInvoiceNumber(type) {
  const prefix = type === 'purchase' ? 'PUR' : type === 'sale' ? 'SAL' : type === 'return_purchase' ? 'RPR' : type === 'return_sale' ? 'RSL' : 'INV';
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await get(
    `SELECT COUNT(*) as c FROM invoices WHERE type = $1 AND created_at::date = CURRENT_DATE`,
    [type]
  ).catch(() => ({ c: 0 }));
  const seq = String((parseInt(count?.c || 0) + 1)).padStart(4, '0');
  return `${prefix}-${dateStr}-${seq}`;
}

// ─── LIST (enhanced) ───────────────────
async function list(filters = {}) {
  let q = `
    SELECT i.*, c.name as customer_name, c.phone as customer_phone,
      s.name as supplier_name, s.phone as supplier_phone,
      u.full_name as created_by_name, au.full_name as auditor_name,
      pr.full_name as preparer_name, sp.full_name as salesperson_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN users u ON i.created_by = u.id
    LEFT JOIN users au ON i.auditor_id = au.id
    LEFT JOIN users pr ON i.preparer_id = pr.id
    LEFT JOIN users sp ON i.salesperson_id = sp.id
    WHERE (i.is_deleted = 0 OR i.is_deleted IS NULL OR i.is_deleted = false)
  `;
  const params = [];

  if (filters.type) { params.push(filters.type); q += ` AND i.type = $${params.length}`; }
  if (filters.status) { params.push(filters.status); q += ` AND i.status = $${params.length}`; }
  if (filters.payment_status) { params.push(filters.payment_status); q += ` AND i.payment_status = $${params.length}`; }
  if (filters.customer_id) { params.push(filters.customer_id); q += ` AND i.customer_id = $${params.length}`; }
  if (filters.supplier_id) { params.push(filters.supplier_id); q += ` AND i.supplier_id = $${params.length}`; }
  if (filters.salesperson_id) { params.push(filters.salesperson_id); q += ` AND i.salesperson_id = $${params.length}`; }
  if (filters.warehouse_id) { params.push(filters.warehouse_id); q += ` AND i.warehouse_id = $${params.length}`; }
  if (filters.currency) { params.push(filters.currency); q += ` AND i.currency = $${params.length}`; }
  if (filters.from_date) { params.push(filters.from_date); q += ` AND i.invoice_date >= $${params.length}`; }
  if (filters.to_date) { params.push(filters.to_date); q += ` AND i.invoice_date <= $${params.length}`; }
  if (filters.is_audited !== undefined) { params.push(filters.is_audited === 'true'); q += ` AND i.is_audited = $${params.length}`; }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    q += ` AND (i.invoice_number ILIKE $${params.length} OR c.name ILIKE $${params.length} OR s.name ILIKE $${params.length})`;
  }

  q += ' ORDER BY i.created_at DESC';
  const limit = parseInt(filters.limit) || 50;
  const offset = parseInt(filters.offset) || 0;
  params.push(limit); q += ` LIMIT $${params.length}`;
  params.push(offset); q += ` OFFSET $${params.length}`;

  return all(q, params);
}

// ─── GET BY ID (with items, payments, expenses) ───
async function getById(id) {
  const invoice = await get(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
      c.balance as customer_balance, c.credit_limit as customer_credit_limit,
      s.name as supplier_name, s.phone as supplier_phone, s.address as supplier_address,
      s.balance as supplier_balance,
      u.full_name as created_by_name, au.full_name as auditor_name,
      pr.full_name as preparer_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN users u ON i.created_by = u.id
    LEFT JOIN users au ON i.auditor_id = au.id
    LEFT JOIN users pr ON i.preparer_id = pr.id
    WHERE i.id = $1
  `, [id]);
  if (!invoice) return null;

  const items = await all(`
    SELECT ii.*, p.name as product_name, p.code as product_code, p.barcode,
      p.cost_price as current_cost, p.selling_price as current_sell_price,
      p.quantity as stock_qty, p.image_url,
      u.name as unit_name, u2.name as secondary_unit_name
    FROM invoice_items ii
    LEFT JOIN products p ON ii.product_id = p.id
    LEFT JOIN units u ON ii.unit_id = u.id
    LEFT JOIN units u2 ON ii.secondary_unit_id = u2.id
    WHERE ii.invoice_id = $1
    ORDER BY ii.sort_order ASC, ii.created_at ASC
  `, [id]);

  const payments = await all(
    `SELECT ip.*, u.full_name as received_by_name FROM invoice_payments ip LEFT JOIN users u ON ip.received_by = u.id WHERE ip.invoice_id = $1 ORDER BY ip.received_at ASC`,
    [id]
  );

  const expenses = await all('SELECT * FROM invoice_expenses WHERE invoice_id = $1 ORDER BY created_at', [id]).catch(() => []);

  return { ...invoice, items, payments, expenses };
}

// ─── CREATE PURCHASE INVOICE ───────────
async function createPurchaseInvoice(data, userId) {
  const id = data.id || generateId();
  const invoiceNumber = data.invoice_number || await generateInvoiceNumber('purchase');
  const items = data.items || [];
  const expensesList = data.expenses || [];

  // Calculate totals
  let subtotal = 0;
  let totalWeight = 0;
  let totalVolume = 0;
  for (const item of items) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const discount = parseFloat(item.discount) || 0;
    subtotal += (qty * price) - discount;
    totalWeight += parseFloat(item.weight) || 0;
    totalVolume += parseFloat(item.volume) || 0;
  }

  const discountAmount = parseFloat(data.discount_amount) || 0;
  const taxAmount = parseFloat(data.tax_amount) || 0;
  let expensesTotal = 0;
  for (const exp of expensesList) {
    expensesTotal += parseFloat(exp.amount) || 0;
  }
  const total = subtotal - discountAmount + taxAmount + expensesTotal;
  const paidAmount = parseFloat(data.paid_amount) || 0;

  await run(`
    INSERT INTO invoices (
      id, invoice_number, type, status, payment_status,
      supplier_id, customer_id, warehouse_id,
      subtotal, discount_amount, discount_type, discount_percent, tax_amount,
      total, total_before_discount, paid_amount, remaining_amount,
      currency, exchange_rate,
      supplier_invoice_no, supplier_invoice_date,
      driver_name, driver_phone, vehicle_no,
      receiver_name, invoice_date, entry_date,
      protection_level, due_days, due_date,
      total_weight, total_volume,
      shipping_method, shipping_cost,
      notes, supervisor_comment,
      is_incomplete, attachment_url, attachment_url_2,
      expenses_total, payment_method, payment_type,
      created_by, created_at, updated_at
    ) VALUES (
      $1, $2, 'purchase', $3, $4,
      $5, $6, $7,
      $8, $9, $10, $11, $12,
      $13, $14, $15, $16,
      $17, $18,
      $19, $20,
      $21, $22, $23,
      $24, $25, CURRENT_TIMESTAMP,
      $26, $27, $28,
      $29, $30,
      $31, $32,
      $33, $34,
      $35, $36, $37,
      $38, $39, $40,
      $41, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `, [
    id, invoiceNumber, data.status || 'draft', data.payment_status || 'pending',
    data.supplier_id || null, data.customer_id || null, data.warehouse_id || null,
    subtotal, discountAmount, data.discount_type || 'fixed', parseFloat(data.discount_percent) || 0, taxAmount,
    total, subtotal, paidAmount, total - paidAmount,
    data.currency || 'IQD', parseFloat(data.exchange_rate) || 1,
    data.supplier_invoice_no || null, data.supplier_invoice_date || null,
    data.driver_name || null, data.driver_phone || null, data.vehicle_no || null,
    data.receiver_name || null, data.invoice_date || new Date().toISOString().split('T')[0],
    data.protection_level || 'medium', data.due_days ? parseInt(data.due_days) : null,
    data.due_days ? new Date(Date.now() + parseInt(data.due_days) * 86400000).toISOString().split('T')[0] : null,
    totalWeight || null, totalVolume || null,
    data.shipping_method || null, parseFloat(data.shipping_cost) || 0,
    data.notes || null, data.supervisor_comment || null,
    data.is_incomplete || false, data.attachment_url || null, data.attachment_url_2 || null,
    expensesTotal, data.payment_method || null, data.payment_type || null,
    userId
  ]);

  // Insert items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemId = generateId();
    const qty = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const discount = parseFloat(item.discount) || 0;
    const itemTotal = (qty * unitPrice) - discount;
    const profit = (parseFloat(item.sell_price) || 0) - unitPrice;

    await run(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, product_name, serial_number,
        quantity, unit_price, cost_price, discount, total,
        unit_id, secondary_unit_id, secondary_qty,
        weight, volume,
        offer_qty, offer_bonus, expiry_date,
        item_notes, currency, exchange_rate,
        purchase_price, sell_price, profit,
        barcode, sort_order, notes,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24,
        $25, $26, $27,
        CURRENT_TIMESTAMP
      )
    `, [
      itemId, id, item.product_id || null, item.product_name || null, item.serial_number || null,
      qty, unitPrice, unitPrice, discount, itemTotal,
      item.unit_id || null, item.secondary_unit_id || null, item.secondary_qty || null,
      item.weight || null, item.volume || null,
      parseInt(item.offer_qty) || 0, parseInt(item.offer_bonus) || 0, item.expiry_date || null,
      item.item_notes || null, item.currency || data.currency || 'IQD', parseFloat(item.exchange_rate) || parseFloat(data.exchange_rate) || 1,
      unitPrice, parseFloat(item.sell_price) || null, profit > 0 ? profit : null,
      item.barcode || null, i, item.notes || null
    ]);
  }

  // Insert expenses
  for (const exp of expensesList) {
    const expId = generateId();
    await run(
      `INSERT INTO invoice_expenses (id, invoice_id, description, amount, currency, category, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [expId, id, exp.description, parseFloat(exp.amount) || 0, exp.currency || data.currency || 'IQD', exp.category || null, exp.notes || null]
    );
  }

  // Audit
  await logAudit('invoice', id, 'create', null, { type: 'purchase', invoice_number: invoiceNumber, total, items_count: items.length }, { user: { id: userId } });

  return getById(id);
}

// ─── CREATE SALE INVOICE ───────────────
async function createSaleInvoice(data, userId) {
  const id = data.id || generateId();
  const invoiceNumber = data.invoice_number || await generateInvoiceNumber('sale');
  const items = data.items || [];

  let subtotal = 0;
  let profitTotal = 0;
  for (const item of items) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const discount = parseFloat(item.discount) || 0;
    const costPrice = parseFloat(item.cost_price) || 0;
    subtotal += (qty * price) - discount;
    profitTotal += (price - costPrice - (parseFloat(item.commission) || 0)) * qty;
  }

  const discountAmount = parseFloat(data.discount_amount) || 0;
  const taxAmount = parseFloat(data.tax_amount) || 0;
  const total = subtotal - discountAmount + taxAmount;
  const paidAmount = parseFloat(data.paid_amount) || 0;

  await run(`
    INSERT INTO invoices (
      id, invoice_number, type, status, payment_status,
      customer_id, supplier_id, warehouse_id,
      subtotal, discount_amount, discount_type, discount_percent, tax_amount,
      total, total_before_discount, paid_amount, remaining_amount,
      currency, exchange_rate, profit_total,
      salesperson_id, commission_amount,
      driver_name, driver_phone, vehicle_no,
      invoice_date, entry_date,
      protection_level, due_days, due_date,
      shipping_method, shipping_cost,
      notes, supervisor_comment,
      collect_previous_debt, collect_debt_amount,
      payment_method, payment_type,
      created_by, created_at, updated_at
    ) VALUES (
      $1, $2, 'sale', $3, $4,
      $5, $6, $7,
      $8, $9, $10, $11, $12,
      $13, $14, $15, $16,
      $17, $18, $19,
      $20, $21,
      $22, $23, $24,
      $25, CURRENT_TIMESTAMP,
      $26, $27, $28,
      $29, $30,
      $31, $32,
      $33, $34,
      $35, $36,
      $37, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `, [
    id, invoiceNumber, data.status || 'draft', data.payment_status || 'pending',
    data.customer_id || null, data.supplier_id || null, data.warehouse_id || null,
    subtotal, discountAmount, data.discount_type || 'fixed', parseFloat(data.discount_percent) || 0, taxAmount,
    total, subtotal, paidAmount, total - paidAmount,
    data.currency || 'IQD', parseFloat(data.exchange_rate) || 1, profitTotal,
    data.salesperson_id || null, parseFloat(data.commission_amount) || 0,
    data.driver_name || null, data.driver_phone || null, data.vehicle_no || null,
    data.invoice_date || new Date().toISOString().split('T')[0],
    data.protection_level || 'medium', data.due_days ? parseInt(data.due_days) : null,
    data.due_days ? new Date(Date.now() + parseInt(data.due_days) * 86400000).toISOString().split('T')[0] : null,
    data.shipping_method || null, parseFloat(data.shipping_cost) || 0,
    data.notes || null, data.supervisor_comment || null,
    data.collect_previous_debt || false, parseFloat(data.collect_debt_amount) || 0,
    data.payment_method || null, data.payment_type || null,
    userId
  ]);

  // Insert items with profit
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemId = generateId();
    const qty = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const costPrice = parseFloat(item.cost_price) || 0;
    const discount = parseFloat(item.discount) || 0;
    const itemTotal = (qty * unitPrice) - discount;
    const profit = (unitPrice - costPrice) * qty;

    await run(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, product_name, serial_number,
        quantity, unit_price, cost_price, discount, total,
        unit_id, offer_qty, offer_bonus, expiry_date,
        item_notes, currency, exchange_rate,
        purchase_price, sell_price, profit,
        barcode, sort_order, notes,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20,
        $21, $22, $23,
        CURRENT_TIMESTAMP
      )
    `, [
      itemId, id, item.product_id || null, item.product_name || null, item.serial_number || null,
      qty, unitPrice, costPrice, discount, itemTotal,
      item.unit_id || null, parseInt(item.offer_qty) || 0, parseInt(item.offer_bonus) || 0, item.expiry_date || null,
      item.item_notes || null, item.currency || data.currency || 'IQD', parseFloat(item.exchange_rate) || 1,
      costPrice, unitPrice, profit,
      item.barcode || null, i, item.notes || null
    ]);

    // Deduct from stock for confirmed sales
    if (data.status === 'confirmed' && item.product_id) {
      await run('UPDATE products SET quantity = quantity - $1, last_sold_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [qty, item.product_id]).catch(() => { });
    }
  }

  await logAudit('invoice', id, 'create', null, { type: 'sale', invoice_number: invoiceNumber, total, profit: profitTotal }, { user: { id: userId } });
  return getById(id);
}

// ─── GENERIC CREATE (backward compat) ──
async function create(data) {
  if (data.type === 'purchase') return createPurchaseInvoice(data, data.created_by);
  if (data.type === 'sale') return createSaleInvoice(data, data.created_by);
  return invoiceRepo.create(data);
}

// ─── UPDATE INVOICE ────────────────────
async function updateInvoice(id, data, userId) {
  const old = await get('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!old) return null;

  const fields = [
    'type', 'customer_id', 'supplier_id', 'warehouse_id', 'payment_method', 'payment_type',
    'discount_amount', 'discount_type', 'discount_percent', 'tax_amount', 'notes',
    'subtotal', 'total', 'total_before_discount', 'paid_amount', 'remaining_amount',
    'currency', 'exchange_rate', 'supplier_invoice_no', 'supplier_invoice_date',
    'driver_name', 'driver_phone', 'vehicle_no', 'receiver_name',
    'invoice_date', 'protection_level', 'due_days', 'due_date',
    'total_weight', 'total_volume', 'shipping_method', 'shipping_cost',
    'supervisor_comment', 'is_incomplete', 'attachment_url', 'attachment_url_2',
    'expenses_total', 'profit_total', 'salesperson_id', 'commission_amount',
    'collect_previous_debt', 'collect_debt_amount', 'payment_status',
    'total_in_words',
  ];
  const sets = [];
  const params = [];
  let i = 1;
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = $${i++}`); params.push(data[f]); }
  }
  if (sets.length === 0) return null;

  sets.push(`updated_at = $${i++}`); params.push(new Date());
  params.push(id);
  await run(`UPDATE invoices SET ${sets.join(', ')} WHERE id = $${i}`, params);

  // Update items if provided
  if (data.items && Array.isArray(data.items)) {
    await run('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
    for (let idx = 0; idx < data.items.length; idx++) {
      const item = data.items[idx];
      const itemId = generateId();
      const qty = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const discount = parseFloat(item.discount) || 0;
      await run(`
        INSERT INTO invoice_items (id, invoice_id, product_id, product_name, quantity, unit_price, cost_price, discount, total, unit_id, offer_qty, offer_bonus, expiry_date, item_notes, currency, exchange_rate, purchase_price, sell_price, profit, barcode, sort_order, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP)
      `, [
        itemId, id, item.product_id || null, item.product_name || null,
        qty, unitPrice, parseFloat(item.cost_price) || unitPrice, discount, (qty * unitPrice) - discount,
        item.unit_id || null, parseInt(item.offer_qty) || 0, parseInt(item.offer_bonus) || 0,
        item.expiry_date || null, item.item_notes || null,
        item.currency || 'IQD', parseFloat(item.exchange_rate) || 1,
        parseFloat(item.purchase_price) || unitPrice, parseFloat(item.sell_price) || null,
        parseFloat(item.profit) || null, item.barcode || null, idx
      ]);
    }
  }

  // Update expenses if provided
  if (data.expenses && Array.isArray(data.expenses)) {
    await run('DELETE FROM invoice_expenses WHERE invoice_id = $1', [id]);
    for (const exp of data.expenses) {
      await run(
        `INSERT INTO invoice_expenses (id, invoice_id, description, amount, currency, category, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [generateId(), id, exp.description, parseFloat(exp.amount) || 0, exp.currency || 'IQD', exp.category || null, exp.notes || null]
      );
    }
  }

  await logAudit('invoice', id, 'update', old, data, { user: { id: userId } });
  return getById(id);
}

// ─── AUDIT INVOICE ─────────────────────
async function auditInvoice(id, userId) {
  const invoice = await get('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!invoice) return { error: 'NOT_FOUND' };
  await run(
    `UPDATE invoices SET is_audited = TRUE, auditor_id = $1, audited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [userId, id]
  );
  await logAudit('invoice', id, 'audit', { is_audited: false }, { is_audited: true, auditor_id: userId }, { user: { id: userId } });
  return { data: await getById(id) };
}

// ─── PREPARE INVOICE ───────────────────
async function prepareInvoice(id, userId) {
  await run(
    `UPDATE invoices SET status = 'preparing', preparer_id = $1, prepared_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [userId, id]
  );
  return getById(id);
}

// ─── CONFIRM INVOICE ───────────────────
async function confirmInvoice(id, userId) {
  const invoice = await get('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!invoice) return { error: 'NOT_FOUND' };

  await run(
    `UPDATE invoices SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, confirmed_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [userId, id]
  );

  // For purchases: add to stock
  if (invoice.type === 'purchase') {
    const items = await all('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
    for (const item of items) {
      if (item.product_id) {
        await run('UPDATE products SET quantity = quantity + $1, cost_price = $2, last_purchased_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [parseFloat(item.quantity) || 0, parseFloat(item.unit_price) || 0, item.product_id]).catch(() => { });
      }
    }
  }
  // For sales: deduct from stock
  if (invoice.type === 'sale') {
    const items = await all('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
    for (const item of items) {
      if (item.product_id) {
        await run('UPDATE products SET quantity = quantity - $1, last_sold_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [parseFloat(item.quantity) || 0, item.product_id]).catch(() => { });
      }
    }
  }

  await logAudit('invoice', id, 'confirm', { status: invoice.status }, { status: 'confirmed' }, { user: { id: userId } });
  return { data: await getById(id) };
}

// ─── CANCEL INVOICE ────────────────────
async function cancelInvoice(id, reason, userId) {
  const invoice = await get('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!invoice) return { error: 'NOT_FOUND' };
  if (invoice.status === 'cancelled') return { error: 'ALREADY_CANCELLED' };

  await run(
    `UPDATE invoices SET status = 'cancelled', cancel_reason = $1, cancelled_at = CURRENT_TIMESTAMP, cancelled_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
    [reason || null, userId, id]
  );

  // Reverse stock changes
  if (invoice.status === 'confirmed') {
    const items = await all('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
    for (const item of items) {
      if (!item.product_id) continue;
      const qtyChange = parseFloat(item.quantity) || 0;
      if (invoice.type === 'sale') {
        await run('UPDATE products SET quantity = quantity + $1 WHERE id = $2', [qtyChange, item.product_id]).catch(() => { });
      } else if (invoice.type === 'purchase') {
        await run('UPDATE products SET quantity = quantity - $1 WHERE id = $2', [qtyChange, item.product_id]).catch(() => { });
      }
    }
  }

  await logAudit('invoice', id, 'cancel', { status: invoice.status }, { status: 'cancelled', reason }, { user: { id: userId } });
  return { data: await getById(id) };
}

// ─── TRANSITION STATUS ─────────────────
const VALID_STATUSES = ['draft', 'waiting', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];
async function transitionStatus(id, status, notes) {
  if (!VALID_STATUSES.includes(status)) return { error: `حالة غير صحيحة: ${status}` };
  const invoice = await get('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!invoice) return { error: 'NOT_FOUND' };
  await run(`UPDATE invoices SET status = $1, status_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, [status, notes || null, id]);
  return { data: await getById(id) };
}

// ─── PRINT ─────────────────────────────
async function getPrintData(id) {
  const invoice = await getById(id);
  if (!invoice) return null;

  // Track prints
  await run(`UPDATE invoices SET print_count = COALESCE(print_count, 0) + 1, last_printed_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]).catch(() => { });

  let company = { name: 'BI Company', name_en: 'BI Company', address: 'بغداد، العراق', phone: '' };
  try {
    const settings = await all("SELECT key, value FROM settings WHERE key IN ('company_name', 'company_name_en', 'company_address', 'company_phone', 'company_logo')");
    for (const s of settings) {
      if (s.key === 'company_name') company.name = s.value;
      if (s.key === 'company_name_en') company.name_en = s.value;
      if (s.key === 'company_address') company.address = s.value;
      if (s.key === 'company_phone') company.phone = s.value;
      if (s.key === 'company_logo') company.logo_url = s.value;
    }
  } catch (_) { }

  return { invoice, items: invoice.items, expenses: invoice.expenses, company, print_count: (invoice.print_count || 0) + 1 };
}

// ─── STATS ─────────────────────────────
async function getStats() {
  const nd = "AND (is_deleted = 0 OR is_deleted IS NULL OR is_deleted = false)";
  const [total, today, pending, totalAmount, todayAmount, purchases, sales] = await Promise.all([
    get(`SELECT COUNT(*) as c FROM invoices WHERE 1=1 ${nd}`).then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COUNT(*) as c FROM invoices WHERE created_at::date = CURRENT_DATE ${nd}`).then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COUNT(*) as c FROM invoices WHERE payment_status = 'pending' ${nd}`).then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE 1=1 ${nd}`).then(r => r?.s || 0).catch(() => 0),
    get(`SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE type = 'sale' AND created_at::date = CURRENT_DATE ${nd}`).then(r => r?.s || 0).catch(() => 0),
    get(`SELECT COUNT(*) as c, COALESCE(SUM(total),0) as s FROM invoices WHERE type = 'purchase' ${nd}`).catch(() => ({ c: 0, s: 0 })),
    get(`SELECT COUNT(*) as c, COALESCE(SUM(total),0) as s FROM invoices WHERE type = 'sale' ${nd}`).catch(() => ({ c: 0, s: 0 })),
  ]);
  return {
    total, today, pending, total_amount: totalAmount, today_amount: todayAmount,
    purchases_count: purchases?.c || 0, purchases_amount: purchases?.s || 0,
    sales_count: sales?.c || 0, sales_amount: sales?.s || 0,
  };
}

// ─── WAITING ───────────────────────────
async function getWaiting() {
  return all("SELECT * FROM invoices WHERE status = 'waiting' AND (is_deleted = 0 OR is_deleted IS NULL OR is_deleted = false) ORDER BY created_at DESC LIMIT 50").catch(() => []);
}

// ─── ADD ITEM ──────────────────────────
async function addItem(invoiceId, item) {
  return invoiceRepo.addItem(invoiceId, item);
}

// ─── ADD PAYMENT ───────────────────────
async function addPayment(invoiceId, amount, paymentMethod, notes, receivedBy) {
  return invoiceRepo.addPayment(invoiceId, amount, paymentMethod, notes, receivedBy);
}

// ─── UPDATE STATUS ─────────────────────
async function updateStatus(id, status) {
  return invoiceRepo.updateStatus(id, status);
}

// ─── ADD EXPENSE ───────────────────────
async function addExpense(invoiceId, expense) {
  const id = generateId();
  await run(
    `INSERT INTO invoice_expenses (id, invoice_id, description, amount, currency, category, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, invoiceId, expense.description, parseFloat(expense.amount) || 0, expense.currency || 'IQD', expense.category || null, expense.notes || null]
  );
  // Recalculate expenses total
  const total = await get('SELECT COALESCE(SUM(amount), 0) as s FROM invoice_expenses WHERE invoice_id = $1', [invoiceId]);
  await run('UPDATE invoices SET expenses_total = $1, total = subtotal - discount_amount + tax_amount + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [total?.s || 0, invoiceId]);
  return { id, ...expense };
}

// ─── GET EXPENSES ──────────────────────
async function getExpenses(invoiceId) {
  return all('SELECT * FROM invoice_expenses WHERE invoice_id = $1 ORDER BY created_at', [invoiceId]);
}

// ─── DELETE EXPENSE ────────────────────
async function deleteExpense(expenseId) {
  const exp = await get('SELECT * FROM invoice_expenses WHERE id = $1', [expenseId]);
  if (!exp) return { error: 'NOT_FOUND' };
  await run('DELETE FROM invoice_expenses WHERE id = $1', [expenseId]);
  const total = await get('SELECT COALESCE(SUM(amount), 0) as s FROM invoice_expenses WHERE invoice_id = $1', [exp.invoice_id]);
  await run('UPDATE invoices SET expenses_total = $1, total = subtotal - discount_amount + tax_amount + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [total?.s || 0, exp.invoice_id]);
  return { success: true };
}

// ─── GET HISTORY ───────────────────────
async function getInvoiceHistory(id) {
  const { getAuditHistory } = require('../middleware/audit.middleware');
  return getAuditHistory('invoice', id);
}

// ─── CONVERT TO ACTIVE (backward compat)
async function convertToActive(id, userId) {
  return confirmInvoice(id, userId);
}

module.exports = {
  list, getById, create,
  createPurchaseInvoice, createSaleInvoice,
  updateInvoice, cancelInvoice, transitionStatus,
  auditInvoice, prepareInvoice, confirmInvoice, convertToActive,
  getStats, getWaiting, getPrintData,
  addItem, addPayment, updateStatus,
  addExpense, getExpenses, deleteExpense,
  getInvoiceHistory,
  generateInvoiceNumber,
};
