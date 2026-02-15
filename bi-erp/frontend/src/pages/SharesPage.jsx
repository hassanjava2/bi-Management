/**
 * BI Management - Shares & Partnership Page (Enhanced Sprint 11)
 * صفحة الأسهم والشراكة — بطاقات مساهمين + نسب بصرية + توزيع أرباح
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PieChart, Users, TrendingUp, DollarSign, Plus, Edit, Trash2,
  Calendar, AlertTriangle, CheckCircle2, Bell, Loader2, Eye, Phone
} from 'lucide-react'
import { clsx } from 'clsx'
import PageShell from '../components/common/PageShell'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'
import Spinner from '../components/common/Spinner'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const formatNumber = (num) => new Intl.NumberFormat('ar-IQ').format(Math.round(num || 0))

const systemTypeLabels = {
  fixed_value_variable_count: 'ثابتة القيمة متغيرة العدد',
  fixed_count_variable_value: 'ثابتة العدد متغيرة القيمة',
}

const SHARE_COLORS = [
  'bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
]

export default function SharesPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingShareholder, setEditingShareholder] = useState(null)
  const [showDistributeModal, setShowDistributeModal] = useState(false)
  const [showDetails, setShowDetails] = useState(null)

  const { data: configData } = useQuery({
    queryKey: ['shares-config'],
    queryFn: async () => { const res = await api.get('/shares/config'); return res.data?.data ?? {} },
  })

  const { data: summaryData, isLoading, error } = useQuery({
    queryKey: ['shares-summary'],
    queryFn: async () => { const res = await api.get('/shares/summary'); return res.data?.data ?? { shareholders: [], total_shares: 0 } },
  })

  const config = configData ?? {}
  const shareholders = summaryData?.shareholders ?? []
  const totalShares = summaryData?.total_shares ?? 0
  const totalValue = summaryData?.total_value ?? 0
  const systemType = config.share_system_type || 'fixed_value_variable_count'
  const shareValue = config.share_value || 2000
  const totalProfit = shareholders.reduce((s, sh) => s + (Number(sh.monthly_profit) || 0), 0)
  const activeShareholders = shareholders.filter(s => s.is_active !== false)

  if (isLoading) {
    return (
      <PageShell title="الأسهم والشراكة" description="إدارة أسهم الشركة والمساهمين">
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title="الأسهم والشراكة" description="إدارة أسهم الشركة والمساهمين">
        <EmptyState icon={PieChart} title="خطأ في التحميل" message={error.message} />
      </PageShell>
    )
  }

  return (
    <PageShell
      title="الأسهم والشراكة"
      description={`نظام: ${systemTypeLabels[systemType] || systemType}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDistributeModal(true)}>
            <DollarSign className="w-4 h-4 ml-2" /> توزيع أرباح
          </Button>
          <Button onClick={() => { setEditingShareholder(null); setShowAddModal(true) }}>
            <Plus className="w-4 h-4 ml-2" /> إضافة مساهم
          </Button>
        </div>
      }
    >
      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="إجمالي الأسهم" value={formatNumber(totalShares)} icon={TrendingUp} color="sky" />
        <StatCard label="عدد المساهمين" value={shareholders.length} icon={Users} color="emerald" />
        <StatCard label="قيمة السهم" value={`${formatNumber(shareValue)} $`} icon={DollarSign} color="amber" />
        <StatCard label="الأرباح الشهرية" value={`${formatNumber(totalProfit)} $`} icon={PieChart} color="purple" />
      </div>

      {/* ═══ Share Distribution Visual ═══ */}
      {shareholders.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 mb-5">
          <h3 className="text-sm font-semibold mb-3">توزيع النسب</h3>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            {shareholders.map((sh, i) => (
              <div key={sh.id || i}
                className={clsx('transition-all', SHARE_COLORS[i % SHARE_COLORS.length])}
                style={{ width: `${Math.max(sh.share_percentage || 0, 1)}%` }}
                title={`${sh.name}: ${Number(sh.share_percentage || 0).toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {shareholders.map((sh, i) => (
              <div key={sh.id || i} className="flex items-center gap-1.5 text-xs">
                <div className={clsx('w-2.5 h-2.5 rounded-full', SHARE_COLORS[i % SHARE_COLORS.length])} />
                <span>{sh.name}</span>
                <span className="text-neutral-400">({Number(sh.share_percentage || 0).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Shareholders Grid ═══ */}
      {shareholders.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد مساهمون"
          message="أضف المساهمين لبدء إدارة أسهم الشركة"
          actionLabel="إضافة مساهم"
          onAction={() => { setEditingShareholder(null); setShowAddModal(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shareholders.map((sh, i) => (
            <div key={sh.id || i}
              onClick={() => setShowDetails(sh)}
              className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white', SHARE_COLORS[i % SHARE_COLORS.length])}>
                    {(sh.name || '?')[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{sh.name}</h3>
                    {sh.code && <p className="text-[10px] text-neutral-400 font-mono">{sh.code}</p>}
                  </div>
                </div>
                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-[10px] font-medium',
                  sh.is_active !== false
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-neutral-100 text-neutral-500'
                )}>{sh.is_active !== false ? 'نشط' : 'غير نشط'}</span>
              </div>

              {/* Percentage bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">النسبة</span>
                  <span className="font-bold">{Number(sh.share_percentage || 0).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div className={clsx('h-full rounded-full transition-all', SHARE_COLORS[i % SHARE_COLORS.length])}
                    style={{ width: `${Math.min(sh.share_percentage || 0, 100)}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                  <p className="text-[10px] text-neutral-400">القيمة</p>
                  <p className="font-bold text-sm">{formatNumber(sh.share_value)} <span className="text-[10px] text-neutral-400">$</span></p>
                </div>
                <div className="p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                  <p className="text-[10px] text-neutral-400">الربح الشهري</p>
                  <p className="font-bold text-sm text-emerald-600">{formatNumber(sh.monthly_profit || 0)} <span className="text-[10px]">$</span></p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                <button onClick={(e) => { e.stopPropagation(); setShowDetails(sh) }}
                  className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"><Eye className="w-3.5 h-3.5 text-neutral-400" /></button>
                <button onClick={(e) => { e.stopPropagation(); setEditingShareholder(sh); setShowAddModal(true) }}
                  className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"><Edit className="w-3.5 h-3.5 text-primary-500" /></button>
                {sh.phone && <span className="mr-auto text-[10px] text-neutral-400 flex items-center gap-0.5"><Phone className="w-3 h-3" />{sh.phone}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Detail Modal ═══ */}
      <Modal isOpen={!!showDetails} onClose={() => setShowDetails(null)} title={showDetails ? `مساهم: ${showDetails.name}` : ''} size="sm">
        {showDetails && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white',
                SHARE_COLORS[shareholders.indexOf(showDetails) % SHARE_COLORS.length] || 'bg-primary-500')}>
                {(showDetails.name || '?')[0]}
              </div>
              <div>
                <p className="font-bold">{showDetails.name}</p>
                {showDetails.code && <p className="text-xs text-neutral-400 font-mono">{showDetails.code}</p>}
              </div>
            </div>
            <InfoField label="النسبة" value={`${Number(showDetails.share_percentage || 0).toFixed(1)}%`} />
            <InfoField label="القيمة" value={`${formatNumber(showDetails.share_value)} $`} />
            <InfoField label="الربح الشهري" value={`${formatNumber(showDetails.monthly_profit || 0)} $`} />
            <InfoField label="الهاتف" value={showDetails.phone || '—'} />
            <InfoField label="الحالة" value={showDetails.is_active !== false ? 'نشط' : 'غير نشط'} />
            <div className="flex gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => { setEditingShareholder(showDetails); setShowAddModal(true); setShowDetails(null) }}>
                <Edit className="w-4 h-4 ml-1" /> تعديل
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ Add/Edit Modal ═══ */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingShareholder(null) }}
        title={editingShareholder ? 'تعديل مساهم' : 'إضافة مساهم جديد'}>
        <ShareholderForm
          shareholder={editingShareholder}
          onClose={() => { setShowAddModal(false); setEditingShareholder(null) }}
          onSuccess={() => { queryClient.invalidateQueries(['shares-summary']); setShowAddModal(false); setEditingShareholder(null) }}
        />
      </Modal>

      {/* ═══ Distribute Profits Modal ═══ */}
      <Modal isOpen={showDistributeModal} onClose={() => setShowDistributeModal(false)} title="توزيع أرباح الأسهم" size="md">
        <DistributeProfitsForm
          shareholders={shareholders}
          shareValue={shareValue}
          onClose={() => setShowDistributeModal(false)}
          onSuccess={() => { queryClient.invalidateQueries(['shares-summary']); setShowDistributeModal(false) }}
        />
      </Modal>
    </PageShell>
  )
}

