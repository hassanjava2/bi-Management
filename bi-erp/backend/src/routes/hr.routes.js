/**
 * BI Management - HR Routes
 * مسارات الموارد البشرية — thin controller
 */
const router = require('express').Router();
const { auth } = require('../middleware/auth');
const hrService = require('../services/hr.service');
const logger = require('../utils/logger');

router.use(auth);

// Role check helper
const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role) && req.user?.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'صلاحية غير كافية' });
    }
    next();
};

// ════════════════ STATS ════════════════
router.get('/stats', async (req, res) => {
    try { res.json({ success: true, data: await hrService.getHRStats() }); }
    catch (e) { res.json({ success: true, data: { total_employees: 0, active_employees: 0, departments: 0, pending_leaves: 0 } }); }
});

// ════════════════ DEPARTMENTS ════════════════
router.get('/departments', async (req, res) => {
    try { res.json({ success: true, data: await hrService.listDepartments() }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/departments/:id', async (req, res) => {
    try {
        const data = await hrService.getDepartmentById(req.params.id);
        if (!data) return res.status(404).json({ success: false, error: 'القسم غير موجود' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/departments', requireRole('admin', 'hr'), async (req, res) => {
    try { res.status(201).json({ success: true, data: await hrService.createDepartment(req.body) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/departments/:id', requireRole('admin', 'hr'), async (req, res) => {
    try { res.json({ success: true, data: await hrService.updateDepartment(req.params.id, req.body) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/departments/:id', requireRole('admin', 'hr'), async (req, res) => {
    try {
        const result = await hrService.deleteDepartment(req.params.id);
        if (result.error) return res.status(400).json({ success: false, error: result.message });
        res.json({ success: true, message: 'تم حذف القسم' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ════════════════ LEAVES ════════════════
router.get('/leaves/stats', async (req, res) => {
    try { res.json({ success: true, data: await hrService.getLeaveStats() }); }
    catch (e) { res.json({ success: true, data: { pending: 0, on_leave_today: 0, approved_upcoming: 0 } }); }
});

router.get('/leaves/types', (req, res) => {
    res.json({ success: true, data: hrService.LEAVE_TYPES });
});

router.get('/leaves/balance/:userId', async (req, res) => {
    try { res.json({ success: true, data: await hrService.getLeaveBalance(req.params.userId) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/leaves', async (req, res) => {
    try { res.json({ success: true, data: await hrService.listLeaves(req.query) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/leaves', async (req, res) => {
    try { res.status(201).json({ success: true, data: await hrService.createLeave(req.body, req.user?.id) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/leaves/:id/approve', requireRole('admin', 'hr', 'manager'), async (req, res) => {
    try { res.json({ success: true, data: await hrService.approveLeave(req.params.id, req.user?.id), message: 'تمت الموافقة على الإجازة' }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/leaves/:id/reject', requireRole('admin', 'hr', 'manager'), async (req, res) => {
    try { res.json({ success: true, data: await hrService.rejectLeave(req.params.id, req.user?.id, req.body.reason), message: 'تم رفض الإجازة' }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ════════════════ ADVANCES ════════════════
router.get('/advances', async (req, res) => {
    try { res.json({ success: true, data: await hrService.listAdvances(req.query) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/advances', async (req, res) => {
    try { res.status(201).json({ success: true, data: await hrService.createAdvance(req.body, req.user?.id) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/advances/:id/approve', requireRole('admin', 'hr', 'owner'), async (req, res) => {
    try { res.json({ success: true, data: await hrService.approveAdvance(req.params.id, req.user?.id), message: 'تمت الموافقة على السلفة' }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/advances/:id/reject', requireRole('admin', 'hr', 'owner'), async (req, res) => {
    try { res.json({ success: true, data: await hrService.rejectAdvance(req.params.id, req.user?.id), message: 'تم رفض السلفة' }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ════════════════ PAYROLL ════════════════
router.get('/payroll', requireRole('admin', 'hr', 'owner'), async (req, res) => {
    try { res.json({ success: true, data: await hrService.listPayroll(req.query) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/payroll/summary/:period', requireRole('admin', 'hr', 'owner'), async (req, res) => {
    try { res.json({ success: true, data: await hrService.getPayrollSummary(req.params.period) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/payroll/generate', requireRole('admin', 'hr', 'owner'), async (req, res) => {
    try {
        const result = await hrService.generatePayroll(req.body.period, req.user?.id);
        res.json({ success: true, data: result, message: `تم إنشاء ${result.generated} كشف راتب` });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/payroll/:id/approve', requireRole('admin', 'owner'), async (req, res) => {
    try { res.json({ success: true, data: await hrService.approvePayroll(req.params.id) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/payroll/:id/pay', requireRole('admin', 'owner'), async (req, res) => {
    try { res.json({ success: true, data: await hrService.markPayrollPaid(req.params.id, req.body.method), message: 'تم تسجيل الدفع' }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ════════════════ SCHEDULES ════════════════
router.get('/schedules', async (req, res) => {
    try { res.json({ success: true, data: await hrService.listSchedules() }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/schedules', requireRole('admin', 'hr'), async (req, res) => {
    try { res.status(201).json({ success: true, data: await hrService.createSchedule(req.body) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/schedules/:id', requireRole('admin', 'hr'), async (req, res) => {
    try { res.json({ success: true, data: await hrService.updateSchedule(req.params.id, req.body) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/schedules/:id', requireRole('admin', 'hr'), async (req, res) => {
    try { res.json({ success: true, ...(await hrService.deleteSchedule(req.params.id)) }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ════════════════ EMPLOYEE PROFILE ════════════════
router.get('/employees/:id/profile', async (req, res) => {
    try {
        const data = await hrService.getEmployeeProfile(req.params.id);
        if (!data) return res.status(404).json({ success: false, error: 'الموظف غير موجود' });
        // Hide salary from non-authorized users
        if (!['admin', 'hr', 'owner'].includes(req.user?.role) && req.user?.id !== req.params.id) {
            delete data.salary;
            delete data.salary_currency;
        }
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/employees/:id/hr', requireRole('admin', 'hr'), async (req, res) => {
    try {
        const data = await hrService.updateEmployeeHR(req.params.id, req.body);
        if (!data) return res.status(400).json({ success: false, error: 'لا توجد تحديثات' });
        res.json({ success: true, data, message: 'تم تحديث بيانات الموظف' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
