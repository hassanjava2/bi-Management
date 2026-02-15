/**
 * BI Management - Delivery Page (Enhanced Sprint 10)
 * صفحة إدارة التوصيل والشحن — إحصائيات محسنة + بطاقات + تفاصيل + خط زمني
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Truck, Package, MapPin, Phone, Plus, Clock, CheckCircle2,
  XCircle, ArrowRight, RotateCcw, Search, DollarSign, Building2,
  Eye, AlertTriangle, Loader2, ChevronLeft
} from 'lucide-react'
import { clsx } from 'clsx'
import PageShell from '../components/common/PageShell'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { deliveryAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const formatNumber = (num) => new Intl.NumberFormat('ar-IQ').format(Math.round(num || 0))
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

// حالات التوصيل المتقدمة
const deliveryStatuses = {
  preparing: { label: 'قيد التجهيز', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Package, step: 1 },
  pending: { label: 'معلق', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock, step: 1 },
  handed_to_delivery: { label: 'سُلمت للتوصيل', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: Truck, step: 2 },
  in_transit: { label: 'في الطريق', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', icon: ArrowRight, step: 3 },
  delivered: { label: 'تم التسليم', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2, step: 4 },
  returned: { label: 'مرتجع', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: RotateCcw, step: 0 },
  cancelled: { label: 'ملغي', color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300', icon: XCircle, step: 0 },
}

// شركات التوصيل
const deliveryCompanies = [
  { id: 'prime', name: 'برايم', icon: '🚚' },
  { id: 'taxi', name: 'تكسي', icon: '🚕' },
  { id: 'jenny_pickup', name: 'جني يستلم', icon: '📦' },
  { id: 'self', name: 'استلام شخصي', icon: '🏪' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'preparing', label: 'تجهيز' },
  { value: 'pending', label: 'معلق' },
  { value: 'handed_to_delivery', label: 'سُلّم' },
  { value: 'in_transit', label: 'في الطريق' },
  { value: 'delivered', label: 'مُسلّم' },
  { value: 'returned', label: 'مرتجع' },
]

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

  return (
    <PageShell
      title="إدارة التوصيل والشحن"
      description="تتبع عمليات التوصيل — من التجهيز إلى التسليم"
      actions={<Button onClick={() => setShowCreateModal(true)}><Plus className="w-4 h-4 ml-2" /> إنشاء توصيل</Button>}
    >
      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="إجمالي الطلبات" value={stats.total || deliveries.length || 0} icon={Truck} color="sky" />
        <StatCard label="قيد التوصيل" value={pendingCount} icon={Clock} color="amber" />
        <StatCard label="تم التسليم" value={stats.delivered || deliveries.filter(d => d.status === 'delivered').length || 0} icon={CheckCircle2} color="emerald" />
        <StatCard label="مرتجع" value={stats.returned || deliveries.filter(d => d.status === 'returned').length || 0} icon={RotateCcw} color="red" />
      </div>

      {/* ═══ Toolbar ═══ */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input type="text" placeholder="بحث بالرقم أو اسم العميل..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800 text-sm"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                  statusFilter === f.value
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                )}
              >{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Delivery Cards ═══ */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>
      ) : deliveries.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
          <Truck className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">لا توجد طلبات توصيل</p>
          <p className="text-xs text-neutral-400 mt-1">طلبات التوصيل ستظهر هنا عند إنشاء فواتير بتوصيل</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map(delivery => {
            const s = deliveryStatuses[delivery.status] || deliveryStatuses.pending
            const StatusIcon = s.icon
            const co = deliveryCompanies.find(c => c.id === delivery.delivery_company)
            const next = getNextAction(delivery.status)

            return (
              <div key={delivery.id}
                onClick={() => setSelectedDelivery(delivery)}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={clsx('p-2.5 rounded-xl flex-shrink-0', s.color.split(' ').slice(0, 1)[0])}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-mono text-sm font-bold text-primary-600">{delivery.tracking_number || '—'}</p>
                        {delivery.invoice_number && <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full">{delivery.invoice_number}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                        <span className="font-medium text-neutral-600 dark:text-neutral-300">{delivery.customer_name || '—'}</span>
                        {delivery.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{delivery.phone}</span>}
                        {delivery.address && <span className="flex items-center gap-0.5 truncate max-w-[200px]"><MapPin className="w-3 h-3" />{delivery.address}</span>}
                        {co && <span>{co.icon} {co.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {delivery.cod_amount > 0 && (
                      <span className="text-xs font-bold text-emerald-600">{formatNumber(delivery.cod_amount)} <span className="text-[10px] text-neutral-400">د.ع</span></span>
                    )}
                    <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap', s.color)}>{s.label}</span>
                  </div>
                </div>

                {/* Quick actions */}
                {(next || delivery.status === 'in_transit') && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                    {next && (
                      <button onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: delivery.id, status: next.next }) }}
                        className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors flex items-center gap-1">
                        <ChevronLeft className="w-3 h-3" /> {next.label}
                      </button>
                    )}
                    {delivery.status === 'in_transit' && (
                      <button onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: delivery.id, status: 'returned' }) }}
                        className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> مرتجع
                      </button>
                    )}
                    <span className="mr-auto text-[10px] text-neutral-400">{formatDate(delivery.created_at)}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ Delivery Details Modal ═══ */}
      <Modal isOpen={!!selectedDelivery} onClose={() => setSelectedDelivery(null)} title={selectedDelivery ? `توصيل: ${selectedDelivery.tracking_number || ''}` : ''} size="md">
        {selectedDelivery && (() => {
          const s = deliveryStatuses[selectedDelivery.status] || deliveryStatuses.pending
          const co = deliveryCompanies.find(c => c.id === selectedDelivery.delivery_company)
          const next = getNextAction(selectedDelivery.status)
          const currentStep = s.step || 0

          return (
            <div className="space-y-4">
              {/* Progress Steps */}
              {currentStep > 0 && (
                <div className="flex items-center justify-between px-2 py-3">
                  {[
                    { label: 'تجهيز', step: 1 },
                    { label: 'سُلّم', step: 2 },
                    { label: 'في الطريق', step: 3 },
                    { label: 'مُسلّم', step: 4 },
                  ].map((st, i) => (
                    <div key={st.step} className="flex items-center gap-0">
                      <div className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                        currentStep >= st.step ? 'bg-primary-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                      )}>{st.step}</div>
                      <span className={clsx('text-[10px] mr-1', currentStep >= st.step ? 'text-primary-600 font-medium' : 'text-neutral-400')}>{st.label}</span>
                      {i < 3 && <div className={clsx('w-8 h-0.5 mx-1', currentStep > st.step ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-700')} />}
                    </div>
                  ))}
                </div>
              )}

              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="رقم التتبع" value={selectedDelivery.tracking_number || '—'} icon={Package} />
                <InfoField label="الفاتورة" value={selectedDelivery.invoice_number || '—'} icon={DollarSign} />
                <InfoField label="العميل" value={selectedDelivery.customer_name || '—'} icon={Building2} />
                <InfoField label="الهاتف" value={selectedDelivery.phone || '—'} icon={Phone} />
                <InfoField label="العنوان" value={selectedDelivery.address || '—'} icon={MapPin} />
                <InfoField label="شركة التوصيل" value={co ? `${co.icon} ${co.name}` : selectedDelivery.delivery_company || '—'} icon={Truck} />
                {selectedDelivery.cod_amount > 0 && (
                  <InfoField label="COD" value={`${formatNumber(selectedDelivery.cod_amount)} د.ع`} icon={DollarSign} />
                )}
                <InfoField label="الحالة" value={s.label} />
              </div>
              {selectedDelivery.notes && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg text-sm text-neutral-600 dark:text-neutral-300">{selectedDelivery.notes}</div>
              )}

              {/* Actions */}
              {(next || selectedDelivery.status === 'in_transit') && (
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {next && (
                    <Button size="sm" onClick={() => { updateStatusMutation.mutate({ id: selectedDelivery.id, status: next.next }); setSelectedDelivery(null) }}>
                      <ChevronLeft className="w-4 h-4 ml-1" /> {next.label}
                    </Button>
                  )}
                  {selectedDelivery.status === 'in_transit' && (
                    <Button variant="danger" size="sm" onClick={() => { updateStatusMutation.mutate({ id: selectedDelivery.id, status: 'returned' }); setSelectedDelivery(null) }}>
                      <RotateCcw className="w-4 h-4 ml-1" /> مرتجع
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* ═══ Create Modal ═══ */}
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

// ═══ CREATE FORM ═══
function CreateDeliveryForm({ onClose, onSubmit, isPending }) {
  const [form, setForm] = useState({
    invoice_id: '', customer_name: '', address: '', phone: '',
    delivery_company: 'prime', cod_amount: '', notes: '',
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
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type={type}
        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm"
        value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={required} placeholder={placeholder} />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {field('رقم الفاتورة (اختياري)', 'invoice_id', 'text', false, 'INV-...')}
        {field('اسم العميل', 'customer_name', 'text', false, 'اسم المستلم')}
      </div>
      {field('العنوان *', 'address', 'text', true, 'المحافظة / المنطقة / التفاصيل')}
      <div className="grid grid-cols-2 gap-3">
        {field('الهاتف', 'phone', 'tel', false, '07XX XXX XXXX')}
        {field('المبلغ COD', 'cod_amount', 'number', false, '0')}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">شركة التوصيل</label>
        <div className="grid grid-cols-2 gap-2">
          {deliveryCompanies.map((co) => (
            <button key={co.id} type="button"
              onClick={() => setForm(f => ({ ...f, delivery_company: co.id }))}
              className={clsx(
                'p-2.5 rounded-xl border-2 text-sm font-medium transition-all text-right',
                form.delivery_company === co.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300'
              )}>
              <span className="ml-2">{co.icon}</span> {co.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">ملاحظات</label>
        <textarea className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 resize-none text-sm"
          value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="ملاحظات إضافية..." />
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Truck className="w-4 h-4 ml-2" />}
          إنشاء التوصيل
        </Button>
      </div>
    </form>
  )
}

// ═══ INFO FIELD ═══
function InfoField({ label, value, icon: Icon }) {
  return (
    <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-700/50">
      <p className="text-[10px] text-neutral-400 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  )
}

// ═══ STAT CARD ═══
function StatCard({ label, value, icon: Icon, color = 'sky' }) {
  const colors = {
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
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
