/**
 * Performance Monitor Module
 * مراقبة أداء النظام
 */

const os = require('os');
const { run, get, all } = require('../../config/database');
const { generateId, now } = require('../../utils/helpers');

class PerformanceMonitor {
    constructor(bot) {
        this.bot = bot;
        this.history = [];
        this.thresholds = {
            cpu: 80, // %
            memory: 85, // %
            responseTime: 2000, // ms
            dbQueryTime: 500, // ms
            errorRate: 5 // %
        };
    }
    
    /**
     * جمع بيانات الأداء
     */
    async collect() {
        const data = {
            timestamp: now(),
            system: await this._collectSystemMetrics(),
            database: await this._collectDatabaseMetrics(),
            application: await this._collectApplicationMetrics(),
            issues: []
        };
        
        // Analyze and find issues
        data.issues = this._analyzeMetrics(data);
        
        // Store in history
        this.history.push(data);
        if (this.history.length > 100) {
            this.history.shift();
        }
        
        // Log to DB
        this._logMetrics(data);
        
        return data;
    }
    
    /**
     * جمع مقاييس النظام
     */
    async _collectSystemMetrics() {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        
        // Calculate CPU usage
        let totalIdle = 0;
        let totalTick = 0;
        
        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }
        
        const cpuUsage = 100 - Math.round(totalIdle / totalTick * 100);
        const memUsage = Math.round((1 - freeMem / totalMem) * 100);
        
