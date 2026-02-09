/**
 * BI Management - AI Routes
 * مسارات الذكاء الاصطناعي
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { aiService } = require('../services/ai.service');
const { get, run } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

// دالة إنشاء جدول المحادثات (تُستدعى عند الحاجة)
let tableCreated = false;
function ensureTable() {
    if (tableCreated) return;
    try {
        run(`
            CREATE TABLE IF NOT EXISTS ai_conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                message TEXT NOT NULL,
                response TEXT,
                conversation_id TEXT,
                blocked INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        tableCreated = true;
    } catch (e) {
        console.log('[AI Routes] Table creation deferred');
    }
}

/**
 * POST /api/ai/chat
 * إرسال رسالة للمساعد الذكي
 */
router.post('/chat', auth, asyncHandler(async (req, res) => {
    ensureTable();
    const { message, conversation_id } = req.body;
    const userId = req.user.id;

    // الحصول على معلومات المستخدم
    const user = get(`
        SELECT id, full_name, email, role, department_id, position_id, security_level
        FROM users WHERE id = ?
    `, [userId]);

    const userInfo = {
        id: userId,
        full_name: user?.full_name || 'موظف',
        department_name: user?.department_id || 'غير محدد',
        position_name: user?.position_id || 'موظف',
        security_level: user?.security_level || 1
    };

    // إرسال للـ AI Engine
    const result = await aiService.chat(userId, message, userInfo, conversation_id);

    // حفظ في سجل المحادثات
    run(`
        INSERT INTO ai_conversations (id, user_id, message, response, conversation_id, blocked, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        generateId(),
        userId,
        message,
        result.response,
        result.conversation_id,
        result.blocked ? 1 : 0,
        now()
    ]);

    res.json({
        success: true,
        data: result
    });
}));

/**
 * GET /api/ai/conversations
 * جلب محادثات المستخدم
 */
router.get('/conversations', auth, asyncHandler(async (req, res) => {
    ensureTable();
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const conversations = require('../config/database').all(`
        SELECT * FROM ai_conversations
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    `, [userId, parseInt(limit)]);

    res.json({
        success: true,
        data: conversations
    });
}));

/**
 * GET /api/ai/conversations/:id
 * جلب محادثة معينة
 */
router.get('/conversations/:id', auth, asyncHandler(async (req, res) => {
    ensureTable();
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = require('../config/database').get(`
        SELECT * FROM ai_conversations
        WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (!conversation) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Conversation not found'
        });
    }

    res.json({
        success: true,
        data: conversation
    });
}));

/**
 * POST /api/ai/analyze
 * تحليل نص
 */
router.post('/analyze', auth, asyncHandler(async (req, res) => {
    const { text, type = 'general' } = req.body;

    const result = await aiService.analyze(text, type);

    res.json({
        success: true,
        data: result
    });
}));

/**
 * POST /api/ai/tasks/generate
 * توليد مهمة من وصف
 */
router.post('/tasks/generate', auth, asyncHandler(async (req, res) => {
    const { description } = req.body;

    // الحصول على سياق إضافي
    const context = {
        user_id: req.user.id,
        user_role: req.user.role
    };

    const result = await aiService.generateTask(description, context);

    res.json({
        success: true,
        data: result
    });
}));

/**
 * POST /api/ai/tasks/suggest-assignment
 * اقتراح تعيين مهمة لموظف
 */
router.post('/tasks/suggest-assignment', auth, asyncHandler(async (req, res) => {
    const { task_description } = req.body;

    // جلب الموظفين المتاحين
    const employees = require('../config/database').all(`
        SELECT id, full_name as name, department_id as department, position_id as position, role
        FROM users
        WHERE is_active = 1
    `);

    const result = await aiService.suggestAssignment(task_description, employees || []);

    res.json({
        success: true,
        data: result
    });
}));

/**
 * GET /api/ai/health
 * فحص صحة خدمة AI
 */
router.get('/health', auth, asyncHandler(async (req, res) => {
    const health = await aiService.healthCheck();

    res.json({
        success: true,
        data: health
    });
}));

/**
 * POST /api/ai/performance/:employeeId
 * تحليل أداء موظف
 */
router.post('/performance/:employeeId', auth, asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    // جلب بيانات الأداء
    const tasksCompleted = require('../config/database').get(`
        SELECT COUNT(*) as count FROM tasks
        WHERE assigned_to = ? AND status = 'completed'
    `, [employeeId]);

    const tasksPending = require('../config/database').get(`
        SELECT COUNT(*) as count FROM tasks
        WHERE assigned_to = ? AND status IN ('pending', 'in_progress')
    `, [employeeId]);

    const attendanceData = require('../config/database').all(`
        SELECT * FROM attendance
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT 30
    `, [employeeId]);

    const performanceData = {
        tasks_completed: tasksCompleted?.count || 0,
        tasks_pending: tasksPending?.count || 0,
        attendance_records: attendanceData.length,
        // يمكن إضافة المزيد من البيانات
    };

    const result = await aiService.analyzePerformance(employeeId, performanceData);

    res.json({
        success: true,
        data: result
    });
}));

module.exports = router;
