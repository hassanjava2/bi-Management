/**
 * BI Management - Warranty Page (Enhanced Sprint 9)
 * صفحة الضمان والمطالبات — إحصائيات + بطاقات + تتبع محسن
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wrench, Package, Building2, User, Plus, Eye, CheckCircle2,
  Clock, Send, ArrowDownToLine, XCircle, Search, AlertTriangle, Shield
} from 'lucide-react'
import { clsx } from 'clsx'
import PageShell from '../components/common/PageShell'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import Spinner from '../components/common/Spinner'
import { warrantyAPI, suppliersAPI } from '../services/api'

const STATUS_CONFIG = {
  pending: { label: 'معلق', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  sent_to_supplier: { label: 'مرسل للمورد', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Send },
  received: { label: 'مستلم', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: ArrowDownToLine },
  closed: { label: 'مغلق', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
}

const STATUS_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'معلق' },
  { value: 'sent_to_supplier', label: 'مرسل' },
  { value: 'received', label: 'مستلم' },
  { value: 'closed', label: 'مغلق' },
]

export default function WarrantyPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showNewClaim, setShowNewClaim] = useState(false)
  const [selectedClaimId, setSelectedClaimId] = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['warranty', statusFilter],
    queryFn: () => warrantyAPI.getClaims({ status: statusFilter || undefined }).then((r) => r.data?.data || r.data || []),
  })

  const claims = Array.isArray(data) ? data : []

  // Filter by search
  const filteredClaims = claims.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return (c.claim_number || '').toLowerCase().includes(s)
      || (c.device_display_serial || c.device_serial || '').toLowerCase().includes(s)
      || (c.customer_name || '').toLowerCase().includes(s)
      || (c.supplier_display_name || c.supplier_name || '').toLowerCase().includes(s)
  })

  // Stats
  const pendingCount = claims.filter(c => c.status === 'pending').length
  const sentCount = claims.filter(c => c.status === 'sent_to_supplier').length
  const receivedCount = claims.filter(c => c.status === 'received').length
  const closedCount = claims.filter(c => c.status === 'closed').length

  return (
    <PageShell
      title="الضمان والمطالبات"
      description="إدارة مطالبات الضمان وتتبعها مع الموردين"
      actions={<Button onClick={() => setShowNewClaim(true)}><Plus className="w-4 h-4 ml-2" /> إنشاء مطالبة</Button>}
    >
      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="معلقة" value={pendingCount} icon={Clock} color="amber" />
        <StatCard label="مرسلة للمورد" value={sentCount} icon={Send} color="blue" />
        <StatCard label="مستلمة" value={receivedCount} icon={ArrowDownToLine} color="purple" />
        <StatCard label="مغلقة" value={closedCount} icon={CheckCircle2} color="emerald" />
      </div>

      {/* ═══ Toolbar ═══ */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input type="text" placeholder="بحث بالسيريال أو العميل أو المورد..."
              value={search} onChange={(e) => setSearch(e.target.value)}
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

      {/* ═══ Claims Grid ═══ */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filteredClaims.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
          <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">لا توجد مطالبات ضمان</p>
          <p className="text-xs text-neutral-400 mt-1">مطالبات الضمان ستظهر هنا عند إنشائها</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map(claim => {
            const s = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending
            const StatusIcon = s.icon
            const daysSinceCreation = claim.created_at
              ? Math.floor((Date.now() - new Date(claim.created_at).getTime()) / 86400000)
              : 0
            const isOld = daysSinceCreation > 14 && claim.status !== 'closed'

            return (
              <div key={claim.id}
                onClick={() => setSelectedClaimId(claim.id)}
                className={clsx(
                  'bg-white dark:bg-neutral-800 rounded-xl border p-4 hover:shadow-md transition-shadow cursor-pointer',
                  isOld ? 'border-red-200 dark:border-red-800' : 'border-neutral-200 dark:border-neutral-700'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={clsx('p-2.5 rounded-xl', s.color.split(' ').slice(0, 1)[0], 'bg-opacity-50')}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-mono text-sm font-bold text-primary-600 truncate">{claim.claim_number || claim.id?.slice(0, 8)}</p>
                        {isOld && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> {daysSinceCreation} يوم
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" />{claim.device_display_serial || claim.device_serial || '—'}</span>
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{claim.supplier_display_name || claim.supplier_name || '—'}</span>
                        {claim.customer_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{claim.customer_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium', s.color)}>{s.label}</span>
                    <span className="text-[10px] text-neutral-400">{claim.created_at ? new Date(claim.created_at).toLocaleDateString('ar-IQ') : ''}</span>
                  </div>
                </div>
                {claim.issue && <p className="text-xs text-neutral-400 mt-2 pr-12 line-clamp-1">{claim.issue}</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ Modals ═══ */}
      {showNewClaim && (
        <Modal isOpen={showNewClaim} onClose={() => setShowNewClaim(false)} title="إنشاء مطالبة ضمان" size="md">
          <NewWarrantyClaimForm
            onClose={() => setShowNewClaim(false)}
            onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['warranty'] }); setShowNewClaim(false) }}
          />
        </Modal>
      )}
      {selectedClaimId && (
        <Modal isOpen={!!selectedClaimId} onClose={() => setSelectedClaimId(null)} title="تفاصيل المطالبة" size="lg">
          <WarrantyClaimDetails
            claimId={selectedClaimId}
            onClose={() => setSelectedClaimId(null)}
            onUpdated={() => queryClient.invalidateQueries({ queryKey: ['warranty'] })}
          />
        </Modal>
      )}
    </PageShell>
  )
}

// ═══ NEW CLAIM FORM ═══
function NewWarrantyClaimForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({ device_serial: '', supplier_id: '', customer_name: '', issue: '' })
  const createMutation = useMutation({
    mutationFn: (data) => warrantyAPI.createClaim(data),
    onSuccess: () => onSuccess?.(),
  })
  const { data: suppliersRes } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersAPI.getSuppliers() })
  const suppliers = suppliersRes?.data?.data || []

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.device_serial?.trim()) return
    createMutation.mutate({
      device_serial: form.device_serial.trim(),
      supplier_id: form.supplier_id || undefined,
      customer_name: form.customer_name?.trim() || undefined,
      issue: form.issue?.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {createMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 text-sm">
          {createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">السيريال / الجهاز *</label>
        <input className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800"
          value={form.device_serial} onChange={(e) => setForm(f => ({ ...f, device_serial: e.target.value }))} required placeholder="أدخل رقم السيريال" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">المورد</label>
        <select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800"
          value={form.supplier_id} onChange={(e) => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
          <option value="">اختر المورد...</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">العميل (اختياري)</label>
        <input className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800"
          value={form.customer_name} onChange={(e) => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="اسم العميل" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">وصف العطل</label>
        <textarea rows={2} className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800 resize-none"
          value={form.issue} onChange={(e) => setForm(f => ({ ...f, issue: e.target.value }))} placeholder="وصف المشكلة أو العطل" />
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري...' : 'إنشاء'}</Button>
      </div>
    </form>
  )
}

// ═══ CLAIM DETAILS ═══
function WarrantyClaimDetails({ claimId, onClose, onUpdated }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['warranty-claim', claimId],
    queryFn: () => warrantyAPI.getClaim(claimId),
    enabled: !!claimId,
  })
  const claim = data?.data?.data || data?.data
  const tracking = claim?.tracking || claim?.history || []
  const trackList = Array.isArray(tracking) ? tracking : []

  const updateMutation = useMutation({
    mutationFn: (payload) => warrantyAPI.updateClaim(claimId, payload),
    onSuccess: () => { onUpdated?.(); queryClient.invalidateQueries({ queryKey: ['warranty-claim', claimId] }) },
  })
  const closeMutation = useMutation({
    mutationFn: (payload) => warrantyAPI.closeClaim(claimId, payload || {}),
    onSuccess: () => { onUpdated?.(); onClose?.() },
  })

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>
  if (!claim) return <p className="text-neutral-500">تعذر تحميل المطالبة.</p>

  const s = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="font-mono text-lg font-bold text-primary-600">{claim.claim_number || claim.id}</p>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">{claim.device_display_serial || claim.device_serial}</p>
        </div>
        <span className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium', s.color)}>{s.label}</span>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <InfoField label="المورد" value={claim.supplier_display_name || claim.supplier_name || '—'} icon={Building2} />
        <InfoField label="العميل" value={claim.customer_name || '—'} icon={User} />
        <InfoField label="التاريخ" value={claim.created_at ? new Date(claim.created_at).toLocaleDateString('ar-IQ') : '—'} icon={Clock} />
        <InfoField label="السيريال" value={claim.device_display_serial || claim.device_serial || '—'} icon={Package} />
      </div>

      {claim.issue && (
        <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
          <p className="text-xs text-neutral-400 mb-1">وصف العطل</p>
          <p className="text-sm">{claim.issue}</p>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h4 className="font-semibold mb-3 text-sm">سجل التتبع</h4>
        {trackList.length === 0 ? (
          <p className="text-neutral-400 text-sm">لا يوجد سجل بعد</p>
        ) : (
          <div className="space-y-2">
            {trackList.map((t, i) => (
              <div key={t.id || i} className="flex items-center gap-3 p-2.5 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg text-sm">
                <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                <span className="flex-1">{t.action || t.status || t.note || '—'}</span>
                <span className="text-xs text-neutral-400">{t.created_at ? new Date(t.created_at).toLocaleDateString('ar-IQ') : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        {claim.status !== 'closed' && (
          <>
            {claim.status === 'pending' && (
              <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ status: 'sent_to_supplier' })} disabled={updateMutation.isPending}>
                <Send className="w-4 h-4 ml-1" /> إرسال للمورد
              </Button>
            )}
            {(claim.status === 'pending' || claim.status === 'sent_to_supplier') && (
              <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ status: 'received' })} disabled={updateMutation.isPending}>
                <ArrowDownToLine className="w-4 h-4 ml-1" /> استلام
              </Button>
            )}
            <Button size="sm" onClick={() => closeMutation.mutate({})} disabled={closeMutation.isPending}>
              <CheckCircle2 className="w-4 h-4 ml-1" /> إغلاق المطالبة
            </Button>
          </>
        )}
      </div>
    </div>
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
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
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
