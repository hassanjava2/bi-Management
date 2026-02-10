/**
 * BI Management - User Controller
 */

const userService = require('../services/user.service');
const taskService = require('../services/task.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { paginationResponse } = require('../utils/helpers');

/**
 * GET /api/users
 */
const list = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, department_id, role, is_active, search } = req.query;

    const filters = {
        department_id,
        role,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        search,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const users = await userService.getUsers(filters, req.user.security_level);
    const total = await userService.getUserCount(filters);

    res.json({
        success: true,
        ...paginationResponse(users, total, page, limit)
    });
});

/**
 * GET /api/users/:id
 */
const getById = asyncHandler(async (req, res) => {
    const user = await userService.getUser(req.params.id, req.user.security_level);

    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        data: user
    });
});

/**
 * POST /api/users
 */
const create = asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body, req.user.id);

    res.status(201).json({
        success: true,
        data: user
    });
});

/**
 * PUT /api/users/:id
 */
const update = asyncHandler(async (req, res) => {
    const existingUser = await userService.getUser(req.params.id);

    if (!existingUser) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'User not found'
        });
    }

    const user = await userService.updateUser(req.params.id, req.body, req.user.id);

    res.json({
        success: true,
        data: user
    });
});

/**
 * DELETE /api/users/:id
 */
const remove = asyncHandler(async (req, res) => {
    const existingUser = await userService.getUser(req.params.id);

    if (!existingUser) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'User not found'
        });
    }

    await userService.deleteUser(req.params.id);

    res.json({
        success: true,
        message: 'User deactivated successfully'
    });
});

/**
 * GET /api/users/:id/tasks
 */
const getUserTasks = asyncHandler(async (req, res) => {
    const { status, priority, limit = 50 } = req.query;

    const tasks = await taskService.getTasks({
        assigned_to: req.params.id,
        status,
        priority,
        limit: parseInt(limit)
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
    remove,
    getUserTasks
};
