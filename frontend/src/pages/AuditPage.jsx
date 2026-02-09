/**
 * BI Management - Audit Dashboard
 * لوحة تحكم سجلات العمليات والأمان
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Shield, Activity, AlertTriangle, Clock, Search,
    User, Filter, Download, CheckCircle, XCircle,
    FileText, TrendingUp, Eye, RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { exportToCSV } from '../utils/helpers';
import Button from '../components/common/Button';
import PageShell from '../components/common/PageShell';

// ========== API Functions ==========
const auditAPI = {
    getLogs: (params) => api.get('/audit/logs', { params }).then(r => r.data),
    searchLogs: (q) => api.get('/audit/logs/search', { params: { q } }).then(r => r.data),
    getSecurityEvents: (params) => api.get('/audit/security-events', { params }).then(r => r.data),
    resolveEvent: (id, notes) => api.post(`/audit/security-events/${id}/resolve`, { notes }).then(r => r.data),
    getDashboard: () => api.get('/audit/dashboard').then(r => r.data),
    getStats: (days) => api.get('/audit/stats', { params: { days } }).then(r => r.data),
    getDailyReport: (date) => api.get('/audit/report/daily', { params: { date } }).then(r => r.data),
    getWeeklyReport: () => api.get('/audit/report/weekly').then(r => r.data),
};

// ========== Main Component ==========
export default function AuditPage() {
    const [activeTab, setActiveTab] = useState('dashboard');

    const tabs = [
        { id: 'dashboard', label: 'نظرة عامة', icon: Activity },
        { id: 'logs', label: 'سجل العمليات', icon: FileText },
        { id: 'security', label: 'أحداث الأمان', icon: AlertTriangle },
        { id: 'reports', label: 'التقارير', icon: TrendingUp },
    ];

    return (
        <PageShell title="Audit Dashboard" description="مراقبة العمليات وأحداث الأمان" className="p-6">

            {/* Tabs */}
            <div className="border-b border-neutral-200 dark:border-neutral-700">
                <nav className="flex gap-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                            }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'logs' && <LogsTab />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'reports' && <ReportsTab />}
        </PageShell>
    );
}

