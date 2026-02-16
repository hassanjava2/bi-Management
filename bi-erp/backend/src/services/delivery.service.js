/**
 * BI Management - Delivery Service
 * خدمة التوصيل — جميع عمليات SQL والمنطق
 */
const { run, get, all } = require('../config/database');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

// ─── Stats ───
async function getStats() {
    const stats = await get(`
    SELECT 
      COUNT(*)::int as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int as pending,
      SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END)::int as preparing,
      SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END)::int as in_transit,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)::int as delivered,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int as failed
    FROM deliveries
  `);
    return stats || { total: 0, pending: 0, preparing: 0, in_transit: 0, delivered: 0, failed: 0 };
}

// ─── Pending ───
async function getPending() {
    return all("SELECT * FROM deliveries WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50");
}

// ─── Drivers ───
async function getDrivers() {
    return all("SELECT id, full_name as name, phone FROM users WHERE role = 'driver' AND is_active = 1");
}

// ─── Track ───
async function trackByNumber(trackingNumber) {
    return get(`
    SELECT d.*, i.invoice_number, i.total as invoice_total,
           c.name as customer_name, c.phone as customer_phone
    FROM deliveries d
    LEFT JOIN invoices i ON d.invoice_id = i.id
    LEFT JOIN customers c ON d.customer_id = c.id
    WHERE d.tracking_number = $1
  `, [trackingNumber]);
}

// ─── List ───
async function listDeliveries(filters) {
    const { status, driver_id } = filters;
    let query = `
    SELECT d.*, i.invoice_number,
           c.name as customer_name, c.phone as customer_phone
    FROM deliveries d
    LEFT JOIN invoices i ON d.invoice_id = i.id
    LEFT JOIN customers c ON d.customer_id = c.id
    WHERE 1=1
  `;
    const params = [];
    if (status) { query += ` AND d.status = $${params.length + 1}`; params.push(status); }
    if (driver_id) { query += ` AND d.driver_id = $${params.length + 1}`; params.push(driver_id); }
    query += ` ORDER BY d.created_at DESC LIMIT 50`;
    return all(query, params);
}

// ─── Create ───
async function create(data, userId) {
    const id = generateId();
    const trackingNumber = `DEL-${Date.now().toString().slice(-8)}`;
    await run(`
    INSERT INTO deliveries (id, tracking_number, invoice_id, customer_id, address, notes, scheduled_date, delivery_method, driver_id, status, created_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, CURRENT_TIMESTAMP)
  `, [id, trackingNumber, data.invoice_id, data.customer_id, data.address, data.notes, data.scheduled_date, data.delivery_method || null, data.driver_id || null, userId]);
    return { id, trackingNumber };
}

// ─── Get by ID ───
async function getById(id) {
    return get(`
    SELECT d.*, i.invoice_number, i.total as invoice_total,
           c.name as customer_name, c.phone as customer_phone
    FROM deliveries d
    LEFT JOIN invoices i ON d.invoice_id = i.id
    LEFT JOIN customers c ON d.customer_id = c.id
    WHERE d.id = $1 OR d.tracking_number = $1
  `, [id]);
}

// ─── Update ───
async function update(id, data) {
    await run(`
    UPDATE deliveries 
    SET address = COALESCE($1, address),
        notes = COALESCE($2, notes),
        scheduled_date = COALESCE($3, scheduled_date),
        delivery_method = COALESCE($4, delivery_method),
        driver_id = COALESCE($5, driver_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
  `, [data.address, data.notes, data.scheduled_date, data.delivery_method, data.driver_id, id]);
    return get('SELECT * FROM deliveries WHERE id = $1', [id]);
}

// ─── Update Status ───
async function updateStatus(id, status, notes) {
    await run(`
    UPDATE deliveries 
    SET status = $1, 
        status_notes = $2, 
        delivered_at = CASE WHEN $1 = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [status, notes, id]);
}

module.exports = {
    getStats,
    getPending,
    getDrivers,
    trackByNumber,
    listDeliveries,
    create,
    getById,
    update,
    updateStatus,
};
