/**
 * قوائم الانتظار - Phase 1
 * عرض الفواتير المحفوظة بالانتظار وتحويلها لقائمة فعالة
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, RefreshCw, CheckCircle2, FileText } from 'lucide-react'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import PageShell from '../components/common/PageShell'
import DataTable from '../components/common/DataTable'
import EmptyState from '../components/common/EmptyState'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

export default function WaitingInvoicesPage() {
  const { showToast } = useToast()
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
      showToast('تم تحويل القائمة إلى فعالة بنجاح', 'success')
      queryClient.invalidateQueries({ queryKey: ['waiting-invoices'] })
    },
    onError: (err) => {
      showToast(err.response?.data?.error || 'فشل التحويل', 'error')
    }
  })

  const list = Array.isArray(data) ? data : []
  const columns = [
    { key: 'invoice_number', label: 'رقم القائمة' },
    { key: 'type', label: 'النوع', render: (v) => (v === 'sale' ? 'بيع' : v === 'purchase' ? 'شراء' : v) },
    { key: 'customer_name', label: 'العميل' },
    { key: 'supplier_name', label: 'المورد' },
    { key: 'total', label: 'المجموع', render: (v) => (v != null ? Number(v).toLocaleString() : '-') },
    { key: 'created_by_name', label: 'مدخل البيانات' },
    {
      key: 'id',
      label: 'إجراء',
      render: (_, row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => convertMutation.mutate(row.id)}
          disabled={convertMutation.isPending}
        >
          <CheckCircle2 className="w-4 h-4 ml-1" />
          تحويل لفعالة
        </Button>
      )
    }
  ]

  return (
    <PageShell
      title="قوائم الانتظار"
      icon={<Clock className="w-6 h-6" />}
      actions={
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
          >
            <option value="">كل الأنواع</option>
            <option value="sale">بيع</option>
            <option value="purchase">شراء</option>
          </select>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['waiting-invoices'] })}>
            <RefreshCw className="w-4 h-4 ml-1" />
            تحديث
          </Button>
        </div>
      }
    >
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {error && (
        <EmptyState
          icon={FileText}
          title="خطأ في التحميل"
          message={error.message}
        />
      )}
      {!isLoading && !error && list.length === 0 && (
        <EmptyState
          icon={Clock}
          title="لا توجد قوائم بالانتظار"
          message="القوائم المحفوظة كمسودة أو انتظار تظهر هنا. يمكنك تحويلها لقائمة فعالة من هنا."
        />
      )}
      {!isLoading && !error && list.length > 0 && (
        <DataTable columns={columns} data={list} keyField="id" />
      )}
    </PageShell>
  )
}
