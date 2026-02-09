import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users, CheckSquare, Clock, AlertTriangle, Receipt, Package,
  DollarSign, TrendingUp, PlusCircle, ShoppingCart, FileText
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../components/dashboard/StatCard'
import StatsGrid from '../components/common/StatsGrid'
import TasksOverview from '../components/dashboard/TasksOverview'
import AttendanceOverview from '../components/dashboard/AttendanceOverview'
import RecentTasks from '../components/dashboard/RecentTasks'
import Card from '../components/common/Card'
import { CardSkeleton } from '../components/common/LoadingSkeleton'
import { dashboardAPI, accountingAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function formatNumber(n) {
  if (!n) return '0'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

const quickActions = [
  { label: 'فاتورة مبيعات', href: '/sales/new', icon: PlusCircle },
  { label: 'مشتريات', href: '/purchases/new', icon: ShoppingCart },
  { label: 'المخزون', href: '/inventory', icon: Package },
  { label: 'المهام', href: '/tasks', icon: FileText },
]

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getStats(),
  })

  const { data: accountingData } = useQuery({
    queryKey: ['accounting-overview'],
    queryFn: () => accountingAPI.getOverview(),
    enabled: isAdmin || user?.role === 'owner',
  })

  const stats = data?.data?.data
  const accounting = accountingData?.data?.data

  const salesChartData = accounting ? [
    { name: 'المبيعات', value: accounting.month_sales || 0 },
    { name: 'المشتريات', value: accounting.month_purchases || 0 },
    { name: 'المصاريف', value: accounting.month_expenses || 0 },
    { name: 'الربح', value: accounting.month_profit || 0 },
  ] : []

  const paymentPie = accounting ? [
    { name: 'نقدي', value: accounting.cash_sales || 1 },
    { name: 'آجل', value: accounting.credit_sales || 0 },
    { name: 'أقساط', value: accounting.installment_sales || 0 },
    { name: 'جملة', value: accounting.wholesale_sales || 0 },
  ].filter(d => d.value > 0) : []

  const taskStats = [
    { title: 'إجمالي المهام', value: stats?.tasks?.total ?? 0, icon: CheckSquare, color: 'primary', animate: true },
    { title: 'مهام اليوم', value: stats?.tasks?.today ?? 0, icon: Clock, color: 'info', animate: true },
    { title: 'مهام متأخرة', value: stats?.tasks?.overdue ?? 0, icon: AlertTriangle, color: 'danger', animate: true },
    { title: 'الحضور اليوم', value: `${stats?.attendance?.checked_in || 0}/${stats?.attendance?.total_employees || 0}`, icon: Users, color: 'success' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome + Quick Actions grid */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
            مرحباً، {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-base">
            {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              to={a.href}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-transparent dark:border-neutral-800 shadow-sm hover:shadow-md hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all duration-200"
            >
              <span className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <a.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </span>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 text-center leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <StatsGrid items={taskStats} columns={4} />
      )}

      {/* Financial */}
      {accounting && (isAdmin || user?.role === 'owner') && (
        <StatsGrid
          items={[
            { title: 'مبيعات الشهر', value: formatNumber(accounting.month_sales), icon: Receipt, color: 'success', trend: 'up', trendValue: 'هذا الشهر' },
            { title: 'مشتريات الشهر', value: formatNumber(accounting.month_purchases), icon: Package, color: 'warning' },
            { title: 'صافي الربح', value: formatNumber(accounting.month_profit), icon: TrendingUp, color: 'primary' },
            { title: 'النقد المتاح', value: formatNumber(accounting.cash_balance), icon: DollarSign, color: 'info' },
          ]}
          columns={4}
        />
      )}

      {/* Charts */}
      {accounting && salesChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <Card.Header>
              <Card.Title>ملخص الشهر المالي</Card.Title>
            </Card.Header>
            <div className="h-[280px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-neutral-500" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} className="text-neutral-400" axisLine={false} tickLine={false} tickFormatter={formatNumber} />
                  <Tooltip formatter={(val) => [val?.toLocaleString() + ' د.ع', '']} contentStyle={{ borderRadius: '12px', border: '1px solid rgb(228 228 231)', fontSize: '13px', background: 'white' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {salesChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>توزيع المبيعات</Card.Title>
            </Card.Header>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {paymentPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val) => [val?.toLocaleString() + ' د.ع', '']} contentStyle={{ borderRadius: '10px', border: '1px solid rgb(228 228 231)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {paymentPie.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                  {d.name}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tasks & Attendance */}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><TasksOverview /></div>
            <div><AttendanceOverview /></div>
          </div>
          <RecentTasks />
        </>
      )}
    </div>
  )
}
