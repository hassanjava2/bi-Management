/**
 * AI Task Distribution - إعدادات التوزيع (أوزان النقاط وحد الحمل)
 * مخزنة في جدول settings
 */

const { get, run } = require('../../config/database');

const DEFAULT_CONFIG = {
    weights: {
        skill: 0.40,
        workload: 0.25,
        history: 0.20,
        availability: 0.15,
    },
    max_utilization: 0.85,
};

let cached = null;

async function getConfig() {
    if (cached) return cached;
    try {
        const row = await get(`SELECT value FROM settings WHERE key = ?`, ['ai_distribution_config']);
        if (row?.value) {
            const parsed = JSON.parse(row.value);
            cached = { ...DEFAULT_CONFIG, ...parsed };
            if (parsed.weights) cached.weights = { ...DEFAULT_CONFIG.weights, ...parsed.weights };
            return cached;
        }
    } catch (e) {
        console.warn('[AI Distribution Config] getConfig:', e.message);
    }
    cached = { ...DEFAULT_CONFIG };
    return cached;
}

async function setConfig(updates) {
    const current = getConfig();
    const next = {
        weights: { ...current.weights, ...(updates.weights || {}) },
        max_utilization: updates.max_utilization !== undefined ? Number(updates.max_utilization) : current.max_utilization,
    };
    next.max_utilization = Math.max(0.1, Math.min(1, next.max_utilization));
    await run(
        `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        ['ai_distribution_config', JSON.stringify(next)]
    );
    cached = next;
    return next;
}

function clearCache() {
    cached = null;
}

module.exports = {
    getConfig,
    setConfig,
    clearCache,
    DEFAULT_CONFIG,
};
