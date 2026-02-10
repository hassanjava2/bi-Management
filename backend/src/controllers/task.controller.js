/**
 * BI Management - Task Controller
 */

const taskService = require('../services/task.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { paginationResponse } = require('../utils/helpers');

/**
 * GET /api/tasks
 */
const list = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, status, priority, source, department_id, due_date, overdue } = req.query;

    const filters = {
        status,
        priority,
        source,
        department_id,
        due_date,
        overdue: overdue === 'true',
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const tasks = taskService.getTasks(filters);

    res.json({
        success: true,
        data: tasks
    });
});

/**
 * GET /api/tasks/:id
 */
const getById = asyncHandler(async (req, res) => {
    const task = taskService.getTask(req.params.id);

    if (!task) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Task not found'
        });
    }

    res.json({
        success: true,
        data: task
    });
});

/**
 * POST /api/tasks
 */
const create = asyncHandler(async (req, res) => {
    const task = taskService.createTask(req.body, req.user.id);

    // تنبيه المهمة الجديدة
    try {
        const notifService = require('../services/notification.service');
        if (task && task.assigned_to && notifService.notifyEvent) {
            notifService.notifyEvent(notifService.NOTIFICATION_TYPES.TASK_ASSIGNED, {
                recipient_id: task.assigned_to,
                task_title: task.title || task.description,
                entity_type: 'task',
                entity_id: task.id,
                action_url: `/tasks`,
            });
        }
    } catch (_) {}

    res.status(201).json({
        success: true,
        data: task
    });
});

/**
 * PUT /api/tasks/:id
 */
const update = asyncHandler(async (req, res) => {
    const existingTask = taskService.getTask(req.params.id);

    if (!existingTask) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Task not found'
        });
    }

    const task = taskService.updateTask(req.params.id, req.body);

    res.json({
        success: true,
        data: task
    });
});

/**
 * PUT /api/tasks/:id/status
 */
const updateStatus = asyncHandler(async (req, res) => {
    const { status, delay_reason } = req.body;

    const existingTask = taskService.getTask(req.params.id);

    if (!existingTask) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Task not found'
        });
    }

    const task = taskService.updateTaskStatus(req.params.id, status, req.user.id, delay_reason);

    res.json({
        success: true,
        data: task
    });
});

/**
 * POST /api/tasks/:id/comments
 */
const addComment = asyncHandler(async (req, res) => {
    const { comment } = req.body;

    const existingTask = taskService.getTask(req.params.id);

    if (!existingTask) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Task not found'
        });
    }

    const newComment = taskService.addComment(req.params.id, req.user.id, comment);

    res.status(201).json({
        success: true,
        data: newComment
    });
});

/**
 * DELETE /api/tasks/:id
 */
const remove = asyncHandler(async (req, res) => {
    const existingTask = taskService.getTask(req.params.id);

    if (!existingTask) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Task not found'
        });
    }

    taskService.deleteTask(req.params.id);

    res.json({
        success: true,
        message: 'Task deleted successfully'
    });
});

/**
 * GET /api/my-tasks
 */
const myTasks = asyncHandler(async (req, res) => {
    const { status, priority } = req.query;

    const tasks = taskService.getTasks({
        assigned_to: req.user.id,
        status,
        priority
    });

    res.json({
        success: true,
        data: tasks
    });
});

/**
 * GET /api/tasks/stats
 */
const stats = asyncHandler(async (req, res) => {
    const { assigned_to, department_id } = req.query;

    const taskStats = taskService.getTaskStats({
        assigned_to,
        department_id
    });

    res.json({
        success: true,
        data: taskStats
    });
});

/**
 * GET /api/tasks/today
 */
const todayTasks = asyncHandler(async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    const tasks = taskService.getTasks({
        assigned_to: req.user.id,
        due_date: today,
        limit: 50
    });

    res.json({
        success: true,
        data: tasks
    });
});

module.exports = {
    list,
    getById,
    create,
    update,
    updateStatus,
    addComment,
    remove,
    myTasks,
    todayTasks,
    stats
};