        return {
            cpuUsage,
            memoryUsage: memUsage,
            totalMemory: Math.round(totalMem / 1024 / 1024), // MB
            freeMemory: Math.round(freeMem / 1024 / 1024), // MB
            uptime: os.uptime(),
            platform: os.platform(),
            nodeVersion: process.version
        };
    }
    
    /**
     * جمع مقاييس قاعدة البيانات
     */
    async _collectDatabaseMetrics() {
        const startTime = Date.now();
        
        let metrics = {
            queryTime: 0,
            tableCount: 0,
            totalRecords: 0,
            largestTables: [],
            indexCount: 0
        };
        
        try {
            // Test query time
            const queryStart = Date.now();
            await get('SELECT 1');
            metrics.queryTime = Date.now() - queryStart;
            
            // Table count
            const tables = await all(`
                SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT LIKE 'pg_%'
            `);
            metrics.tableCount = tables?.length || 0;
            
            // Record counts for main tables
            const mainTables = ['users', 'products', 'customers', 'invoices', 'tasks', 'notifications'];
            const tableCounts = [];
            
            for (const table of mainTables) {
                try {
                    const result = await get(`SELECT COUNT(*) as count FROM ${table}`);
                    if (result) {
                        tableCounts.push({ table, count: result.count });
                        metrics.totalRecords += result.count;
                    }
                } catch (e) {
                    // Table doesn't exist
                }
            }
            
            metrics.largestTables = tableCounts
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            
            // Index count
            const indexResult = await get(`SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname='public'`);
            metrics.indexCount = indexResult?.count || 0;
            
        } catch (error) {
            this.bot.log(`DB metrics error: ${error.message}`, 'warn');
        }
        
        metrics.totalTime = Date.now() - startTime;
        return metrics;
    }
    
    /**
     * جمع مقاييس التطبيق
     */
    async _collectApplicationMetrics() {
        const memUsage = process.memoryUsage();
        
        let metrics = {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memUsage.external / 1024 / 1024), // MB
            rss: Math.round(memUsage.rss / 1024 / 1024), // MB
            processUptime: Math.round(process.uptime()),
            activeConnections: 0,
            requestsPerMinute: 0,
            averageResponseTime: 0,
            errorRate: 0
        };
        
        try {
            // Get recent error rate from audit logs
            const recentErrors = await get(`
                SELECT COUNT(*) as count FROM audit_logs 
                WHERE severity = 'critical' 
                AND created_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes'
            `);
            
            const totalRequests = await get(`
                SELECT COUNT(*) as count FROM audit_logs 
                WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes'
            `);
            
            if (totalRequests?.count > 0) {
                metrics.errorRate = Math.round((recentErrors?.count || 0) / totalRequests.count * 100);
                metrics.requestsPerMinute = Math.round(totalRequests.count / 5);
            }
        } catch (error) {
            // Ignore
        }
        
        return metrics;
    }
    
    /**
     * تحليل المقاييس
     */
    _analyzeMetrics(data) {
        const issues = [];
        
        // CPU check
        if (data.system.cpuUsage > this.thresholds.cpu) {
            issues.push({
                type: 'high_cpu',
                severity: 'warning',
                value: data.system.cpuUsage,
                threshold: this.thresholds.cpu,
                message: `استخدام CPU مرتفع: ${data.system.cpuUsage}%`
            });
        }
        
        // Memory check
        if (data.system.memoryUsage > this.thresholds.memory) {
            issues.push({
                type: 'high_memory',
                severity: 'warning',
                value: data.system.memoryUsage,
                threshold: this.thresholds.memory,
                message: `استخدام الذاكرة مرتفع: ${data.system.memoryUsage}%`
            });
        }
        
        // DB query time check
        if (data.database.queryTime > this.thresholds.dbQueryTime) {
            issues.push({
                type: 'slow_db',
                severity: 'warning',
                value: data.database.queryTime,
                threshold: this.thresholds.dbQueryTime,
                message: `استعلامات قاعدة البيانات بطيئة: ${data.database.queryTime}ms`
            });
        }
        
        // Error rate check
        if (data.application.errorRate > this.thresholds.errorRate) {
            issues.push({
                type: 'high_error_rate',
                severity: 'critical',
                value: data.application.errorRate,
                threshold: this.thresholds.errorRate,
                message: `معدل الأخطاء مرتفع: ${data.application.errorRate}%`
            });
        }
        
        // Heap memory check
        const heapUsagePercent = (data.application.heapUsed / data.application.heapTotal) * 100;
        if (heapUsagePercent > 90) {
            issues.push({
                type: 'heap_pressure',
                severity: 'warning',
                value: heapUsagePercent,
                threshold: 90,
                message: `ضغط على ذاكرة Heap: ${Math.round(heapUsagePercent)}%`
            });
        }
        
        return issues;
    }
    
    /**
     * تسجيل المقاييس
     */
    async _logMetrics(data) {
        try {
            await run(`
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id TEXT PRIMARY KEY,
                    cpu_usage NUMERIC,
                    memory_usage NUMERIC,
                    db_query_time INTEGER,
                    heap_used INTEGER,
                    error_rate NUMERIC,
                    issues_count INTEGER,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await run(`
                INSERT INTO performance_metrics 
                (id, cpu_usage, memory_usage, db_query_time, heap_used, error_rate, issues_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                generateId(),
                data.system.cpuUsage,
                data.system.memoryUsage,
                data.database.queryTime,
                data.application.heapUsed,
                data.application.errorRate,
                data.issues.length,
                data.timestamp
            ]);
            
            // Clean old metrics (keep last 24 hours)
            await run(`
                DELETE FROM performance_metrics 
                WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
            `);
        } catch (error) {
            // Ignore
        }
    }
    
    /**
     * الحصول على ملخص الأداء
     */
    getSummary() {
        if (this.history.length === 0) {
            return null;
        }
        
        const recent = this.history.slice(-10);
        
        return {
            avgCpuUsage: Math.round(recent.reduce((a, b) => a + b.system.cpuUsage, 0) / recent.length),
            avgMemoryUsage: Math.round(recent.reduce((a, b) => a + b.system.memoryUsage, 0) / recent.length),
            avgDbQueryTime: Math.round(recent.reduce((a, b) => a + b.database.queryTime, 0) / recent.length),
            totalIssues: recent.reduce((a, b) => a + b.issues.length, 0),
            lastCheck: this.history[this.history.length - 1].timestamp
        };
    }
    
    /**
     * الحصول على التاريخ
     */
    getHistory(limit = 50) {
        return this.history.slice(-limit);
    }
    
    /**
     * الحصول على التوصيات
     */
    getRecommendations() {
        const recommendations = [];
        
        if (this.history.length < 5) {
            return recommendations;
        }
        
        const recent = this.history.slice(-10);
        
        // CPU recommendations
        const avgCpu = recent.reduce((a, b) => a + b.system.cpuUsage, 0) / recent.length;
        if (avgCpu > 70) {
            recommendations.push({
                type: 'cpu',
                priority: 'high',
                title: 'تحسين استخدام المعالج',
                suggestions: [
                    'مراجعة العمليات الثقيلة',
                    'تحسين الاستعلامات',
                    'استخدام التخزين المؤقت (caching)'
                ]
            });
        }
        
        // Memory recommendations
        const avgMem = recent.reduce((a, b) => a + b.system.memoryUsage, 0) / recent.length;
        if (avgMem > 75) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                title: 'تحسين استخدام الذاكرة',
                suggestions: [
                    'تنظيف البيانات غير المستخدمة',
                    'تحسين هيكل البيانات',
                    'مراجعة تسريبات الذاكرة'
                ]
            });
        }
        
        // Database recommendations
        const avgDbTime = recent.reduce((a, b) => a + b.database.queryTime, 0) / recent.length;
        if (avgDbTime > 100) {
            recommendations.push({
                type: 'database',
                priority: 'medium',
                title: 'تحسين أداء قاعدة البيانات',
                suggestions: [
                    'إضافة فهارس للجداول الكبيرة',
                    'تحسين الاستعلامات المعقدة',
                    'تنظيف البيانات القديمة'
                ]
            });
        }
        
        return recommendations;
    }
}

module.exports = PerformanceMonitor;
