/**
 * BI ERP — Pricing Service
 * التسعير حسب نوع الزبون — جملة/مفرد/وكيل/خاص/مطروح
 * Queries the product_prices table to return the right price for a customer type
 */
const { run, get, all } = require('../config/database');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

// ─── GET PRICE FOR PRODUCT + CUSTOMER TYPE ─────
async function getPrice(productId, customerTypeId) {
    if (!productId) return null;

    // Try product_prices table first
    if (customerTypeId) {
        const pp = await get(
            `SELECT * FROM product_prices WHERE product_id = $1 AND customer_type_id = $2 LIMIT 1`,
            [productId, customerTypeId]
        ).catch(() => null);
        if (pp) return pp;
    }

    // Fallback: product's default sell_price
    const product = await get('SELECT id, name, sell_price, buy_price, quantity FROM products WHERE id = $1', [productId]).catch(() => null);
    if (!product) return null;
    return {
        product_id: productId,
        customer_type_id: customerTypeId || null,
        price: product.sell_price || 0,
        cost_price: product.buy_price || 0,
        offer_qty: 0,
        offer_bonus: 0,
    };
}

// ─── GET ALL PRICES FOR A PRODUCT ──────────────
async function getProductPrices(productId) {
    const prices = await all(`
    SELECT pp.*, ct.name as type_name
    FROM product_prices pp
    LEFT JOIN customer_types ct ON pp.customer_type_id = ct.id
    WHERE pp.product_id = $1
    ORDER BY ct.name
  `, [productId]).catch(() => []);

    const product = await get('SELECT sell_price, buy_price FROM products WHERE id = $1', [productId]).catch(() => null);
    return { prices, default_sell: product?.sell_price || 0, default_buy: product?.buy_price || 0 };
}

// ─── SET PRICE FOR PRODUCT + CUSTOMER TYPE ─────
async function setPrice(productId, customerTypeId, priceData) {
    const existing = await get(
        'SELECT id FROM product_prices WHERE product_id = $1 AND customer_type_id = $2',
        [productId, customerTypeId]
    ).catch(() => null);

    if (existing) {
        await run(`
      UPDATE product_prices
      SET price = $1, offer_qty = $2, offer_bonus = $3, min_qty = $4, max_discount = $5, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $6 AND customer_type_id = $7
    `, [
            parseFloat(priceData.price) || 0,
            parseInt(priceData.offer_qty) || 0,
            parseInt(priceData.offer_bonus) || 0,
            parseInt(priceData.min_qty) || 0,
            parseFloat(priceData.max_discount) || 0,
            productId, customerTypeId
        ]);
        return get('SELECT * FROM product_prices WHERE id = $1', [existing.id]);
    }

    const id = generateId();
    await run(`
    INSERT INTO product_prices (id, product_id, customer_type_id, price, offer_qty, offer_bonus, min_qty, max_discount, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
  `, [
        id, productId, customerTypeId,
        parseFloat(priceData.price) || 0,
        parseInt(priceData.offer_qty) || 0,
        parseInt(priceData.offer_bonus) || 0,
        parseInt(priceData.min_qty) || 0,
        parseFloat(priceData.max_discount) || 0,
    ]);
    return get('SELECT * FROM product_prices WHERE id = $1', [id]);
}

// ─── BULK SET PRICES (for import/batch) ────────
async function bulkSetPrices(productId, pricesList) {
    const results = [];
    for (const p of pricesList) {
        if (!p.customer_type_id) continue;
        const result = await setPrice(productId, p.customer_type_id, p);
        results.push(result);
    }
    return results;
}

// ─── AUTO-PRICE AN INVOICE ITEM ────────────────
// Given a customer and product, resolve the correct price + offer
async function resolveItemPrice(productId, customerId) {
    if (!productId) return { price: 0, cost_price: 0, offer_qty: 0, offer_bonus: 0 };

    // Get customer type
    let customerTypeId = null;
    if (customerId) {
        const customer = await get('SELECT customer_type_id FROM customers WHERE id = $1', [customerId]).catch(() => null);
        customerTypeId = customer?.customer_type_id || null;
    }

    const priceInfo = await getPrice(productId, customerTypeId);
    return {
        price: priceInfo?.price || 0,
        cost_price: priceInfo?.cost_price || 0,
        offer_qty: priceInfo?.offer_qty || 0,
        offer_bonus: priceInfo?.offer_bonus || 0,
        customer_type_id: customerTypeId,
    };
}

// ─── CALCULATE PROFIT FOR ITEM ─────────────────
function calculateItemProfit(sellPrice, costPrice, qty, commission = 0) {
    const profit = (sellPrice - costPrice - commission) * qty;
    return {
        profit,
        profit_per_unit: sellPrice - costPrice - commission,
        is_losing: profit < 0,
        margin_percent: costPrice > 0 ? ((sellPrice - costPrice) / costPrice * 100).toFixed(2) : 0,
    };
}

module.exports = {
    getPrice, getProductPrices, setPrice, bulkSetPrices,
    resolveItemPrice, calculateItemProfit,
};
