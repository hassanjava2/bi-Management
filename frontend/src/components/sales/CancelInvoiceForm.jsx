import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Button from '../common/Button'
import { salesAPI } from '../../services/api'

export default function CancelInvoiceForm({ invoiceId, onClose, onSuccess }) {
  const [reason, setReason] = useState('')
  const cancelMutation = useMutation({
    mutationFn: (data) => salesAPI.cancelInvoice(invoiceId, data),
    onSuccess: () => onSuccess?.(),
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    cancelMutation.mutate({ reason: reason.trim() || undefined })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-neutral-600 dark:text-neutral-400">إلغاء الفاتورة رقم <strong>{invoiceId}</strong>. يُفضّل ذكر السبب.</p>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">سبب الإلغاء (اختياري)</label>
        <input type="text" className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: طلب العميل" />
      </div>
      {cancelMutation.isError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{cancelMutation.error?.response?.data?.error || cancelMutation.error?.message || 'حدث خطأ'}</div>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" variant="danger" disabled={cancelMutation.isPending}>{cancelMutation.isPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}</Button>
      </div>
    </form>
  )
}
