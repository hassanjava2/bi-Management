/**
 * BI Management - AI Task Distribution API
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const aiDistribution = require('../services/ai-distribution/index');

router.use(auth);

/** Get distribution config */
router.get('/config', (req, res) => {
    try {
        const config = aiDistribution.getDistributionConfig();
        res.json({ success: true, data: config });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Update distribution config */
router.put('/config', (req, res) => {
    try {
        const data = aiDistribution.setDistributionConfig(req.body || {});
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Get all users skill scores */
router.get('/skills', (req, res) => {
    try {
        const data = aiDistribution.getAllSkills();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Get workload summary for all users */
router.get('/workload', (req, res) => {
    try {
        const workloads = aiDistribution.getAllWorkloads();
        res.json({ success: true, data: workloads });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Get distribution log */
router.get('/log', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const list = aiDistribution.getDistributionLog(limit);
        res.json({ success: true, data: list });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Get pending approvals (manager) */
router.get('/approvals', (req, res) => {
    try {
        const list = aiDistribution.getPendingApprovals();
        res.json({ success: true, data: list });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Approve an assignment */
router.post('/approvals/:id/approve', (req, res) => {
    try {
        const { id } = req.params;
        const { assign_to: overrideUserId } = req.body || {};
        const result = aiDistribution.approveAssignment(id, req.user.id, overrideUserId);
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Reject an approval */
router.post('/approvals/:id/reject', (req, res) => {
    try {
        const result = aiDistribution.rejectApproval(req.params.id, req.user.id);
        res.json({ success: result.success });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Score candidates for a task (for UI) */
router.post('/score-candidates', (req, res) => {
    try {
        const taskDef = req.body;
        if (!taskDef || !taskDef.required_skills) {
            return res.status(400).json({ success: false, error: 'taskDef with required_skills needed' });
        }
        const scores = aiDistribution.getCandidateScores(taskDef);
        res.json({ success: true, data: scores });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Emit event manually (e.g. daily_tasks, stock_low) */
router.post('/emit', (req, res) => {
    try {
        const { eventType, payload } = req.body;
        if (!eventType) {
            return res.status(400).json({ success: false, error: 'eventType required' });
        }
        aiDistribution.eventBus.emit(eventType, payload || {});
        res.json({ success: true, message: 'Event emitted' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Get users absent today (for reassign UI) */
router.get('/absent-today', (req, res) => {
    try {
        const list = aiDistribution.getAbsentToday();
        res.json({ success: true, data: list });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Reassign open tasks from an absent user to others */
router.post('/reassign/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const result = aiDistribution.reassignTasksFromUser(userId);
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/** Process event synchronously and return created/pending results */
router.post('/process-event', async (req, res) => {
    try {
        const { eventType, payload } = req.body;
        if (!eventType) {
            return res.status(400).json({ success: false, error: 'eventType required' });
        }
        const event = { eventType, payload: payload || {}, timestamp: new Date().toISOString() };
        const results = await aiDistribution.processEvent(event);
        res.json({ success: true, data: results });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
