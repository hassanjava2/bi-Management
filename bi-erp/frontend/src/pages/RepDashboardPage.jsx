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



  return (
    <PageShell title="لوحة المندوب" description="ملخص أدائك ومبيعاتك وتحصيلاتك">
      <div className="space-y-6">
        {/* إحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <RepStatCard label="مبيعاتي (30 يوم)" value={`${formatNumber(mySales)} د.ع`} icon={DollarSign} color="sky" />
          <RepStatCard label="عدد الفواتير" value={myCount} icon={Receipt} color="blue" />
          <RepStatCard label="التحصيلات" value={`${formatNumber(myCollections)} د.ع`} icon={ArrowUpRight} color="emerald" />
          <RepStatCard label="فواتير متأخرة" value={overdue.length} icon={Clock} color={overdue.length > 0 ? 'red' : 'sky'} />
        </div>

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
              <div className="p-3 space-y-2">
                {overdue.map((inv, i) => (
                  <div key={inv.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                    <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-bold text-primary-600">{inv.invoice_number}</p>
                      <p className="text-xs text-neutral-400">{inv.customer_name || '—'} • {formatDate(inv.due_date)}</p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-bold text-red-600">{formatNumber(inv.remaining_amount || inv.total)} <span className="text-[10px]">د.ع</span></p>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="p-3 space-y-2">
                {myInvoices.slice(0, 10).map((inv, i) => {
                  const statusColors = { completed: 'bg-emerald-100 text-emerald-700', draft: 'bg-neutral-100 text-neutral-600', cancelled: 'bg-red-100 text-red-700' }
                  return (
                    <div key={inv.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-700/30 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-bold text-primary-600">{inv.invoice_number}</p>
                        <p className="text-xs text-neutral-400">{inv.customer_name || inv.supplier_name || '—'} • {formatDate(inv.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold">{formatNumber(inv.total)} <span className="text-[10px] text-neutral-400">د.ع</span></span>
                        <span className={clsx('px-2 py-0.5 rounded-lg text-[10px] font-medium', statusColors[inv.status] || 'bg-blue-100 text-blue-700')}>{inv.status}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
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

// ═══ STAT CARD ═══
function RepStatCard({ label, value, icon: Icon, color = 'sky' }) {
  const colors = {
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
  }
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
      <div className="flex items-center gap-2.5">
        <div className={clsx('p-2 rounded-lg', colors[color])}><Icon className="w-4 h-4" /></div>
        <div>
          <p className="text-[10px] text-neutral-400">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}
