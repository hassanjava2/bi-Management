/**
 * BI Management - Attendance Page (Enhanced Sprint 9)
 * الحضور والانصراف — إحصائيات محسنة + إدارة إجازات + رواتب + تقويم
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar, Briefcase, DollarSign, Plus, CheckCircle2, XCircle, Clock,
  Loader2, Users, AlertTriangle, TrendingUp, Timer
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../context/AuthContext'
import CheckInOutWidget from '../components/attendance/CheckInOutWidget'
import AttendanceCalendar from '../components/attendance/AttendanceCalendar'
import AttendanceReport from '../components/attendance/AttendanceReport'
import PageShell from '../components/common/PageShell'

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
    { id: 'my', label: 'حضوري', icon: Clock },
    ...(canViewReport ? [
      { id: 'report', label: 'تقرير الحضور', icon: TrendingUp },
      { id: 'vacations', label: 'الإجازات', icon: Calendar },
      { id: 'salaries', label: 'الرواتب', icon: DollarSign },
    ] : []),
  ]

  return (
    <PageShell title="الحضور والانصراف" description="سجل حضورك وتابع حالتك">
      {/* ═══ Tab Navigation ═══ */}
      <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 overflow-x-auto mb-5">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                activeTab === t.id
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              )}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ═══ Content ═══ */}
      {activeTab === 'my' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1"><CheckInOutWidget /></div>
            <div className="lg:col-span-2"><AttendanceCalendar /></div>
          </div>
        </div>
      )}
      {activeTab === 'report' && <AttendanceReport />}
      {activeTab === 'vacations' && <VacationsTab />}
      {activeTab === 'salaries' && <SalariesTab />}
    </PageShell>
  )
}

// ═══════════════════════════════════════════
// تبويب الإجازات (Enhanced)
// ═══════════════════════════════════════════
function VacationsTab() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showNewModal, setShowNewModal] = useState(false)
  const [showDetails, setShowDetails] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => api.get('/attendance/vacations').then(r => r.data?.data || []),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/attendance/vacations/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries(['vacations']); toast.success('تم التحديث') },
  })

  const vacations = Array.isArray(data) ? data : []
  const pendingCount = vacations.filter(v => v.status === 'pending').length
  const approvedCount = vacations.filter(v => v.status === 'approved').length
  const rejectedCount = vacations.filter(v => v.status === 'rejected').length

  const statusConfig = {
    pending: { label: 'بانتظار', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
    approved: { label: 'مقبولة', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
    rejected: { label: 'مرفوضة', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
  }

  const typeLabels = { annual: 'سنوية', sick: 'مرضية', personal: 'شخصية', unpaid: 'بدون راتب' }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="بانتظار الموافقة" value={pendingCount} icon={Clock} color="amber" />
        <StatCard label="مقبولة" value={approvedCount} icon={CheckCircle2} color="emerald" />
        <StatCard label="مرفوضة" value={rejectedCount} icon={XCircle} color="red" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowNewModal(true)}><Plus className="w-4 h-4 ml-2" /> طلب إجازة</Button>
      </div>

      {/* Vacations List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>
      ) : vacations.length === 0 ? (
        <div className="text-center py-8 text-neutral-400">لا توجد إجازات مسجلة</div>
      ) : (
        <div className="space-y-3">
          {vacations.map(v => {
            const s = statusConfig[v.status] || statusConfig.pending
            const StatusIcon = s.icon
            return (
              <div key={v.id}
                onClick={() => setShowDetails(v)}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={clsx('p-2 rounded-lg', s.color.split(' ').slice(0, 1).join(' '), 'dark:bg-opacity-30')}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{v.user_name || 'موظف'}</p>
                      <p className="text-xs text-neutral-400">{typeLabels[v.type] || v.type || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left text-xs">
                      <p className="text-neutral-400">من {v.start_date || '—'}</p>
                      <p className="text-neutral-400">إلى {v.end_date || '—'}</p>
                    </div>
                    <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium', s.color)}>{s.label}</span>
                    {v.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); approveMutation.mutate({ id: v.id, status: 'approved' }) }}
                          className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); approveMutation.mutate({ id: v.id, status: 'rejected' }) }}
                          className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {v.reason && <p className="text-xs text-neutral-400 mt-2 pr-10">{v.reason}</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* Vacation Details */}
      <Modal isOpen={!!showDetails} onClose={() => setShowDetails(null)} title={showDetails ? `إجازة: ${showDetails.user_name || 'موظف'}` : ''} size="sm">
        {showDetails && (
          <div className="space-y-3">
            <InfoField label="الموظف" value={showDetails.user_name || '—'} />
            <InfoField label="النوع" value={typeLabels[showDetails.type] || showDetails.type || '—'} />
            <InfoField label="من" value={showDetails.start_date || '—'} />
            <InfoField label="إلى" value={showDetails.end_date || '—'} />
            <InfoField label="السبب" value={showDetails.reason || 'لم يتم تحديد سبب'} />
            <InfoField label="الحالة" value={(statusConfig[showDetails.status] || statusConfig.pending).label} />
            {showDetails.status === 'pending' && (
              <div className="flex gap-2 pt-3 border-t">
                <Button size="sm" onClick={() => { approveMutation.mutate({ id: showDetails.id, status: 'approved' }); setShowDetails(null) }}>
                  <CheckCircle2 className="w-4 h-4 ml-1" /> قبول
                </Button>
                <Button variant="danger" size="sm" onClick={() => { approveMutation.mutate({ id: showDetails.id, status: 'rejected' }); setShowDetails(null) }}>
                  <XCircle className="w-4 h-4 ml-1" /> رفض
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

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
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800">
          <option value="annual">سنوية</option>
          <option value="sick">مرضية</option>
          <option value="personal">شخصية</option>
          <option value="unpaid">بدون راتب</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium mb-1">من</label>
          <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800" /></div>
        <div><label className="block text-sm font-medium mb-1">إلى</label>
          <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800" /></div>
      </div>
      <div><label className="block text-sm font-medium mb-1">السبب</label>
        <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 resize-none" /></div>
      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null} إرسال الطلب
        </Button>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════
// تبويب الرواتب (Enhanced)
// ═══════════════════════════════════════════
function SalariesTab() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  const { data, isLoading } = useQuery({
    queryKey: ['salaries', month],
    queryFn: () => api.get(`/attendance/salaries?month=${month}`).then(r => r.data?.data || {}),
  })

  const employees = data?.employees || []
  const summary = data?.summary || {}

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي الموظفين" value={summary.total_employees || 0} icon={Users} color="sky" />
        <StatCard label="إجمالي الحضور" value={summary.total_present || 0} icon={CheckCircle2} color="emerald" />
        <StatCard label="إجمالي التأخير" value={summary.total_late || 0} icon={AlertTriangle} color="amber" />
        <StatCard label="إجمالي الغياب" value={summary.total_absent || 0} icon={XCircle} color="red" />
      </div>

      {/* Month picker */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الشهر</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
          </div>
        </div>
      </div>

      {/* Employees salary table */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>
      ) : employees.length === 0 ? (
        <div className="text-center py-8 text-neutral-400">لا توجد بيانات لهذا الشهر</div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp, i) => (
            <div key={emp.id || i} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-600 flex-shrink-0">
                  {(emp.full_name || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{emp.full_name}</p>
                  <p className="text-xs text-neutral-400">{emp.role || '—'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">حضور {emp.present_days || 0}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">تأخر {emp.late_days || 0}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">غياب {emp.absent_days || 0}</span>
                  {(emp.total_overtime_minutes || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">إضافي {emp.total_overtime_minutes} دقيقة</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
