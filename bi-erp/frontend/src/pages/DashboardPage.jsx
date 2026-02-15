/**
 * BI Management — لوحة التحكم التحليلية
 * تتضمن 16+ مخطط إحصائي تفاعلي
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users, CheckSquare, Clock, AlertTriangle, Receipt, Package,
  DollarSign, TrendingUp, PlusCircle, ShoppingCart, FileText,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, MapPin,
  UserCheck, Zap, AlertCircle, Truck, Star, ShieldAlert, Timer
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts'
import { dashboardAPI, accountingAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

// ═══ COLORS ═══
const COLORS = {
  primary: '#0ea5e9', success: '#10b981', warning: '#f59e0b',
  danger: '#ef4444', purple: '#8b5cf6', cyan: '#06b6d4',
  indigo: '#6366f1', pink: '#ec4899', orange: '#f97316', teal: '#14b8a6',
}
const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple, COLORS.cyan, COLORS.indigo, COLORS.pink]

const formatNumber = (n) => {
  if (!n && n !== 0) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return Number(n).toLocaleString('ar-IQ')
}
const formatCurrency = (n) => formatNumber(n) + ' د.ع'

const quickActions = [
  { label: 'فاتورة مبيعات', href: '/sales/new', icon: PlusCircle, color: 'bg-sky-500' },
  { label: 'مشتريات', href: '/purchases/new', icon: ShoppingCart, color: 'bg-amber-500' },
  { label: 'المخزون', href: '/inventory', icon: Package, color: 'bg-emerald-500' },
  { label: 'التقارير', href: '/reports', icon: BarChart3, color: 'bg-violet-500' },
]

// ═══ ANALYTICS TABS ═══
const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
  { id: 'sales', label: 'المبيعات', icon: TrendingUp },
  { id: 'inventory', label: 'المخزون', icon: Package },
  { id: 'finance', label: 'المالية', icon: DollarSign },
  { id: 'hr', label: 'الموظفين', icon: Users },
]

// ═══ REUSABLE COMPONENTS ═══
function StatCard({ icon: Icon, label, value, sub, color = 'sky', trend }) {
  const colorMap = {
    sky: 'from-sky-500 to-sky-600', emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600', rose: 'from-rose-500 to-rose-600',
    violet: 'from-violet-500 to-violet-600', cyan: 'from-cyan-500 to-cyan-600',
    indigo: 'from-indigo-500 to-indigo-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${colorMap[color] || colorMap.sky} text-white shadow-sm`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center text-xs font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function AnalyticsCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={18} className="text-sky-500" />}
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function MiniTable({ columns, rows, emptyMsg = 'لا توجد بيانات' }) {
  if (!rows?.length) return <p className="text-sm text-gray-400 text-center py-6">{emptyMsg}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            {columns.map((col, i) => (
              <th key={i} className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium text-xs">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              {columns.map((col, j) => (
                <td key={j} className={`py-2 px-2 ${col.className || ''}`}>
                  {col.render ? col.render(row, i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TypeBadge({ type }) {
  const map = {
    sale: { label: 'بيع', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    purchase: { label: 'شراء', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    return: { label: 'مرتجع', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
    receipt: { label: 'قبض', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
    payment: { label: 'دفع', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  }
  const t = map[type] || { label: type, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.cls}`}>{t.label}</span>
}

// ═══ MAIN DASHBOARD ═══
export default function DashboardPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  // Core stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then(r => r.data?.data || {}),
    staleTime: 30000,
  })
  const { data: chartData } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: () => dashboardAPI.getChart().then(r => r.data?.data || []),
    staleTime: 60000,
  })

  // Analytics queries — only fetch when tab is active
  const useAnalytics = (type, tab) => useQuery({
    queryKey: ['analytics', type],
    queryFn: () => dashboardAPI.getAnalytics(type).then(r => r.data?.data || []),
    staleTime: 60000,
    enabled: activeTab === tab || activeTab === 'overview',
  })

  const profitLoss = useAnalytics('profit-loss', 'overview')
  const recentInvoices = useAnalytics('recent-invoices', 'overview')
  const overdueInvoices = useAnalytics('overdue-invoices', 'finance')
  const recentPayments = useAnalytics('recent-payments', 'finance')
  const topCustomers = useAnalytics('top-customers', 'sales')
  const profitableCustomers = useAnalytics('most-profitable-customers', 'sales')
  const topProducts = useAnalytics('top-selling-products', 'sales')
  const stagnantProducts = useAnalytics('stagnant-products', 'inventory')
  const belowMinimum = useAnalytics('below-minimum', 'inventory')
  const negativeStock = useAnalytics('negative-stock', 'inventory')
  const bestPaying = useAnalytics('best-paying-customers', 'finance')
  const topReps = useAnalytics('top-sales-reps', 'sales')
  const topRegions = useAnalytics('top-regions', 'sales')
  const invoicesToday = useAnalytics('invoices-today', 'overview')
  const lateEmployees = useAnalytics('late-employees', 'hr')
  const fastestEmployees = useAnalytics('fastest-employees', 'hr')

  const s = stats || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            مرحباً، {user?.name || 'مستخدم'} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Quick Actions */}
        <div className="flex gap-2">
          {quickActions.map(a => (
            <Link key={a.href} to={a.href}
              className={`${a.color} text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-sm`}>
              <a.icon size={16} />{a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={DollarSign} label="مبيعات اليوم" value={formatCurrency(s.today_sales_total)} sub={`${s.today_sales_count || 0} فاتورة`} color="emerald" />
        <StatCard icon={TrendingUp} label="مبيعات الشهر" value={formatCurrency(s.month_sales_total)} sub={`${s.month_sales_count || 0} فاتورة`} color="sky" />
        <StatCard icon={Users} label="العملاء" value={formatNumber(s.total_customers)} color="violet" />
        <StatCard icon={Package} label="المنتجات" value={formatNumber(s.total_products)} sub={`${s.low_stock_count || 0} منخفض`} color="amber" />
        <StatCard icon={AlertTriangle} label="ديون معلقة" value={formatNumber(s.pending_credit_count)} color="rose" />
      </div>

      {/* Analytics Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-sky-600 border-b-2 border-sky-500'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <tab.icon size={16} />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ TAB: OVERVIEW ═══ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Sales/Purchases Chart + Profit Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsCard title="المبيعات والمشتريات — آخر 7 أيام" icon={TrendingUp}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatNumber} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="sales" name="مبيعات" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="purchases" name="مشتريات" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsCard>

            <AnalyticsCard title="الربح والخسارة — آخر 12 شهر" icon={DollarSign}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitLoss.data || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatNumber} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="sales" name="مبيعات" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="purchases" name="مشتريات" stroke={COLORS.warning} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="profit" name="صافي الربح" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsCard>
          </div>

          {/* Recent Invoices + Today's Invoices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsCard title="أحدث الفواتير" icon={Receipt}>
              <MiniTable
                columns={[
                  { label: '#', render: (r) => <span className="text-gray-400 font-mono text-xs">{r.invoice_number}</span> },
                  { label: 'النوع', render: (r) => <TypeBadge type={r.type} /> },
                  { label: 'الطرف', key: 'party_name' },
                  { label: 'المبلغ', render: (r) => <span className="font-semibold">{formatCurrency(r.total)}</span> },
                ]}
                rows={recentInvoices.data?.slice(0, 8)}
              />
            </AnalyticsCard>

            <AnalyticsCard title={`الفواتير المرفوعة اليوم (${invoicesToday.data?.length || 0})`} icon={FileText}>
              <MiniTable
                columns={[
                  { label: '#', render: (r) => <span className="text-gray-400 font-mono text-xs">{r.invoice_number}</span> },
                  { label: 'النوع', render: (r) => <TypeBadge type={r.type} /> },
                  { label: 'الطرف', key: 'party_name' },
                  { label: 'المبلغ', render: (r) => <span className="font-semibold">{formatCurrency(r.total)}</span> },
                  { label: 'بواسطة', key: 'created_by_name', className: 'text-gray-400 text-xs' },
                ]}
                rows={invoicesToday.data?.slice(0, 8)}
                emptyMsg="لا توجد فواتير اليوم بعد"
              />
            </AnalyticsCard>
          </div>
        </div>
      )}

      {/* ═══ TAB: SALES ═══ */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers */}
            <AnalyticsCard title="أفضل 10 زبائن شراءً" icon={Star}>
              <MiniTable
                columns={[
                  { label: '#', render: (_, i) => <span className="text-gray-400">{i + 1}</span> },
                  { label: 'الزبون', key: 'name', className: 'font-medium text-gray-900 dark:text-white' },
                  { label: 'الفواتير', key: 'invoice_count', className: 'text-center' },
                  { label: 'إجمالي المشتريات', render: (r) => <span className="font-semibold text-emerald-600">{formatCurrency(r.total_purchases)}</span> },
                ]}
                rows={topCustomers.data}
              />
            </AnalyticsCard>

            {/* Most Profitable Customers */}
            <AnalyticsCard title="أعلى 10 زبائن أرباحاً" icon={TrendingUp}>
              <MiniTable
                columns={[
                  { label: '#', render: (_, i) => <span className="text-gray-400">{i + 1}</span> },
                  { label: 'الزبون', key: 'name', className: 'font-medium text-gray-900 dark:text-white' },
                  { label: 'الفواتير', key: 'invoice_count', className: 'text-center' },
                  { label: 'صافي الربح', render: (r) => <span className="font-semibold text-sky-600">{formatCurrency(r.total_profit)}</span> },
                ]}
                rows={profitableCustomers.data}
              />
            </AnalyticsCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Products — Bar Chart */}
            <AnalyticsCard title="المواد الأعلى استهلاكاً" icon={Package}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(topProducts.data || []).slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatNumber} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v, name) => [formatNumber(v), name === 'total_sold' ? 'مباع' : 'إيراد']} />
                    <Bar dataKey="total_sold" name="مباع" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsCard>

            {/* Top Sales Reps */}
            <AnalyticsCard title="المندوب الأكثر مبيعاً" icon={UserCheck}>
              <MiniTable
                columns={[
                  { label: '#', render: (_, i) => <span className={`${i < 3 ? 'text-amber-500 font-bold' : 'text-gray-400'}`}>{i < 3 ? '🏆' : i + 1}</span> },
                  { label: 'المندوب', key: 'name', className: 'font-medium text-gray-900 dark:text-white' },
                  { label: 'الفواتير', key: 'invoice_count', className: 'text-center' },
                  { label: 'إجمالي المبيعات', render: (r) => <span className="font-semibold">{formatCurrency(r.total_sales)}</span> },
                  { label: 'الربح', render: (r) => <span className="text-emerald-600">{formatCurrency(r.total_profit)}</span> },
                ]}
                rows={topReps.data}
              />
            </AnalyticsCard>
          </div>

          {/* Top Regions — Pie Chart */}
          <AnalyticsCard title="المنطقة الأكثر مبيعاً" icon={MapPin}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={(topRegions.data || []).slice(0, 8)} dataKey="total_sales" nameKey="region"
                      cx="50%" cy="50%" outerRadius={90} label={({ region }) => region}>
                      {(topRegions.data || []).slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <MiniTable
                columns={[
                  { label: 'المنطقة', key: 'region', className: 'font-medium' },
                  { label: 'الفواتير', key: 'invoice_count', className: 'text-center' },
                  { label: 'المبيعات', render: (r) => <span className="font-semibold">{formatCurrency(r.total_sales)}</span> },
                ]}
                rows={topRegions.data}
              />
            </div>
          </AnalyticsCard>
        </div>
      )}

      {/* ═══ TAB: INVENTORY ═══ */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Below Minimum */}
            <AnalyticsCard title={`مواد دون المعدل المطلوب (${belowMinimum.data?.length || 0})`} icon={AlertTriangle} className="border-amber-200 dark:border-amber-800">
              <MiniTable
                columns={[
                  { label: 'المادة', key: 'name', className: 'font-medium text-gray-900 dark:text-white' },
                  { label: 'الكود', key: 'code', className: 'text-gray-400 text-xs font-mono' },
                  { label: 'الرصيد', render: (r) => <span className="text-amber-600 font-semibold">{r.quantity}</span> },
                  { label: 'الحد الأدنى', key: 'min_quantity' },
                  { label: 'العجز', render: (r) => <span className="text-rose-500 font-semibold">-{r.deficit}</span> },
                ]}
                rows={belowMinimum.data}
                emptyMsg="جميع المواد فوق الحد الأدنى ✅"
              />
            </AnalyticsCard>

            {/* Negative Stock */}
            <AnalyticsCard title={`مواد برصيد سالب (${negativeStock.data?.length || 0})`} icon={ShieldAlert} className="border-rose-200 dark:border-rose-800">
              <MiniTable
                columns={[
                  { label: 'المادة', key: 'name', className: 'font-medium text-gray-900 dark:text-white' },
                  { label: 'الكود', key: 'code', className: 'text-gray-400 text-xs font-mono' },
                  { label: 'الرصيد', render: (r) => <span className="text-rose-600 font-bold">{r.quantity}</span> },
                ]}
                rows={negativeStock.data}
                emptyMsg="لا توجد مواد برصيد سالب ✅"
              />
            </AnalyticsCard>
          </div>

          {/* Stagnant Products */}
          <AnalyticsCard title="المواد الراكدة (أكثر من 30 يوم بدون حركة)" icon={Timer}>
            <MiniTable
              columns={[
                { label: 'المادة', key: 'name', className: 'font-medium text-gray-900 dark:text-white' },
                { label: 'الكود', key: 'code', className: 'text-gray-400 text-xs font-mono' },
                { label: 'الرصيد', key: 'quantity', className: 'text-center' },
                { label: 'آخر بيع', render: (r) => r.last_sale_date ? new Date(r.last_sale_date).toLocaleDateString('ar-IQ') : <span className="text-rose-400">أبداً</span> },
                { label: 'أيام الركود', render: (r) => <span className={`font-semibold ${r.days_stagnant > 90 ? 'text-rose-600' : r.days_stagnant > 60 ? 'text-amber-600' : 'text-gray-600'}`}>{r.days_stagnant || '∞'}</span> },
              ]}
              rows={stagnantProducts.data}
              emptyMsg="لا توجد مواد راكدة ✅"
            />
          </AnalyticsCard>
        </div>
      )}

      {/* ═══ TAB: FINANCE ═══ */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overdue Invoices */}
            <AnalyticsCard title={`فواتير متأخرة الدفع (${overdueInvoices.data?.length || 0})`} icon={AlertCircle} className="border-rose-200 dark:border-rose-800">
              <MiniTable
                columns={[
                  { label: '#', render: (r) => <span className="font-mono text-xs text-gray-400">{r.invoice_number}</span> },
                  { label: 'الطرف', key: 'party_name', className: 'font-medium' },
                  { label: 'المبلغ', render: (r) => <span className="font-semibold">{formatCurrency(r.total)}</span> },
                  { label: 'أيام التأخير', render: (r) => <span className={`font-bold ${r.days_overdue > 30 ? 'text-rose-600' : 'text-amber-600'}`}>{r.days_overdue} يوم</span> },
                ]}
                rows={overdueInvoices.data}
                emptyMsg="لا توجد فواتير متأخرة ✅"
              />
            </AnalyticsCard>

            {/* Recent Payments */}
            <AnalyticsCard title="أحدث المدفوعات" icon={DollarSign}>
              <MiniTable
                columns={[
                  { label: '#', render: (r) => <span className="font-mono text-xs text-gray-400">{r.voucher_number}</span> },
                  { label: 'النوع', render: (r) => <TypeBadge type={r.type} /> },
                  { label: 'الطرف', key: 'party_name' },
                  { label: 'المبلغ', render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
                  { label: 'التاريخ', render: (r) => <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('ar-IQ')}</span> },
                ]}
                rows={recentPayments.data}
              />
            </AnalyticsCard>
          </div>

          {/* Best Paying Customers */}
          <AnalyticsCard title="أفضل الزبائن تسديداً" icon={UserCheck}>
            <MiniTable
              columns={[
                { label: '#', render: (_, i) => <span className={`${i < 3 ? 'text-emerald-500 font-bold' : 'text-gray-400'}`}>{i < 3 ? '⭐' : i + 1}</span> },
                { label: 'الزبون', key: 'name', className: 'font-medium text-gray-900 dark:text-white' },
                { label: 'عدد التسديدات', key: 'payment_count', className: 'text-center' },
                { label: 'إجمالي المدفوع', render: (r) => <span className="font-semibold text-emerald-600">{formatCurrency(r.total_paid)}</span> },
                { label: 'الرصيد الحالي', render: (r) => <span className={Number(r.current_balance) < 0 ? 'text-rose-500' : 'text-emerald-500'}>{formatCurrency(r.current_balance)}</span> },
              ]}
              rows={bestPaying.data}
            />
          </AnalyticsCard>
        </div>
      )}

      {/* ═══ TAB: HR ═══ */}
      {activeTab === 'hr' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Late Employees */}
            <AnalyticsCard title={`الموظفين المتأخرين / الغائبين اليوم (${lateEmployees.data?.length || 0})`} icon={Clock} className="border-amber-200 dark:border-amber-800">
              <MiniTable
                columns={[
                  { label: 'الموظف', key: 'name', className: 'font-medium text-gray-900 dark:text-white' },
                  { label: 'الوظيفة', key: 'role', className: 'text-gray-400 text-xs' },
                  {
                    label: 'الحالة', render: (r) => (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status_label === 'غائب' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>{r.status_label}</span>
                    )
                  },
                  { label: 'وقت الحضور', render: (r) => r.arrived_at ? <span className="font-mono text-xs">{String(r.arrived_at).slice(0, 5)}</span> : '—' },
                ]}
                rows={lateEmployees.data}
                emptyMsg="جميع الموظفين في الوقت ✅"
              />
            </AnalyticsCard>

            {/* Fastest Employees */}
            <AnalyticsCard title="الموظفين الأسرع إنجازاً للمهام" icon={Zap}>
              <MiniTable
                columns={[
                  { label: '#', render: (_, i) => <span className={`${i < 3 ? 'text-amber-500 font-bold' : 'text-gray-400'}`}>{i < 3 ? '🚀' : i + 1}</span> },
                  { label: 'الموظف', key: 'name', className: 'font-medium text-gray-900 dark:text-white' },
                  { label: 'الوظيفة', key: 'role', className: 'text-gray-400 text-xs' },
                  { label: 'المهام المنجزة', key: 'completed_tasks', className: 'text-center font-semibold' },
                  { label: 'متوسط (ساعة)', render: (r) => <span className="text-sky-600 font-medium">{Number(r.avg_hours).toFixed(1)}</span> },
                ]}
                rows={fastestEmployees.data}
                emptyMsg="لا توجد مهام مكتملة بعد"
              />
            </AnalyticsCard>
          </div>
        </div>
      )}
    </div>
  )
}
