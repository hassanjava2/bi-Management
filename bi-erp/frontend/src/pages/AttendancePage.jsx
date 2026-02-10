import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Briefcase, DollarSign, Plus, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../context/AuthContext'
import CheckInOutWidget from '../components/attendance/CheckInOutWidget'
import AttendanceCalendar from '../components/attendance/AttendanceCalendar'
import AttendanceReport from '../components/attendance/AttendanceReport'
import PageShell from '../components/common/PageShell'
import DataTable from '../components/common/DataTable'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const formatNumber = (n) => new Intl.NumberFormat('ar-IQ').format(Math.round(n || 0))

export default function AttendancePage() {
  const { isAdmin, isHR, isManager } = useAuth()
  const [activeTab, setActiveTab] = useState('my')

  const canViewReport = isAdmin || isHR || isManager

  const tabs = [
    { id: 'my', label: 'حضوري' },
    ...(canViewReport ? [
      { id: 'report', label: 'تقرير الحضور' },
      { id: 'vacations', label: 'الإجازات' },
      { id: 'salaries', label: 'الرواتب' },
    ] : []),
  ]

  return (
    <PageShell
      title="الحضور والانصراف"
      description="سجل حضورك وتابع حالتك"
      actions={
        <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === t.id ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400'
              )}>{t.label}</button>
          ))}
        </div>
      }
    >

      {activeTab === 'my' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1"><CheckInOutWidget /></div>
          <div className="lg:col-span-2"><AttendanceCalendar /></div>
        </div>
      )}
      {activeTab === 'report' && <AttendanceReport />}
      {activeTab === 'vacations' && <VacationsTab />}
      {activeTab === 'salaries' && <SalariesTab />}
    </PageShell>
  )
}

// تبويب الإجازات
function VacationsTab() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showNewModal, setShowNewModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => api.get('/attendance/vacations').then(r => r.data?.data || []),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/attendance/vacations/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries(['vacations']); toast.success('تم التحديث') },
  })

  const vacations = Array.isArray(data) ? data : []

  const statusConfig = {
    pending: { label: 'بانتظار', color: 'bg-amber-100 text-amber-700' },
    approved: { label: 'مقبولة', color: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'مرفوضة', color: 'bg-red-100 text-red-700' },
  }

  const columns = [
    { key: 'user_name', label: 'الموظف' },
    { key: 'type', label: 'النوع', render: r => r.type === 'annual' ? 'سنوية' : r.type === 'sick' ? 'مرضية' : r.type || '—' },
    { key: 'start_date', label: 'من', render: r => r.start_date || '—' },
    { key: 'end_date', label: 'إلى', render: r => r.end_date || '—' },
    { key: 'reason', label: 'السبب', render: r => r.reason || '—' },
    { key: 'status', label: 'الحالة', render: r => {
      const s = statusConfig[r.status] || statusConfig.pending
      return <span className={clsx('px-2 py-1 rounded-lg text-xs font-medium', s.color)}>{s.label}</span>
    }},
    { key: 'actions', label: '', render: r => r.status === 'pending' ? (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); approveMutation.mutate({ id: r.id, status: 'approved' }) }}
          className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"><CheckCircle2 className="w-4 h-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); approveMutation.mutate({ id: r.id, status: 'rejected' }) }}
          className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200"><XCircle className="w-4 h-4" /></button>
      </div>
    ) : '—' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowNewModal(true)}><Plus className="w-4 h-4 ml-2" /> طلب إجازة</Button>
      </div>
      <DataTable columns={columns} data={vacations} loading={isLoading} emptyTitle="لا توجد إجازات" />

      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="طلب إجازة جديد">
        <NewVacationForm onClose={() => setShowNewModal(false)} onSuccess={() => { queryClient.invalidateQueries(['vacations']); setShowNewModal(false) }} />
      </Modal>
    </div>
  )
}

function NewVacationForm({ onClose, onSuccess }) {
  const toast = useToast()
  const [form, setForm] = useState({ type: 'annual', start_date: '', end_date: '', reason: '' })
  const mutation = useMutation({
    mutationFn: (data) => api.post('/attendance/vacations', data),
    onSuccess: () => { toast.success('تم إرسال الطلب'); onSuccess?.() },
    onError: (e) => toast.error(e?.response?.data?.error || 'فشل'),
  })
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">نوع الإجازة</label>
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800">
          <option value="annual">سنوية</option>
          <option value="sick">مرضية</option>
          <option value="personal">شخصية</option>
          <option value="unpaid">بدون راتب</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium mb-1">من</label>
          <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required
            className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800" /></div>
        <div><label className="block text-sm font-medium mb-1">إلى</label>
          <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required
            className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800" /></div>
      </div>
      <div><label className="block text-sm font-medium mb-1">السبب</label>
        <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2}
          className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 resize-none" /></div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null} إرسال الطلب
        </Button>
      </div>
    </form>
  )
}

// تبويب الرواتب
function SalariesTab() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  const { data, isLoading } = useQuery({
    queryKey: ['salaries', month],
    queryFn: () => api.get(`/attendance/salaries?month=${month}`).then(r => r.data?.data || {}),
  })

  const employees = data?.employees || []
  const summary = data?.summary || {}

  const columns = [
    { key: 'full_name', label: 'الموظف' },
    { key: 'role', label: 'الدور' },
    { key: 'present_days', label: 'حضور', render: r => <span className="text-emerald-600 font-medium">{r.present_days || 0}</span> },
    { key: 'late_days', label: 'تأخر', render: r => <span className="text-amber-600">{r.late_days || 0}</span> },
    { key: 'absent_days', label: 'غياب', render: r => <span className="text-red-600">{r.absent_days || 0}</span> },
    { key: 'total_overtime_minutes', label: 'إضافي (دقيقة)', render: r => r.total_overtime_minutes || 0 },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">الشهر</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800" />
        </div>
        <div className="flex gap-4 text-sm mt-5">
          <span>إجمالي الموظفين: <strong>{summary.total_employees || 0}</strong></span>
          <span>حضور: <strong className="text-emerald-600">{summary.total_present || 0}</strong></span>
          <span>تأخر: <strong className="text-amber-600">{summary.total_late || 0}</strong></span>
          <span>غياب: <strong className="text-red-600">{summary.total_absent || 0}</strong></span>
        </div>
      </div>
      <DataTable columns={columns} data={employees} loading={isLoading} emptyTitle="لا توجد بيانات" />
    </div>
  )
}
