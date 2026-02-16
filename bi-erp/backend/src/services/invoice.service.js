const invoiceRepo = require('../repositories/invoice.repository');
const { get, all, run } = require('../config/database');
const logger = require('../utils/logger');

async function list(filters) {
  return invoiceRepo.findAll(filters || {});
}

async function getById(id) {
  const invoice = await invoiceRepo.findById(id);
  if (!invoice) return null;
  const items = await invoiceRepo.getItems(id);
  const payments = await invoiceRepo.getPayments(id);
  return { ...invoice, items, payments };
}

async function create(data) {
  return invoiceRepo.create(data);
}

async function addItem(invoiceId, item) {
  return invoiceRepo.addItem(invoiceId, item);
}

async function addPayment(invoiceId, amount, paymentMethod, notes, receivedBy) {
  return invoiceRepo.addPayment(invoiceId, amount, paymentMethod, notes, receivedBy);
}

async function updateStatus(id, status) {
  return invoiceRepo.updateStatus(id, status);
}

// ─── Stats ───
async function getStats() {
  const nd = "AND (is_deleted = 0 OR is_deleted IS NULL)";
  const [total, today, pending, totalAmount, todayAmount] = await Promise.all([
    get(`SELECT COUNT(*) as c FROM invoices WHERE 1=1 ${nd}`).then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COUNT(*) as c FROM invoices WHERE created_at::date = CURRENT_DATE ${nd}`).then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COUNT(*) as c FROM invoices WHERE payment_status = 'pending' ${nd}`).then(r => r?.c || 0).catch(() => 0),
    get(`SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE 1=1 ${nd}`).then(r => r?.s || 0).catch(() => 0),
    get(`SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE type = 'sale' AND created_at::date = CURRENT_DATE ${nd}`).then(r => r?.s || 0).catch(() => 0),
  ]);
  return { total, today, pending, total_amount: totalAmount, today_amount: todayAmount };
}

// ─── Waiting Invoices ───
async function getWaiting() {
  return all("SELECT * FROM invoices WHERE status = 'waiting' AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at DESC LIMIT 50").catch(() => []);
}

// ─── Print Data ───
async function getPrintData(id) {
  const invoice = await get(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
      s.name as supplier_name, s.phone as supplier_phone, u.full_name as created_by_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.id = $1
  `, [id]);
  if (!invoice) return null;

  const items = await all(`
    SELECT ii.*, p.name as product_name, p.code as product_code, p.serial_number
    FROM invoice_items ii LEFT JOIN products p ON ii.product_id = p.id
    WHERE ii.invoice_id = $1 ORDER BY ii.created_at ASC
  `, [id]);

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

  return { invoice, items, company };
}

// ─── Update Invoice ───
async function updateInvoice(id, data) {
  const fields = ['type', 'customer_id', 'supplier_id', 'payment_method', 'payment_type',
    'discount_amount', 'discount_type', 'tax_amount', 'notes', 'subtotal', 'total', 'paid_amount', 'remaining_amount'];
  const sets = [];
  const params = [];
  let i = 1;
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = $${i++}`); params.push(data[f]); }
  }
  if (sets.length === 0) return null;

  sets.push(`updated_at = $${i++}`);
  params.push(new Date());
  params.push(id);
  await run(`UPDATE invoices SET ${sets.join(', ')} WHERE id = $${i}`, params);
  return get('SELECT * FROM invoices WHERE id = $1', [id]);
}

// ─── Cancel Invoice ───
async function cancelInvoice(id, reason, userId) {
  const invoice = await get('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!invoice) return { error: 'NOT_FOUND' };
  if (invoice.status === 'cancelled') return { error: 'ALREADY_CANCELLED' };

  await run(`UPDATE invoices SET status = 'cancelled', cancel_reason = $1, cancelled_at = CURRENT_TIMESTAMP, cancelled_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
    [reason || null, userId, id]);

  if (invoice.type === 'sale') {
    try {
      const items = await all('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
      for (const item of items) {
        if (item.product_id) await run('UPDATE products SET quantity = quantity + $1 WHERE id = $2', [item.quantity || 1, item.product_id]).catch(() => { });
      }
    } catch (_) { }
  }
  return { data: await get('SELECT * FROM invoices WHERE id = $1', [id]) };
}

// ─── Transition Status ───
const VALID_STATUSES = ['draft', 'waiting', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];
async function transitionStatus(id, status, notes) {
  if (!VALID_STATUSES.includes(status)) return { error: `حالة غير صحيحة: ${status}` };
  const invoice = await get('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!invoice) return { error: 'NOT_FOUND' };
  await run(`UPDATE invoices SET status = $1, status_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, [status, notes || null, id]);
  return { data: await get('SELECT * FROM invoices WHERE id = $1', [id]) };
}

// ─── Prepare ───
async function prepareInvoice(id, userId) {
  await run(`UPDATE invoices SET status = 'preparing', prepared_by = $1, prepared_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [userId, id]);
  return get('SELECT * FROM invoices WHERE id = $1', [id]);
}

// ─── Convert to Active ───
async function convertToActive(id, userId) {
  const invoice = await get('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!invoice) return { error: 'NOT_FOUND' };

  await run(`UPDATE invoices SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, confirmed_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [userId, id]);

  if (invoice.type === 'sale') {
    try {
      const items = await all('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
      for (const item of items) {
        if (item.product_id) await run('UPDATE products SET quantity = quantity - $1 WHERE id = $2', [item.quantity || 1, item.product_id]).catch(() => { });
      }
    } catch (_) { }
  }
  return { data: await get('SELECT * FROM invoices WHERE id = $1', [id]) };
}

module.exports = {
  list, getById, create, addItem, addPayment, updateStatus,
  getStats, getWaiting, getPrintData, updateInvoice,
  cancelInvoice, transitionStatus, prepareInvoice, convertToActive,
};
