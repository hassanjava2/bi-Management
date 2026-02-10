/**
 * BI Management - Task Service
 * خدمة إدارة المهام
 */

const { run, get, all } = require('../config/database');
const { generateId, now, today } = require('../utils/helpers');
const notificationService = require('./notification.service');

// Lazy load goals service to avoid circular dependency
let goalsService = null;
function getGoalsService() {
    if (!goalsService) {
        goalsService = require('./goals.service').goalsService;
    }
    return goalsService;
}

/**
 * Create task
 */
async function createTask(data, assignedBy) {
    const id = generateId();

    try {
        await run(`
            INSERT INTO tasks (
                id, title, description, assigned_to, assigned_by,
                department_id, priority, status, category,
                source, source_reference, due_date, estimated_minutes,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
            id,
            data.title,
            data.description || null,
            data.assigned_to || null,
            assignedBy,
            data.department_id || null,
            data.priority || 'medium',
            data.status || 'pending',
            data.category || null,
            data.source || 'manual',
            data.source_reference ? JSON.stringify(data.source_reference) : null,
            data.due_date || null,
            data.estimated_minutes || null
        ]);
    } catch (insertError) {
        console.error('[Task] Insert error:', insertError.message);
        throw insertError;
    }

    // Send notification to assigned user
    if (data.assigned_to) {
        try {
            notificationService.create({
                user_id: data.assigned_to,
                title: 'New Task',
                body: `You have been assigned a new task: ${data.title}`,
                type: 'task',
                data: { task_id: id, priority: data.priority }
            });
        } catch (notifError) {
            console.error('[Task] Notification failed:', notifError.message);
            // Don't fail task creation if notification fails
        }
    }

    return getTask(id);
}

/**
 * Get task by ID
 */
async function getTask(taskId) {
    const task = await get(`
        SELECT t.*, 
               u1.full_name as assigned_to_name,
               u2.full_name as assigned_by_name,
               d.name as department_name
        FROM tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN users u2 ON t.assigned_by = u2.id
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.id = ?
    `, [taskId]);

    if (!task) return null;

    // Get comments
    const comments = await all(`
        SELECT tc.*, u.full_name as user_name
        FROM task_comments tc
        LEFT JOIN users u ON tc.user_id = u.id
        WHERE tc.task_id = ?
        ORDER BY tc.created_at ASC
    `, [taskId]);

    return {
        ...task,
        source_reference: task.source_reference ? JSON.parse(task.source_reference) : null,
        attachments: task.attachments ? JSON.parse(task.attachments) : [],
        comments
    };
}

/**
 * Get tasks list
 */
async function getTasks(filters = {}) {
    let query = `
        SELECT t.*, 
               u1.full_name as assigned_to_name,
               d.name as department_name
        FROM tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE 1=1
    `;
    const params = [];

    if (filters.assigned_to) {
        query += ` AND t.assigned_to = ?`;
        params.push(filters.assigned_to);
    }

    if (filters.status) {
        if (Array.isArray(filters.status)) {
            query += ` AND t.status IN (${filters.status.map(() => '?').join(',')})`;
            params.push(...filters.status);
        } else {
            query += ` AND t.status = ?`;
            params.push(filters.status);
        }
    }

    if (filters.priority) {
        query += ` AND t.priority = ?`;
        params.push(filters.priority);
    }

    if (filters.source) {
        query += ` AND t.source = ?`;
        params.push(filters.source);
    }

    if (filters.department_id) {
        query += ` AND t.department_id = ?`;
        params.push(filters.department_id);
    }

    if (filters.due_date) {
        query += ` AND date(t.due_date) = ?`;
        params.push(filters.due_date);
    }

    if (filters.overdue) {
        query += ` AND t.due_date < CURRENT_TIMESTAMP AND t.status NOT IN ('completed', 'cancelled')`;
    }

    query += ` ORDER BY 
        CASE t.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
        END,
        t.due_date ASC`;

    if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
        
        if (filters.offset) {
            query += ` OFFSET ?`;
            params.push(filters.offset);
        }
    }

    return await all(query, params);
}

/**
 * Update task
 */
async function updateTask(taskId, data) {
    const updates = [];
    const params = [];

    const allowedFields = ['title', 'description', 'assigned_to', 'priority', 
                           'category', 'due_date', 'estimated_minutes'];

    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            updates.push(`${field} = ?`);
            params.push(data[field]);
        }
    }

    if (updates.length === 0) {
        return getTask(taskId);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(taskId);

    await run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);

    return getTask(taskId);
}

/**
 * Update task status
 */
async function updateTaskStatus(taskId, status, userId, delayReason = null) {
    const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];

    // Get task details before update
    const taskBefore = await get(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

    if (status === 'in_progress') {
        updates.push('started_at = COALESCE(started_at, CURRENT_TIMESTAMP)');
    }

    if (status === 'completed') {
        updates.push('completed_at = CURRENT_TIMESTAMP');
        
        // Calculate actual minutes
        if (taskBefore?.started_at) {
            const started = new Date(taskBefore.started_at);
            const actualMinutes = Math.floor((Date.now() - started) / 60000);
            updates.push('actual_minutes = ?');
            params.push(actualMinutes);
        }
    }

    if (status === 'blocked' && delayReason) {
        updates.push('delay_reason = ?');
        params.push(delayReason);
    }

    params.push(taskId);

    await run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);

    // Award points for completed tasks (Bi Goals integration)
    if (status === 'completed' && taskBefore?.assigned_to) {
        try {
            const goals = getGoalsService();
            const today = new Date().toISOString().split('T')[0];
            const dueDate = taskBefore.due_date;
            
            // Determine point type based on completion timing
            let reason = 'task_completed';
            if (dueDate) {
                if (today < dueDate) {
                    reason = 'task_completed_early';
                } else if (today === dueDate && taskBefore.priority === 'urgent') {
                    reason = 'task_urgent_completed';
                } else if (today === taskBefore.created_at?.split('T')[0]) {
                    reason = 'task_completed_same_day';
                }
            }
            
            goals.awardPoints(taskBefore.assigned_to, reason);
        } catch (e) {
            console.error('[Task Service] Failed to award points:', e.message);
        }
        try {
            const aiDist = require('./ai-distribution/index');
            const kind = taskBefore.category || 'preparation';
            const onTime = !taskBefore.due_date || (taskBefore.completed_at && new Date(taskBefore.completed_at) <= new Date(taskBefore.due_date));
            aiDist.historyLearner.recordCompletion(taskBefore.assigned_to, kind, { onTime });
        } catch (e) {
            // AI distribution optional
        }
    }

    return getTask(taskId);
}

/**
 * Add comment to task
 */
async function addComment(taskId, userId, comment) {
    const id = generateId();

    await run(`
        INSERT INTO task_comments (id, task_id, user_id, comment)
        VALUES (?, ?, ?, ?)
    `, [id, taskId, userId, comment]);

    // Notify task owner
    const task = await get(`SELECT assigned_to, title FROM tasks WHERE id = ?`, [taskId]);
    if (task && task.assigned_to && task.assigned_to !== userId) {
        notificationService.create({
            user_id: task.assigned_to,
            title: 'New Comment',
            body: `New comment on task: ${task.title}`,
            type: 'task',
            data: { task_id: taskId }
        });
    }

    return await get(`
        SELECT tc.*, u.full_name as user_name
        FROM task_comments tc
        LEFT JOIN users u ON tc.user_id = u.id
        WHERE tc.id = ?
    `, [id]);
}

/**
 * Delete task
 */
async function deleteTask(taskId) {
    await run(`DELETE FROM task_comments WHERE task_id = ?`, [taskId]);
    await run(`DELETE FROM tasks WHERE id = ?`, [taskId]);
    return { success: true };
}

/**
 * Get task statistics
 */
async function getTaskStats(filters = {}) {
    let whereClause = '1=1';
    const params = [];

    if (filters.assigned_to) {
        whereClause += ' AND assigned_to = ?';
        params.push(filters.assigned_to);
    }

    if (filters.department_id) {
        whereClause += ' AND department_id = ?';
        params.push(filters.department_id);
    }

    const stats = await get(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN due_date < CURRENT_TIMESTAMP AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue
        FROM tasks WHERE ${whereClause}
    `, params);

    const todayTasks = await get(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE ${whereClause} AND date(due_date) = CURRENT_DATE
    `, params);

    return {
        ...stats,
        today: todayTasks?.count || 0
    };
}

module.exports = {
    createTask,
    getTask,
    getTasks,
    updateTask,
    updateTaskStatus,
    addComment,
    deleteTask,
    getTaskStats
};
