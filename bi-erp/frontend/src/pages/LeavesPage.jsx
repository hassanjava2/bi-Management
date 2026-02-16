/**
 * BI Management - Leaves Page
 * صفحة الإجازات — طلب + قائمة + موافقة/رفض
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { CalendarDays, Plus, Check, X, Clock, Filter } from 'lucide-react'

const Card = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 ${className}`}>{children}</div>
)
const Button = ({ children, variant = 'primary', className = '', ...props }) => (
    <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${variant === 'outline' ? 'border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700' : variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : variant === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-sky-600 text-white hover:bg-sky-700'} ${className}`} {...props}>{children}</button>
)
const Badge = ({ status }) => {
    const styles = {
        pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    const labels = { pending: 'قيد الانتظار', approved: 'مقبول', rejected: 'مرفوض' }
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.pending}`}>{labels[status] || status}</span>
}

const LEAVE_TYPE_LABELS = { annual: 'سنوية', sick: 'مرضية', personal: 'شخصية', unpaid: 'بدون راتب', emergency: 'طارئة', maternity: 'أمومة' }

export default function LeavesPage() {
    const qc = useQueryClient()
    const { user } = useAuth()
    const [showForm, setShowForm] = useState(false)
    const [filter, setFilter] = useState('')
    const isManager = ['admin', 'hr', 'manager', 'owner'].includes(user?.role)

    const { data: stats } = useQuery({
        queryKey: ['leave-stats'],
        queryFn: () => hrAPI.getLeaveStats().then(r => r.data?.data || {}),
    })
    const { data: leaves = [], isLoading } = useQuery({
        queryKey: ['leaves', filter],
        queryFn: () => hrAPI.getLeaves(filter ? { status: filter } : {}).then(r => r.data?.data || []),
    })

    const approveMut = useMutation({
        mutationFn: (id) => hrAPI.approveLeave(id),
        onSuccess: () => qc.invalidateQueries(['leaves', 'leave-stats']),
    })
    const rejectMut = useMutation({
        mutationFn: (id) => hrAPI.rejectLeave(id, 'رفض'),
        onSuccess: () => qc.invalidateQueries(['leaves', 'leave-stats']),
    })
    const createMut = useMutation({
        mutationFn: (data) => hrAPI.createLeave(data),
        onSuccess: () => { qc.invalidateQueries(['leaves', 'leave-stats']); setShowForm(false) },
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-white" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">الإجازات</h1>
                        <p className="text-sm text-neutral-500">إدارة طلبات الإجازات</p>
                    </div>
                </div>
                <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 ml-1 inline" /> طلب إجازة</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-600" /></div>
                        <div><div className="text-sm text-neutral-500">قيد الانتظار</div><div className="text-xl font-bold">{stats?.pending || 0}</div></div></div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Check className="w-4 h-4 text-emerald-600" /></div>
                        <div><div className="text-sm text-neutral-500">إجازة اليوم</div><div className="text-xl font-bold">{stats?.on_leave_today || 0}</div></div></div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center"><CalendarDays className="w-4 h-4 text-sky-600" /></div>
                        <div><div className="text-sm text-neutral-500">قادمة</div><div className="text-xl font-bold">{stats?.approved_upcoming || 0}</div></div></div>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {[{ v: '', l: 'الكل' }, { v: 'pending', l: 'قيد الانتظار' }, { v: 'approved', l: 'مقبول' }, { v: 'rejected', l: 'مرفوض' }].map(f => (
                    <button key={f.v} onClick={() => setFilter(f.v)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === f.v ? 'bg-sky-600 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}>
                        {f.l}
                    </button>
                ))}
            </div>

            {/* Leaves List */}
            {isLoading ? (
                <div className="text-center py-12 text-neutral-500">جاري التحميل...</div>
            ) : leaves.length === 0 ? (
                <Card className="p-12 text-center">
                    <CalendarDays className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                    <p className="text-neutral-500">لا توجد إجازات</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {leaves.map(l => (
                        <Card key={l.id} className="p-4">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 font-medium text-sm">
                                        {l.employee_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <div className="font-medium text-neutral-900 dark:text-white">{l.employee_name}</div>
                                        <div className="text-xs text-neutral-500">
                                            {LEAVE_TYPE_LABELS[l.leave_type] || l.leave_type} — {l.days} يوم
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-left text-sm">
                                        <div className="text-neutral-600 dark:text-neutral-300">{l.start_date} → {l.end_date}</div>
                                        <Badge status={l.status} />
                                    </div>
                                    {isManager && l.status === 'pending' && (
                                        <div className="flex gap-1">
                                            <button onClick={() => approveMut.mutate(l.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg" title="موافقة"><Check className="w-4 h-4" /></button>
                                            <button onClick={() => rejectMut.mutate(l.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="رفض"><X className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {l.reason && <p className="mt-2 text-sm text-neutral-500 pr-12">{l.reason}</p>}
                        </Card>
                    ))}
                </div>
            )}

            {/* New Leave Form */}
            {showForm && <LeaveForm onClose={() => setShowForm(false)} onSubmit={(d) => createMut.mutate(d)} loading={createMut.isPending} error={createMut.error} />}
        </div>
    )
}

function LeaveForm({ onClose, onSubmit, loading, error }) {
    const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', reason: '' })
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">طلب إجازة</h2>
                    <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"><X className="w-5 h-5" /></button>
                </div>
                {error && <div className="p-3 mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">{error?.response?.data?.error || error?.message}</div>}
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-3">
                    <div><label className="block text-sm font-medium mb-1">نوع الإجازة</label>
                        <select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}>
                            {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium mb-1">من تاريخ *</label>
                            <input type="date" className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required /></div>
                        <div><label className="block text-sm font-medium mb-1">إلى تاريخ *</label>
                            <input type="date" className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required /></div>
                    </div>
                    <div><label className="block text-sm font-medium mb-1">السبب</label>
                        <textarea className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button variant="outline" type="button" onClick={onClose}>إلغاء</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'جاري الإرسال...' : 'تقديم الطلب'}</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
