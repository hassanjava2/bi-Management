/**
 * BI Management - Settings Routes
 * مسارات الإعدادات
 */

const router = require('express').Router();
const { run, get, all } = require('../config/database');
const { auth } = require('../middleware/auth');

router.use(auth);

/**
 * GET /api/settings
 * جلب جميع الإعدادات
 */
router.get('/', async (req, res) => {
    try {
        const settings = await all(`SELECT * FROM settings ORDER BY category, key`);
        
        // تحويل إلى كائن منظم
        const organized = {};
        for (const setting of settings) {
            if (!organized[setting.category]) {
                organized[setting.category] = {};
            }
            organized[setting.category][setting.key] = setting.value;
        }
        
        res.json({
            success: true,
            data: organized
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/settings/print (Phase 10)
 * إعدادات الطباعة: طابعة افتراضية، حجم ورق، اتجاه
 */
router.get('/print', async (req, res) => {
    try {
        const rows = await all(`SELECT key, value FROM settings WHERE category = 'print' OR key LIKE 'print.%'`);
        const data = { default_printer: '', paper_size: 'A4', orientation: 'portrait' };
        for (const r of rows) {
            const k = r.key.replace('print.', '');
            data[k] = r.value;
        }
        res.json({ success: true, data });
    } catch (e) {
        res.json({ success: true, data: { default_printer: '', paper_size: 'A4', orientation: 'portrait' } });
    }
});

/**
 * GET /api/settings/invoice-templates (Phase 10)
 * قوالب الفواتير (بيع، شراء، عرض سعر، إلخ)
 */
router.get('/invoice-templates', async (req, res) => {
    try {
        const rows = await all(`SELECT key, value FROM settings WHERE category = 'invoice_template' OR key LIKE 'invoice_template.%'`);
        const data = {};
        for (const r of rows) data[r.key] = r.value;
        res.json({ success: true, data });
    } catch (e) {
        res.json({ success: true, data: {} });
    }
});

/**
 * GET /api/settings/:key
 * جلب إعداد محدد
 */
router.get('/:key', async (req, res) => {
    try {
        const setting = await get(`SELECT * FROM settings WHERE key = ?`, [req.params.key]);
        
        if (!setting) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            data: setting
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings/:key
 * تحديث إعداد
 */
router.put('/:key', async (req, res) => {
    try {
        const { value } = req.body;
        
        const existing = await get(`SELECT * FROM settings WHERE key = ?`, [req.params.key]);
        
        if (existing) {
            await run(`UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`, 
                [value, req.params.key]);
        } else {
            await run(`INSERT INTO settings (key, value, category, created_at) VALUES (?, ?, 'general', CURRENT_TIMESTAMP)`,
                [req.params.key, value]);
        }
        
        res.json({
            success: true,
            message: 'تم تحديث الإعداد'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/settings/category/:category
 * جلب إعدادات فئة معينة
 */
router.get('/category/:category', async (req, res) => {
    try {
        const settings = await all(`SELECT * FROM settings WHERE category = ?`, [req.params.category]);
        
        const data = {};
        for (const s of settings) {
            data[s.key] = s.value;
        }
        
        res.json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
