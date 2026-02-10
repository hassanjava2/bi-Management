/**
 * BI Management - Delivery Page
 * صفحة إدارة التوصيل والشحن — حالات متعددة + شركات توصيل + تتبع
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Truck, Package, MapPin, Phone, Plus, Clock, CheckCircle2,
  XCircle, ArrowRight, RotateCcw, Search, DollarSign, Building2,
  Eye, AlertTriangle, Loader2
} from 'lucide-react'
import { clsx } from 'clsx'
import PageShell from '../components/common/PageShell'
import DataTable from '../components/common/DataTable'
import StatsGrid from '../components/common/StatsGrid'
import SearchInput from '../components/common/SearchInput'
import FilterSelect from '../components/common/FilterSelect'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { deliveryAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const formatNumber = (num) => new Intl.NumberFormat('ar-IQ').format(Math.round(num || 0))
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

// حالات التوصيل المتقدمة
const deliveryStatuses = {
  preparing: { label: 'قيد التجهيز', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Package },
  pending: { label: 'معلق', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  handed_to_delivery: { label: 'سُلمت للتوصيل', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: Truck },
  in_transit: { label: 'في الطريق', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', icon: ArrowRight },
  delivered: { label: 'تم التسليم', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  returned: { label: 'مرتجع', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: RotateCcw },
  cancelled: { label: 'ملغي', color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300', icon: XCircle },
}

// شركات التوصيل
const deliveryCompanies = [
  { id: 'prime', name: 'برايم', icon: '🚚' },
  { id: 'taxi', name: 'تكسي', icon: '🚕' },
  { id: 'jenny_pickup', name: 'جني يستلم', icon: '📦' },
  { id: 'self', name: 'استلام شخصي', icon: '🏪' },
]

function StatusBadge({ status }) {
  const config = deliveryStatuses[status] || deliveryStatuses.pending
  const Icon = config.icon
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium', config.color)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}

// الخطوة التالية بحسب الحالة
function getNextAction(status) {
  const map = {
    preparing: { label: 'تسليم للتوصيل', next: 'handed_to_delivery' },
    pending: { label: 'بدء التوصيل', next: 'in_transit' },
    handed_to_delivery: { label: 'في الطريق', next: 'in_transit' },
    in_transit: { label: 'تم التسليم', next: 'delivered' },
  }
  return map[status] || null
}

export default function DeliveryPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', statusFilter, searchTerm],
    queryFn: () => deliveryAPI.getDeliveries({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchTerm || undefined,
    }).then((r) => r.data?.data || []),
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
  const deliveries = Array.isArray(data) ? data : []

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => deliveryAPI.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['deliveries'])
      queryClient.invalidateQueries(['delivery-stats'])
      toast.success('تم تحديث الحالة')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'فشل'),
  })

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

  // بطاقات الإحصائيات
  const statsItems = [
    { label: 'إجمالي الطلبات', value: stats.total || deliveries.length || 0, icon: Truck, color: 'primary' },
    { label: 'قيد التوصيل', value: pendingCount, icon: Clock, color: 'amber' },
    { label: 'تم التسليم', value: stats.delivered || deliveries.filter(d => d.status === 'delivered').length || 0, icon: CheckCircle2, color: 'emerald' },
    { label: 'مرتجع', value: stats.returned || deliveries.filter(d => d.status === 'returned').length || 0, icon: RotateCcw, color: 'red' },
  ]

  const columns = [
    {
      key: 'tracking_number',
      label: 'رقم التتبع',
      render: (r) => <span className="font-mono font-medium text-primary-600">{r.tracking_number || '—'}</span>,
    },
    {
      key: 'invoice_number',
      label: 'الفاتورة',
      render: (r) => r.invoice_number || '—',
    },
    {
      key: 'customer_name',
      label: 'العميل',
      render: (r) => (
        <div>
          <p className="font-medium">{r.customer_name || '—'}</p>
          {r.phone && <p className="text-xs text-neutral-500">{r.phone}</p>}
        </div>
      ),
    },
    {
      key: 'delivery_company',
      label: 'شركة التوصيل',
      render: (r) => {
        const co = deliveryCompanies.find(c => c.id === r.delivery_company)
        return co ? `${co.icon} ${co.name}` : r.delivery_company || '—'
      },
    },
    {
      key: 'address',
      label: 'العنوان',
      render: (r) => <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate max-w-[200px] block">{r.address || '—'}</span>,
    },
    {
      key: 'cod_amount',
      label: 'المبلغ',
      render: (r) => r.cod_amount ? `${formatNumber(r.cod_amount)} د.ع` : '—',
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (r) => {
        const next = getNextAction(r.status)
        return (
          <div className="flex items-center gap-1">
            {next && (
              <button
                onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: r.id, status: next.next }) }}
                className="px-2.5 py-1 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
              >
                {next.label}
              </button>
            )}
            {r.status === 'in_transit' && (
              <button
                onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: r.id, status: 'returned' }) }}
                className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors"
              >
                مرتجع
              </button>
            )}
          </div>
        )
      },
    },
  ]

  const statusOptions = [
    { value: 'all', label: 'كل الحالات' },
    ...Object.entries(deliveryStatuses).map(([k, v]) => ({ value: k, label: v.label })),
  ]

  return (
    <PageShell
      title="إدارة التوصيل والشحن"
      description="تتبع جميع عمليات التوصيل — من التجهيز إلى التسليم"
      actions={
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 ml-2" />
          إنشاء توصيل
        </Button>
      }
    >
      <div className="space-y-6">
        <StatsGrid items={statsItems} />

        <PageShell.Toolbar>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="بحث بالرقم أو اسم العميل..."
            className="flex-1"
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="الحالة"
          />
        </PageShell.Toolbar>

        <PageShell.Content>
          <DataTable
            columns={columns}
            data={deliveries}
            loading={isLoading}
            emptyTitle="لا توجد طلبات توصيل"
            emptyDescription="طلبات التوصيل ستظهر هنا عند إنشاء فواتير بتوصيل"
          />
        </PageShell.Content>
      </div>

      {/* نافذة إنشاء توصيل */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="إنشاء توصيل جديد">
        <CreateDeliveryForm
          onClose={() => setShowCreateModal(false)}
          onSubmit={(body) => createMutation.mutate(body)}
          isPending={createMutation.isPending}
        />
      </Modal>
    </PageShell>
  )
}

