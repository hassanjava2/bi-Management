import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Package,
  FileCheck,
  ShieldAlert,
  RefreshCw,
  Wrench,
  BarChart3,
  ArrowLeft,
  Wallet,
  Receipt,
} from 'lucide-react'
import StatCard from '../components/dashboard/StatCard'
import Spinner from '../components/common/Spinner'
import { reportsAPI } from '../services/api'

// تنسيق المبلغ
function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '0'
  return Number(n).toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// روابط سريعة من التسمية إلى مسار الواجهة
const quickLinkToRoute = {
  'تقرير المبيعات': '/sales',
  'مبيعات بالموظف': '/sales',
  'أفضل البائعين': '/sales',
  'مبيعات حسب الدفع': '/sales',
  'الربحية والتدفق': '/accounting',
  'أداء HR': '/attendance',
  'سجل التدقيق': '/audit',
}

export default function ExecutiveDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['executive-dashboard'],
    queryFn: () => reportsAPI.getExecutiveDashboard(),
  })

  const apiData = data?.data?.data
  const revenue = apiData?.revenue ?? {}
  const cashFlow = apiData?.cash_flow ?? []
  const topSellers = apiData?.top_sellers_month ?? []
  const alerts = apiData?.alerts ?? {}
  const quickLinks = apiData?.quick_links ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 dark:text-red-300">فشل تحميل لوحة المدير. تحقق من الاتصال بالخادم.</p>
      </div>
    )
  }

  const alertItems = [
    { key: 'pending_invoices', label: 'فواتير معلقة (ذمم)', count: alerts.pending_invoices, icon: Receipt, href: '/sales', color: 'warning' },
    { key: 'low_stock', label: 'منتجات تحت الحد الأدنى', count: alerts.low_stock, icon: Package, href: '/inventory', color: 'danger' },
    { key: 'pending_approvals', label: 'طلبات موافقة معلقة', count: alerts.pending_approvals, icon: FileCheck, href: '/audit', color: 'info' },
    { key: 'critical_audit_7d', label: 'أحداث تدقيق حرجة (7 أيام)', count: alerts.critical_audit_7d, icon: ShieldAlert, href: '/audit', color: 'danger' },
    { key: 'returns_pending', label: 'مرتجعات معلقة', count: alerts.returns_pending, icon: RefreshCw, href: '/returns', color: 'warning' },
    { key: 'warranty_pending', label: 'ضمانات معلقة', count: alerts.warranty_pending, icon: Wrench, href: '/returns', color: 'info' },
  ].filter((a) => Number(a.count) > 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          لوحة المدير التنفيذية
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          إيرادات، تدفق نقدي، أفضل البائعين، تنبيهات وروابط سريعة
        </p>
      </div>

      {/* إيرادات اليوم والشهر */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إيرادات اليوم"
          value={formatMoney(revenue.today)}
          icon={DollarSign}
          color="primary"
        />
        <StatCard
          title="عدد فواتير اليوم"
          value={revenue.today_count ?? 0}
          icon={Receipt}
          color="info"
        />
        <StatCard
          title="إيرادات الشهر"
          value={formatMoney(revenue.month)}
          icon={TrendingUp}
          color="success"
        />
        <StatCard
          title="عدد فواتير الشهر"
          value={revenue.month_count ?? 0}
          icon={BarChart3}
          color="primary"
        />
      </div>

      {/* التدفق النقدي (حسب طريقة الدفع) + أفضل البائعين */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary-500" />
              التدفق النقدي لهذا الشهر (حسب طريقة الدفع)
            </h2>
          </div>
          <div className="p-4">
            {cashFlow.length === 0 ? (
              <p className="text-surface-500 dark:text-surface-400 text-sm">لا توجد حركة هذا الشهر</p>
            ) : (
              <ul className="space-y-2">
                {cashFlow.map((row, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700 last:border-0"
                  >
                    <span className="text-surface-700 dark:text-surface-300 capitalize">
                      {row.method || 'أخرى'}
                    </span>
                    <span className="font-medium text-surface-900 dark:text-white">
                      {formatMoney(row.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-500" />
              أفضل البائعين هذا الشهر
            </h2>
          </div>
          <div className="p-4">
            {topSellers.length === 0 ? (
              <p className="text-surface-500 dark:text-surface-400 text-sm">لا توجد مبيعات هذا الشهر</p>
            ) : (
              <ul className="space-y-2">
                {topSellers.map((row, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700 last:border-0"
                  >
                    <span className="text-surface-700 dark:text-surface-300">
                      {row.employee_name || '—'}
                    </span>
                    <span className="font-medium text-surface-900 dark:text-white">
                      {formatMoney(row.total_sales)} ({row.invoice_count ?? 0} فاتورة)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* التنبيهات */}
      {alertItems.length > 0 && (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              تنبيهات تحتاج متابعة
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {alertItems.map((a) => (
                <Link
                  key={a.key}
                  to={a.href}
                  className="flex items-center gap-3 p-4 rounded-lg border border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
                >
                  <div
                    className={`
                      p-2 rounded-lg
                      ${a.color === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : ''}
                      ${a.color === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                      ${a.color === 'info' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                    `}
                  >
                    <a.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                      {a.label}
                    </p>
                    <p className="text-lg font-bold text-surface-700 dark:text-surface-200">{a.count}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-surface-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
            {alerts.low_stock_items?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  منتجات تحت الحد: (عرض 10)
                </p>
                <ul className="text-sm text-surface-600 dark:text-surface-400 space-y-1">
                  {alerts.low_stock_items.slice(0, 10).map((p, i) => (
                    <li key={i}>
                      {p.name} — الكمية: {p.quantity ?? 0}، الحد الأدنى: {p.min_quantity ?? 0}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* روابط سريعة */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            روابط سريعة
          </h2>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-3">
            {(quickLinks.length > 0 ? quickLinks : []).map((link, i) => {
              const route = quickLinkToRoute[link.label]
              return (
                <Link
                  key={i}
                  to={route || '/sales'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 font-medium text-sm transition-colors"
                >
                  {link.label}
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              )
            })}
            {quickLinks.length === 0 && (
                <>
                  <Link
                    to="/sales"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-100 font-medium text-sm"
                  >
                    المبيعات
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/accounting"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-100 font-medium text-sm"
                  >
                    المحاسبة
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/attendance"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-100 font-medium text-sm"
                  >
                    الحضور
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/audit"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-100 font-medium text-sm"
                  >
                    سجل التدقيق
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/returns"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-100 font-medium text-sm"
                  >
                    المرتجعات
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/inventory"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-100 font-medium text-sm"
                  >
                    المخزون
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
