const { get, all, run } = require('../config/database');

async function findAll(filters = {}) {
  let sql = `
    SELECT i.*, c.name as customer_name, s.name as supplier_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE (i.is_deleted = FALSE OR i.is_deleted IS NULL)
  `;
  const params = [];
  if (filters.type) params.push(filters.type), sql += ` AND i.type = ?`;
  if (filters.status) params.push(filters.status), sql += ` AND i.status = ?`;
  if (filters.customer_id) params.push(filters.customer_id), sql += ` AND i.customer_id = ?`;
  if (filters.supplier_id) params.push(filters.supplier_id), sql += ` AND i.supplier_id = ?`;
  sql += ` ORDER BY i.created_at DESC`;
  if (filters.limit) params.push(parseInt(filters.limit, 10) || 50), sql += ` LIMIT ?`;
  if (filters.offset) params.push(parseInt(filters.offset, 10)), sql += ` OFFSET ?`;
  return all(sql, params);
}

async function findById(id) {
  return get(`
    SELECT i.*, c.name as customer_name, s.name as supplier_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.id = ?
  `, [id]);
}

async function getItems(invoiceId) {
  return all('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at', [invoiceId]);
}

async function getPayments(invoiceId) {
  return all('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY received_at', [invoiceId]);
}

async function create(data) {
  const { generateId } = require('../utils/helpers');
  const id = data.id || generateId();
  const total = parseFloat(data.total) || 0;
  const paid = parseFloat(data.paid_amount) || 0;
  await run(
    `INSERT INTO invoices (id, invoice_number, type, status, payment_status, customer_id, supplier_id, subtotal, discount_amount, tax_amount, total, paid_amount, remaining_amount, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.invoice_number || null, data.type || 'sale', data.status || 'draft', data.payment_status || 'pending', data.customer_id || null, data.supplier_id || null, parseFloat(data.subtotal) || 0, parseFloat(data.discount_amount) || 0, parseFloat(data.tax_amount) || 0, total, paid, total - paid, data.notes || null, data.created_by || null]
  );
  return findById(id);
}

async function addItem(invoiceId, item) {
  const { generateId } = require('../utils/helpers');
  const id = generateId();
  const total = (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0) - (parseFloat(item.discount) || 0);
  await run(
    `INSERT INTO invoice_items (id, invoice_id, product_id, product_name, quantity, unit_price, cost_price, discount, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, invoiceId, item.product_id || null, item.product_name || null, parseInt(item.quantity, 10) || 1, parseFloat(item.unit_price) || 0, parseFloat(item.cost_price) || 0, parseFloat(item.discount) || 0, total, item.notes || null]
  );
  return { id };
}

async function addPayment(invoiceId, amount, paymentMethod, notes, receivedBy) {
  const { generateId } = require('../utils/helpers');
  const id = generateId();
  await run(
    `INSERT INTO invoice_payments (id, invoice_id, amount, payment_method, notes, received_by) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, invoiceId, parseFloat(amount), paymentMethod || null, notes || null, receivedBy || null]
  );
  await run('UPDATE invoices SET paid_amount = paid_amount + ?, remaining_amount = total - (paid_amount + ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [amount, amount, invoiceId]);
  return { id };
}

async function updateStatus(id, status) {
  await run('UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
  return findById(id);
}

module.exports = { findAll, findById, getItems, getPayments, create, addItem, addPayment, updateStatus };
