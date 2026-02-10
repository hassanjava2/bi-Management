/**
 * BI Management - Shares & Partnership Page
 * صفحة الأسهم والشراكة — إدارة المساهمين + أرباح + تنبيهات توزيع
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PieChart, Users, TrendingUp, DollarSign, Plus, Edit, Trash2,
  Calendar, AlertTriangle, CheckCircle2, Bell, Loader2
} from 'lucide-react'
import { clsx } from 'clsx'
import PageShell from '../components/common/PageShell'
import StatsGrid from '../components/common/StatsGrid'
import DataTable from '../components/common/DataTable'
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

export default function SharesPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingShareholder, setEditingShareholder] = useState(null)
  const [showDistributeModal, setShowDistributeModal] = useState(false)

  const { data: configData } = useQuery({
    queryKey: ['shares-config'],
    queryFn: async () => {
      const res = await api.get('/shares/config')
      return res.data?.data ?? {}
    },
  })

  const { data: summaryData, isLoading, error } = useQuery({
    queryKey: ['shares-summary'],
    queryFn: async () => {
      const res = await api.get('/shares/summary')
      return res.data?.data ?? { shareholders: [], total_shares: 0 }
    },
  })

  const config = configData ?? {}
  const shareholders = summaryData?.shareholders ?? []
  const totalShares = summaryData?.total_shares ?? 0
  const totalValue = summaryData?.total_value ?? 0
  const systemType = config.share_system_type || 'fixed_value_variable_count'
  const shareValue = config.share_value || 2000

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

  const statsItems = [
    { label: 'نظام الأسهم', value: systemType === 'fixed_value_variable_count' ? 'ثابت القيمة' : 'ثابت العدد', icon: PieChart, color: 'primary' },
    { label: 'إجمالي الأسهم', value: formatNumber(totalShares), icon: TrendingUp, color: 'blue' },
    { label: 'عدد المساهمين', value: shareholders.length, icon: Users, color: 'emerald' },
    { label: 'قيمة السهم', value: `${formatNumber(shareValue)} $`, icon: DollarSign, color: 'amber' },
  ]

  const columns = [
    {
      key: 'name',
      label: 'المساهم',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-sm font-bold text-primary-600">
            {(r.name || '?')[0]}
          </div>
          <div>
            <p className="font-medium">{r.name}</p>
            {r.code && <p className="text-xs text-neutral-500 font-mono">{r.code}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'share_percentage',
      label: 'النسبة %',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden max-w-[100px]">
            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(r.share_percentage || 0, 100)}%` }} />
          </div>
          <span className="font-medium text-sm">{Number(r.share_percentage || 0).toFixed(1)}%</span>
        </div>
      ),
    },
    {
      key: 'share_value',
      label: 'القيمة',
      render: (r) => <span className="font-bold">{formatNumber(r.share_value)} <span className="text-xs text-neutral-400 font-normal">$</span></span>,
    },
    {
      key: 'monthly_profit',
      label: 'الربح الشهري',
      render: (r) => <span className="text-emerald-600 font-medium">{formatNumber(r.monthly_profit || 0)} $</span>,
    },
    {
      key: 'phone',
      label: 'الهاتف',
      render: (r) => <span className="text-neutral-500 text-sm">{r.phone || '—'}</span>,
    },
    {
      key: 'is_active',
      label: 'الحالة',
      render: (r) => (
        <span className={clsx(
          'px-2 py-1 rounded-lg text-xs font-medium',
          r.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-500'
        )}>
          {r.is_active ? 'نشط' : 'غير نشط'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setEditingShareholder(r); setShowAddModal(true) }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500" title="تعديل">
            <Edit className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageShell
      title="الأسهم والشراكة"
      description={`نظام: ${systemTypeLabels[systemType] || systemType}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDistributeModal(true)}>
            <DollarSign className="w-4 h-4 ml-2" />
            توزيع أرباح
          </Button>
          <Button onClick={() => { setEditingShareholder(null); setShowAddModal(true) }}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مساهم
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <StatsGrid items={statsItems} />

        {shareholders.length === 0 ? (
          <EmptyState icon={Users} title="لا يوجد مساهمون"
            message="أضف المساهمين لبدء إدارة أسهم الشركة"
            actionLabel="إضافة مساهم"
            onAction={() => { setEditingShareholder(null); setShowAddModal(true) }}
          />
        ) : (
          <DataTable columns={columns} data={shareholders} />
        )}
      </div>

      {/* نافذة إضافة/تعديل مساهم */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingShareholder(null) }}
        title={editingShareholder ? 'تعديل مساهم' : 'إضافة مساهم جديد'}>
        <ShareholderForm
          shareholder={editingShareholder}
          onClose={() => { setShowAddModal(false); setEditingShareholder(null) }}
          onSuccess={() => { queryClient.invalidateQueries(['shares-summary']); setShowAddModal(false); setEditingShareholder(null) }}
        />
      </Modal>

      {/* نافذة توزيع أرباح */}
      <Modal isOpen={showDistributeModal} onClose={() => setShowDistributeModal(false)} title="توزيع أرباح الأسهم">
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

