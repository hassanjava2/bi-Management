/**
 * BI ERP — Unit Service
 * وحدات القياس وتحويلها
 */
const { get, all, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

// ─── UNITS ─────────────────────────────
async function listUnits() {
    return all('SELECT * FROM units WHERE is_active = TRUE ORDER BY type, name');
}

async function createUnit({ name, name_en, abbreviation, type }) {
    const id = generateId();
    await run(
        'INSERT INTO units (id, name, name_en, abbreviation, type) VALUES ($1, $2, $3, $4, $5)',
        [id, name, name_en || null, abbreviation || null, type || 'quantity']
    );
    return get('SELECT * FROM units WHERE id = $1', [id]);
}

async function updateUnit(id, data) {
    const fields = ['name', 'name_en', 'abbreviation', 'type', 'is_active'];
    const sets = []; const params = []; let i = 1;
    for (const f of fields) {
        if (data[f] !== undefined) { sets.push(`${f} = $${i++}`); params.push(data[f]); }
    }
    if (!sets.length) return null;
    params.push(id);
    await run(`UPDATE units SET ${sets.join(', ')} WHERE id = $${i}`, params);
    return get('SELECT * FROM units WHERE id = $1', [id]);
}

async function deleteUnit(id) {
    await run('UPDATE units SET is_active = FALSE WHERE id = $1', [id]);
    return { success: true };
}

// ─── PRODUCT UNITS ─────────────────────
async function getProductUnits(productId) {
    return all(
        `SELECT pu.*, u.name as unit_name, u.name_en as unit_name_en, u.abbreviation
     FROM product_units pu JOIN units u ON pu.unit_id = u.id
     WHERE pu.product_id = $1 ORDER BY pu.is_primary DESC`,
        [productId]
    );
}

async function setProductUnit(productId, { unit_id, conversion_factor, is_primary, barcode, price }) {
    const id = generateId();
    if (is_primary) {
        await run('UPDATE product_units SET is_primary = FALSE WHERE product_id = $1', [productId]);
    }
    await run(
        `INSERT INTO product_units (id, product_id, unit_id, conversion_factor, is_primary, barcode, price)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (product_id, unit_id) DO UPDATE SET
       conversion_factor = $4, is_primary = $5, barcode = $6, price = $7`,
        [id, productId, unit_id, conversion_factor || 1, is_primary || false, barcode || null, price || null]
    );
    return getProductUnits(productId);
}

async function removeProductUnit(productId, unitId) {
    await run('DELETE FROM product_units WHERE product_id = $1 AND unit_id = $2', [productId, unitId]);
    return { success: true };
}

// ─── CONVERT ───────────────────────────
async function convertQty(productId, qty, fromUnitId, toUnitId) {
    if (fromUnitId === toUnitId) return qty;
    const from = await get('SELECT conversion_factor FROM product_units WHERE product_id = $1 AND unit_id = $2', [productId, fromUnitId]);
    const to = await get('SELECT conversion_factor FROM product_units WHERE product_id = $1 AND unit_id = $2', [productId, toUnitId]);
    if (!from || !to) return qty;
    return (parseFloat(qty) * parseFloat(from.conversion_factor)) / parseFloat(to.conversion_factor);
}

// ─── CUSTOMER TYPES ────────────────────
async function listCustomerTypes() {
    return all('SELECT * FROM customer_types WHERE is_active = TRUE ORDER BY sort_order');
}

async function createCustomerType({ name, name_en, discount_percent }) {
    const id = generateId();
    await run(
        'INSERT INTO customer_types (id, name, name_en, discount_percent) VALUES ($1, $2, $3, $4)',
        [id, name, name_en || null, discount_percent || 0]
    );
    return get('SELECT * FROM customer_types WHERE id = $1', [id]);
}

async function updateCustomerType(id, data) {
    const fields = ['name', 'name_en', 'discount_percent', 'sort_order', 'is_active'];
    const sets = []; const params = []; let i = 1;
    for (const f of fields) {
        if (data[f] !== undefined) { sets.push(`${f} = $${i++}`); params.push(data[f]); }
    }
    if (!sets.length) return null;
    params.push(id);
    await run(`UPDATE customer_types SET ${sets.join(', ')} WHERE id = $${i}`, params);
    return get('SELECT * FROM customer_types WHERE id = $1', [id]);
}

// ─── PRODUCT PRICES ────────────────────
async function getProductPrices(productId) {
    return all(
        `SELECT pp.*, ct.name as type_name, ct.name_en as type_name_en
     FROM product_prices pp JOIN customer_types ct ON pp.customer_type_id = ct.id
     WHERE pp.product_id = $1 ORDER BY ct.sort_order`,
        [productId]
    );
}

async function setProductPrice(productId, { customer_type_id, price, offer_qty, offer_bonus, offer_percent, min_qty, currency }) {
    const id = generateId();
    await run(
        `INSERT INTO product_prices (id, product_id, customer_type_id, price, offer_qty, offer_bonus, offer_percent, min_qty, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (product_id, customer_type_id, currency) DO UPDATE SET
       price = $4, offer_qty = $5, offer_bonus = $6, offer_percent = $7, min_qty = $8, updated_at = CURRENT_TIMESTAMP`,
        [id, productId, customer_type_id, price, offer_qty || 0, offer_bonus || 0, offer_percent || 0, min_qty || 1, currency || 'IQD']
    );
    return getProductPrices(productId);
}

// Get price for a specific customer type
async function getPriceForCustomerType(productId, customerTypeId, currency) {
    const pp = await get(
        `SELECT * FROM product_prices WHERE product_id = $1 AND customer_type_id = $2 AND currency = $3`,
        [productId, customerTypeId, currency || 'IQD']
    );
    if (pp) return pp;
    // fallback to product selling_price
    const p = await get('SELECT selling_price FROM products WHERE id = $1', [productId]);
    return { price: p?.selling_price || 0, offer_qty: 0, offer_bonus: 0 };
}

module.exports = {
    listUnits, createUnit, updateUnit, deleteUnit,
    getProductUnits, setProductUnit, removeProductUnit, convertQty,
    listCustomerTypes, createCustomerType, updateCustomerType,
    getProductPrices, setProductPrice, getPriceForCustomerType,
};
