/**
 * BI Management - Warranty Page
 * صفحة الضمان والمطالبات
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wrench, Package, Building2, User, Plus, Eye, CheckCircle2 } from 'lucide-react'
import PageLayout from '../components/common/PageLayout'
import DataTable from '../components/common/DataTable'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import Spinner from '../components/common/Spinner'
import { warrantyAPI, suppliersAPI } from '../services/api'

export default function WarrantyPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [showNewClaim, setShowNewClaim] = useState(false)
  const [selectedClaimId, setSelectedClaimId] = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['warranty', statusFilter],
    queryFn: () => warrantyAPI.getClaims({ status: statusFilter || undefined }).then((r) => r.data?.data || r.data || []),
  })

  const claims = Array.isArray(data) ? data : []

  const columns = [
    { key: 'claim_number', label: 'رقم المطالبة', render: (r) => r.claim_number || r.id?.slice(0, 8) },
    { key: 'device_display_serial', label: 'السيريال', render: (r) => r.device_display_serial || r.device_serial || '—' },
    { key: 'supplier_display_name', label: 'المورد', render: (r) => r.supplier_display_name || r.supplier_name || '—' },
    { key: 'customer_name', label: 'العميل', render: (r) => r.customer_name || '—' },
    { key: 'status', label: 'الحالة' },
    { key: 'created_at', label: 'التاريخ', render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString('ar-IQ') : '—' },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setSelectedClaimId(r.id)}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PageLayout title="الضمان" description="مطالبات الضمان وإرسالها للموردين">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-input bg-white dark:bg-neutral-800"
            >
              <option value="">كل الحالات</option>
              <option value="pending">معلق</option>
              <option value="sent_to_supplier">مرسل للمورد</option>
              <option value="received">مستلم</option>
              <option value="closed">مغلق</option>
            </select>
          </div>
          <Button onClick={() => setShowNewClaim(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إنشاء مطالبة ضمان
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={claims}
          loading={isLoading}
          emptyTitle="لا توجد مطالبات ضمان"
          emptyDescription="مطالبات الضمان ستظهر هنا."
        />
      </div>
      {showNewClaim && (
        <Modal isOpen={showNewClaim} onClose={() => setShowNewClaim(false)} title="إنشاء مطالبة ضمان" size="md">
          <NewWarrantyClaimForm
            onClose={() => setShowNewClaim(false)}
            onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['warranty'] }); setShowNewClaim(false); }}
          />
        </Modal>
      )}
      {selectedClaimId && (
        <Modal isOpen={!!selectedClaimId} onClose={() => setSelectedClaimId(null)} title="تفاصيل المطالبة" size="xl">
          <WarrantyClaimDetails
            claimId={selectedClaimId}
            onClose={() => setSelectedClaimId(null)}
            onUpdated={() => { queryClient.invalidateQueries({ queryKey: ['warranty'] }); }}
          />
        </Modal>
      )}
    </PageLayout>
  )
}

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
        <label className="block text-sm font-medium mb-1">السيريال / الجهاز</label>
        <input className="w-full px-3 py-2 border rounded-lg" value={form.device_serial} onChange={(e) => setForm((f) => ({ ...f, device_serial: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">المورد</label>
        <select className="w-full px-3 py-2 border rounded-lg" value={form.supplier_id} onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}>
          <option value="">اختر المورد...</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">العميل (اختياري)</label>
        <input className="w-full px-3 py-2 border rounded-lg" value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">وصف العطل</label>
        <input className="w-full px-3 py-2 border rounded-lg" value={form.issue} onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري...' : 'إنشاء'}</Button>
      </div>
    </form>
  )
}

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
    onSuccess: () => { onUpdated?.(); queryClient.invalidateQueries({ queryKey: ['warranty-claim', claimId] }); },
  })
  const closeMutation = useMutation({
    mutationFn: (payload) => warrantyAPI.closeClaim(claimId, payload || {}),
    onSuccess: () => { onUpdated?.(); onClose?.(); },
  })

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>
  if (!claim) return <p className="text-neutral-500">تعذر تحميل المطالبة.</p>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-mono text-primary-600">{claim.claim_number || claim.id}</p>
          <p className="text-neutral-600 dark:text-neutral-400">{claim.device_display_serial || claim.device_serial}</p>
          <p className="text-sm text-neutral-500">المورد: {claim.supplier_display_name || claim.supplier_name || '—'}</p>
        </div>
        <span className="px-2 py-1 rounded-full text-sm bg-neutral-100 dark:bg-neutral-700">{claim.status || '—'}</span>
      </div>
      {claim.issue && <p className="text-sm text-neutral-600">{claim.issue}</p>}
      <div>
        <h4 className="font-semibold mb-2">سجل التتبع</h4>
        {trackList.length === 0 ? <p className="text-neutral-500 text-sm">لا يوجد سجل</p> : (
          <ul className="space-y-2 text-sm">
            {trackList.map((t, i) => (
              <li key={t.id || i} className="flex justify-between p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded">
                <span>{t.action || t.status || t.note || '—'}</span>
                <span>{t.created_at ? new Date(t.created_at).toLocaleDateString('ar-IQ') : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => updateMutation.mutate({ status: 'sent_to_supplier' })} disabled={updateMutation.isPending}>
          إرسال للمورد
        </Button>
        <Button variant="outline" onClick={() => updateMutation.mutate({ status: 'received' })} disabled={updateMutation.isPending}>
          استلام
        </Button>
        <Button onClick={() => closeMutation.mutate({})} disabled={closeMutation.isPending || claim.status === 'closed'}>
          <CheckCircle2 className="w-4 h-4 ml-2" />
          إغلاق المطالبة
        </Button>
        {onClose && <Button variant="outline" onClick={onClose}>إغلاق</Button>}
      </div>
    </div>
  )
}
