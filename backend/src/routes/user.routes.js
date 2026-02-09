/**
 * BI Management - User Routes
 */

const router = require('express').Router();
const userController = require('../controllers/user.controller');
const { auth } = require('../middleware/auth');
const { hasRole, canViewSensitive } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { auditMiddleware: auditAction, auditSensitiveAccess } = require('../middleware/audit');
const { sensitiveLimiter } = require('../middleware/rateLimit');
const { userSchemas } = require('../utils/validators');
const { ROLES } = require('../config/constants');

// All routes require authentication
router.use(auth);

// List users (HR/Manager/Admin)
router.get('/', hasRole(ROLES.OWNER, ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), userController.list);

// Get user by ID
router.get('/:id', userController.getById);

// Create user (HR/Admin only)
router.post('/', 
    hasRole(ROLES.OWNER, ROLES.ADMIN, ROLES.HR),
    validate(userSchemas.create),
    auditAction('CREATE', 'users'),
    userController.create
);

// Update user (HR/Admin only)
router.put('/:id',
    hasRole(ROLES.ADMIN, ROLES.HR),
    validate(userSchemas.update),
    auditAction('UPDATE', 'users'),
    userController.update
);

// Delete user (Admin only)
router.delete('/:id',
    hasRole(ROLES.ADMIN),
    auditAction('DELETE', 'users'),
    userController.remove
);

// Get user's tasks
router.get('/:id/tasks', userController.getUserTasks);

// Get user's salary (Level 4+ only)
router.get('/:id/salary',
    canViewSensitive,
    sensitiveLimiter,
    auditSensitiveAccess('salary'),
    (req, res) => {
        const userService = require('../services/user.service');
        const user = userService.getUser(req.params.id, req.user.security_level);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        }

        res.json({
            success: true,
            data: {
                user_id: user.id,
                full_name: user.full_name,
                salary: user.salary
            }
        });
    }
);

module.exports = router;
