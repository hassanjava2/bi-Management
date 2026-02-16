/**
 * BI ERP — Inventory Service
 * Device, product, warehouse, parts, stock-count business logic
 */
const { get, all, run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const ND = '(is_deleted = 0 OR is_deleted IS NULL)';

// ─── TABLE INIT ────────────────────────────────
async function ensureTables() {
    try {
        await run(`CREATE TABLE IF NOT EXISTS stock_counts (
      id TEXT PRIMARY KEY, warehouse_id TEXT, status TEXT DEFAULT 'in_progress',
      notes TEXT, created_by TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP)`);
        await run(`CREATE TABLE IF NOT EXISTS stock_count_items (
      id TEXT PRIMARY KEY, stock_count_id TEXT REFERENCES stock_counts(id),
      product_id TEXT, expected_quantity INTEGER DEFAULT 0, actual_quantity INTEGER, counted_at TIMESTAMP)`);
    } catch (_) { }
}
ensureTables();

// ═════════════════════════════════════════════════
// DEVICES
// ═════════════════════════════════════════════════
async function listDevices({ status, warehouse_id, supplier_id, customer_id, search, page = 1, limit = 50 }) {
    let query = `SELECT d.*, w.name as warehouse_name, p.name as product_name, p.brand, p.model,
    s.name as supplier_name, c.name as customer_name
    FROM devices d LEFT JOIN warehouses w ON d.warehouse_id=w.id LEFT JOIN products p ON d.product_id=p.id
    LEFT JOIN suppliers s ON d.supplier_id=s.id LEFT JOIN customers c ON d.customer_id=c.id WHERE ${ND.replace(/is_deleted/g, 'd.is_deleted')}`;
    const params = []; let idx = 1;
    if (status) { query += ` AND d.status=$${idx++}`; params.push(status); }
    if (warehouse_id) { query += ` AND d.warehouse_id=$${idx++}`; params.push(warehouse_id); }
    if (supplier_id) { query += ` AND d.supplier_id=$${idx++}`; params.push(supplier_id); }
    if (customer_id) { query += ` AND d.customer_id=$${idx++}`; params.push(customer_id); }
    if (search) { query += ` AND (d.serial_number ILIKE $${idx} OR p.name ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    query += ` ORDER BY d.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    const pg = parseInt(page), lim = parseInt(limit);
    params.push(lim, (pg - 1) * lim);
    const rows = await all(query, params).catch(() => []);
    return { rows, pagination: { page: pg, limit: lim, hasMore: rows.length === lim } };
}

async function scanDevice(code) {
    code = code.trim();
    const devices = await all(`SELECT d.id, d.serial_number, d.status, d.selling_price, d.actual_specs,
    p.name as product_name, p.brand, p.model, p.code as product_code, w.name as warehouse_name
    FROM devices d LEFT JOIN products p ON d.product_id=p.id LEFT JOIN warehouses w ON d.warehouse_id=w.id
    WHERE ${ND.replace(/is_deleted/g, 'd.is_deleted')} AND (d.serial_number ILIKE $1 OR p.barcode=$2 OR p.code=$2)
    LIMIT 5`, [`%${code}%`, code]).catch(() => []);
    if (devices.length === 0) {
        const products = await all(`SELECT p.id as product_id, p.name as product_name, p.code as product_code,
      p.barcode, p.price as selling_price, p.brand, p.model, p.quantity as stock_quantity
      FROM products p WHERE ${ND.replace(/is_deleted/g, 'p.is_deleted')}
      AND (p.barcode=$1 OR p.code=$1 OR p.name ILIKE $2) LIMIT 5`, [code, `%${code}%`]).catch(() => []);
        return { source: 'product', data: products };
    }
    return { source: 'device', data: devices };
}

async function getDevice(id) {
    const device = await get(`SELECT d.*, w.name as warehouse_name, p.name as product_name,
    s.name as supplier_name, c.name as customer_name
    FROM devices d LEFT JOIN warehouses w ON d.warehouse_id=w.id LEFT JOIN products p ON d.product_id=p.id
    LEFT JOIN suppliers s ON d.supplier_id=s.id LEFT JOIN customers c ON d.customer_id=c.id WHERE d.id=$1`, [id]);
    if (!device) return null;
    const history = await all('SELECT * FROM device_history WHERE device_id=$1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => []);
    return { device, history };
}

async function createDevice(body, userId) {
    const { product_id, serial_number, actual_specs, purchase_cost, selling_price, warehouse_id, supplier_id, notes, status } = body;
    const id = uuidv4();
    const sn = serial_number || `BI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    await run(`INSERT INTO devices (id,serial_number,product_id,actual_specs,purchase_cost,selling_price,status,warehouse_id,supplier_id,notes,created_by,created_at,is_deleted)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP,0)`,
        [id, sn, product_id, actual_specs || null, purchase_cost || 0, selling_price || 0, status || 'available', warehouse_id || null, supplier_id || null, notes || null, userId]);
    return get('SELECT * FROM devices WHERE id=$1', [id]);
}

async function updateDevice(id, body) {
    const { serial_number, actual_specs, selling_price, status, warehouse_id, notes, supplier_id, customer_id } = body;
    const sets = [], params = []; let i = 1;
    const add = (n, v) => { if (v !== undefined) { sets.push(`${n}=$${i++}`); params.push(v); } };
    add('serial_number', serial_number); add('actual_specs', actual_specs); add('selling_price', selling_price);
    add('status', status); add('warehouse_id', warehouse_id); add('notes', notes);
    add('supplier_id', supplier_id); add('customer_id', customer_id);
    if (!sets.length) return null;
    sets.push('updated_at=CURRENT_TIMESTAMP'); params.push(id);
    await run(`UPDATE devices SET ${sets.join(',')} WHERE id=$${i}`, params);
    return get('SELECT * FROM devices WHERE id=$1', [id]);
}

async function deleteDevice(id) {
    await run('UPDATE devices SET is_deleted=1, updated_at=CURRENT_TIMESTAMP WHERE id=$1', [id]);
}

async function getDeviceHistory(id) {
    return all('SELECT * FROM device_history WHERE device_id=$1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => []);
}

async function transferDevice(id, { to_warehouse_id, notes }, userId) {
    const device = await get('SELECT * FROM devices WHERE id=$1', [id]);
    if (!device) return null;
    const from = device.warehouse_id;
    await run('UPDATE devices SET warehouse_id=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [to_warehouse_id, id]);
    try {
        await run(`INSERT INTO device_history (id,device_id,action,from_warehouse_id,to_warehouse_id,notes,created_by,created_at)
    VALUES ($1,$2,'transfer',$3,$4,$5,$6,CURRENT_TIMESTAMP)`, [uuidv4(), id, from, to_warehouse_id, notes || null, userId]);
    } catch (_) { }
    return get('SELECT * FROM devices WHERE id=$1', [id]);
}

async function custodyDevice(id, { customer_id, notes }, userId) {
    await run('UPDATE devices SET customer_id=$1, status=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3',
        [customer_id, customer_id ? 'sold' : 'available', id]);
    try {
        await run(`INSERT INTO device_history (id,device_id,action,notes,created_by,created_at)
    VALUES ($1,$2,'custody_change',$3,$4,CURRENT_TIMESTAMP)`, [uuidv4(), id, notes || 'تغيير العهدة', userId]);
    } catch (_) { }
    return get('SELECT * FROM devices WHERE id=$1', [id]);
}

// ═════════════════════════════════════════════════
// PRODUCTS (inline)
// ═════════════════════════════════════════════════
async function listProducts({ search, category_id, page = 1, limit = 50 }) {
    let query = `SELECT * FROM products WHERE ${ND}`;
    const params = []; let idx = 1;
    if (search) { query += ` AND (name ILIKE $${idx} OR code ILIKE $${idx} OR barcode=$${idx + 1})`; params.push(`%${search}%`, search); idx += 2; }
    if (category_id) { query += ` AND category_id=$${idx++}`; params.push(category_id); }
    const pg = parseInt(page), lim = parseInt(limit);
    query += ` ORDER BY name LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(lim, (pg - 1) * lim);
    return all(query, params).catch(() => []);
}

async function getProduct(id) {
    return get(`SELECT * FROM products WHERE id=$1 AND ${ND}`, [id]);
}

async function createProduct(body) {
    const { name, code, barcode, price, quantity, category_id, brand, model, description, min_quantity } = body;
    const id = uuidv4();
    await run(`INSERT INTO products (id,name,code,barcode,price,quantity,category_id,brand,model,description,min_quantity,created_at,is_deleted)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP,0)`,
        [id, name, code || null, barcode || null, price || 0, quantity || 0, category_id || null, brand || null, model || null, description || null, min_quantity || 5]);
    return get('SELECT * FROM products WHERE id=$1', [id]);
}

async function updateProduct(id, body) {
    const { name, code, barcode, price, quantity, category_id, brand, model, description, min_quantity } = body;
    await run(`UPDATE products SET name=COALESCE($1,name), code=COALESCE($2,code), barcode=COALESCE($3,barcode),
    price=COALESCE($4,price), quantity=COALESCE($5,quantity), category_id=COALESCE($6,category_id),
    brand=COALESCE($7,brand), model=COALESCE($8,model), description=COALESCE($9,description),
    min_quantity=COALESCE($10,min_quantity), updated_at=CURRENT_TIMESTAMP WHERE id=$11`,
        [name, code, barcode, price, quantity, category_id, brand, model, description, min_quantity, id]);
    return get('SELECT * FROM products WHERE id=$1', [id]);
}

// ═════════════════════════════════════════════════
// WAREHOUSES
// ═════════════════════════════════════════════════
async function listWarehouses() {
    const rows = await all('SELECT * FROM warehouses ORDER BY name').catch(() => []);
    return rows.length ? rows : [{ id: 'main', name: 'المخزن الرئيسي', location: 'الرئيسي' }];
}

async function getWarehouseStats(id) {
    const warehouse = await get('SELECT * FROM warehouses WHERE id=$1', [id]);
    if (!warehouse) return null;
    const deviceCount = await get('SELECT COUNT(*)::int as count FROM devices WHERE warehouse_id=$1 AND is_deleted=0', [id]).then(r => r?.count || 0).catch(() => 0);
    const totalValue = await get('SELECT COALESCE(SUM(selling_price),0) as v FROM devices WHERE warehouse_id=$1 AND is_deleted=0', [id]).then(r => Number(r?.v) || 0).catch(() => 0);
    return { ...warehouse, device_count: deviceCount, total_value: totalValue };
}

// ═════════════════════════════════════════════════
// PARTS
// ═════════════════════════════════════════════════
async function listParts({ search }) {
    let query = `SELECT * FROM products WHERE ${ND} AND (category_id IN (SELECT id FROM categories WHERE name ILIKE '%قطع%' OR name ILIKE '%اكسسوار%'))`;
    const params = [];
    if (search) { query += ` AND (name ILIKE $${params.length + 1} OR code ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    query += ' ORDER BY name LIMIT 100';
    return all(query, params).catch(() => []);
}

async function createPart(body) {
    const { name, code, price, quantity, category_id, description } = body;
    const id = uuidv4();
    await run('INSERT INTO products (id,name,code,price,quantity,category_id,description,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)',
        [id, name, code, price || 0, quantity || 0, category_id, description]);
    return get('SELECT * FROM products WHERE id=$1', [id]);
}

async function updatePart(id, body) {
    const { name, code, price, quantity, description } = body;
    await run('UPDATE products SET name=COALESCE($1,name), code=COALESCE($2,code), price=COALESCE($3,price), quantity=COALESCE($4,quantity), description=COALESCE($5,description), updated_at=CURRENT_TIMESTAMP WHERE id=$6',
        [name, code, price, quantity, description, id]);
    return get('SELECT * FROM products WHERE id=$1', [id]);
}

// ═════════════════════════════════════════════════
// LOW STOCK / ALERTS
// ═════════════════════════════════════════════════
async function getLowStock() {
    return all(`SELECT * FROM products WHERE ${ND} AND quantity<=COALESCE(min_quantity,5) ORDER BY quantity ASC LIMIT 50`).catch(() => []);
}

async function getAlerts() {
    return all(`SELECT * FROM products WHERE ${ND} AND quantity<=COALESCE(min_quantity,5) LIMIT 20`).catch(() => []);
}

// ═════════════════════════════════════════════════
// SERIAL GENERATION
// ═════════════════════════════════════════════════
async function generateSerial() {
    const year = new Date().getFullYear();
    const countResult = await get('SELECT COUNT(*) as c FROM devices WHERE serial_number LIKE $1', [`BI-${year}-%`]);
    const count = parseInt(countResult?.c || 0) + 1;
    return `BI-${year}-${String(count).padStart(6, '0')}`;
}

// ═════════════════════════════════════════════════
// STOCK COUNTS
// ═════════════════════════════════════════════════
async function listStockCounts() {
    return all(`SELECT sc.*, u.full_name as created_by_name,
    (SELECT COUNT(*)::int FROM stock_count_items WHERE stock_count_id=sc.id) as item_count,
    (SELECT COUNT(*)::int FROM stock_count_items WHERE stock_count_id=sc.id AND actual_quantity IS NOT NULL) as counted_items
    FROM stock_counts sc LEFT JOIN users u ON sc.created_by=u.id ORDER BY sc.created_at DESC LIMIT 20`).catch(() => []);
}

async function getStockCount(id) {
    const count = await get('SELECT * FROM stock_counts WHERE id=$1', [id]);
    if (!count) return null;
    const items = await all(`SELECT sci.*, p.name as product_name, p.barcode, p.code
    FROM stock_count_items sci LEFT JOIN products p ON sci.product_id=p.id
    WHERE sci.stock_count_id=$1 ORDER BY p.name`, [id]).catch(() => []);
    return { ...count, items };
}

async function createStockCount({ warehouse_id, notes }, userId) {
    const id = uuidv4();
    await run('INSERT INTO stock_counts (id,warehouse_id,status,notes,created_by,created_at) VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)',
        [id, warehouse_id || 'main', 'in_progress', notes || '', userId]);
    const products = await all(`SELECT id, quantity FROM products WHERE ${ND}`).catch(() => []);
    for (const p of products) {
        await run('INSERT INTO stock_count_items (id,stock_count_id,product_id,expected_quantity,actual_quantity) VALUES ($1,$2,$3,$4,NULL)',
            [uuidv4(), id, p.id, p.quantity || 0]).catch(() => { });
    }
    const created = await get('SELECT * FROM stock_counts WHERE id=$1', [id]);
    return { data: created, count: products.length };
}

async function updateStockCountItem(countId, itemId, actual_quantity) {
    await run('UPDATE stock_count_items SET actual_quantity=$1, counted_at=CURRENT_TIMESTAMP WHERE id=$2 AND stock_count_id=$3',
        [actual_quantity, itemId, countId]);
}

async function completeStockCount(id) {
    const items = await all('SELECT * FROM stock_count_items WHERE stock_count_id=$1 AND actual_quantity IS NOT NULL', [id]).catch(() => []);
    for (const item of items) {
        if (item.actual_quantity !== item.expected_quantity) {
            await run('UPDATE products SET quantity=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [item.actual_quantity, item.product_id]).catch(() => { });
        }
    }
    await run("UPDATE stock_counts SET status='completed', completed_at=CURRENT_TIMESTAMP WHERE id=$1", [id]);
    return items.length;
}

module.exports = {
    listDevices, scanDevice, getDevice, createDevice, updateDevice, deleteDevice,
    getDeviceHistory, transferDevice, custodyDevice,
    listProducts, getProduct, createProduct, updateProduct,
    listWarehouses, getWarehouseStats,
    listParts, createPart, updatePart,
    getLowStock, getAlerts, generateSerial,
    listStockCounts, getStockCount, createStockCount, updateStockCountItem, completeStockCount,
};
