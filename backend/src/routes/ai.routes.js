/**
 * BI Management - AI Routes
 * مسارات الذكاء الاصطناعي
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { hasRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const { aiService } = require('../services/ai.service');
const aiTaskService = require('../services/ai-task.service');
const chatActions = require('../services/ai-chat-actions');
const { get, run, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

// دالة إنشاء جدول المحادثات (تُستدعى عند الحاجة)
let tableCreated = false;
async function ensureTable() {
    if (tableCreated) return;
    try {
        await run(`
            CREATE TABLE IF NOT EXISTS ai_conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                message TEXT NOT NULL,
                response TEXT,
                conversation_id TEXT,
                blocked INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
    await ensureTable();
    const { message, conversation_id } = req.body;
    const userId = req.user.id;

    // الحصول على معلومات المستخدم
    const user = await get(`
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

    // للمدير/المالك: إن كانت الرسالة تصف مشكلة، اقتراح مهام مرتبة
    const isManager = req.user.role === 'admin' || req.user.role === 'owner' || req.user.role === 'manager';
    if (isManager && message && String(message).trim().length > 15) {
        try {
            const suggestion = await aiTaskService.processUserProblem(userId, result.conversation_id || conversation_id, String(message).trim());
            if (suggestion && suggestion.suggested_task) {
                result.suggested_tasks = [{
                    suggested_task: suggestion.suggested_task,
                    assignee_suggestion: suggestion.assignee_suggestion,
                    department: suggestion.department,
                    requires_confirmation: suggestion.requires_confirmation !== false
                }];
            }
        } catch (e) {
            console.warn('[AI Routes] suggest-tasks from chat:', e.message);
        }
    }

    // تنفيذ أوامر من المحادثة (سند قبض، سند صرف) مع التحقق من الصلاحية
    try {
        const actionResult = chatActions.processMessageForActions(String(message || '').trim(), req.user);
        if (actionResult) {
            result.action_result = actionResult;
            if (actionResult.success && actionResult.result && actionResult.result.message) {
                result.response = (result.response || '') + '\n\n' + actionResult.result.message;
            } else if (!actionResult.success && actionResult.error) {
                result.response = (result.response || '') + '\n\n(تنفيذ الأمر: ' + actionResult.error + ')';
            }
        }
    } catch (e) {
        console.warn('[AI Routes] chat action:', e.message);
    }

    // حفظ في سجل المحادثات
    await run(`
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
 * جلب محادثات المستخدم الحالي
 */
router.get('/conversations', auth, asyncHandler(async (req, res) => {
    await ensureTable();
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const conversations = await all(`
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
 * GET /api/ai/admin/conversations
 * قائمة كل دردشات الموظفين مع الذكاء (للمدير/المالك فقط)
 */
router.get('/admin/conversations', auth, hasRole(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER), asyncHandler(async (req, res) => {
    await ensureTable();
    const { user_id, from, to, limit = 100 } = req.query;
    let query = `
        SELECT c.conversation_id, c.user_id,
               MIN(c.created_at) as first_at,
               MAX(c.created_at) as last_at,
               COUNT(*) as turns
        FROM ai_conversations c
        WHERE (c.conversation_id IS NOT NULL AND c.conversation_id != '')
    `;
    const params = [];
    if (user_id) {
        query += ` AND c.user_id = ?`;
        params.push(user_id);
    }
    if (from) {
        query += ` AND date(c.created_at) >= ?`;
        params.push(from);
    }
    if (to) {
        query += ` AND date(c.created_at) <= ?`;
        params.push(to);
    }
    query += ` GROUP BY c.conversation_id, c.user_id ORDER BY last_at DESC LIMIT ?`;
    params.push(parseInt(limit) || 100);

    const rows = await all(query, params);
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const users = userIds.length ? await all(`SELECT id, full_name FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`, userIds) : [];
    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u.full_name || u.id]));

    const data = rows.map((r) => ({
        conversation_id: r.conversation_id,
        user_id: r.user_id,
        user_name: userMap[r.user_id] || r.user_id,
        first_at: r.first_at,
        last_at: r.last_at,
        turns: r.turns
    }));

    res.json({
        success: true,
        data
    });
}));

/**
 * GET /api/ai/admin/conversations/:conversationId
 * تفاصيل محادثة واحدة (كل التبادلات)
 */
router.get('/admin/conversations/:conversationId', auth, hasRole(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER), asyncHandler(async (req, res) => {
    await ensureTable();
    const { conversationId } = req.params;
    const rows = await all(`
        SELECT id, user_id, message, response, blocked, created_at
        FROM ai_conversations
        WHERE conversation_id = ?
        ORDER BY created_at ASC
    `, [conversationId]);

    if (!rows.length) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'المحادثة غير موجودة' });
    }

    const userId = rows[0].user_id;
    const user = await get(`SELECT id, full_name FROM users WHERE id = ?`, [userId]);

    res.json({
        success: true,
        data: {
            conversation_id: conversationId,
            user_id: userId,
            user_name: user?.full_name || userId,
            messages: rows.map((r) => ({
                id: r.id,
                user_message: r.message,
                ai_response: r.response,
                blocked: !!r.blocked,
                created_at: r.created_at
            }))
        }
    });
}));

/**
 * GET /api/ai/conversations/:id
 * جلب محادثة معينة
 */
router.get('/conversations/:id', auth, asyncHandler(async (req, res) => {
    await ensureTable();
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = await get(`
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
 * POST /api/ai/problems/suggest-tasks
 * تحليل مشكلة من المدير واقتراح مهام مرتبة (عنوان، وصف، أولوية، موظف مقترح)
 */
router.post('/problems/suggest-tasks', auth, asyncHandler(async (req, res) => {
    const { description } = req.body;
    if (!description || String(description).trim().length < 5) {
        return res.status(400).json({ success: false, error: 'وصف المشكلة مطلوب (5 أحرف على الأقل)' });
    }
    const suggestion = await aiTaskService.processUserProblem(req.user.id, null, String(description).trim());
    res.json({
        success: true,
        data: suggestion
    });
}));

/**
 * POST /api/ai/tasks/confirm-from-chat
 * تأكيد إنشاء المهمة المقترحة من المحادثة
 */
router.post('/tasks/confirm-from-chat', auth, asyncHandler(async (req, res) => {
    const taskData = req.body;
    if (!taskData || !taskData.title) {
        return res.status(400).json({ success: false, error: 'بيانات المهمة مطلوبة' });
    }
    const task = await aiTaskService.confirmAndCreateTask(req.user.id, taskData);
    res.json({
        success: true,
        data: task
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
    const employees = await require('../config/database').all(`
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
    const tasksCompleted = await require('../config/database').get(`
        SELECT COUNT(*) as count FROM tasks
        WHERE assigned_to = ? AND status = 'completed'
    `, [employeeId]);

    const tasksPending = await require('../config/database').get(`
        SELECT COUNT(*) as count FROM tasks
        WHERE assigned_to = ? AND status IN ('pending', 'in_progress')
    `, [employeeId]);

    const attendanceData = await require('../config/database').all(`
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