function CreateDeliveryForm({ onClose, onSubmit, isPending }) {
  const [form, setForm] = useState({
    invoice_id: '',
    customer_name: '',
    address: '',
    phone: '',
    delivery_company: 'prime',
    cod_amount: '',
    notes: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.address?.trim()) return
    onSubmit({
      invoice_id: form.invoice_id?.trim() || undefined,
      customer_name: form.customer_name?.trim() || undefined,
      address: form.address.trim(),
      phone: form.phone?.trim() || undefined,
      delivery_company: form.delivery_company,
      cod_amount: form.cod_amount ? parseFloat(form.cod_amount) : undefined,
      notes: form.notes?.trim() || undefined,
    })
  }

  const field = (label, key, type = 'text', required = false, placeholder = '') => (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        required={required}
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {field('رقم الفاتورة (اختياري)', 'invoice_id', 'text', false, 'INV-...')}
      {field('اسم العميل', 'customer_name', 'text', false, 'اسم المستلم')}
      {field('العنوان', 'address', 'text', true, 'المحافظة / المنطقة / التفاصيل')}
      {field('الهاتف', 'phone', 'tel', false, '07XX XXX XXXX')}

      <div>
        <label className="block text-sm font-medium mb-1.5">شركة التوصيل</label>
        <div className="grid grid-cols-2 gap-2">
          {deliveryCompanies.map((co) => (
            <button
              key={co.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, delivery_company: co.id }))}
              className={clsx(
                'p-3 rounded-xl border-2 text-sm font-medium transition-all text-right',
                form.delivery_company === co.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300'
              )}
            >
              <span className="ml-2">{co.icon}</span> {co.name}
            </button>
          ))}
        </div>
      </div>

      {field('المبلغ المطلوب تحصيله (COD)', 'cod_amount', 'number', false, '0')}

      <div>
        <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
        <textarea
          className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 resize-none"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder="ملاحظات إضافية..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Truck className="w-4 h-4 ml-2" />}
          إنشاء التوصيل
        </Button>
      </div>
    </form>
  )
}