// ═══ SHAREHOLDER FORM ═══
function ShareholderForm({ shareholder, onClose, onSuccess }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: shareholder?.name || '', code: shareholder?.code || '', phone: shareholder?.phone || '',
    share_percentage: shareholder?.share_percentage || '', share_value: shareholder?.share_value || '',
    monthly_profit: shareholder?.monthly_profit || '', is_active: shareholder?.is_active !== false,
  })

  const mutation = useMutation({
    mutationFn: (data) => shareholder?.id ? api.put(`/shares/shareholders/${shareholder.id}`, data) : api.post('/shares/shareholders', data),
    onSuccess: () => { toast.success(shareholder ? 'تم التعديل' : 'تم الإضافة'); onSuccess?.() },
    onError: (e) => toast.error(e?.response?.data?.error || 'فشل'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.warning('الاسم مطلوب')
    mutation.mutate({ ...form, share_percentage: parseFloat(form.share_percentage) || 0, share_value: parseFloat(form.share_value) || 0, monthly_profit: parseFloat(form.monthly_profit) || 0 })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">اسم المساهم *</label>
        <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm" placeholder="الاسم الكامل" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium mb-1">الكود</label>
          <input type="text" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm" placeholder="SH-001" /></div>
        <div><label className="block text-sm font-medium mb-1">الهاتف</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm" placeholder="07XX" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium mb-1">النسبة %</label>
          <input type="number" value={form.share_percentage} onChange={(e) => setForm(f => ({ ...f, share_percentage: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm" placeholder="0" /></div>
        <div><label className="block text-sm font-medium mb-1">القيمة $</label>
          <input type="number" value={form.share_value} onChange={(e) => setForm(f => ({ ...f, share_value: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm" placeholder="0" /></div>
        <div><label className="block text-sm font-medium mb-1">الربح الشهري</label>
          <input type="number" value={form.monthly_profit} onChange={(e) => setForm(f => ({ ...f, monthly_profit: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm" placeholder="0" /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" id="active" />
        <label htmlFor="active" className="text-sm">نشط</label>
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
          {shareholder ? 'تعديل' : 'إضافة'}
        </Button>
      </div>
    </form>
  )
}

// ═══ DISTRIBUTE PROFITS FORM ═══
function DistributeProfitsForm({ shareholders, shareValue, onClose, onSuccess }) {
  const toast = useToast()
  const [totalProfit, setTotalProfit] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))

  const activeShareholders = (shareholders || []).filter(s => s.is_active !== false)
  const profitAmount = parseFloat(totalProfit) || 0
  const distribution = activeShareholders.map(s => ({ ...s, share: ((s.share_percentage || 0) / 100) * profitAmount }))

  const mutation = useMutation({
    mutationFn: (data) => api.post('/shares/distribute', data),
    onSuccess: () => { toast.success('تم توزيع الأرباح'); onSuccess?.() },
    onError: (e) => toast.error(e?.response?.data?.error || 'فشل'),
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">إجمالي الأرباح ($)</label>
          <input type="number" value={totalProfit} onChange={(e) => setTotalProfit(e.target.value)} placeholder="0" min="0"
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-lg font-bold" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">الفترة</label>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800" />
        </div>
      </div>

      {profitAmount > 0 && (
        <div className="space-y-2">
          {distribution.map((s, i) => (
            <div key={s.id || i} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white', SHARE_COLORS[i % SHARE_COLORS.length])}>
                {(s.name || '?')[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-neutral-400">{Number(s.share_percentage || 0).toFixed(1)}%</p>
              </div>
              <p className="font-bold text-emerald-600">{formatNumber(s.share)} $</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={() => mutation.mutate({ total_profit: profitAmount, period, distribution })}
          disabled={profitAmount <= 0 || mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <DollarSign className="w-4 h-4 ml-2" />}
          توزيع الأرباح
        </Button>
      </div>
    </div>
  )
}

// ═══ INFO FIELD ═══
function InfoField({ label, value }) {
  return (
    <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700/50">
      <p className="text-[10px] text-neutral-400">{label}</p>
      <p className="text-sm font-medium">{value}</p>
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
