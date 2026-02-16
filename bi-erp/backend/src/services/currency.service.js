/**
 * BI ERP — Currency Service
 * العملات وأسعار الصرف
 */
const { get, all, run } = require('../config/database');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

// ─── LIST ──────────────────────────────
async function listCurrencies() {
    return all('SELECT * FROM currencies ORDER BY is_default DESC, code ASC');
}

// ─── GET BY CODE ───────────────────────
async function getCurrency(code) {
    return get('SELECT * FROM currencies WHERE code = $1', [code]);
}

// ─── CREATE ────────────────────────────
async function createCurrency({ code, name_ar, name_en, symbol, exchange_rate, decimal_places }) {
    const id = generateId();
    await run(
        `INSERT INTO currencies (id, code, name_ar, name_en, symbol, exchange_rate, decimal_places)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, code.toUpperCase(), name_ar, name_en || null, symbol || null, exchange_rate || 1, decimal_places || 0]
    );
    return get('SELECT * FROM currencies WHERE id = $1', [id]);
}

// ─── UPDATE ────────────────────────────
async function updateCurrency(id, data) {
    const fields = ['name_ar', 'name_en', 'symbol', 'exchange_rate', 'is_active', 'decimal_places'];
    const sets = [];
    const params = [];
    let i = 1;
    for (const f of fields) {
        if (data[f] !== undefined) { sets.push(`${f} = $${i++}`); params.push(data[f]); }
    }
    if (sets.length === 0) return null;
    sets.push(`updated_at = $${i++}`); params.push(new Date());
    params.push(id);
    await run(`UPDATE currencies SET ${sets.join(', ')} WHERE id = $${i}`, params);
    return get('SELECT * FROM currencies WHERE id = $1', [id]);
}

// ─── SET DEFAULT ───────────────────────
async function setDefault(id) {
    await run('UPDATE currencies SET is_default = FALSE');
    await run('UPDATE currencies SET is_default = TRUE WHERE id = $1', [id]);
    return get('SELECT * FROM currencies WHERE id = $1', [id]);
}

// ─── DELETE ────────────────────────────
async function deleteCurrency(id) {
    const c = await get('SELECT is_default FROM currencies WHERE id = $1', [id]);
    if (c?.is_default) return { error: 'لا يمكن حذف العملة الافتراضية' };
    await run('DELETE FROM currencies WHERE id = $1', [id]);
    return { success: true };
}

// ─── EXCHANGE RATES ────────────────────
async function getExchangeRate(from, to, date) {
    const d = date || new Date().toISOString().split('T')[0];
    const rate = await get(
        `SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2 AND effective_date <= $3 ORDER BY effective_date DESC LIMIT 1`,
        [from, to, d]
    );
    if (rate) return parseFloat(rate.rate);
    // Fallback to currencies table
    const fromC = await get('SELECT exchange_rate FROM currencies WHERE code = $1', [from]);
    const toC = await get('SELECT exchange_rate FROM currencies WHERE code = $1', [to]);
    if (fromC && toC) return parseFloat(toC.exchange_rate) / parseFloat(fromC.exchange_rate);
    return 1;
}

async function setExchangeRate({ from_currency, to_currency, rate }, userId) {
    const id = generateId();
    await run(
        `INSERT INTO exchange_rates (id, from_currency, to_currency, rate, effective_date, created_by)
     VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
     ON CONFLICT (from_currency, to_currency, effective_date) DO UPDATE SET rate = $4`,
        [id, from_currency, to_currency, rate, userId]
    );
    // Also update currencies table
    await run('UPDATE currencies SET exchange_rate = $1, updated_at = CURRENT_TIMESTAMP WHERE code = $2', [rate, to_currency]).catch(() => { });
    return { from_currency, to_currency, rate, date: new Date().toISOString().split('T')[0] };
}

async function listExchangeRates({ from_date, to_date } = {}) {
    let q = 'SELECT * FROM exchange_rates WHERE 1=1';
    const params = [];
    if (from_date) { params.push(from_date); q += ` AND effective_date >= $${params.length}`; }
    if (to_date) { params.push(to_date); q += ` AND effective_date <= $${params.length}`; }
    q += ' ORDER BY effective_date DESC LIMIT 200';
    return all(q, params);
}

// ─── CONVERT ───────────────────────────
async function convert(amount, from, to, date) {
    if (from === to) return amount;
    const rate = await getExchangeRate(from, to, date);
    return parseFloat(amount) * rate;
}

module.exports = {
    listCurrencies, getCurrency, createCurrency, updateCurrency,
    setDefault, deleteCurrency,
    getExchangeRate, setExchangeRate, listExchangeRates,
    convert,
};
