/**
 * BI Management - Bot Routes
 * مسارات API للبوت الذكي
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { ownerOnly } = require('../middleware/rbac');
const { getBot } = require('../services/ai-bot');
const { get, all } = require('../config/database');

// Get bot instance
const bot = getBot();

/**
 * GET /api/bot/status
 * حالة البوت
 */
router.get('/status', auth, (req, res) => {
    res.json({
        success: true,
        data: {
            name: bot.name,
            version: bot.version,
            isRunning: bot.isRunning,
            isPaused: bot.isPaused,
            stats: bot.getStats()
        }
    });
});

/**
 * POST /api/bot/start
 * تشغيل البوت
 */
router.post('/start', auth, ownerOnly, (req, res) => {
    try {
        bot.start();
        res.json({
            success: true,
            message: 'تم تشغيل البوت بنجاح',
            data: bot.getStats()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bot/stop
 * إيقاف البوت
 */
router.post('/stop', auth, ownerOnly, (req, res) => {
    try {
        bot.stop();
        res.json({
            success: true,
            message: 'تم إيقاف البوت'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bot/pause
 * إيقاف مؤقت
 */
router.post('/pause', auth, ownerOnly, (req, res) => {
    bot.pause();
    res.json({
        success: true,
        message: 'تم إيقاف البوت مؤقتاً'
    });
});

/**
 * POST /api/bot/resume
 * استئناف
 */
router.post('/resume', auth, ownerOnly, (req, res) => {
    bot.resume();
    res.json({
        success: true,
        message: 'تم استئناف البوت'
    });
});

/**
 * GET /api/bot/stats
 * إحصائيات البوت
 */
router.get('/stats', auth, (req, res) => {
    res.json({
        success: true,
        data: bot.getStats()
    });
});

/**
 * GET /api/bot/errors
 * سجل الأخطاء
 */
router.get('/errors', auth, (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json({
        success: true,
        data: bot.getErrorHistory(limit)
    });
});

/**
 * GET /api/bot/suggestions
 * الاقتراحات
 */
router.get('/suggestions', auth, (req, res) => {
    const status = req.query.status || null;
    res.json({
        success: true,
        data: bot.getSuggestions(status)
    });
});

/**
 * POST /api/bot/suggestions/:id/apply
 * تطبيق اقتراح
 */
router.post('/suggestions/:id/apply', auth, ownerOnly, async (req, res) => {
    try {
        const result = await bot.applySuggestion(req.params.id);
        res.json({
            success: result.success,
            message: result.success ? 'تم تطبيق الاقتراح' : result.reason
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/bot/performance
 * بيانات الأداء
 */
router.get('/performance', auth, (req, res) => {
    res.json({
        success: true,
        data: {
            summary: bot.perfMonitor.getSummary(),
            recommendations: bot.perfMonitor.getRecommendations(),
            history: bot.perfMonitor.getHistory(20)
        }
    });
});

/**
 * POST /api/bot/test
 * تشغيل اختبار فوري
 */
router.post('/test', auth, ownerOnly, async (req, res) => {
    try {
        const results = await bot.tester.runAllTests();
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bot/heal
 * تشغيل إصلاح فوري
 */
router.post('/heal', auth, ownerOnly, async (req, res) => {
    try {
        const results = await bot.healer.checkAndHeal();
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bot/generate
 * توليد بيانات فورية
 */
router.post('/generate', auth, ownerOnly, async (req, res) => {
    try {
        const results = await bot.generator.generateTestData();
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bot/generate/bulk
 * توليد بيانات مجمعة
 */
router.post('/generate/bulk', auth, ownerOnly, async (req, res) => {
    try {
        const { customers, products, invoices, tasks } = req.body;
        const results = await bot.generator.generateBulkData({
            customers: Math.min(customers || 5, 50),
            products: Math.min(products || 10, 100),
            invoices: Math.min(invoices || 3, 20),
            tasks: Math.min(tasks || 5, 30)
        });
        res.json({
            success: true,
            message: 'تم إنشاء البيانات بنجاح',
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bot/analyze
 * تحليل UX فوري
 */
router.post('/analyze', auth, ownerOnly, async (req, res) => {
    try {
        const suggestions = await bot.uxAnalyzer.analyze();
        res.json({
            success: true,
            data: {
                suggestions,
                count: suggestions.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/bot/config
 * تحديث إعدادات البوت
 */
router.put('/config', auth, ownerOnly, (req, res) => {
    const { testInterval, healInterval, generateInterval, autoFix, verbose } = req.body;
    
    if (testInterval) bot.config.testInterval = testInterval;
    if (healInterval) bot.config.healInterval = healInterval;
    if (generateInterval) bot.config.generateInterval = generateInterval;
    if (typeof autoFix === 'boolean') bot.config.autoFix = autoFix;
    if (typeof verbose === 'boolean') bot.config.verbose = verbose;
    
    res.json({
        success: true,
        message: 'تم تحديث الإعدادات',
        data: bot.config
    });
});

/**
 * POST /api/bot/simulate
 * تشغيل محاكاة مستخدم
 */
router.post('/simulate', auth, ownerOnly, async (req, res) => {
    try {
        const { scenarios = 5 } = req.body;
        const safeScenarios = Math.min(Math.max(scenarios, 1), 20);
        
        const result = await bot.userSimulator.runFullSession(safeScenarios);
        
        bot.stats.simulationSessions++;
        
        res.json({
            success: true,
            message: 'تم تشغيل جلسة المحاكاة',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bot/simulate/scenario
 * تشغيل سيناريو واحد
 */
router.post('/simulate/scenario', auth, ownerOnly, async (req, res) => {
    try {
        const result = await bot.userSimulator.runRandomScenario();
        
        bot.stats.simulationScenarios++;
        if (result.success) {
            bot.stats.simulationSuccessful++;
        }
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/bot/simulate/log
 * سجل عمليات المحاكاة
 */
router.get('/simulate/log', auth, (req, res) => {
    res.json({
        success: true,
        data: bot.userSimulator.getActionLog()
    });
});

/**
 * POST /api/bot/test-features
 * فحص جميع الميزات
 */
router.post('/test-features', auth, ownerOnly, async (req, res) => {
    try {
        const report = await bot.featureTester.runFullTest();
        
        res.json({
            success: true,
            message: 'تم فحص جميع الميزات',
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bot/worker/start
 * بدء العامل الواقعي
 */
router.post('/worker/start', auth, ownerOnly, async (req, res) => {
    try {
        const interval = req.body.interval || 5000; // كل 5 ثواني افتراضياً
        bot.worker.startWorking(interval);
        
        res.json({
            success: true,
            message: 'بدأ العامل الواقعي العمل',
            data: { interval }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bot/worker/stop
 * إيقاف العامل الواقعي
 */
router.post('/worker/stop', auth, ownerOnly, async (req, res) => {
    try {
        bot.worker.stopWorking();
        
        res.json({
            success: true,
            message: 'توقف العامل الواقعي',
            data: bot.worker.getStats()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/bot/worker/stats
 * إحصائيات العامل الواقعي
 */
router.get('/worker/stats', auth, async (req, res) => {
    try {
        res.json({
            success: true,
            data: bot.worker.getStats()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/bot/feature-report
 * آخر تقرير فحص الميزات
 */
router.get('/feature-report', auth, async (req, res) => {
    try {
        const report = await get(`
            SELECT * FROM bot_logs 
            WHERE action = 'feature_test' 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        res.json({
            success: true,
            data: report ? JSON.parse(report.data) : null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/bot/logs
 * سجلات البوت
 */
router.get('/logs', auth, async (req, res) => {
    try {
        const { all } = require('../config/database');
        const limit = parseInt(req.query.limit) || 100;
        
        const logs = await all(`
            SELECT * FROM bot_logs 
            ORDER BY created_at DESC 
            LIMIT ?
        `, [limit]);
        
        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        res.json({
            success: true,
            data: []
        });
    }
});

module.exports = router;
