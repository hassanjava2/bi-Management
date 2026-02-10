/**
 * BI Management - Routes Index
 */

const router = require('express').Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const taskRoutes = require('./task.routes');
const attendanceRoutes = require('./attendance.routes');
const notificationRoutes = require('./notification.routes');
const deviceRoutes = require('./device.routes');
const externalRoutes = require('./external.routes');
const aiRoutes = require('./ai.routes');
const goalsRoutes = require('./goals.routes');
const camerasRoutes = require('./cameras.routes');
const trainingRoutes = require('./training.routes');
const securityRoutes = require('./security.routes');
const permissionsRoutes = require('./permissions.routes');
const auditRoutes = require('./audit.routes');
const approvalRoutes = require('./approval.routes');
const warrantyRoutes = require('./warranty.routes');
const invoiceRoutes = require('./invoice.routes');
const botRoutes = require('./bot.routes');

// ERP Module Routes
const inventoryRoutes = require('./inventory.routes');
const returnsRoutes = require('./returns.routes');
const accountingRoutes = require('./accounting.routes');
const suppliersRoutes = require('./suppliers.routes');
const customersRoutes = require('./customers.routes');
const productsRoutes = require('./products.routes');
const reportsRoutes = require('./reports.routes');
const deliveryRoutes = require('./delivery.routes');
const settingsRoutes = require('./settings.routes');
const companiesRoutes = require('./companies.routes');
const fixedAssetsRoutes = require('./fixed-assets.routes');
const calculatorRoutes = require('./calculator.routes');
const sharesRoutes = require('./shares.routes');
const mediaRoutes = require('./media.routes');
const aiDistributionRoutes = require('./ai-distribution.routes');

// API Info (root route)
router.get('/', (req, res) => {
    res.json({
        success: true,
        name: 'BI Management API',
        version: '3.0.0',
        status: 'running',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            users: '/api/users',
            tasks: '/api/tasks',
            inventory: '/api/inventory',
            sales: '/api/sales',
            dashboard: '/api/dashboard'
        }
    });
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        features: {
            permissions: '600+',
            tables: '80+',
            security_levels: 5
        }
    });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/devices', deviceRoutes);
router.use('/external', externalRoutes);
router.use('/ai', aiRoutes);
router.use('/goals', goalsRoutes);
router.use('/cameras', camerasRoutes);
router.use('/training', trainingRoutes);
router.use('/security', securityRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/audit', auditRoutes);
router.use('/approvals', approvalRoutes);
router.use('/warranty', warrantyRoutes);
router.use('/invoices', invoiceRoutes);

// ERP Module Routes
router.use('/inventory', inventoryRoutes);
router.use('/returns', returnsRoutes);
router.use('/accounting', accountingRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/customers', customersRoutes);
router.use('/products', productsRoutes);
router.use('/companies', companiesRoutes);
router.use('/fixed-assets', fixedAssetsRoutes);
router.use('/calculator', calculatorRoutes);
router.use('/shares', sharesRoutes);
router.use('/media', mediaRoutes);
router.use('/ai-distribution', aiDistributionRoutes);

// Sales route (alias for invoices)
router.use('/sales', invoiceRoutes);

// Reports & Settings
router.use('/reports', reportsRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/settings', settingsRoutes);

// Bot routes
router.use('/bot', botRoutes);

// Dashboard stats
router.get('/dashboard', require('../middleware/auth').auth, async (req, res) => {
    const taskService = require('../services/task.service');
    const attendanceService = require('../services/attendance.service');
    const userService = require('../services/user.service');
    const notificationService = require('../services/notification.service');

    const taskStats = await taskService.getTaskStats(
        req.user.role === 'admin' ? {} : { assigned_to: req.user.id }
    );
    const attendanceStats = await attendanceService.getAttendanceStats();
    const unreadNotifications = await notificationService.getUnreadCount(req.user.id);

    res.json({
        success: true,
        data: {
            tasks: taskStats,
            attendance: attendanceStats,
            unread_notifications: unreadNotifications
        }
    });
});

module.exports = router;
