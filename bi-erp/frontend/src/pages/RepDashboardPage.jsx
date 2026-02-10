/**
 * BI Management - Rep Dashboard
 * لوحة المندوب — مبيعاتي، أهداف، عملاء، تحصيلات، فواتير متأخرة
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  UserCircle, DollarSign, Clock, FileText, Target, Users,
  TrendingUp, CheckCircle2, AlertTriangle, Receipt, Phone,
  Calendar, ArrowUpRight
} from 'lucide-react'
import { clsx } from 'clsx'
import PageShell from '../components/common/PageShell'
import StatsGrid from '../components/common/StatsGrid'
import DataTable from '../components/common/DataTable'
import EmptyState from '../components/common/EmptyState'
import Spinner from '../components/common/Spinner'
import api from '../services/api'
import { salesAPI } from '../services/api'

const formatNumber = (num) => new Intl.NumberFormat('ar-IQ').format(Math.round(num || 0))
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' }) : '—'

export default function RepDashboardPage() {
  const [period, setPeriod] = useState('month') // today, week, month

  // بيانات لوحة المندوب
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-dashboard'],
    queryFn: async () => {
      const res = await api.get('/reports/rep-dashboard')
      if (!res.data.success) throw new Error(res.data.error || 'فشل التحميل')
      return res.data.data
    },
  })

  // فواتيري
  const { data: myInvoicesData } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => salesAPI.getInvoices({ my_only: '1', limit: 20 }),
  })

  if (isLoading) {
    return (
      <PageShell title="لوحة المندوب" description="ملخص أدائك ومبيعاتك">
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title="لوحة المندوب" description="ملخص أدائك ومبيعاتك">
        <EmptyState icon={AlertTriangle} title="خطأ في التحميل" message={error.message} />
      </PageShell>
    )
  }

  const mySales = data?.my_sales ?? 0
  const myCount = data?.my_invoice_count ?? 0
  const overdue = data?.overdue_invoices ?? []
  const myTarget = data?.monthly_target ?? 0
  const myCollections = data?.collections ?? 0
  const myCustomers = data?.assigned_customers ?? []
  const targetPercent = myTarget > 0 ? Math.min(100, Math.round((mySales / myTarget) * 100)) : 0

  const myInvoices = myInvoicesData?.data?.data?.invoices || myInvoicesData?.data?.data || []

  const statsItems = [
    { label: 'مبيعاتي (30 يوم)', value: `${formatNumber(mySales)} د.ع`, icon: DollarSign, color: 'primary' },
    { label: 'عدد الفواتير', value: myCount, icon: Receipt, color: 'blue' },
    { label: 'التحصيلات', value: `${formatNumber(myCollections)} د.ع`, icon: ArrowUpRight, color: 'emerald' },
    { label: 'فواتير متأخرة', value: overdue.length, icon: Clock, color: overdue.length > 0 ? 'red' : 'neutral' },
  ]

  const overdueColumns = [
    { key: 'invoice_number', label: 'رقم الفاتورة', render: (r) => <span className="font-mono text-primary-600">{r.invoice_number}</span> },
    { key: 'customer_name', label: 'العميل', render: (r) => r.customer_name || '—' },
    { key: 'total', label: 'المبلغ', render: (r) => <span className="font-bold">{formatNumber(r.total)} د.ع</span> },
    { key: 'remaining_amount', label: 'المتبقي', render: (r) => <span className="text-red-600 font-bold">{formatNumber(r.remaining_amount || r.total)} د.ع</span> },
    { key: 'due_date', label: 'الاستحقاق', render: (r) => <span className="text-neutral-500">{formatDate(r.due_date)}</span> },
  ]

  const recentColumns = [
    { key: 'invoice_number', label: 'رقم', render: (r) => <span className="font-mono text-xs text-primary-600">{r.invoice_number}</span> },
    { key: 'customer_name', label: 'العميل', render: (r) => r.customer_name || r.supplier_name || '—' },
    { key: 'total', label: 'المبلغ', render: (r) => `${formatNumber(r.total)} د.ع` },
    { key: 'status', label: 'الحالة', render: (r) => {
      const colors = { completed: 'bg-emerald-100 text-emerald-700', draft: 'bg-neutral-100 text-neutral-600', cancelled: 'bg-red-100 text-red-700' }
      return <span className={clsx('px-2 py-0.5 rounded-lg text-xs font-medium', colors[r.status] || 'bg-blue-100 text-blue-700')}>{r.status}</span>
    }},
    { key: 'created_at', label: 'التاريخ', render: (r) => formatDate(r.created_at) },
  ]

  return (
    <PageShell title="لوحة المندوب" description="ملخص أدائك ومبيعاتك وتحصيلاتك">
      <div className="space-y-6">
        {/* إحصائيات */}
        <StatsGrid items={statsItems} />

        {/* شريط الهدف */}
        {myTarget > 0 && (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-600" />
                <span className="font-bold">الهدف الشهري</span>
              </div>
              <span className="text-sm text-neutral-500">
                {formatNumber(mySales)} / {formatNumber(myTarget)} د.ع
              </span>
            </div>
            <div className="w-full h-4 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  targetPercent >= 100 ? 'bg-emerald-500' : targetPercent >= 70 ? 'bg-blue-500' : targetPercent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${targetPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className={clsx(
                'font-bold',
                targetPercent >= 100 ? 'text-emerald-600' : targetPercent >= 70 ? 'text-blue-600' : 'text-amber-600'
              )}>
                {targetPercent}% محقق
              </span>
              {targetPercent < 100 && (
                <span className="text-neutral-500">
                  متبقي: {formatNumber(myTarget - mySales)} د.ع
                </span>
              )}
              {targetPercent >= 100 && (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> تم تحقيق الهدف!
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* فواتير متأخرة */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-bold">فواتير متأخرة التسديد ({overdue.length})</h3>
            </div>
            {overdue.length > 0 ? (
              <DataTable columns={overdueColumns} data={overdue} compact />
            ) : (
              <div className="p-8 text-center text-neutral-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>لا توجد فواتير متأخرة</p>
              </div>
            )}
          </div>

          {/* آخر فواتيري */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary-600" />
              <h3 className="font-bold">آخر فواتيري</h3>
            </div>
            {(Array.isArray(myInvoices) && myInvoices.length > 0) ? (
              <DataTable columns={recentColumns} data={myInvoices.slice(0, 10)} compact />
            ) : (
              <div className="p-8 text-center text-neutral-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>لا توجد فواتير</p>
              </div>
            )}
          </div>
        </div>

        {/* العملاء المعينين */}
        {Array.isArray(myCustomers) && myCustomers.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold">عملائي المعينين ({myCustomers.length})</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {myCustomers.map((c, i) => (
                <div key={c.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-600">
                    {(c.name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    {c.phone && (
                      <p className="text-xs text-neutral-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </p>
                    )}
                  </div>
                  {c.balance != null && (
                    <span className={clsx(
                      'text-xs font-bold',
                      c.balance > 0 ? 'text-red-600' : 'text-emerald-600'
                    )}>
                      {formatNumber(Math.abs(c.balance))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