// فورم إضافة/تعديل مساهم
function ShareholderForm({ shareholder, onClose, onSuccess }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: shareholder?.name || '',
    code: shareholder?.code || '',
    phone: shareholder?.phone || '',
    share_percentage: shareholder?.share_percentage || '',
    share_value: shareholder?.share_value || '',
    monthly_profit: shareholder?.monthly_profit || '',
    is_active: shareholder?.is_active !== false,
  })

  const mutation = useMutation({
    mutationFn: (data) => shareholder?.id
      ? api.put(`/shares/shareholders/${shareholder.id}`, data)
      : api.post('/shares/shareholders', data),
    onSuccess: () => {
      toast.success(shareholder ? 'تم التعديل' : 'تم الإضافة')
      onSuccess?.()
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'فشل'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.warning('الاسم مطلوب')
    mutation.mutate({
      ...form,
      share_percentage: parseFloat(form.share_percentage) || 0,
      share_value: parseFloat(form.share_value) || 0,
      monthly_profit: parseFloat(form.monthly_profit) || 0,
    })
  }

  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800" />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {field('اسم المساهم', 'name', 'text', 'الاسم الكامل')}
      <div className="grid grid-cols-2 gap-3">
        {field('الكود', 'code', 'text', 'SH-001')}
        {field('الهاتف', 'phone', 'tel', '07XX XXX XXXX')}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {field('النسبة %', 'share_percentage', 'number', '0')}
        {field('القيمة $', 'share_value', 'number', '0')}
        {field('الربح الشهري $', 'monthly_profit', 'number', '0')}
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
          className="rounded text-primary-600" id="active" />
        <label htmlFor="active" className="text-sm">نشط</label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
          {shareholder ? 'تعديل' : 'إضافة'}
        </Button>
      </div>
    </form>
  )
}

// فورم توزيع أرباح
function DistributeProfitsForm({ shareholders, shareValue, onClose, onSuccess }) {
  const toast = useToast()
  const [totalProfit, setTotalProfit] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))

  const activeShareholders = (shareholders || []).filter(s => s.is_active)
  const profitAmount = parseFloat(totalProfit) || 0

  const distribution = activeShareholders.map(s => ({
    ...s,
    share: ((s.share_percentage || 0) / 100) * profitAmount,
  }))

  const mutation = useMutation({
    mutationFn: (data) => api.post('/shares/distribute', data),
    onSuccess: () => {
      toast.success('تم توزيع الأرباح')
      onSuccess?.()
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'فشل'),
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">إجمالي الأرباح ($)</label>
          <input type="number" value={totalProfit} onChange={(e) => setTotalProfit(e.target.value)}
            placeholder="0" min="0"
            className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-lg font-bold" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">الفترة</label>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800" />
        </div>
      </div>

      {profitAmount > 0 && (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th className="px-3 py-2 text-right text-xs text-neutral-500">المساهم</th>
                <th className="px-3 py-2 text-center text-xs text-neutral-500">النسبة</th>
                <th className="px-3 py-2 text-center text-xs text-neutral-500">حصته من الربح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {distribution.map((s, i) => (
                <tr key={s.id || i}>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 text-center">{Number(s.share_percentage || 0).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center font-bold text-emerald-600">{formatNumber(s.share)} $</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button onClick={() => mutation.mutate({ total_profit: profitAmount, period, distribution })}
          disabled={profitAmount <= 0 || mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <DollarSign className="w-4 h-4 ml-2" />}
          توزيع الأرباح
        </Button>
      </div>
    </div>
  )
}
