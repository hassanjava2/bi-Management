/**
 * BI Management - AI Task Distribution
 * المنسق الرئيسي: ربط Event Bus -> Task Generator -> Assignment Engine -> إنشاء مهام / موافقة مدير
 */

const { run, get, all } = require('../../config/database');
const { generateId } = require('../../utils/helpers');
const eventBus = require('./event-bus');
const taskGenerator = require('./task-generator');
const assignmentEngine = require('./assignment-engine');
const workloadBalancer = require('./workload-balancer');
const historyLearner = require('./history-learner');
const distConfig = require('./config');
const taskService = require('../task.service');
const notificationService = require('../notification.service');

async function getManagerUserId() {
    const u = await get(`SELECT id FROM users WHERE (role = 'admin' OR role = 'owner') AND is_active = TRUE LIMIT 1`);
    return u?.id || null;
}

async function ensureTables() {
    historyLearner.ensureTable();
    try {
        await run(`
            CREATE TABLE IF NOT EXISTS ai_distribution_approvals (
                id TEXT PRIMARY KEY,
                task_title TEXT,
                task_title_ar TEXT,
                task_def TEXT,
                suggested_user_id TEXT,
                suggested_score NUMERIC,
                status TEXT DEFAULT 'pending',
                approved_by TEXT,
                created_task_id TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await run(`
            CREATE TABLE IF NOT EXISTS ai_distribution_log (
                id TEXT PRIMARY KEY,
                task_id TEXT,
                assigned_to TEXT,
                method TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        console.error('[AI Distribution] ensureTables:', e.message);
    }
}

async function seedEmployeeSkills() {
    try {
        const users = await all(`SELECT id FROM users WHERE is_active = TRUE`);
        for (const u of users) {
            historyLearner.ensureEmployeeSkills(u.id);
        }
    } catch (e) {
        console.warn('[AI Distribution] seedEmployeeSkills:', e.message);
    }
}

async function logAssignment(taskId, assignedTo, method) {
    try {
        await run(
            `INSERT INTO ai_distribution_log (id, task_id, assigned_to, method) VALUES (?, ?, ?, ?)`,
            [generateId(), taskId, assignedTo, method || 'auto']
        );
    } catch (e) {
        console.warn('[AI Distribution] logAssignment:', e.message);
    }
}

/**
 * Create one task in DB and notify assignee
 */
function createAndNotifyTask(taskDef, assignedToUserId, createdBy = null) {
    const id = generateId();
    const title = taskDef.title_ar || taskDef.title;
    const task = taskService.createTask(
        {
            title,
            description: taskDef.title || taskDef.title_ar,
            assigned_to: assignedToUserId,
            priority: taskDef.priority || 'medium',
            status: 'pending',
            category: taskDef.taskKind,
            source: 'ai_distribution',
            source_reference: taskDef.source_reference,
            estimated_minutes: taskDef.estimated_minutes || 60,
        },
        createdBy
    );

    notificationService.create({
        user_id: assignedToUserId,
        title: 'مهمة جديدة - توزيع ذكي',
        message: title,
        type: 'task',
        entity_type: 'task',
        entity_id: task.id,
        data: JSON.stringify({ task_id: task.id, source: 'ai_distribution' }),
    });

    logAssignment(task.id, assignedToUserId, createdBy ? 'approval' : 'auto');
    return task;
}

/**
 * Process one generated task: auto-assign or queue for approval
 */
async function processGeneratedTask(taskDef, managerUserId = null) {
    const selection = assignmentEngine.selectAssignee(taskDef);

    if (!selection) {
        console.warn('[AI Distribution] No eligible assignee for task', taskDef.taskKind);
        return { created: false, reason: 'no_assignee' };
    }

    if (selection.autoAssign) {
        const task = createAndNotifyTask(taskDef, selection.userId);
        return { created: true, taskId: task.id, assigned_to: selection.userId, autoAssign: true };
    }

    const approvalId = generateId();
    await run(
        `INSERT INTO ai_distribution_approvals (id, task_title, task_title_ar, task_def, suggested_user_id, suggested_score, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [
            approvalId,
            taskDef.title,
            taskDef.title_ar,
            JSON.stringify(taskDef),
            selection.userId,
            selection.score,
        ]
    );

    const managerId = managerUserId || getManagerUserId();
    if (managerId) {
        notificationService.create({
            user_id: managerId,
            title: 'موافقة مطلوبة - توزيع مهمة',
            message: `مهمة: ${taskDef.title_ar || taskDef.title}. المقترح: موظف بنقاط ${selection.score.toFixed(2)}`,
            type: 'approval',
            entity_type: 'ai_distribution_approval',
            entity_id: approvalId,
            action_url: '/ai-distribution',
        });
    }

    return { created: false, approvalId, suggested: selection, autoAssign: false };
}

/**
 * Handle incoming event: generate tasks and process each
 */
async function processEvent(event) {
    const tasks = taskGenerator.generateFromEvent(event);
    const results = [];

    for (const taskDef of tasks) {
        const result = processGeneratedTask(taskDef);
        results.push({ taskDef, ...result });
    }

    return results;
}

/**
 * Get pending approvals for manager
 */
async function getPendingApprovals() {
    const rows = await all(
        `SELECT a.*, u.full_name as suggested_user_name
         FROM ai_distribution_approvals a
         LEFT JOIN users u ON u.id = a.suggested_user_id
         WHERE a.status = 'pending' ORDER BY a.created_at DESC`
    );
    return rows.map((r) => ({
        ...r,
        task_def: r.task_def ? JSON.parse(r.task_def) : null,
    }));
}

/**
 * Manager approves: create task and assign to suggested or override user
 */
async function approveAssignment(approvalId, managerUserId, overrideUserId = null) {
    const row = await get(`SELECT * FROM ai_distribution_approvals WHERE id = ? AND status = 'pending'`, [
        approvalId,
    ]);
    if (!row) return { success: false, error: 'not_found' };

    const taskDef = JSON.parse(row.task_def || '{}');
    const assignTo = overrideUserId || row.suggested_user_id;
    const task = createAndNotifyTask(taskDef, assignTo, managerUserId);

    await run(
        `UPDATE ai_distribution_approvals SET status = 'approved', approved_by = ?, created_task_id = ? WHERE id = ?`,
        [managerUserId, task.id, approvalId]
    );

    return { success: true, taskId: task.id, assigned_to: assignTo };
}

/**
 * Reject approval
 */
async function rejectApproval(approvalId, managerUserId) {
    const r = await run(`UPDATE ai_distribution_approvals SET status = 'rejected', approved_by = ? WHERE id = ?`, [
        managerUserId,
        approvalId,
    ]);
    return { success: r.changes > 0 };
}

/**
 * Get users marked absent today (for reassignment UI)
 */
async function getAbsentToday() {
    const today = new Date().toISOString().split('T')[0];
    return await all(
        `SELECT a.user_id, u.full_name
         FROM attendance a
         JOIN users u ON u.id = a.user_id
         WHERE a.date = ? AND a.status = 'absent' AND u.is_active = TRUE`,
        [today]
    );
}

/**
 * Reassign all open tasks from an absent user to others (by score)
 * @param {string} fromUserId - user marked absent
 * @returns {{ reassigned: Array<{taskId, newUserId, title}>, skipped: number }}
 */
function reassignTasksFromUser(fromUserId) {
    const openTasks = workloadBalancer.getTasksToReassign(fromUserId);
    if (openTasks.length === 0) return { reassigned: [], skipped: 0 };

    let eligibleIds = workloadBalancer.getEligibleUserIds().filter((id) => id !== fromUserId);
    if (eligibleIds.length === 0) return { reassigned: [], skipped: openTasks.length };

    const reassigned = [];
    for (const taskRow of openTasks) {
        const task = taskService.getTask(taskRow.id);
        if (!task) continue;

        const skillKey = historyLearner.TASK_KIND_TO_SKILL[task.category] || 'preparation';
        const taskDef = {
            taskKind: task.category || 'preparation',
            title: task.title,
            title_ar: task.title,
            priority: task.priority || 'normal',
            required_skills: [skillKey],
            estimated_minutes: task.estimated_minutes || 60,
        };

        const candidates = assignmentEngine.getCandidateScores(taskDef, eligibleIds);
        const best = candidates[0];
        if (!best || best.userId === fromUserId) continue;

        try {
            taskService.updateTask(taskRow.id, { assigned_to: best.userId });
            logAssignment(taskRow.id, best.userId, 'reassign');
            notificationService.create({
                user_id: best.userId,
                title: 'مهمة مُعاد توزيعها',
                message: `تم تعيينك للمهمة: ${task.title} (نقل من موظف غائب)`,
                type: 'task',
                entity_type: 'task',
                entity_id: taskRow.id,
                action_url: '/tasks',
            });
            reassigned.push({ taskId: taskRow.id, newUserId: best.userId, title: task.title });
        } catch (e) {
            console.error('[AI Distribution] Reassign task error:', e.message);
        }
    }

    const managerId = getManagerUserId();
    if (reassigned.length > 0 && managerId) {
        notificationService.create({
            user_id: managerId,
            title: 'إعادة توزيع مهام غائب',
            message: `تم إعادة توزيع ${reassigned.length} مهمة من موظف غائب.`,
            type: 'info',
            entity_type: 'ai_distribution',
            entity_id: fromUserId,
            action_url: '/ai-distribution',
        });
    }

    return { reassigned, skipped: openTasks.length - reassigned.length };
}

/**
 * Record task completion for history learner (call from task service when status -> completed)
 */
function onTaskCompleted(taskId, userId, taskKindFromCategory) {
    const task = taskService.getTask(taskId);
    if (!task || task.assigned_to !== userId) return;
    const kind = taskKindFromCategory || task.category || 'preparation';
    const onTime =
        !task.due_date || (task.completed_at && new Date(task.completed_at) <= new Date(task.due_date));
    historyLearner.recordCompletion(userId, kind, { onTime });
}

/**
 * Get / set distribution config (weights, max_utilization)
 */
function getDistributionConfig() {
    return distConfig.getConfig();
}

function setDistributionConfig(updates) {
    distConfig.clearCache();
    return distConfig.setConfig(updates);
}

/**
 * Get skill scores for all active users (for skills overview)
 */
async function getAllSkills() {
    seedEmployeeSkills();
    const users = await all(`SELECT id, full_name FROM users WHERE is_active = TRUE`);
    return users.map((u) => ({
        user_id: u.id,
        full_name: u.full_name,
        skills: historyLearner.getSkillScores(u.id),
    }));
}

/**
 * Get distribution log (last N entries)
 */
async function getDistributionLog(limit = 50) {
    const rows = await all(
        `SELECT l.*, u.full_name as assigned_to_name, t.title as task_title
         FROM ai_distribution_log l
         LEFT JOIN users u ON u.id = l.assigned_to
         LEFT JOIN tasks t ON t.id = l.task_id
         ORDER BY l.created_at DESC LIMIT ?`,
        [limit]
    );
    return rows;
}

/**
 * Wire event bus to processor (subscribe to all)
 */
async function start() {
    ensureTables();
    seedEmployeeSkills();
    eventBus.subscribeToAll(async (event) => {
        try {
            await processEvent(event);
        } catch (e) {
            console.error('[AI Distribution] processEvent error:', e.message);
        }
    });
}

module.exports = {
    start,
    processEvent,
    getPendingApprovals,
    approveAssignment,
    rejectApproval,
    getAbsentToday,
    getDistributionConfig,
    setDistributionConfig,
    getAllSkills,
    getDistributionLog,
    reassignTasksFromUser,
    onTaskCompleted,
    getAllWorkloads: workloadBalancer.getAllWorkloads,
    getCandidateScores: assignmentEngine.getCandidateScores,
    eventBus,
    taskGenerator,
    assignmentEngine,
    workloadBalancer,
    historyLearner,
};
