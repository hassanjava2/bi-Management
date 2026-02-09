import { useQuery } from '@tanstack/react-query'
import { Users, CheckSquare, Clock, AlertTriangle, Receipt, Package, DollarSign, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../components/dashboard/StatCard'
import TasksOverview from '../components/dashboard/TasksOverview'
import AttendanceOverview from '../components/dashboard/AttendanceOverview'
import RecentTasks from '../components/dashboard/RecentTasks'
import Card from '../components/common/Card'
import { CardSkeleton } from '../components/common/LoadingSkeleton'
import { dashboardAPI, accountingAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

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
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">
          مرحباً، {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
          هذه نظرة عامة على النظام اليوم
        </p>
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
          />
          <StatCard
            title="مهام اليوم"
            value={stats?.tasks?.today || 0}
            icon={Clock}
            color="info"
          />
          <StatCard
            title="مهام متأخرة"
            value={stats?.tasks?.overdue || 0}
            icon={AlertTriangle}
            color="danger"
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
                  <Tooltip 
                    formatter={(val) => [val?.toLocaleString() + ' د.ع', '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}
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
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {paymentPie.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
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
