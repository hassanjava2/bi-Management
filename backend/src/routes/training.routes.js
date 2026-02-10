/**
 * BI Management - Training Routes
 * مسارات نظام التدريب
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { hasRole, hasSecurityLevel } = require('../middleware/rbac');
const { onboardingService } = require('../services/onboarding.service');
const { asyncHandler } = require('../middleware/errorHandler');

// ========== Employee Routes ==========

/**
 * GET /api/training/my-progress
 * تقدم تدريبي
 */
router.get('/my-progress', auth, asyncHandler(async (req, res) => {
    const progress = await onboardingService.checkProgress(req.user.id);

    res.json({
        success: true,
        data: progress
    });
}));

/**
 * POST /api/training/complete-task/:index
 * إكمال مهمة تدريب
 */
router.post('/complete-task/:index', auth, asyncHandler(async (req, res) => {
    const { index } = req.params;
    const { score, notes } = req.body;

    const progress = await onboardingService.completeTrainingTask(
        req.user.id,
        parseInt(index),
        score,
        notes
    );

    res.json({
        success: true,
        data: progress,
        message: 'تم إكمال المهمة بنجاح'
    });
}));

/**
 * GET /api/training/today-tasks
 * مهام التدريب لليوم
 */
router.get('/today-tasks', auth, asyncHandler(async (req, res) => {
    const progress = await onboardingService.checkProgress(req.user.id);

    if (!progress.in_training) {
        return res.json({
            success: true,
            data: { in_training: false, tasks: [] }
        });
    }

    const todayTasks = progress.tasks.filter(t => t.day === progress.current_day);

    res.json({
        success: true,
        data: {
            current_day: progress.current_day,
            tasks: todayTasks
        }
    });
}));

// ========== HR/Admin Routes ==========

/**
 * POST /api/training/start/:employeeId
 * بدء تدريب موظف
 */
router.post('/start/:employeeId', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const result = await onboardingService.startOnboarding(req.params.employeeId);

    res.json({
        success: true,
        data: result
    });
}));

/**
 * GET /api/training/report
 * تقرير التدريب
 */
router.get('/report', auth, hasSecurityLevel(3), asyncHandler(async (req, res) => {
    const report = await onboardingService.getTrainingReport();

    res.json({
        success: true,
        data: report
    });
}));

/**
 * GET /api/training/employee/:id
 * تقدم موظف معين
 */
router.get('/employee/:id', auth, hasSecurityLevel(3), asyncHandler(async (req, res) => {
    const progress = await onboardingService.checkProgress(req.params.id);

    res.json({
        success: true,
        data: progress
    });
}));

/**
 * GET /api/training/plans
 * قائمة خطط التدريب
 */
router.get('/plans', auth, hasSecurityLevel(3), asyncHandler(async (req, res) => {
    const plans = await onboardingService.listTrainingPlans();

    res.json({
        success: true,
        data: plans
    });
}));

/**
 * POST /api/training/plans
 * إنشاء خطة تدريب جديدة
 */
router.post('/plans', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const { name, description, position_id, duration_days, tasks } = req.body;

    if (!name || !duration_days) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_DATA',
            message: 'name و duration_days مطلوبان'
        });
    }

    const plan = await onboardingService.createTrainingPlan({
        name,
        description,
        position_id,
        duration_days,
        tasks
    });

    res.status(201).json({
        success: true,
        data: plan,
        message: 'تم إنشاء خطة التدريب'
    });
}));

/**
 * POST /api/training/send-reminders
 * إرسال تذكيرات التدريب (للـ scheduler)
 */
router.post('/send-reminders', auth, hasSecurityLevel(5), asyncHandler(async (req, res) => {
    const report = await onboardingService.getTrainingReport();

    for (const trainee of report.trainees) {
        await onboardingService.sendDailyTrainingReminder(trainee.employee_id);
    }

    res.json({
        success: true,
        message: `تم إرسال تذكيرات لـ ${report.trainees.length} متدرب`
    });
}));

module.exports = router;
