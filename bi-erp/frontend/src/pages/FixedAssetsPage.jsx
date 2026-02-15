/**
 * BI Management - Fixed Assets Page (Enhanced Sprint 8)
 * المواد الثابتة — إحصائيات + تصنيفات + ذمة موظف + تفاصيل
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Boxes, Plus, UserPlus, Search, Eye, Edit, Trash2,
  Package, DollarSign, Users, Tag, Filter, Wrench
} from 'lucide-react'
import Spinner from '../components/common/Spinner'
import PageShell from '../components/common/PageShell'
import EmptyState from '../components/common/EmptyState'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { usersAPI } from '../services/api'
import { clsx } from 'clsx'

const CATEGORIES = [
  { value: '', label: 'الكل', icon: Boxes },
  { value: 'أثاث', label: 'أثاث', icon: Package },
  { value: 'أجهزة', label: 'أجهزة', icon: Wrench },
  { value: 'سيارات', label: 'سيارات', icon: Package },
  { value: 'أخرى', label: 'أخرى', icon: Tag },
]

export default function FixedAssetsPage() {
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(null)
  const [assignAsset, setAssignAsset] = useState(null)
  const [assignEmployeeId, setAssignEmployeeId] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [form, setForm] = useState({ code: '', name: '', category: '', cost: '', purchase_date: '', location: '', notes: '', is_expense_tracked: false })
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
      setForm({ code: '', name: '', category: '', cost: '', purchase_date: '', location: '', notes: '', is_expense_tracked: false })
      showToast('تمت إضافة الأصل', 'success')
    },
    onError: (err) => showToast(err.response?.data?.error || 'فشل الحفظ', 'error')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/fixed-assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] })
      setShowDeleteConfirm(null)
      setShowDetails(null)
      showToast('تم حذف الأصل', 'success')
    },
    onError: (err) => showToast(err.response?.data?.error || 'فشل الحذف', 'error')
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
    if (!form.name?.trim()) { showToast('الاسم مطلوب', 'error'); return }
    createMutation.mutate({
      code: form.code?.trim() || undefined,
      name: form.name.trim(),
      category: form.category?.trim() || undefined,
      cost: form.cost === '' ? 0 : parseFloat(form.cost) || 0,
      purchase_date: form.purchase_date || undefined,
      location: form.location?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      is_expense_tracked: !!form.is_expense_tracked
    })
  }

  // Filters
  const filteredAssets = assets
    .filter(a => !categoryFilter || (a.category || 'أخرى') === categoryFilter)
    .filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.code?.toLowerCase().includes(search.toLowerCase()))

  // Stats
  const totalAssets = assets.length
  const totalCost = assets.reduce((s, a) => s + (Number(a.cost) || 0), 0)
  const assignedCount = assets.filter(a => a.assigned_employee_id).length
  const categoryCount = new Set(assets.map(a => a.category || 'أخرى')).size

  if (isLoading) {
    return (
      <PageShell title="المواد الثابتة" description="إدارة الأصول والذمم">
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title="المواد الثابتة" description="إدارة الأصول والذمم">
        <EmptyState icon={Boxes} title="خطأ في التحميل" message={error.message} />
      </PageShell>
    )
  }

  return (
    <PageShell
      title="المواد الثابتة"
      description="إدارة الأصول والذمم والصرفيات"
      actions={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 ml-1" /> إضافة أصل</Button>}
    >
      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="إجمالي الأصول" value={totalAssets} icon={Boxes} color="sky" />
        <StatCard label="إجمالي التكلفة" value={`${(totalCost / 1000).toFixed(0)}K`} icon={DollarSign} color="emerald" />
        <StatCard label="مُعيّنة لموظف" value={assignedCount} icon={Users} color="amber" />
        <StatCard label="التصنيفات" value={categoryCount} icon={Tag} color="purple" />
      </div>

      {/* ═══ Toolbar ═══ */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الكود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800 text-sm"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setCategoryFilter(cat.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                  categoryFilter === cat.value
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                )}
              >{cat.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Assets Grid ═══ */}
      {filteredAssets.length === 0 ? (
        <EmptyState icon={Boxes} title="لا توجد مواد ثابتة" message="أضف أصولاً (أثاث، سيارات، أجهزة) وربطها بموظف للذمة." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map(asset => (
            <div key={asset.id}
              className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setShowDetails(asset)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{asset.name}</h3>
                    {asset.code && <p className="text-[10px] text-neutral-400">{asset.code}</p>}
                  </div>
                </div>
                {asset.category && (
                  <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full">{asset.category}</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-neutral-400 text-[10px]">التكلفة</p>
                  <p className="font-bold">{asset.cost != null ? Number(asset.cost).toLocaleString() : '0'} <span className="text-[10px] text-neutral-400">د.ع</span></p>
                </div>
                <div className="text-left">
                  <p className="text-neutral-400 text-[10px]">المسؤول</p>
                  <p className={clsx('text-sm font-medium', asset.assigned_employee_name ? 'text-primary-600' : 'text-neutral-400')}>
                    {asset.assigned_employee_name || 'غير مُعيّن'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                <button onClick={(e) => { e.stopPropagation(); setShowDetails(asset) }} className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"><Eye className="w-3.5 h-3.5 text-neutral-400" /></button>
                <button onClick={(e) => { e.stopPropagation(); setAssignAsset(asset); setAssignEmployeeId(asset.assigned_employee_id || '') }}
                  className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"><UserPlus className="w-3.5 h-3.5 text-primary-500" /></button>
                <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(asset) }}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                {asset.is_expense_tracked && (
                  <span className="mr-auto text-[9px] bg-amber-100 dark:bg-amber-900/20 text-amber-700 px-1.5 py-0.5 rounded">تتبع مصروفات</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Add Asset Modal ═══ */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="إضافة أصل ثابت" size="md">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">الكود (اختياري)</label>
              <input type="text" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm" placeholder="AST-001" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الاسم *</label>
              <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm" placeholder="اسم الأصل" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">التصنيف</label>
              <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm">
                <option value="">-- اختر --</option>
                <option value="أثاث">أثاث</option>
                <option value="أجهزة">أجهزة</option>
                <option value="سيارات">سيارات</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">التكلفة</label>
              <input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm(f => ({ ...f, cost: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ الشراء</label>
              <input type="date" value={form.purchase_date} onChange={(e) => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الموقع</label>
              <input type="text" value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm" placeholder="المخزن، المكتب..." />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="expense_tracked" checked={form.is_expense_tracked} onChange={(e) => setForm(f => ({ ...f, is_expense_tracked: e.target.checked }))} className="rounded" />
            <label htmlFor="expense_tracked" className="text-sm">تتبع مصروفات هذا الأصل</label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>
        </form>
      </Modal>

      {/* ═══ Asset Details Modal ═══ */}
      <Modal isOpen={!!showDetails} onClose={() => setShowDetails(null)} title={showDetails ? `تفاصيل: ${showDetails.name}` : ''} size="md">
        {showDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="الكود" value={showDetails.code || '-'} />
              <InfoField label="التصنيف" value={showDetails.category || 'غير محدد'} />
              <InfoField label="التكلفة" value={`${Number(showDetails.cost || 0).toLocaleString()} د.ع`} />
              <InfoField label="المسؤول" value={showDetails.assigned_employee_name || 'غير مُعيّن'} highlight={!!showDetails.assigned_employee_name} />
              <InfoField label="حالة الذمة" value={showDetails.custody_status || 'غير محدد'} />
              <InfoField label="تتبع المصروفات" value={showDetails.is_expense_tracked ? 'نعم' : 'لا'} />
              {showDetails.purchase_date && <InfoField label="تاريخ الشراء" value={new Date(showDetails.purchase_date).toLocaleDateString('ar-IQ')} />}
              {showDetails.location && <InfoField label="الموقع" value={showDetails.location} />}
            </div>
            {showDetails.notes && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg text-sm text-neutral-600 dark:text-neutral-300">{showDetails.notes}</div>
            )}
            <div className="flex gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => { setAssignAsset(showDetails); setAssignEmployeeId(showDetails.assigned_employee_id || ''); setShowDetails(null) }}>
                <UserPlus className="w-4 h-4 ml-1" /> تعيين مسؤول
              </Button>
              <Button variant="danger" size="sm" onClick={() => { setShowDeleteConfirm(showDetails); setShowDetails(null) }}>
                <Trash2 className="w-4 h-4 ml-1" /> حذف
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ Delete Confirm ═══ */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="تأكيد الحذف" size="sm">
        {showDeleteConfirm && (
          <div className="space-y-4">
            <p className="text-neutral-600 dark:text-neutral-400">هل أنت متأكد من حذف <strong>{showDeleteConfirm.name}</strong>؟</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>إلغاء</Button>
              <Button variant="danger" onClick={() => deleteMutation.mutate(showDeleteConfirm.id)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ Assign Employee ═══ */}
      <Modal isOpen={!!assignAsset} onClose={() => { setAssignAsset(null); setAssignEmployeeId('') }} title={assignAsset ? `تعيين مسؤول: ${assignAsset.name}` : 'تعيين مسؤول'} size="md">
        {assignAsset && (
          <form onSubmit={(e) => { e.preventDefault(); assignMutation.mutate({ assetId: assignAsset.id, employee_id: assignEmployeeId || null }) }} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">الموظف المسؤول</label>
              <select value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm">
                <option value="">— إلغاء التعيين —</option>
                {Array.isArray(usersList) && usersList.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.username || u.id}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => { setAssignAsset(null); setAssignEmployeeId('') }}>إلغاء</Button>
              <Button type="submit" disabled={assignMutation.isPending}>{assignMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </PageShell>
  )
}

// ═══ INFO FIELD ═══
function InfoField({ label, value, highlight }) {
  return (
    <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700/50">
      <p className="text-[10px] text-neutral-400">{label}</p>
      <p className={clsx('text-sm font-medium', highlight ? 'text-primary-600' : '')}>{value}</p>
    </div>
  )
}

// ═══ STAT CARD ═══
function StatCard({ label, value, icon: Icon, color = 'sky' }) {
  const colors = {
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
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
