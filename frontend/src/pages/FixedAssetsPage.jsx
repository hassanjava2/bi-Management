/**
 * المواد الثابتة - Phase 4
 * أصول، ذمة موظف، صرفيات
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Boxes, Plus, UserPlus } from 'lucide-react'
import Spinner from '../components/common/Spinner'
import PageShell from '../components/common/PageShell'
import DataTable from '../components/common/DataTable'
import EmptyState from '../components/common/EmptyState'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { usersAPI } from '../services/api'

export default function FixedAssetsPage() {
  const [showForm, setShowForm] = useState(false)
  const [assignAsset, setAssignAsset] = useState(null)
  const [assignEmployeeId, setAssignEmployeeId] = useState('')
  const [form, setForm] = useState({ code: '', name: '', category: '', cost: '', is_expense_tracked: false })
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['fixed-assets'],
    queryFn: async () => {
      const res = await api.get('/fixed-assets')
      return res.data?.data ?? []
    }
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/fixed-assets', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] })
      setShowForm(false)
      setForm({ code: '', name: '', category: '', cost: '', is_expense_tracked: false })
      showToast('تمت إضافة الأصل', 'success')
    },
    onError: (err) => showToast(err.response?.data?.error || 'فشل الحفظ', 'error')
  })

  const { data: usersList = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await usersAPI.getAll({})
      return res?.data?.data ?? res?.data ?? []
    },
    enabled: !!assignAsset
  })

  const assignMutation = useMutation({
    mutationFn: ({ assetId, employee_id }) => api.patch(`/fixed-assets/${assetId}/assign`, { employee_id: employee_id || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] })
      setAssignAsset(null)
      setAssignEmployeeId('')
      showToast('تم تحديث المسؤول', 'success')
    },
    onError: (err) => showToast(err.response?.data?.error || 'فشل التعيين', 'error')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name?.trim()) {
      showToast('الاسم مطلوب', 'error')
      return
    }
    createMutation.mutate({
      code: form.code?.trim() || undefined,
      name: form.name.trim(),
      category: form.category?.trim() || undefined,
      cost: form.cost === '' ? 0 : parseFloat(form.cost) || 0,
      is_expense_tracked: !!form.is_expense_tracked
    })
  }

  if (isLoading) {
    return (
      <PageShell title="المواد الثابتة" icon={<Boxes className="w-6 h-6" />}>
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title="المواد الثابتة" icon={<Boxes className="w-6 h-6" />}>
        <EmptyState icon={Boxes} title="خطأ في التحميل" message={error.message} />
      </PageShell>
    )
  }

  const columns = [
    { key: 'code', label: 'الكود' },
    { key: 'name', label: 'الاسم' },
    { key: 'category', label: 'التصنيف' },
    { key: 'cost', label: 'التكلفة', render: (v) => (v != null ? Number(v).toLocaleString() : '-') },
    { key: 'assigned_employee_name', label: 'المسؤول' },
    { key: 'custody_status', label: 'الحالة' },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setAssignAsset(row); setAssignEmployeeId(row.assigned_employee_id || '') }}
        >
          <UserPlus className="w-4 h-4 ml-1" />
          تعيين
        </Button>
      )
    }
  ]

  return (
    <PageShell
      title="المواد الثابتة"
      icon={<Boxes className="w-6 h-6" />}
      actions={
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 ml-1" />
          إضافة أصل
        </Button>
      }
    >
      {assets.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="لا توجد مواد ثابتة"
          message="أضف أصولاً (أثاث، سيارات، أجهزة) وربطها بموظف للذمة."
        />
      ) : (
        <DataTable columns={columns} data={assets} keyField="id" />
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="إضافة أصل ثابت" size="md">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكود (اختياري)</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder="مثال: AST-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder="اسم الأصل"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التصنيف (اختياري)</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder="أثاث، أجهزة، سيارات..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التكلفة (اختياري)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="expense_tracked"
              checked={form.is_expense_tracked}
              onChange={(e) => setForm((f) => ({ ...f, is_expense_tracked: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <label htmlFor="expense_tracked" className="text-sm text-slate-700 dark:text-slate-300">تتبع مصروفات هذا الأصل</label>
          </div>
          <Modal.Footer>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button type="submit" disabled={createMutation.isPending}>حفظ</Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal isOpen={!!assignAsset} onClose={() => { setAssignAsset(null); setAssignEmployeeId('') }} title={assignAsset ? `تعيين مسؤول: ${assignAsset.name}` : 'تعيين مسؤول'} size="md">
        {assignAsset && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              assignMutation.mutate({ assetId: assignAsset.id, employee_id: assignEmployeeId || null })
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الموظف المسؤول</label>
              <select
                value={assignEmployeeId}
                onChange={(e) => setAssignEmployeeId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">— إلغاء التعيين —</option>
                {Array.isArray(usersList) && usersList.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.username || u.id}</option>
                ))}
              </select>
            </div>
            <Modal.Footer>
              <Button type="button" variant="outline" onClick={() => { setAssignAsset(null); setAssignEmployeeId('') }}>إلغاء</Button>
              <Button type="submit" disabled={assignMutation.isPending}>حفظ</Button>
            </Modal.Footer>
          </form>
        )}
      </Modal>
    </PageShell>
  )
}
