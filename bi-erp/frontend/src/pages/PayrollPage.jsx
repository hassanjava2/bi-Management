/**
 * BI Management - Payroll Page
 * صفحة الرواتب — كشوف شهرية + سلف + إحصائيات
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrAPI } from '../services/api'
import { Wallet, Plus, Check, X, DollarSign, Clock, ArrowDownCircle, Send } from 'lucide-react'

const Card = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 ${className}`}>{children}</div>
)
const Button = ({ children, variant = 'primary', className = '', ...props }) => (
    <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${variant === 'outline' ? 'border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700' : variant === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-sky-600 text-white hover:bg-sky-700'} ${className}`} {...props}>{children}</button>
)
const Badge = ({ status }) => {
    const styles = {
        draft: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
        approved: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
        paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    }
    const labels = { draft: 'مسودة', approved: 'مُعتمد', paid: 'مدفوع', pending: 'قيد الانتظار' }
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.draft}`}>{labels[status] || status}</span>
}

const TABS = [
    { id: 'payroll', label: 'كشوف الرواتب', icon: Wallet },
    { id: 'advances', label: 'السلف', icon: ArrowDownCircle },
]

export default function PayrollPage() {
    const qc = useQueryClient()
    const [tab, setTab] = useState('payroll')
    const now = new Date()
    const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    const [showAdvanceForm, setShowAdvanceForm] = useState(false)

    // Payroll queries
    const { data: payrolls = [], isLoading: payrollLoading } = useQuery({
        queryKey: ['payroll', period],
        queryFn: () => hrAPI.getPayroll({ period }).then(r => r.data?.data || []),
        enabled: tab === 'payroll',
    })
    const { data: summary } = useQuery({
        queryKey: ['payroll-summary', period],
        queryFn: () => hrAPI.getPayrollSummary(period).then(r => r.data?.data || {}),
        enabled: tab === 'payroll',
    })

    // Advances queries
    const { data: advances = [], isLoading: advancesLoading } = useQuery({
        queryKey: ['advances'],
        queryFn: () => hrAPI.getAdvances().then(r => r.data?.data || []),
        enabled: tab === 'advances',
    })

    // Mutations
    const generateMut = useMutation({
        mutationFn: () => hrAPI.generatePayroll(period),
        onSuccess: () => qc.invalidateQueries(['payroll', 'payroll-summary']),
    })
    const approveMut = useMutation({
        mutationFn: (id) => hrAPI.approvePayroll(id),
        onSuccess: () => qc.invalidateQueries(['payroll']),
    })
    const payMut = useMutation({
        mutationFn: (id) => hrAPI.payPayroll(id, 'cash'),
        onSuccess: () => qc.invalidateQueries(['payroll', 'payroll-summary']),
    })
    const createAdvanceMut = useMutation({
        mutationFn: (data) => hrAPI.createAdvance(data),
        onSuccess: () => { qc.invalidateQueries(['advances']); setShowAdvanceForm(false) },
    })
    const approveAdvMut = useMutation({
        mutationFn: (id) => hrAPI.approveAdvance(id),
        onSuccess: () => qc.invalidateQueries(['advances']),
    })

    const fmt = (n) => `${Number(n || 0).toLocaleString('en-US')} IQD`

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><Wallet className="w-5 h-5 text-white" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">الرواتب والسلف</h1>
                        <p className="text-sm text-neutral-500">إدارة كشوف الرواتب وسلف الموظفين</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg p-1">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
                        <t.icon className="w-4 h-4" />{t.label}
                    </button>
                ))}
            </div>

            {/* PAYROLL TAB */}
            {tab === 'payroll' && (
                <>
                    {/* Summary & Controls */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
                            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 text-sm" />
                        <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
                            {generateMut.isPending ? 'جاري الإنشاء...' : '⚡ إنشاء كشف الرواتب'}
                        </Button>
                    </div>

                    {generateMut.isSuccess && (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm">
                            ✅ تم إنشاء {generateMut.data?.data?.data?.generated || 0} كشف راتب لشهر {period}
                        </div>
                    )}

                    {/* Summary Cards */}
                    {summary && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="p-4">
                                <div className="text-sm text-neutral-500">الموظفين</div>
                                <div className="text-xl font-bold mt-1">{summary.total_employees || 0}</div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-sm text-neutral-500">إجمالي الرواتب</div>
                                <div className="text-xl font-bold mt-1 text-sky-600">{fmt(summary.total_base)}</div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-sm text-neutral-500">الخصومات</div>
                                <div className="text-xl font-bold mt-1 text-red-600">{fmt(parseFloat(summary.total_deductions || 0) + parseFloat(summary.total_advance_deductions || 0))}</div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-sm text-neutral-500">صافي المدفوع</div>
                                <div className="text-xl font-bold mt-1 text-emerald-600">{fmt(summary.paid_amount)}</div>
                            </Card>
                        </div>
                    )}

                    {/* Payroll List */}
                    {payrollLoading ? (
                        <div className="text-center py-12 text-neutral-500">جاري التحميل...</div>
                    ) : payrolls.length === 0 ? (
                        <Card className="p-12 text-center">
                            <Wallet className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                            <p className="text-neutral-500">لا توجد كشوف لشهر {period}</p>
                            <Button className="mt-4" onClick={() => generateMut.mutate()}>إنشاء كشوف الرواتب</Button>
                        </Card>
                    ) : (
                        <Card className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-neutral-50 dark:bg-neutral-700/50 border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="px-4 py-3 text-right font-medium text-neutral-500">الموظف</th>
                                            <th className="px-4 py-3 text-right font-medium text-neutral-500">الراتب الأساسي</th>
                                            <th className="px-4 py-3 text-right font-medium text-neutral-500">الخصومات</th>
                                            <th className="px-4 py-3 text-right font-medium text-neutral-500">خصم سلف</th>
                                            <th className="px-4 py-3 text-right font-medium text-neutral-500">الصافي</th>
                                            <th className="px-4 py-3 text-right font-medium text-neutral-500">أيام عمل</th>
                                            <th className="px-4 py-3 text-right font-medium text-neutral-500">الحالة</th>
                                            <th className="px-4 py-3 text-right font-medium text-neutral-500">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                        {payrolls.map(p => (
                                            <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{p.employee_name}</div>
                                                    <div className="text-xs text-neutral-500">{p.employee_code}</div>
                                                </td>
                                                <td className="px-4 py-3">{fmt(p.base_salary)}</td>
                                                <td className="px-4 py-3 text-red-600">{parseFloat(p.deductions) > 0 ? fmt(p.deductions) : '—'}</td>
                                                <td className="px-4 py-3 text-orange-600">{parseFloat(p.advance_deduction) > 0 ? fmt(p.advance_deduction) : '—'}</td>
                                                <td className="px-4 py-3 font-semibold text-emerald-600">{fmt(p.net_salary)}</td>
                                                <td className="px-4 py-3">{p.working_days || 0}</td>
                                                <td className="px-4 py-3"><Badge status={p.status} /></td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1">
                                                        {p.status === 'draft' && (
                                                            <button onClick={() => approveMut.mutate(p.id)} className="p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded" title="اعتماد"><Check className="w-3.5 h-3.5" /></button>
                                                        )}
                                                        {p.status === 'approved' && (
                                                            <button onClick={() => payMut.mutate(p.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded" title="تسجيل دفع"><Send className="w-3.5 h-3.5" /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* ADVANCES TAB */}
            {tab === 'advances' && (
                <>
                    <div className="flex justify-end">
                        <Button onClick={() => setShowAdvanceForm(true)}><Plus className="w-4 h-4 ml-1 inline" /> طلب سلفة</Button>
                    </div>

                    {advancesLoading ? (
                        <div className="text-center py-12 text-neutral-500">جاري التحميل...</div>
                    ) : advances.length === 0 ? (
                        <Card className="p-12 text-center">
                            <ArrowDownCircle className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                            <p className="text-neutral-500">لا توجد سلف</p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {advances.map(a => (
                                <Card key={a.id} className="p-4">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 font-medium text-sm">
                                                {a.employee_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium">{a.employee_name}</div>
                                                <div className="text-xs text-neutral-500">{a.reason || 'بدون سبب'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-left">
                                                <div className="font-bold text-lg">{fmt(a.amount)}</div>
                                                <div className="text-xs text-neutral-500">
                                                    {a.deduction_months} شهر — {fmt(a.monthly_deduction)}/شهر — متبقي: {fmt(a.remaining_amount)}
                                                </div>
                                            </div>
                                            <Badge status={a.status} />
                                            {a.status === 'pending' && (
                                                <div className="flex gap-1">
                                                    <button onClick={() => approveAdvMut.mutate(a.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg" title="موافقة"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => hrAPI.rejectAdvance(a.id).then(() => qc.invalidateQueries(['advances']))} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="رفض"><X className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* New Advance Form */}
                    {showAdvanceForm && <AdvanceForm onClose={() => setShowAdvanceForm(false)} onSubmit={d => createAdvanceMut.mutate(d)} loading={createAdvanceMut.isPending} error={createAdvanceMut.error} />}
                </>
            )}
        </div>
    )
}

function AdvanceForm({ onClose, onSubmit, loading, error }) {
    const [form, setForm] = useState({ user_id: '', amount: '', reason: '', deduction_months: 1 })
    const { data: users = [] } = useQuery({
        queryKey: ['users-for-advance'],
        queryFn: () => import('../services/api').then(m => m.usersAPI.getAll().then(r => r.data?.data || [])),
    })
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">طلب سلفة</h2>
                    <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"><X className="w-5 h-5" /></button>
                </div>
                {error && <div className="p-3 mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">{error?.response?.data?.error || error?.message}</div>}
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-3">
                    <div><label className="block text-sm font-medium mb-1">الموظف *</label>
                        <select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} required>
                            <option value="">— اختر —</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select></div>
                    <div><label className="block text-sm font-medium mb-1">المبلغ (IQD) *</label>
                        <input type="number" className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required min="1" /></div>
                    <div><label className="block text-sm font-medium mb-1">أشهر الاستقطاع</label>
                        <input type="number" className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" value={form.deduction_months} onChange={e => setForm(f => ({ ...f, deduction_months: parseInt(e.target.value) || 1 }))} min="1" max="24" /></div>
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
