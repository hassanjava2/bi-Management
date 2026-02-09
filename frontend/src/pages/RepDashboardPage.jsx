/**
 * لوحة المندوب - Phase 8
 * مبيعاتي، قوائم متأخرة التسديد
 */
import { useQuery } from '@tanstack/react-query'
import { UserCircle, DollarSign, Clock, FileText } from 'lucide-react'
import Spinner from '../components/common/Spinner'
import PageShell from '../components/common/PageShell'
import DataTable from '../components/common/DataTable'
import EmptyState from '../components/common/EmptyState'
import api from '../services/api'

export default function RepDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-dashboard'],
    queryFn: async () => {
      const res = await api.get('/reports/rep-dashboard')
      if (!res.data.success) throw new Error(res.data.error || 'فشل التحميل')
      return res.data.data
    }
  })

  if (isLoading) {
    return (
      <PageShell title="لوحة المندوب" icon={<UserCircle className="w-6 h-6" />}>
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title="لوحة المندوب" icon={<UserCircle className="w-6 h-6" />}>
        <EmptyState icon={FileText} title="خطأ في التحميل" message={error.message} />
      </PageShell>
    )
  }

  const mySales = data?.my_sales ?? 0
  const myCount = data?.my_invoice_count ?? 0
  const overdue = data?.overdue_invoices ?? []

  return (
    <PageShell title="لوحة المندوب" icon={<UserCircle className="w-6 h-6" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">مبيعاتي (آخر 30 يوم)</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{Number(mySales).toLocaleString()} د.ع</p>
            <p className="text-sm text-slate-500">{myCount} فاتورة</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">فواتير متأخرة التسديد</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{overdue.length}</p>
          </div>
        </div>
      </div>
      {overdue.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">قوائم متأخرة</h3>
          <DataTable
            keyField="id"
            columns={[
              { key: 'invoice_number', label: 'رقم الفاتورة' },
              { key: 'total', label: 'المبلغ', render: (v) => (v != null ? Number(v).toLocaleString() : '-') },
              { key: 'due_date', label: 'تاريخ الاستحقاق' }
            ]}
            data={overdue}
          />
        </div>
      )}
    </PageShell>
  )
}