// ========== Dashboard Tab ==========
function DashboardTab() {
    const { data: dashboard, isLoading } = useQuery({
        queryKey: ['audit-dashboard'],
        queryFn: auditAPI.getDashboard,
        refetchInterval: 30000 // كل 30 ثانية
    });

    const { data: stats } = useQuery({
        queryKey: ['audit-stats'],
        queryFn: () => auditAPI.getStats(7)
    });

    if (isLoading) {
        return <div className="p-8 text-center">جاري التحميل...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="عمليات اليوم"
                    value={dashboard?.data?.today?.operations || 0}
                    icon={Activity}
                    color="blue"
                />
                <StatCard
                    title="تسجيلات الدخول"
                    value={dashboard?.data?.today?.logins || 0}
                    icon={User}
                    color="green"
                />
                <StatCard
                    title="محاولات فاشلة"
                    value={dashboard?.data?.today?.failed_logins || 0}
                    icon={XCircle}
                    color="red"
                />
                <StatCard
                    title="أحداث غير محلولة"
                    value={dashboard?.data?.unresolved_events || 0}
                    icon={AlertTriangle}
                    color="yellow"
                    highlight={dashboard?.data?.critical_events > 0}
                />
            </div>

            {/* Security Summary */}
            {stats?.data && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Events by Type */}
                    <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                            الأحداث حسب النوع (آخر 7 أيام)
                        </h3>
                        <div className="space-y-3">
                            {stats.data.by_type?.slice(0, 5).map(item => (
                                <div key={item.event_type} className="flex items-center justify-between">
                                    <span className="text-neutral-600 dark:text-neutral-400">{item.event_type}</span>
                                    <span className="font-medium text-neutral-900 dark:text-white">{item.count}</span>
                                </div>
                            ))}
                            {(!stats.data.by_type || stats.data.by_type.length === 0) && (
                                <p className="text-neutral-400 text-center py-4">لا توجد أحداث</p>
                            )}
                        </div>
                    </div>

                    {/* Top Users */}
                    <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                            المستخدمون الأكثر نشاطاً
                        </h3>
                        <div className="space-y-3">
                            {stats.data.top_users?.slice(0, 5).map((user, i) => (
                                <div key={user.user_id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                                            {i + 1}
                                        </span>
                                        <span className="text-neutral-700 dark:text-neutral-300">{user.full_name}</span>
                                    </div>
                                    <span className="text-sm text-neutral-500">{user.event_count} أحداث</span>
                                </div>
                            ))}
                            {(!stats.data.top_users || stats.data.top_users.length === 0) && (
                                <p className="text-neutral-400 text-center py-4">لا توجد بيانات</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ========== Logs Tab ==========
function LogsTab() {
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ action: '', limit: 50 });

    const { data: logs, isLoading, refetch } = useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: () => search ? auditAPI.searchLogs(search) : auditAPI.getLogs(filters)
    });

    const actionColors = {
        'LOGIN_SUCCESS': 'bg-green-100 text-green-700',
        'LOGIN_FAILED': 'bg-red-100 text-red-700',
        'CREATE': 'bg-blue-100 text-blue-700',
        'UPDATE': 'bg-yellow-100 text-yellow-700',
        'DELETE': 'bg-red-100 text-red-700',
        'VIEW_SENSITIVE': 'bg-purple-100 text-purple-700',
    };

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm">
            {/* Search & Filters */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="بحث في السجلات..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && refetch()}
                        className="w-full pr-10 pl-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                    />
                </div>
                <select
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                >
                    <option value="">كل العمليات</option>
                    <option value="LOGIN_SUCCESS">تسجيل دخول</option>
                    <option value="LOGIN_FAILED">دخول فاشل</option>
                    <option value="CREATE">إنشاء</option>
                    <option value="UPDATE">تعديل</option>
                    <option value="DELETE">حذف</option>
                    <option value="VIEW_SENSITIVE">عرض حساس</option>
                </select>
                <button
                    onClick={() => refetch()}
                    className="p-2 text-neutral-500 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(logs?.data || [], 'audit-logs.csv')}>
                    <Download className="w-4 h-4 ml-2" />
                    تصدير CSV
                </Button>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-neutral-50 dark:bg-neutral-700">
                        <tr>
                            <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">الوقت</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">المستخدم</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">العملية</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">الجدول</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {logs?.data?.map(log => (
                            <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                <td className="px-4 py-3 text-sm text-neutral-500">
                                    {new Date(log.created_at).toLocaleString('ar-IQ')}
                                </td>
                                <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
                                    {log.user_name || 'غير معروف'}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs ${actionColors[log.action] || 'bg-neutral-100 text-neutral-700'}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-neutral-500">
                                    {log.table_name || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-neutral-400 font-mono">
                                    {log.ip_address || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {isLoading && <div className="p-8 text-center">جاري التحميل...</div>}
                {!isLoading && (!logs?.data || logs.data.length === 0) && (
                    <div className="p-8 text-center text-neutral-400">لا توجد سجلات</div>
                )}
            </div>
        </div>
    );
}

// ========== Security Tab ==========
function SecurityTab() {
    const queryClient = useQueryClient();
    const [showResolved, setShowResolved] = useState(false);

    const { data: events, isLoading } = useQuery({
        queryKey: ['security-events', showResolved],
        queryFn: () => auditAPI.getSecurityEvents({ unresolved_only: !showResolved })
    });

    const resolveMutation = useMutation({
        mutationFn: ({ id, notes }) => auditAPI.resolveEvent(id, notes),
        onSuccess: () => {
            queryClient.invalidateQueries(['security-events']);
            queryClient.invalidateQueries(['audit-dashboard']);
        }
    });

    const severityColors = {
        'critical': 'bg-red-100 text-red-700 border-red-200',
        'high': 'bg-orange-100 text-orange-700 border-orange-200',
        'warning': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'info': 'bg-blue-100 text-blue-700 border-blue-200',
    };

    return (
        <div className="space-y-4">
            {/* Filter */}
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={showResolved}
                        onChange={(e) => setShowResolved(e.target.checked)}
                        className="rounded"
                    />
                    <span className="text-neutral-600 dark:text-neutral-400">إظهار المحلولة</span>
                </label>
            </div>

            {/* Events List */}
            <div className="space-y-3">
                {events?.data?.map(event => (
                    <div
                        key={event.id}
                        className={`bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm border-r-4 ${severityColors[event.severity] || 'border-neutral-200'}`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs ${severityColors[event.severity]}`}>
                                        {event.severity}
                                    </span>
                                    <span className="font-medium text-neutral-900 dark:text-white">
                                        {event.event_type}
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-500 mt-1">
                                    {event.user_name || 'غير معروف'} • {new Date(event.created_at).toLocaleString('ar-IQ')}
                                </p>
                            </div>
                            {!event.resolved && (
                                <button
                                    onClick={() => resolveMutation.mutate({ id: event.id, notes: 'تم الحل' })}
                                    className="text-green-600 hover:text-green-700 flex items-center gap-1 text-sm"
                                    disabled={resolveMutation.isPending}
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    حل
                                </button>
                            )}
                            {event.resolved && (
                                <span className="text-green-600 flex items-center gap-1 text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    محلول
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="p-8 text-center">جاري التحميل...</div>}
                {!isLoading && (!events?.data || events.data.length === 0) && (
                    <div className="p-8 text-center text-neutral-400 bg-white dark:bg-neutral-800 rounded-xl">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>لا توجد أحداث أمنية</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ========== Reports Tab ==========
function ReportsTab() {
    const [reportType, setReportType] = useState('daily');

    const { data: report, isLoading } = useQuery({
        queryKey: ['audit-report', reportType],
        queryFn: () => reportType === 'daily' ? auditAPI.getDailyReport() : auditAPI.getWeeklyReport()
    });

    return (
        <div className="space-y-6">
            {/* Report Type Selector */}
            <div className="flex gap-2">
                <button
                    onClick={() => setReportType('daily')}
                    className={`px-4 py-2 rounded-lg ${reportType === 'daily' ? 'bg-blue-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700'}`}
                >
                    تقرير يومي
                </button>
                <button
                    onClick={() => setReportType('weekly')}
                    className={`px-4 py-2 rounded-lg ${reportType === 'weekly' ? 'bg-blue-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700'}`}
                >
                    تقرير أسبوعي
                </button>
            </div>

            {isLoading ? (
                <div className="p-8 text-center">جاري التحميل...</div>
            ) : report?.data ? (
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm space-y-6">
                    {/* Summary */}
                    <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">ملخص</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
                                <div className="text-sm text-neutral-500">العمليات</div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {report.data.summary?.total_operations || 0}
                                </div>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
                                <div className="text-sm text-neutral-500">تسجيلات الدخول</div>
                                <div className="text-2xl font-bold text-green-600">
                                    {report.data.summary?.success_logins || 0}
                                </div>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
                                <div className="text-sm text-neutral-500">محاولات فاشلة</div>
                                <div className="text-2xl font-bold text-red-600">
                                    {report.data.summary?.failed_logins || 0}
                                </div>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
                                <div className="text-sm text-neutral-500">أحداث أمنية</div>
                                <div className="text-2xl font-bold text-yellow-600">
                                    {report.data.summary?.security_events || 0}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    {report.data.recommendations && (
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">التوصيات</h3>
                            <div className="space-y-2">
                                {report.data.recommendations.map((rec, i) => (
                                    <div
                                        key={i}
                                        className={`p-3 rounded-lg border ${
                                            rec.priority === 'critical' ? 'border-red-200 bg-red-50' :
                                            rec.priority === 'high' ? 'border-orange-200 bg-orange-50' :
                                            rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                                            'border-green-200 bg-green-50'
                                        }`}
                                    >
                                        <div className="font-medium">{rec.message}</div>
                                        <div className="text-sm text-neutral-600 mt-1">{rec.action}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}

// ========== Components ==========
function StatCard({ title, value, icon: Icon, color, highlight }) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        red: 'bg-red-50 text-red-600',
        yellow: 'bg-yellow-50 text-yellow-600',
    };

    return (
        <div className={`bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm ${highlight ? 'ring-2 ring-red-500' : ''}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-neutral-500 text-sm">{title}</p>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">{value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
