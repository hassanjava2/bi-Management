/**
 * BI Management - Media Upload Routes
 * رفع صور/فيديو (فحص، توصيل، أجهزة)
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { run, get, all } = require('../config/database');
const { auth } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

// مجلد التخزين
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// إعداد Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const subDir = req.body.entity_type || 'general';
        const dir = path.join(UPLOAD_DIR, subDir);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${generateId().slice(0, 8)}${ext}`;
        cb(null, name);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mov|pdf/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('نوع الملف غير مسموح'));
    },
});

router.use(auth);

// Ensure media table
(async () => {
    try {
        await run(`CREATE TABLE IF NOT EXISTS media (
            id TEXT PRIMARY KEY,
            file_name TEXT,
            file_type TEXT,
            file_size INTEGER,
            mime_type TEXT,
            storage_path TEXT,
            entity_type TEXT,
            entity_id TEXT,
            media_category TEXT,
            uploaded_by TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`);
    } catch (_) {}
})();

/**
 * POST /api/media/upload
 * رفع ملف واحد
 * body: entity_type, entity_id, media_category
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'لم يتم رفع ملف' });

        const { entity_type, entity_id, media_category } = req.body;
        const id = generateId();

        await run(`INSERT INTO media (id, file_name, file_type, file_size, mime_type, storage_path, entity_type, entity_id, media_category, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            req.file.originalname,
            req.file.mimetype.startsWith('video') ? 'video' : req.file.mimetype.startsWith('image') ? 'image' : 'document',
            req.file.size,
            req.file.mimetype,
            req.file.path,
            entity_type || null,
            entity_id || null,
            media_category || null,
            req.user?.id,
        ]);

        const media = await get('SELECT * FROM media WHERE id = ?', [id]);
        res.status(201).json({
            success: true,
            data: {
                ...media,
                url: `/api/media/file/${id}`,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/media/upload-multiple
 * رفع عدة ملفات
 */
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, error: 'لم يتم رفع ملفات' });

        const { entity_type, entity_id, media_category } = req.body;
        const results = [];

        for (const file of req.files) {
            const id = generateId();
            await run(`INSERT INTO media (id, file_name, file_type, file_size, mime_type, storage_path, entity_type, entity_id, media_category, uploaded_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id, file.originalname,
                file.mimetype.startsWith('video') ? 'video' : file.mimetype.startsWith('image') ? 'image' : 'document',
                file.size, file.mimetype, file.path,
                entity_type || null, entity_id || null, media_category || null, req.user?.id,
            ]);
            results.push({ id, file_name: file.originalname, url: `/api/media/file/${id}` });
        }

        res.status(201).json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/media/file/:id
 * عرض ملف
 */
router.get('/file/:id', async (req, res) => {
    try {
        const media = await get('SELECT * FROM media WHERE id = ?', [req.params.id]);
        if (!media || !media.storage_path) return res.status(404).json({ success: false, error: 'الملف غير موجود' });
        if (!fs.existsSync(media.storage_path)) return res.status(404).json({ success: false, error: 'الملف محذوف' });
        res.sendFile(media.storage_path);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/media/entity/:type/:id
 * ملفات كيان معين
 */
router.get('/entity/:type/:id', async (req, res) => {
    try {
        const files = await all('SELECT id, file_name, file_type, file_size, media_category, created_at FROM media WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC', [req.params.type, req.params.id]);
        res.json({
            success: true,
            data: files.map(f => ({ ...f, url: `/api/media/file/${f.id}` }))
        });
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

/**
 * DELETE /api/media/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const media = await get('SELECT * FROM media WHERE id = ?', [req.params.id]);
        if (!media) return res.status(404).json({ success: false, error: 'الملف غير موجود' });
        // حذف الملف من القرص
        if (media.storage_path && fs.existsSync(media.storage_path)) {
            fs.unlinkSync(media.storage_path);
        }
        await run('DELETE FROM media WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
