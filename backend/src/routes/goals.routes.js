/**
 * BI Management - Goals & Incentives Routes
 * مسارات نظام Bi Goals
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { hasRole, hasSecurityLevel } = require('../middleware/rbac');
const { goalsService, POINTS_CONFIG, LEVELS } = require('../services/goals.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/goals/my-points
 * نقاطي
 */
router.get('/my-points', auth, asyncHandler(async (req, res) => {
    const points = await goalsService.getUserPoints(req.user.id);
    
    res.json({
        success: true,
        data: points
    });
}));

/**
 * GET /api/goals/my-history
 * سجل نقاطي
 */
router.get('/my-history', auth, asyncHandler(async (req, res) => {
    const { limit = 20, offset = 0 } = req.query;
    
    const history = await goalsService.getPointsHistory(
        req.user.id, 
        parseInt(limit), 
        parseInt(offset)
    );
    
    res.json({
        success: true,
        data: history
    });
}));

/**
 * GET /api/goals/my-stats
 * إحصائياتي
 */
router.get('/my-stats', auth, asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;
    
    const stats = await goalsService.getUserStats(req.user.id, period);
    
    res.json({
        success: true,
        data: stats
    });
}));

/**
 * GET /api/goals/my-badges
 * شاراتي
 */
router.get('/my-badges', auth, asyncHandler(async (req, res) => {
    const badges = await goalsService.getUserBadges(req.user.id);
    
    res.json({
        success: true,
        data: badges
    });
}));

/**
 * GET /api/goals/leaderboard
 * لوحة المتصدرين
 */
router.get('/leaderboard', auth, asyncHandler(async (req, res) => {
    const { period = 'monthly', department_id, limit = 10 } = req.query;
    
    const leaderboard = await goalsService.getLeaderboard(
        period, 
        department_id || null, 
        parseInt(limit)
    );
    
    res.json({
        success: true,
        data: leaderboard
    });
}));

/**
 * GET /api/goals/rewards
 * المكافآت المتاحة
 */
router.get('/rewards', auth, asyncHandler(async (req, res) => {
    const rewards = await goalsService.getAvailableRewards();
    
    res.json({
        success: true,
        data: rewards
    });
}));

/**
 * POST /api/goals/rewards/:id/redeem
 * استبدال مكافأة
 */
router.post('/rewards/:id/redeem', auth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const redemption = await goalsService.redeemReward(req.user.id, id);
    
    res.json({
        success: true,
        data: redemption,
        message: 'تم طلب المكافأة بنجاح'
    });
}));

/**
 * GET /api/goals/levels
 * المستويات
 */
router.get('/levels', auth, asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: LEVELS
    });
}));

/**
 * GET /api/goals/config
 * تكوين النقاط
 */
router.get('/config', auth, asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: {
            points: POINTS_CONFIG,
            levels: LEVELS
        }
    });
}));

// ========== Admin/HR Routes ==========

/**
 * POST /api/goals/award
 * منح نقاط يدوياً (HR/Admin)
 */
router.post('/award', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const { user_id, points, reason, description } = req.body;
    
    if (!user_id || !points) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_DATA',
            message: 'user_id و points مطلوبان'
        });
    }

    const transaction = await goalsService.awardPoints(
        user_id, 
        reason || 'manual_bonus', 
        parseInt(points)
    );
    
    res.json({
        success: true,
        data: transaction,
        message: `تم منح ${points} نقطة`
    });
}));

/**
 * POST /api/goals/deduct
 * خصم نقاط يدوياً (HR/Admin)
 */
router.post('/deduct', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const { user_id, points, reason, note } = req.body;
    
    if (!user_id || !points) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_DATA',
            message: 'user_id و points مطلوبان'
        });
    }

    const transaction = await goalsService.deductPoints(
        user_id, 
        reason || 'manual_deduction', 
        parseInt(points),
        note
    );
    
    res.json({
        success: true,
        data: transaction,
        message: `تم خصم ${points} نقطة`
    });
}));

/**
 * GET /api/goals/user/:id
 * نقاط موظف معين (HR/Admin/Manager)
 */
router.get('/user/:id', auth, hasSecurityLevel(3), asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const points = await goalsService.getUserPoints(id);
    const stats = await goalsService.getUserStats(id, 'month');
    const badges = await goalsService.getUserBadges(id);
    
    res.json({
        success: true,
        data: {
            ...points,
            stats,
            badges
        }
    });
}));

/**
 * GET /api/goals/user/:id/history
 * سجل نقاط موظف (HR/Admin)
 */
router.get('/user/:id/history', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const history = await goalsService.getPointsHistory(id, parseInt(limit), parseInt(offset));
    
    res.json({
        success: true,
        data: history
    });
}));

module.exports = router;
