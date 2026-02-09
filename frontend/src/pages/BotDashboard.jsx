/**
 * Bot Dashboard - لوحة تحكم البوت الذكي
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function BotDashboard() {
    const [botStatus, setBotStatus] = useState(null);
    const [stats, setStats] = useState(null);
    const [errors, setErrors] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [performance, setPerformance] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [workerStats, setWorkerStats] = useState(null);

    const [error, setError] = useState(null);

    // Fetch all data
    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const statusRes = await api.get('/bot/status');
            setBotStatus(statusRes.data.data);
            setStats(statusRes.data.data.stats);
            
            // Fetch other data in parallel
            const [errorsRes, suggestionsRes, perfRes, logsRes, workerRes] = await Promise.all([
                api.get('/bot/errors?limit=20').catch(() => ({ data: { data: [] } })),
                api.get('/bot/suggestions').catch(() => ({ data: { data: [] } })),
                api.get('/bot/performance').catch(() => ({ data: { data: null } })),
                api.get('/bot/logs?limit=50').catch(() => ({ data: { data: [] } })),
                api.get('/bot/worker/stats').catch(() => ({ data: { data: null } }))
            ]);

            setErrors(errorsRes.data.data || []);
            setSuggestions(suggestionsRes.data.data || []);
            setPerformance(perfRes.data.data);
            setLogs(logsRes.data.data || []);
            setWorkerStats(workerRes.data.data);
        } catch (err) {
            console.error('Error fetching bot data:', err);
            setError(err.response?.data?.message || err.message || 'خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Refresh every 10 seconds
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Bot controls
    const handleStart = async () => {
        try {
            await api.post('/bot/start');
            fetchData();
        } catch (error) {
            alert('خطأ في تشغيل البوت');
        }
    };

    const handleStop = async () => {
        try {
            await api.post('/bot/stop');
            fetchData();
        } catch (error) {
            alert('خطأ في إيقاف البوت');
        }
    };

    const handlePause = async () => {
        try {
            await api.post('/bot/pause');
            fetchData();
        } catch (error) {
            alert('خطأ في إيقاف البوت مؤقتاً');
        }
    };

    const handleResume = async () => {
        try {
            await api.post('/bot/resume');
            fetchData();
        } catch (error) {
            alert('خطأ في استئناف البوت');
        }
    };

    const handleRunTest = async () => {
        try {
            const res = await api.post('/bot/test');
            alert(`تم الاختبار: ${res.data.data.passed}/${res.data.data.total} ناجح`);
            fetchData();
        } catch (error) {
            alert('خطأ في تشغيل الاختبار');
        }
    };

    const handleRunHeal = async () => {
        try {
            const res = await api.post('/bot/heal');
            alert(`تم الفحص: وجد ${res.data.data.errorsFound} مشكلة، أصلح ${res.data.data.errorsFixed}`);
            fetchData();
        } catch (error) {
            alert('خطأ في تشغيل الإصلاح');
        }
    };

    const handleGenerate = async () => {
        try {
            const res = await api.post('/bot/generate');
            alert('تم إنشاء بيانات');
            fetchData();
        } catch (error) {
            alert('خطأ في إنشاء البيانات');
        }
    };

    const handleBulkGenerate = async () => {
        const customers = prompt('عدد العملاء (افتراضي 5):', '5');
        const products = prompt('عدد المنتجات (افتراضي 10):', '10');
        const invoices = prompt('عدد الفواتير (افتراضي 3):', '3');
        
        try {
            const res = await api.post('/bot/generate/bulk', {
                customers: parseInt(customers) || 5,
                products: parseInt(products) || 10,
                invoices: parseInt(invoices) || 3,
                tasks: 5
            });
            alert(`تم إنشاء: ${res.data.data.customers} عميل، ${res.data.data.products} منتج، ${res.data.data.invoices} فاتورة`);
            fetchData();
        } catch (error) {
            alert('خطأ في إنشاء البيانات');
        }
    };

    const handleAnalyze = async () => {
        try {
            const res = await api.post('/bot/analyze');
            alert(`تم التحليل: ${res.data.data.count} اقتراح`);
            fetchData();
        } catch (error) {
            alert('خطأ في التحليل');
        }
    };

    const handleSimulate = async () => {
        const scenarios = prompt('عدد السيناريوهات (1-20):', '5');
        try {
            const res = await api.post('/bot/simulate', { scenarios: parseInt(scenarios) || 5 });
            alert(`تم تشغيل ${res.data.data.totalScenarios} سيناريو\nنجح: ${res.data.data.successCount}\nفشل: ${res.data.data.failedCount}`);
            fetchData();
        } catch (error) {
            alert('خطأ في المحاكاة');
        }
    };

    const handleSingleScenario = async () => {
        try {
            const res = await api.post('/bot/simulate/scenario');
            const data = res.data.data;
            alert(`سيناريو: ${data.scenario}\n${data.success ? '✅ نجح' : '❌ فشل'}\n${JSON.stringify(data, null, 2).substring(0, 200)}`);
            fetchData();
        } catch (error) {
            alert('خطأ في السيناريو');
        }
    };

    const handleTestFeatures = async () => {
        if (!confirm('سيتم فحص جميع الميزات (~840). قد يستغرق هذا بضع دقائق. متابعة؟')) return;
        try {
            const res = await api.post('/bot/test-features');
            const report = res.data.data;
            alert(`📊 تقرير فحص الميزات:\n\n` +
                `إجمالي: ${report.summary.total}\n` +
                `ناجح: ${report.summary.passed} ✅\n` +
                `فاشل: ${report.summary.failed} ❌\n` +
                `نسبة النجاح: ${report.passRate}\n` +
                `الدرجة: ${report.grade}\n` +
                `المدة: ${report.duration}`);
            fetchData();
        } catch (error) {
            alert('خطأ في فحص الميزات');
        }
    };

    // Worker controls
    const handleStartWorker = async () => {
        try {
            await api.post('/bot/worker/start', { interval: 3000 });
            alert('🏭 بدأ العامل الواقعي - سيقوم بإنشاء بيانات حقيقية كل 3 ثواني');
            fetchData();
        } catch (error) {
            alert('خطأ في تشغيل العامل');
        }
    };

    const handleStopWorker = async () => {
        try {
            const res = await api.post('/bot/worker/stop');
            const stats = res.data.data;
            alert(`⏹️ توقف العامل\n\n` +
                `العملاء: ${stats.customersCreated}\n` +
                `المنتجات: ${stats.productsCreated}\n` +
                `الفواتير: ${stats.invoicesCreated}\n` +
                `المبيعات: ${stats.totalSales?.toLocaleString()} د.ع\n` +
                `المشتريات: ${stats.totalPurchases?.toLocaleString()} د.ع`);
            fetchData();
        } catch (error) {
            alert('خطأ في إيقاف العامل');
        }
    };

    const applySuggestion = async (id) => {
        try {
            await api.post(`/bot/suggestions/${id}/apply`);
            alert('تم تطبيق الاقتراح');
            fetchData();
        } catch (error) {
            alert('خطأ في تطبيق الاقتراح');
        }
    };

    const formatUptime = (seconds) => {
        if (!seconds) return '0s';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-surface-100 dark:bg-surface-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-surface-600 dark:text-surface-400">جاري تحميل البوت...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-surface-100 dark:bg-surface-900">
                <div className="text-center p-8 bg-white dark:bg-surface-800 rounded-lg shadow-lg">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-xl font-bold text-red-600 mb-2">خطأ في الاتصال</h2>
                    <p className="text-surface-600 dark:text-surface-400 mb-4">{error}</p>
                    <button 
                        onClick={fetchData}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-100 dark:bg-surface-900 p-6" dir="rtl">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-surface-800 dark:text-white flex items-center gap-3">
                    🤖 البوت الذكي
                    <span className={`text-sm px-3 py-1 rounded-full ${
                        botStatus?.isRunning 
                            ? botStatus?.isPaused 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }`}>
                        {botStatus?.isRunning 
                            ? botStatus?.isPaused ? 'متوقف مؤقتاً' : 'يعمل'
                            : 'متوقف'}
                    </span>
                </h1>
                <p className="text-surface-600 dark:text-surface-400 mt-1">
                    نظام ذكي يعمل في الخلفية لإنشاء البيانات، اكتشاف الأخطاء، وتحسين النظام
                </p>
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-surface-800 rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-3">
                    {!botStatus?.isRunning ? (
                        <button onClick={handleStart} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2">
                            ▶️ تشغيل
                        </button>
                    ) : (
                        <>
                            <button onClick={handleStop} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2">
                                ⏹️ إيقاف
                            </button>
                            {botStatus?.isPaused ? (
                                <button onClick={handleResume} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2">
                                    ▶️ استئناف
                                </button>
                            ) : (
                                <button onClick={handlePause} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition flex items-center gap-2">
                                    ⏸️ إيقاف مؤقت
                                </button>
                            )}
                        </>
                    )}
                    
                    <div className="border-r border-surface-300 dark:border-surface-600 mx-2"></div>
                    
                    <button onClick={handleRunTest} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
                        🧪 اختبار فوري
                    </button>
                    <button onClick={handleRunHeal} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
                        🔧 فحص وإصلاح
                    </button>
                    <button onClick={handleGenerate} className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition">
                        📦 إنشاء بيانات
                    </button>
                    <button onClick={handleBulkGenerate} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                        📦📦 إنشاء مجمع
                    </button>
                    <button onClick={handleAnalyze} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition">
                        🎨 تحليل UX
                    </button>
                    
                    <div className="border-r border-surface-300 dark:border-surface-600 mx-2"></div>
                    
                    <button onClick={handleSimulate} className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition">
                        🎭 محاكاة مستخدم
                    </button>
                    <button onClick={handleSingleScenario} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition">
                        👤 سيناريو واحد
                    </button>
                    
                    <div className="border-r border-surface-300 dark:border-surface-600 mx-2"></div>
                    
                    <button onClick={handleTestFeatures} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-bold">
                        🔬 فحص 840 ميزة
                    </button>
                    
                    <div className="border-r border-surface-300 dark:border-surface-600 mx-2"></div>
                    
                    {workerStats?.isWorking ? (
                        <button onClick={handleStopWorker} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition animate-pulse">
                            ⏹️ إيقاف العامل
                        </button>
                    ) : (
                        <button onClick={handleStartWorker} className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition font-bold">
                            🏭 تشغيل العامل الواقعي
                        </button>
                    )}
                </div>
            </div>
            
            {/* Worker Stats Banner */}
            {workerStats?.isWorking && (
                <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-4 rounded-lg mb-6 animate-pulse">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🏭</span>
                            <span className="font-bold">العامل الواقعي يعمل الآن!</span>
                            <span className="text-sm opacity-80">({workerStats.runtime})</span>
                        </div>
                        <div className="flex gap-6 text-sm">
                            <div className="text-center">
                                <div className="font-bold text-xl">{workerStats.customersCreated}</div>
                                <div className="opacity-80">عملاء</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-xl">{workerStats.productsCreated}</div>
                                <div className="opacity-80">منتجات</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-xl">{workerStats.invoicesCreated}</div>
                                <div className="opacity-80">فواتير</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-xl">{workerStats.totalSales?.toLocaleString()}</div>
                                <div className="opacity-80">مبيعات (د.ع)</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                <StatCard title="وقت التشغيل" value={formatUptime(stats?.uptime)} icon="⏱️" />
                <StatCard title="الاختبارات" value={`${stats?.passedTests || 0}/${stats?.totalTests || 0}`} icon="🧪" color="purple" />
                <StatCard title="الأخطاء المكتشفة" value={stats?.errorsFound || 0} icon="🔍" color="red" />
                <StatCard title="الأخطاء المُصلحة" value={stats?.errorsFixed || 0} icon="🔧" color="green" />
                <StatCard title="الفواتير المنشأة" value={stats?.invoicesCreated || 0} icon="📄" color="blue" />
                <StatCard title="الاقتراحات" value={stats?.suggestionsGenerated || 0} icon="💡" color="yellow" />
                <StatCard title="جلسات المحاكاة" value={stats?.simulationSessions || 0} icon="🎭" color="purple" />
                <StatCard title="السيناريوهات" value={`${stats?.simulationSuccessful || 0}/${stats?.simulationScenarios || 0}`} icon="👤" color="blue" />
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-surface-800 rounded-lg shadow">
                <div className="border-b border-surface-200 dark:border-surface-700">
                    <nav className="flex gap-4 px-4">
                        {['overview', 'errors', 'suggestions', 'performance', 'logs'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-2 border-b-2 transition ${
                                    activeTab === tab
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-surface-500 hover:text-surface-700'
                                }`}
                            >
                                {tab === 'overview' && '📊 نظرة عامة'}
                                {tab === 'errors' && `❌ الأخطاء (${errors.length})`}
                                {tab === 'suggestions' && `💡 الاقتراحات (${suggestions.length})`}
                                {tab === 'performance' && '📈 الأداء'}
                                {tab === 'logs' && '📜 السجلات'}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-4">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-3">🎯 النشاط الأخير</h3>
                                <div className="space-y-2">
                                    {logs.slice(0, 10).map((log, i) => (
                                        <div key={i} className="p-2 bg-surface-50 dark:bg-surface-700 rounded text-sm">
                                            <span className="text-surface-500">{new Date(log.created_at).toLocaleTimeString('ar-IQ')}</span>
                                            <span className="mx-2">-</span>
                                            <span>{log.action}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-semibold mb-3">📊 ملخص الأداء</h3>
                                {performance?.summary && (
                                    <div className="space-y-3">
                                        <ProgressBar label="المعالج (CPU)" value={performance.summary.avgCpuUsage} />
                                        <ProgressBar label="الذاكرة" value={performance.summary.avgMemoryUsage} />
                                        <div className="text-sm text-surface-600 dark:text-surface-400">
                                            متوسط وقت الاستعلام: {performance.summary.avgDbQueryTime}ms
                                        </div>
                                    </div>
                                )}
                                
                                {performance?.recommendations?.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-medium mb-2">💡 توصيات</h4>
                                        {performance.recommendations.map((rec, i) => (
                                            <div key={i} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded mb-2">
                                                <div className="font-medium">{rec.title}</div>
                                                <ul className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                                                    {rec.suggestions.map((s, j) => <li key={j}>• {s}</li>)}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Errors Tab */}
                    {activeTab === 'errors' && (
                        <div className="space-y-3">
                            {errors.length === 0 ? (
                                <div className="text-center py-8 text-surface-500">
                                    ✅ لا توجد أخطاء
                                </div>
                            ) : (
                                errors.map((error, i) => (
                                    <div key={i} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        <div className="flex justify-between">
                                            <span className="font-medium text-red-800 dark:text-red-400">{error.source}</span>
                                            <span className="text-sm text-surface-500">{new Date(error.timestamp).toLocaleString('ar-IQ')}</span>
                                        </div>
                                        <p className="text-sm mt-1">{error.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Suggestions Tab */}
                    {activeTab === 'suggestions' && (
                        <div className="space-y-3">
                            {suggestions.length === 0 ? (
                                <div className="text-center py-8 text-surface-500">
                                    لا توجد اقتراحات حالياً
                                </div>
                            ) : (
                                suggestions.map((suggestion, i) => (
                                    <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                                                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                    {suggestion.priority}
                                                </span>
                                                <span className="mx-2 text-sm text-surface-500">{suggestion.type}</span>
                                                <span className="text-sm text-surface-500">{suggestion.component}</span>
                                            </div>
                                            {suggestion.status === 'pending' && suggestion.autoFix && (
                                                <button
                                                    onClick={() => applySuggestion(suggestion.id)}
                                                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                                                >
                                                    تطبيق
                                                </button>
                                            )}
                                        </div>
                                        <p className="mt-2">{suggestion.suggestion}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Performance Tab */}
                    {activeTab === 'performance' && (
                        <div>
                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg">
                                    <h4 className="text-sm text-surface-500 mb-1">المعالج</h4>
                                    <div className="text-2xl font-bold">{performance?.summary?.avgCpuUsage || 0}%</div>
                                </div>
                                <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg">
                                    <h4 className="text-sm text-surface-500 mb-1">الذاكرة</h4>
                                    <div className="text-2xl font-bold">{performance?.summary?.avgMemoryUsage || 0}%</div>
                                </div>
                                <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg">
                                    <h4 className="text-sm text-surface-500 mb-1">وقت الاستعلام</h4>
                                    <div className="text-2xl font-bold">{performance?.summary?.avgDbQueryTime || 0}ms</div>
                                </div>
                            </div>
                            
                            <h4 className="font-medium mb-3">📊 التاريخ</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-right py-2">الوقت</th>
                                            <th className="text-right py-2">CPU</th>
                                            <th className="text-right py-2">الذاكرة</th>
                                            <th className="text-right py-2">DB</th>
                                            <th className="text-right py-2">المشاكل</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performance?.history?.map((item, i) => (
                                            <tr key={i} className="border-b">
                                                <td className="py-2">{new Date(item.timestamp).toLocaleTimeString('ar-IQ')}</td>
                                                <td className="py-2">{item.system?.cpuUsage}%</td>
                                                <td className="py-2">{item.system?.memoryUsage}%</td>
                                                <td className="py-2">{item.database?.queryTime}ms</td>
                                                <td className="py-2">{item.issues?.length || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Logs Tab */}
                    {activeTab === 'logs' && (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {logs.map((log, i) => (
                                <div key={i} className="p-2 bg-surface-50 dark:bg-surface-700 rounded text-sm font-mono">
                                    <span className="text-surface-400">[{new Date(log.created_at).toLocaleString('ar-IQ')}]</span>
                                    <span className="mx-2 text-blue-600">{log.action}</span>
                                    {log.data && <span className="text-surface-500">{JSON.stringify(JSON.parse(log.data || '{}'))}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper Components
function StatCard({ title, value, icon, color = 'gray' }) {
    const colors = {
        gray: 'bg-surface-100 text-surface-800',
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-green-100 text-green-800',
        red: 'bg-red-100 text-red-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        purple: 'bg-purple-100 text-purple-800'
    };

    return (
        <div className={`p-4 rounded-lg ${colors[color]} dark:bg-opacity-20`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm opacity-75">{title}</div>
        </div>
    );
}

function ProgressBar({ label, value }) {
    const color = value > 80 ? 'bg-red-500' : value > 60 ? 'bg-yellow-500' : 'bg-green-500';
    
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }}></div>
            </div>
        </div>
    );
}
