/**
 * BI Management - Delivery Page
 * صفحة التوصيل
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, Package, MapPin, Phone, Plus } from 'lucide-react'
import PageShell from '../components/common/PageShell'
import DataTable from '../components/common/DataTable'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { deliveryAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const statusLabels = { pending: 'معلق', in_transit: 'قيد التوصيل', delivered: 'تم التوصيل', cancelled: 'ملغي' }

export default function DeliveryPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', statusFilter],
    queryFn: () => deliveryAPI.getDeliveries({ status: statusFilter || undefined }).then((r) => r.data?.data || []),
  })
  const { data: statsData } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: () => deliveryAPI.getStats(),
  })
  const { data: pendingData } = useQuery({
    queryKey: ['delivery-pending'],
    queryFn: () => deliveryAPI.getPending(),
  })
  const stats = statsData?.data?.data || statsData?.data || {}
  const pendingCount = Array.isArray(pendingData?.data?.data) ? pendingData.data.data.length : (pendingData?.data?.length ?? 0)

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => deliveryAPI.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['deliveries'])
      toast.success('تم تحديث الحالة')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'فشل'),
  })

  const deliveries = Array.isArray(data) ? data : []

  const columns = [
    { key: 'tracking_number', label: 'رقم التتبع', render: (r) => r.tracking_number || '—' },
    { key: 'invoice_number', label: 'رقم الفاتورة' },
    { key: 'customer_name', label: 'العميل', render: (r) => r.customer_name || '—' },
    { key: 'address', label: 'العنوان', render: (r) => (r.address || '—').slice(0, 30) },
    { key: 'status', label: 'الحالة', render: (r) => statusLabels[r.status] || r.status },
    {
      key: 'actions',
      label: 'إجراء',
      render: (r) =>
        r.status === 'pending' ? (
          <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'in_transit' })}>
            بدء التوصيل
          </Button>
        ) : r.status === 'in_transit' ? (
          <Button size="sm" variant="success" onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'delivered' })}>
            تم التوصيل
          </Button>
        ) : '—',
    },
  ]

  const createMutation = useMutation({
    mutationFn: (body) => deliveryAPI.createDelivery(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-pending'] })
      setShowCreateModal(false)
      toast.success('تم إنشاء التوصيل')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'فشل إنشاء التوصيل'),
  })

  return (
    <PageShell
      title="التوصيل"
      description="إدارة طلبات التوصيل وحالاتها"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-neutral-500">إجمالي: {(stats.total || 0)} | معلق: {pendingCount}</span>
            <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-input bg-white dark:bg-neutral-800"
          >
            <option value="">كل الحالات</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إنشاء توصيل
          </Button>
        </div>
        {showCreateModal && (
          <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="إنشاء توصيل">
            <CreateDeliveryForm
              onClose={() => setShowCreateModal(false)}
              onSubmit={(body) => createMutation.mutate(body)}
              isPending={createMutation.isPending}
            />
          </Modal>
        )}
        <DataTable
          columns={columns}
          data={deliveries}
          loading={isLoading}
          emptyTitle="لا توجد طلبات توصيل"
          emptyDescription="طلبات التوصيل ستظهر هنا."
        />
      </div>
    </PageShell>
  )
}

function CreateDeliveryForm({ onClose, onSubmit, isPending }) {
  const [form, setForm] = useState({ invoice_id: '', customer_name: '', address: '', phone: '' })
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.address?.trim()) return
    onSubmit({
      invoice_id: form.invoice_id?.trim() || undefined,
      customer_name: form.customer_name?.trim() || undefined,
      address: form.address.trim(),
      phone: form.phone?.trim() || undefined,
    })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">رقم الفاتورة (اختياري)</label>
        <input className="w-full px-3 py-2 border rounded-lg" value={form.invoice_id} onChange={(e) => setForm((f) => ({ ...f, invoice_id: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">اسم العميل</label>
        <input className="w-full px-3 py-2 border rounded-lg" value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">العنوان</label>
        <input className="w-full px-3 py-2 border rounded-lg" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">الهاتف</label>
        <input className="w-full px-3 py-2 border rounded-lg" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={isPending}>{isPending ? 'جاري...' : 'إنشاء'}</Button>
      </div>
    </form>
  )
}
