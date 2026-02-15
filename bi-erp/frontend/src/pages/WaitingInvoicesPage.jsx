/**
 * BI Management - Waiting Invoices Page (Enhanced Sprint 13)
 * قوائم الانتظار — بطاقات بدل جدول
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, RefreshCw, CheckCircle2, FileText, ShoppingCart, User, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import PageShell from '../components/common/PageShell'
import EmptyState from '../components/common/EmptyState'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

const formatNumber = (num) => new Intl.NumberFormat('ar-IQ').format(Math.round(num || 0))
const typeLabels = { sale: 'بيع', purchase: 'شراء' }
const typeColors = {
  sale: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  purchase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

export default function WaitingInvoicesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [type, setType] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['waiting-invoices', type],
    queryFn: async () => {
      const params = type ? { type } : {}
      const res = await api.get('/invoices/waiting', { params })
      if (!res.data.success) throw new Error(res.data.error || 'فشل التحميل')
      return res.data.data
    }
  })

  const convertMutation = useMutation({
    mutationFn: (id) => api.post(`/invoices/${id}/convert-to-active`),
    onSuccess: (_, id) => {
      toast.success('تم تحويل القائمة إلى فعالة بنجاح')
      queryClient.invalidateQueries({ queryKey: ['waiting-invoices'] })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل التحويل'),
  })

  const list = Array.isArray(data) ? data : []
  const saleCount = list.filter(i => i.type === 'sale').length
  const purchaseCount = list.filter(i => i.type === 'purchase').length
  const totalValue = list.reduce((s, i) => s + (parseFloat(i.total) || 0), 0)

  return (
    <PageShell
      title="قوائم الانتظار"
      description="الفواتير المحفوظة بالانتظار"
      actions={
        <div className="flex gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm">
            <option value="">كل الأنواع</option>
            <option value="sale">بيع</option>
            <option value="purchase">شراء</option>
          </select>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['waiting-invoices'] })}>
            <RefreshCw className="w-4 h-4 ml-1" /> تحديث
          </Button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="إجمالي المنتظرة" value={list.length} icon={Clock} color="sky" />
        <StatCard label="فواتير بيع" value={saleCount} icon={ShoppingCart} color="emerald" />
        <StatCard label="فواتير شراء" value={purchaseCount} icon={FileText} color="blue" />
        <StatCard label="القيمة الإجمالية" value={`${formatNumber(totalValue)}`} icon={Clock} color="amber" />
      </div>

      {/* Content */}
      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
      {error && <EmptyState icon={FileText} title="خطأ في التحميل" message={error.message} />}
      {!isLoading && !error && list.length === 0 && (
        <EmptyState icon={Clock} title="لا توجد قوائم بالانتظار"
          message="القوائم المحفوظة كمسودة أو انتظار تظهر هنا. يمكنك تحويلها لقائمة فعالة من هنا." />
      )}
      {!isLoading && !error && list.length > 0 && (
        <div className="space-y-3">
          {list.map(item => (
            <div key={item.id}
              className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-mono text-sm font-bold text-primary-600">{item.invoice_number}</p>
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', typeColors[item.type] || 'bg-neutral-100')}>
                        {typeLabels[item.type] || item.type}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-neutral-400">
                      {item.customer_name && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{item.customer_name}</span>}
                      {item.supplier_name && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{item.supplier_name}</span>}
                      {item.created_by_name && <span>بواسطة: {item.created_by_name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {item.total != null && <span className="text-sm font-bold">{formatNumber(item.total)} <span className="text-[10px] text-neutral-400">د.ع</span></span>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                <Button size="sm" onClick={() => convertMutation.mutate(item.id)} disabled={convertMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  {convertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 ml-1" />} تحويل لفعالة
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}

// ═══ STAT CARD ═══
function StatCard({ label, value, icon: Icon, color = 'sky' }) {
  const colors = {
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
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
