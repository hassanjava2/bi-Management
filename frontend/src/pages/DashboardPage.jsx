import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, CheckSquare, Clock, AlertTriangle, Receipt, Package, DollarSign, TrendingUp, PlusCircle, ShoppingCart, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../components/dashboard/StatCard'
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

export default function DashboardPage() {
  const { user, isAdmin, isManager, isHR } = useAuth()
  
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

  // Chart data
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

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-page-title text-neutral-900 dark:text-white">
          مرحباً، {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          هذه نظرة عامة على النظام اليوم
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          to="/sales/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          فاتورة مبيعات جديدة
        </Link>
        <Link
          to="/purchases/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          فاتورة مشتريات
        </Link>
        <Link
          to="/inventory"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Package className="w-4 h-4" />
          المخزون
        </Link>
        <Link
          to="/tasks"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          المهام
        </Link>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard
            title="إجمالي المهام"
            value={stats?.tasks?.total || 0}
            icon={CheckSquare}
            color="primary"
            animate
          />
          <StatCard
            title="مهام اليوم"
            value={stats?.tasks?.today || 0}
            icon={Clock}
            color="info"
            animate
          />
          <StatCard
            title="مهام متأخرة"
            value={stats?.tasks?.overdue || 0}
            icon={AlertTriangle}
            color="danger"
            animate
          />
          <StatCard
            title="الحضور اليوم"
            value={`${stats?.attendance?.checked_in || 0}/${stats?.attendance?.total_employees || 0}`}
            icon={Users}
            color="success"
          />
        </div>
      )}

      {/* Financial overview - Admin/Owner only */}
      {accounting && (isAdmin || user?.role === 'owner') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard
            title="مبيعات الشهر"
            value={formatNumber(accounting.month_sales)}
            icon={Receipt}
            color="success"
            trend="up"
            trendValue="هذا الشهر"
          />
          <StatCard
            title="مشتريات الشهر"
            value={formatNumber(accounting.month_purchases)}
            icon={Package}
            color="warning"
          />
          <StatCard
            title="صافي الربح"
            value={formatNumber(accounting.month_profit)}
            icon={TrendingUp}
            color="primary"
          />
          <StatCard
            title="النقد المتاح"
            value={formatNumber(accounting.cash_balance)}
            icon={DollarSign}
            color="info"
          />
        </div>
      )}

      {/* Charts Row */}
      {accounting && salesChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar Chart */}
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
                  <Tooltip 
                    formatter={(val) => [val?.toLocaleString() + ' د.ع', '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid rgb(228 228 231)', fontSize: '13px' }}
                    labelStyle={{ color: 'inherit' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {salesChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Pie Chart */}
          <Card>
            <Card.Header>
              <Card.Title>توزيع المبيعات</Card.Title>
            </Card.Header>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => [val?.toLocaleString() + ' د.ع', '']}
                    contentStyle={{ borderRadius: '10px', border: '1px solid rgb(228 228 231)', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
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
            <div className="lg:col-span-2">
              <TasksOverview />
            </div>
            <div>
              <AttendanceOverview />
            </div>
          </div>
          <RecentTasks />
        </>
      )}
    </div>
  )
}
