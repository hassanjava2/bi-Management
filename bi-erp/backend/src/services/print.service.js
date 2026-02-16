/**
 * BI ERP — Print & Template Settings Service (Phase 11)
 * إعدادات الطباعة + قوالب الفواتير
 */
const { get, all, run } = require('../config/database');
const { generateId } = require('../utils/helpers');

// ─── PRINT SETTINGS ───────────────────
async function getPrintSettings() {
    return get("SELECT * FROM settings WHERE category = 'print' LIMIT 1").then(r => {
        if (!r) return { paper_size: 'A4', orientation: 'portrait', margin: '10mm', show_header: true, show_footer: true, logo_position: 'center' };
        try { return JSON.parse(r.value); } catch { return r; }
    }).catch(() => ({ paper_size: 'A4', orientation: 'portrait' }));
}

async function updatePrintSettings(data) {
    const exists = await get("SELECT id FROM settings WHERE category = 'print'");
    if (exists) {
        await run("UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE category = 'print'", [JSON.stringify(data)]);
    } else {
        await run("INSERT INTO settings (id, category, key, value, created_at) VALUES ($1, 'print', 'print_settings', $2, CURRENT_TIMESTAMP)", [generateId(), JSON.stringify(data)]);
    }
    return getPrintSettings();
}

// ─── INVOICE TEMPLATES ────────────────
async function getTemplates() {
    return all("SELECT * FROM invoice_templates ORDER BY type, name").catch(() => {
        // Return defaults if table doesn't exist
        return [
            { type: 'sale', name: 'قالب البيع الافتراضي', is_default: true },
            { type: 'purchase', name: 'قالب الشراء الافتراضي', is_default: true },
            { type: 'quote', name: 'قالب عرض السعر', is_default: true },
            { type: 'return', name: 'قالب المرتجعات', is_default: true },
            { type: 'damaged', name: 'قالب الإتلاف', is_default: true },
            { type: 'consumed', name: 'قالب الصرفيات', is_default: true },
            { type: 'receipt', name: 'قالب سند القبض', is_default: true },
            { type: 'payment', name: 'قالب سند الدفع', is_default: true },
            { type: 'delivery', name: 'قالب التوصيل', is_default: true },
        ];
    });
}

async function getTemplate(id) {
    return get('SELECT * FROM invoice_templates WHERE id = $1', [id]).catch(() => null);
}

async function saveTemplate(data) {
    const id = data.id || generateId();
    const exists = data.id ? await get('SELECT id FROM invoice_templates WHERE id = $1', [data.id]) : null;

    if (exists) {
        await run(`UPDATE invoice_templates SET name = $1, type = $2, header_html = $3, body_html = $4, footer_html = $5, 
      css = $6, paper_size = $7, orientation = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9`,
            [data.name, data.type, data.header_html || '', data.body_html || '', data.footer_html || '',
            data.css || '', data.paper_size || 'A4', data.orientation || 'portrait', exists.id]);
        return getTemplate(exists.id);
    }

    await run(`INSERT INTO invoice_templates (id, name, type, header_html, body_html, footer_html, css, paper_size, orientation, is_default, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
        [id, data.name, data.type, data.header_html || '', data.body_html || '', data.footer_html || '',
            data.css || '', data.paper_size || 'A4', data.orientation || 'portrait', data.is_default || false]);
    return getTemplate(id);
}

module.exports = { getPrintSettings, updatePrintSettings, getTemplates, getTemplate, saveTemplate };
