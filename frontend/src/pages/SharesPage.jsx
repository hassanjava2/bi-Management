/**
 * الأسهم والشراكة - Phase 11
 * عرض نوع النظام (ثابت القيمة/ثابت العدد) وملخص المساهمين
 */
import { useQuery } from '@tanstack/react-query'
import { PieChart, Users, TrendingUp } from 'lucide-react'
import Spinner from '../components/common/Spinner'
import PageShell from '../components/common/PageShell'
import DataTable from '../components/common/DataTable'
import EmptyState from '../components/common/EmptyState'
import api from '../services/api'

const systemTypeLabels = {
  fixed_value_variable_count: 'ثابتة القيمة متغيرة العدد',
  fixed_count_variable_value: 'ثابتة العدد متغيرة القيمة'
}

export default function SharesPage() {
  const { data: configData } = useQuery({
    queryKey: ['shares-config'],
    queryFn: async () => {
      const res = await api.get('/shares/config')
      return res.data?.data ?? {}
    }
  })

  const { data: summaryData, isLoading, error } = useQuery({
    queryKey: ['shares-summary'],
    queryFn: async () => {
      const res = await api.get('/shares/summary')
      return res.data?.data ?? { shareholders: [], total_shares: 0 }
    }
  })

  const config = configData ?? {}
  const shareholders = summaryData?.shareholders ?? []
  const totalShares = summaryData?.total_shares ?? 0
  const systemType = config.share_system_type || 'fixed_value_variable_count'

  if (isLoading) {
    return (
      <PageShell title="الأسهم والشراكة" icon={<PieChart className="w-6 h-6" />}>
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title="الأسهم والشراكة" icon={<PieChart className="w-6 h-6" />}>
        <EmptyState icon={PieChart} title="خطأ في التحميل" message={error.message} />
      </PageShell>
    )
  }

  const columns = [
    { key: 'code', label: 'الكود' },
    { key: 'name', label: 'الاسم' },
    { key: 'share_percentage', label: 'نسبة الأسهم %', render: (v) => (v != null ? Number(v).toLocaleString() : '-') },
    { key: 'share_value', label: 'قيمة السهم', render: (v) => (v != null ? Number(v).toLocaleString() : '-') },
    { key: 'phone', label: 'الهاتف' },
    { key: 'is_active', label: 'نشط', render: (v) => (v === 1 || v === true ? 'نعم' : 'لا') }
  ]

  return (
    <PageShell title="الأسهم والشراكة" icon={<PieChart className="w-6 h-6" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">نوع نظام الأسهم</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {systemTypeLabels[systemType] || systemType}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إجمالي الأسهم / المساهمين</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{Number(totalShares).toLocaleString()}</p>
            <p className="text-sm text-slate-500">{shareholders.length} مساهم</p>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">المساهمون</h3>
      {shareholders.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد مساهمون" message="أضف المساهمين من الإعدادات أو الوحدات المختصة." />
      ) : (
        <DataTable columns={columns} data={shareholders} keyField="id" />
      )}
    </PageShell>
  )
}
