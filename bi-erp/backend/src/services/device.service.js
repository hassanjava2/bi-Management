/**
 * BI Management - Device Service
 * خدمة الأجهزة — جميع عمليات SQL والمنطق
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// ─── List Devices ───
async function listDevices(db, filters) {
    const { status, warehouse_id, supplier_id, customer_id, search, page = 1, limit = 50 } = filters;

    let query = `
    SELECT d.*, 
           w.name as warehouse_name,
           p.name as product_name,
           s.name as supplier_name
    FROM devices d
    LEFT JOIN warehouses w ON d.warehouse_id = w.id
    LEFT JOIN products p ON d.product_id = p.id
    LEFT JOIN suppliers s ON d.supplier_id = s.id
    WHERE d.is_deleted = 0
  `;
    const params = [];
    let pi = 1;

    if (status) { query += ` AND d.status = $${pi++}`; params.push(status); }
    if (warehouse_id) { query += ` AND d.warehouse_id = $${pi++}`; params.push(warehouse_id); }
    if (supplier_id) { query += ` AND d.supplier_id = $${pi++}`; params.push(supplier_id); }
    if (customer_id) { query += ` AND d.customer_id = $${pi++}`; params.push(customer_id); }
    if (search) {
        query += ` AND (d.serial_number ILIKE $${pi} OR p.name ILIKE $${pi})`;
        params.push(`%${search}%`);
        pi++;
    }

    query += ' ORDER BY d.created_at DESC';
    query += ` LIMIT $${pi++} OFFSET $${pi++}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.query(query, params);
    return {
        rows: result.rows,
        pagination: { page: parseInt(page), limit: parseInt(limit), hasMore: result.rows.length === parseInt(limit) }
    };
}

// ─── Scan by Barcode / Serial ───
async function scanDevice(db, code) {
    code = code.trim();

    let result = await db.query(`
    SELECT d.id, d.serial_number, d.status, d.selling_price, d.actual_specs,
           d.product_id, d.warehouse_id, d.notes,
           p.name as product_name, p.code as product_code, p.barcode, p.price as product_price,
           p.brand, p.model, p.description as product_description, p.category_id,
           w.name as warehouse_name, c.name as category_name
    FROM devices d
    LEFT JOIN products p ON d.product_id = p.id
    LEFT JOIN warehouses w ON d.warehouse_id = w.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE d.is_deleted = 0
      AND (d.serial_number ILIKE $1 OR p.barcode = $2 OR p.code = $2)
    LIMIT 5
  `, [`%${code}%`, code]);

    if (result.rows.length > 0) return { source: 'device', data: result.rows };

    result = await db.query(`
    SELECT p.id as product_id, p.name as product_name, p.code as product_code,
           p.barcode, p.price as selling_price, p.brand, p.model,
           p.description as product_description, p.quantity as stock_quantity, p.category_id,
           c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.barcode = $1 OR p.code = $1 OR p.name ILIKE $2
    LIMIT 10
  `, [code, `%${code}%`]);

    if (result.rows.length === 0) return null;
    return { source: 'product', data: result.rows };
}

// ─── Get by ID ───
async function getById(db, id) {
    const result = await db.query(`
    SELECT d.*, 
           w.name as warehouse_name,
           p.name as product_name,
           s.name as supplier_name,
           c.name as customer_name
    FROM devices d
    LEFT JOIN warehouses w ON d.warehouse_id = w.id
    LEFT JOIN products p ON d.product_id = p.id
    LEFT JOIN suppliers s ON d.supplier_id = s.id
    LEFT JOIN customers c ON d.customer_id = c.id
    WHERE (d.id = $1 OR d.serial_number = $1) AND d.is_deleted = 0
  `, [id]);

    if (result.rows.length === 0) return null;

    const historyResult = await db.query(`
    SELECT * FROM device_history
    WHERE device_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [result.rows[0].id]);

    return { device: result.rows[0], history: historyResult.rows };
}

// ─── Create Device ───
async function createDevice(db, data, user) {
    const year = new Date().getFullYear();
    const countResult = await db.query(
        "SELECT COUNT(*) FROM devices WHERE serial_number LIKE $1",
        [`BI-${year}-%`]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const serial_number = `BI-${year}-${String(count).padStart(6, '0')}`;

    const device = {
        id: uuidv4(),
        serial_number,
        product_id: data.product_id,
        actual_specs: data.actual_specs || {},
        selling_price: data.selling_price,
        status: data.has_problem ? 'inspection_failed' : 'new',
        warehouse_id: data.warehouse_id || (data.has_problem ? await getInspectionWarehouse(db) : await getMainWarehouse(db)),
        location_area: data.location_area,
        location_shelf: data.location_shelf,
        location_row: data.location_row,
        supplier_id: data.supplier_id,
        notes: data.notes,
        created_by: user.id,
        created_at: new Date()
    };

    await db.query(`
    INSERT INTO devices 
    (id, serial_number, product_id, actual_specs, selling_price, status,
     warehouse_id, location_area, location_shelf, location_row,
     supplier_id, notes, created_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `, [
        device.id, device.serial_number, device.product_id,
        JSON.stringify(device.actual_specs), device.selling_price, device.status,
        device.warehouse_id, device.location_area, device.location_shelf, device.location_row,
        device.supplier_id, device.notes, device.created_by, device.created_at
    ]);

    await db.query(`
    INSERT INTO device_history (id, device_id, event_type, event_details, performed_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [uuidv4(), device.id, 'created', JSON.stringify({ product_name: data.product_name, has_problem: data.has_problem }), user.id, new Date()]);

    return device;
}

// ─── Update Device ───
const ALLOWED_UPDATE_FIELDS = [
    'actual_specs', 'selling_price', 'status',
    'warehouse_id', 'location_area', 'location_shelf', 'location_row',
    'notes', 'inspection_notes', 'preparation_notes'
];

async function updateDevice(db, id, updates, user) {
    const currentResult = await db.query('SELECT * FROM devices WHERE id = $1 AND is_deleted = 0', [id]);
    if (currentResult.rows.length === 0) return null;

    const currentDevice = currentResult.rows[0];
    const filteredUpdates = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
        if (updates[field] !== undefined) filteredUpdates[field] = updates[field];
    }
    if (Object.keys(filteredUpdates).length === 0) {
        throw Object.assign(new Error('لا توجد تحديثات صالحة'), { statusCode: 400, code: 'NO_VALID_UPDATES' });
    }

    const setClauses = [];
    const params = [];
    let pi = 1;
    for (const [key, value] of Object.entries(filteredUpdates)) {
        setClauses.push(`${key} = $${pi++}`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }
    setClauses.push(`updated_at = $${pi++}`);
    params.push(new Date());
    params.push(id);

    await db.query(`UPDATE devices SET ${setClauses.join(', ')} WHERE id = $${pi}`, params);

    await db.query(`
    INSERT INTO device_history (id, device_id, event_type, event_details, old_values, new_values, performed_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [uuidv4(), id, 'updated', JSON.stringify({ fields: Object.keys(filteredUpdates) }),
    JSON.stringify(currentDevice), JSON.stringify(filteredUpdates), user.id, new Date()]);

    return { currentDevice, filteredUpdates };
}

// ─── Transfer Device ───
async function transferDevice(db, id, toWarehouseId, reason, user) {
    const deviceResult = await db.query('SELECT * FROM devices WHERE id = $1 AND is_deleted = 0', [id]);
    if (deviceResult.rows.length === 0) return null;

    const device = deviceResult.rows[0];
    const fromWarehouse = device.warehouse_id;

    await db.query('UPDATE devices SET warehouse_id = $1, updated_at = $2 WHERE id = $3', [toWarehouseId, new Date(), id]);

    await db.query(`
    INSERT INTO device_history (id, device_id, event_type, event_details, performed_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [uuidv4(), id, 'transferred', JSON.stringify({ from: fromWarehouse, to: toWarehouseId, reason }), user.id, new Date()]);

    return { device, fromWarehouse };
}

// ─── Custody ───
async function updateCustody(db, id, action, reason, user) {
    const deviceResult = await db.query('SELECT * FROM devices WHERE id = $1', [id]);
    if (deviceResult.rows.length === 0) return null;

    if (action === 'take') {
        await db.query('UPDATE devices SET custody_user_id = $1, custody_since = $2, custody_reason = $3 WHERE id = $4',
            [user.id, new Date(), reason, id]);
    } else if (action === 'return') {
        await db.query('UPDATE devices SET custody_user_id = NULL, custody_since = NULL, custody_reason = NULL WHERE id = $1', [id]);
    }

    await db.query(`
    INSERT INTO device_history (id, device_id, event_type, event_details, performed_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [uuidv4(), id, action === 'take' ? 'custody_taken' : 'custody_returned', JSON.stringify({ reason }), user.id, new Date()]);

    return action === 'take' ? 'تم تسجيل الجهاز بذمتك' : 'تم إرجاع الجهاز';
}

// ─── Request Deletion ───
async function requestDeletion(db, id, reason, user) {
    const deviceResult = await db.query('SELECT * FROM devices WHERE id = $1', [id]);
    if (deviceResult.rows.length === 0) return null;

    const device = deviceResult.rows[0];
    const { getApprovalService } = require('./approval.service');
    const approvalService = getApprovalService(db);

    return approvalService.requestDeletion('device', device.id, device.serial_number, reason, user);
}

// ─── Get History ───
async function getHistory(db, deviceId) {
    const result = await db.query(`
    SELECT dh.*, u.full_name as performed_by_name
    FROM device_history dh
    LEFT JOIN users u ON dh.performed_by = u.id
    WHERE dh.device_id = $1
    ORDER BY dh.created_at DESC
  `, [deviceId]);
    return result.rows;
}

// ─── Helpers ───
async function getMainWarehouse(db) {
    const result = await db.query("SELECT id FROM warehouses WHERE code = 'MAIN'");
    return result.rows[0]?.id;
}

async function getInspectionWarehouse(db) {
    const result = await db.query("SELECT id FROM warehouses WHERE code = 'INSP'");
    return result.rows[0]?.id;
}

module.exports = {
    listDevices,
    scanDevice,
    getById,
    createDevice,
    updateDevice,
    transferDevice,
    updateCustody,
    requestDeletion,
    getHistory,
};
