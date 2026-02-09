/**
 * BI Management - Intelligent Bot System
 * نظام الروبوت الذكي
 * 
 * يعمل في الخلفية باستمرار:
 * - إنشاء فواتير وحركات تجريبية
 * - اكتشاف الأخطاء وإصلاحها
 * - اقتراح تحسينات وتنفيذها
 * - تحليل سهولة الاستخدام
 */

const EventEmitter = require('events');
const AutoTester = require('./auto-tester');
const AutoHealer = require('./auto-healer');
const DataGenerator = require('./data-generator');
const UXAnalyzer = require('./ux-analyzer');
const PerformanceMonitor = require('./performance-monitor');
const UserSimulator = require('./user-simulator');
const FeatureTester = require('./feature-tester');
const RealisticWorker = require('./realistic-worker');
const { run, get, all } = require('../../config/database');
const { generateId, now } = require('../../utils/helpers');

class IntelligentBot extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.name = 'BI-Bot';
        this.version = '1.0.0';
        this.isRunning = false;
        this.isPaused = false;
        
        // Configuration
        this.config = {
            testInterval: options.testInterval || 30000,      // 30 seconds
            healInterval: options.healInterval || 60000,      // 1 minute
            generateInterval: options.generateInterval || 45000, // 45 seconds
            uxAnalysisInterval: options.uxAnalysisInterval || 300000, // 5 minutes
            maxErrors: options.maxErrors || 100,
            autoFix: options.autoFix !== false,
            verbose: options.verbose !== false
        };
        
        // Statistics
        this.stats = {
            startedAt: null,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            errorsFound: 0,
            errorsFixed: 0,
            suggestionsGenerated: 0,
            suggestionsApplied: 0,
            invoicesCreated: 0,
            transactionsCreated: 0,
            uptime: 0,
            // User simulation stats
            simulationSessions: 0,
            simulationScenarios: 0,
            simulationSuccessful: 0
        };
        
        // Error history
        this.errorHistory = [];
        this.fixHistory = [];
        this.suggestions = [];
        
        // Initialize modules
        this.tester = new AutoTester(this);
        this.healer = new AutoHealer(this);
        this.generator = new DataGenerator(this);
        this.uxAnalyzer = new UXAnalyzer(this);
        this.perfMonitor = new PerformanceMonitor(this);
        this.userSimulator = new UserSimulator(this);
        this.featureTester = new FeatureTester(this);
        this.worker = new RealisticWorker(this);
        
        // Intervals
        this.intervals = {};
        
        this.log('🤖 Intelligent Bot initialized');
    }
    
    /**
     * بدء الروبوت
     */
    start() {
        if (this.isRunning) {
            this.log('⚠️ Bot is already running');
            return;
        }
        
        this.isRunning = true;
        this.stats.startedAt = new Date();
        
        this.log('🚀 Starting Intelligent Bot...');
        this.logToDB('bot_started', { config: this.config });
        
        // Start all modules
        this._startTestingCycle();
        this._startHealingCycle();
        this._startGeneratorCycle();
        this._startUXAnalysisCycle();
        this._startPerformanceMonitoring();
        this._startUserSimulationCycle();
        
        // Update uptime every second
        this.intervals.uptime = setInterval(() => {
            this.stats.uptime = Math.floor((Date.now() - this.stats.startedAt) / 1000);
        }, 1000);
        
        this.emit('started');
        this.log('✅ Bot is now running');
        
        // Initial run
        this._runAllChecks();
    }
    
    /**
     * إيقاف الروبوت
     */
    stop() {
        if (!this.isRunning) {
            this.log('⚠️ Bot is not running');
            return;
        }
        
        this.isRunning = false;
        
        // Clear all intervals
        Object.values(this.intervals).forEach(interval => clearInterval(interval));
        this.intervals = {};
        
        this.logToDB('bot_stopped', { stats: this.stats });
        this.emit('stopped');
        this.log('🛑 Bot stopped');
    }
    
    /**
     * إيقاف مؤقت
     */
    pause() {
        this.isPaused = true;
        this.log('⏸️ Bot paused');
        this.emit('paused');
    }
    
    /**
     * استئناف
     */
    resume() {
        this.isPaused = false;
        this.log('▶️ Bot resumed');
        this.emit('resumed');
    }
    
    /**
     * دورة الاختبارات التلقائية
     */
    _startTestingCycle() {
        this.intervals.testing = setInterval(async () => {
            if (this.isPaused) return;
            
            try {
                const results = await this.tester.runAllTests();
                this.stats.totalTests += results.total;
                this.stats.passedTests += results.passed;
                this.stats.failedTests += results.failed;
                
                if (results.failed > 0) {
                    this.emit('tests_failed', results.failures);
                }
            } catch (error) {
                this.handleError('testing_cycle', error);
            }
        }, this.config.testInterval);
    }
    
    /**
     * دورة الإصلاح التلقائي
     */
    _startHealingCycle() {
        this.intervals.healing = setInterval(async () => {
            if (this.isPaused) return;
            
            try {
                const healResults = await this.healer.checkAndHeal();
                this.stats.errorsFound += healResults.errorsFound;
                this.stats.errorsFixed += healResults.errorsFixed;
                
                if (healResults.errorsFixed > 0) {
                    this.emit('errors_fixed', healResults.fixes);
                }
            } catch (error) {
                this.handleError('healing_cycle', error);
            }
        }, this.config.healInterval);
    }
    
    /**
     * دورة إنشاء البيانات
     */
    _startGeneratorCycle() {
        this.intervals.generator = setInterval(async () => {
            if (this.isPaused) return;
            
            try {
                const genResults = await this.generator.generateTestData();
                this.stats.invoicesCreated += genResults.invoices || 0;
                this.stats.transactionsCreated += genResults.transactions || 0;
                
                this.emit('data_generated', genResults);
            } catch (error) {
                this.handleError('generator_cycle', error);
            }
        }, this.config.generateInterval);
    }
    
    /**
     * دورة تحليل UX
     */
    _startUXAnalysisCycle() {
        this.intervals.uxAnalysis = setInterval(async () => {
            if (this.isPaused) return;
            
            try {
                const suggestions = await this.uxAnalyzer.analyze();
                this.stats.suggestionsGenerated += suggestions.length;
                
                if (suggestions.length > 0) {
                    this.suggestions.push(...suggestions);
                    this.emit('ux_suggestions', suggestions);
                    
                    // Apply auto-suggestions if enabled
                    if (this.config.autoFix) {
                        const applied = await this.uxAnalyzer.applyAutoSuggestions(suggestions);
                        this.stats.suggestionsApplied += applied;
                    }
                }
            } catch (error) {
                this.handleError('ux_analysis_cycle', error);
            }
        }, this.config.uxAnalysisInterval);
    }
    
    /**
     * مراقبة الأداء
     */
    _startPerformanceMonitoring() {
        this.intervals.performance = setInterval(async () => {
            if (this.isPaused) return;
            
            try {
                const perfData = await this.perfMonitor.collect();
                this.emit('performance_data', perfData);
                
                // Check for performance issues
                if (perfData.issues.length > 0) {
                    this.emit('performance_issues', perfData.issues);
                }
            } catch (error) {
                this.handleError('performance_cycle', error);
            }
        }, 10000); // Every 10 seconds
    }
    
    /**
     * دورة محاكاة المستخدم
     */
    _startUserSimulationCycle() {
        this.intervals.userSimulation = setInterval(async () => {
            if (this.isPaused) return;
            
            try {
                // Run a random user scenario
                const result = await this.userSimulator.runRandomScenario();
                
                this.stats.simulationScenarios++;
                if (result.success) {
                    this.stats.simulationSuccessful++;
                }
                
                this.emit('simulation_completed', result);
            } catch (error) {
                this.handleError('simulation_cycle', error);
            }
        }, 60000); // Every minute - simulates a user action
    }
    
    /**
     * تشغيل جميع الفحوصات فوراً
     */
    async _runAllChecks() {
        this.log('🔍 Running initial checks...');
        
        try {
            // Test endpoints
            await this.tester.runAllTests();
            
            // Check for issues
            await this.healer.checkAndHeal();
            
            // Generate initial data
            await this.generator.generateTestData();
            
            this.log('✅ Initial checks completed');
        } catch (error) {
            this.handleError('initial_checks', error);
        }
    }
    
    /**
     * معالجة الأخطاء
     */
    handleError(source, error) {
        const errorRecord = {
            id: generateId(),
            source,
            message: error.message,
            stack: error.stack,
            timestamp: now()
        };
        
        this.errorHistory.push(errorRecord);
        
        // Keep only last N errors
        if (this.errorHistory.length > this.config.maxErrors) {
            this.errorHistory.shift();
        }
        
        this.log(`❌ Error in ${source}: ${error.message}`, 'error');
        this.logToDB('bot_error', errorRecord);
        this.emit('error', errorRecord);
    }
    
    /**
     * تسجيل
     */
    log(message, level = 'info') {
        if (!this.config.verbose && level === 'debug') return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[${this.name}]`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }
    
    /**
     * تسجيل في قاعدة البيانات
     */
    logToDB(action, data) {
        try {
            run(`
                INSERT INTO bot_logs (id, action, data, created_at)
                VALUES (?, ?, ?, ?)
            `, [generateId(), action, JSON.stringify(data), now()]);
        } catch (error) {
            // Table might not exist, create it
            this._ensureTables();
        }
    }
    
    /**
     * التأكد من وجود الجداول
     */
    _ensureTables() {
        try {
            run(`
                CREATE TABLE IF NOT EXISTS bot_logs (
                    id TEXT PRIMARY KEY,
                    action TEXT NOT NULL,
                    data TEXT,
                    created_at TEXT NOT NULL
                )
            `);
            
            run(`
                CREATE TABLE IF NOT EXISTS bot_suggestions (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    component TEXT,
                    suggestion TEXT NOT NULL,
                    priority TEXT DEFAULT 'medium',
                    status TEXT DEFAULT 'pending',
                    applied_at TEXT,
                    created_at TEXT NOT NULL
                )
            `);
            
            run(`
                CREATE TABLE IF NOT EXISTS bot_fixes (
                    id TEXT PRIMARY KEY,
                    error_type TEXT NOT NULL,
                    description TEXT,
                    fix_applied TEXT,
                    success INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            `);
        } catch (error) {
            console.error('Error creating bot tables:', error.message);
        }
    }
    
    /**
     * الحصول على الإحصائيات
     */
    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            errorCount: this.errorHistory.length,
            suggestionCount: this.suggestions.length
        };
    }
    
    /**
     * الحصول على سجل الأخطاء
     */
    getErrorHistory(limit = 50) {
        return this.errorHistory.slice(-limit);
    }
    
    /**
     * الحصول على الاقتراحات
     */
    getSuggestions(status = null) {
        if (status) {
            return this.suggestions.filter(s => s.status === status);
        }
        return this.suggestions;
    }
    
    /**
     * تنفيذ اقتراح معين
     */
    async applySuggestion(suggestionId) {
        const suggestion = this.suggestions.find(s => s.id === suggestionId);
        if (!suggestion) {
            throw new Error('Suggestion not found');
        }
        
        const result = await this.uxAnalyzer.applySuggestion(suggestion);
        if (result.success) {
            suggestion.status = 'applied';
            suggestion.appliedAt = now();
            this.stats.suggestionsApplied++;
        }
        
        return result;
    }
}

// Singleton instance
let botInstance = null;

function getBot(options) {
    if (!botInstance) {
        botInstance = new IntelligentBot(options);
    }
    return botInstance;
}

module.exports = {
    IntelligentBot,
    getBot
};
