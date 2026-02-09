/**
 * BI Management - Task Routes
 */

const router = require('express').Router();
const taskController = require('../controllers/task.controller');
const { auth } = require('../middleware/auth');
const { hasRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { auditMiddleware: auditAction } = require('../middleware/audit');
const { taskSchemas } = require('../utils/validators');
const { ROLES } = require('../config/constants');

// All routes require authentication
router.use(auth);

// Get today's tasks for current user
router.get('/today', taskController.todayTasks);

// Get my tasks
router.get('/my-tasks', taskController.myTasks);

// Get task statistics
router.get('/stats', taskController.stats);

// List all tasks (with filters)
router.get('/', taskController.list);

// Get task by ID
router.get('/:id', taskController.getById);

// Create task
router.post('/',
    validate(taskSchemas.create),
    auditAction('CREATE', 'tasks'),
    taskController.create
);

// Update task
router.put('/:id',
    validate(taskSchemas.update),
    auditAction('UPDATE', 'tasks'),
    taskController.update
);

// Update task status
router.put('/:id/status',
    validate(taskSchemas.updateStatus),
    auditAction('STATUS_CHANGE', 'tasks'),
    taskController.updateStatus
);

// Add comment to task
router.post('/:id/comments',
    validate(taskSchemas.comment),
    taskController.addComment
);

// Delete task (Manager/Admin only)
router.delete('/:id',
    hasRole(ROLES.ADMIN, ROLES.MANAGER),
    auditAction('DELETE', 'tasks'),
    taskController.remove
);

module.exports = router;
