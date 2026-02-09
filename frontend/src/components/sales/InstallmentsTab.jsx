import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Spinner from '../common/Spinner'
import Button from '../common/Button'
import { salesAPI } from '../../services/api'
import { installmentPlatforms } from './salesConstants'

export default function InstallmentsTab() {
  const queryClient = useQueryClient()
  const { data: statsRes, isLoading: statsLoading } = useQuery({ queryKey: ['installment-stats'], queryFn: () => salesAPI.getInstallmentStats() })
  const { data: pendingRes, isLoading: pendingLoading } = useQuery({ queryKey: ['installment-pending-transfers'], queryFn: () => salesAPI.getPendingTransfers() })
  const confirmMutation = useMutation({
    mutationFn: ({ id, data }) => salesAPI.confirmTransfer(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['installment-pending-transfers'] }); queryClient.invalidateQueries({ queryKey: ['installment-stats'] }) },
  })
  const stats = statsRes?.data?.data || statsRes?.data || {}
  const pendingList = Array.isArray(pendingRes?.data?.data) ? pendingRes.data.data : (Array.isArray(pendingRes?.data) ? pendingRes.data : [])
  const platformStats = stats.by_platform || stats.platforms || {}
  const defaultPlatforms = Object.entries(installmentPlatforms).map(([key, platform]) => ({
    key, ...platform,
    count: platformStats[key]?.count ?? platformStats[key]?.invoices_count ?? 0,
    pending: platformStats[key]?.pending ?? 0,
    total: platformStats[key]?.total ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {defaultPlatforms.map(({ key, name, logo, fee, count, pending, total }) => (
          <div key={key} className="bg-white dark:bg-neutral-800 rounded-2xl border border-transparent dark:border-neutral-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{logo}</span>
                <div><h3 className="font-semibold text-lg">{name}</h3><p className="text-sm text-neutral-500">نسبة الرفع: {fee}</p></div>
              </div>
            </div>
            {statsLoading ? <Spinner size="sm" /> : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3"><p className="text-2xl font-bold text-green-600">{count ?? 0}</p><p className="text-xs text-neutral-500">فواتير الشهر</p></div>
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3"><p className="text-2xl font-bold text-blue-600">{pending ?? 0}</p><p className="text-xs text-neutral-500">بانتظار التحويل</p></div>
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3"><p className="text-2xl font-bold text-purple-600">{(total / 1000000 || 0).toFixed(1)}M</p><p className="text-xs text-neutral-500">إجمالي الشهر</p></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-transparent dark:border-neutral-800 shadow-sm p-6">
        <h3 className="font-semibold text-lg mb-4">التحويلات المنتظرة</h3>
        {pendingLoading ? <Spinner size="sm" /> : pendingList.length === 0 ? (
          <div className="text-center text-neutral-500 py-8">لا توجد تحويلات منتظرة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-700/50"><tr><th className="px-3 py-2 text-right">الفاتورة/العميل</th><th className="px-3 py-2 text-right">المبلغ</th><th className="px-3 py-2 text-right">التاريخ</th><th className="px-3 py-2 text-right">إجراء</th></tr></thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {pendingList.map((t) => (
                  <tr key={t.id || t.invoice_id}>
                    <td className="px-3 py-2">{t.invoice_number || t.customer_name || t.id}</td>
                    <td className="px-3 py-2">{(t.amount || t.total || 0).toLocaleString()}</td>
                    <td className="px-3 py-2">{t.date || t.created_at ? new Date(t.date || t.created_at).toLocaleDateString('ar-IQ') : '-'}</td>
                    <td className="px-3 py-2"><Button size="sm" onClick={() => confirmMutation.mutate({ id: t.id, data: {} })} disabled={confirmMutation.isPending}>تأكيد التحويل</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
