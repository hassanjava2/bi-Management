/**
 * BI Management - Employees Page (Enhanced Sprint 7)
 * صفحة الموظفين — إحصائيات + أداء + حضور
 */
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreVertical, Eye, Edit, Trash2, Sparkles,
  Users, UserCheck, UserX, Building2, Award, Clock, TrendingUp,
  CheckCircle, AlertTriangle, BarChart3, Briefcase
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Spinner from '../components/common/Spinner'
import Modal from '../components/common/Modal'
import PageShell from '../components/common/PageShell'
import SearchInput from '../components/common/SearchInput'
import { usersAPI, aiAPI } from '../services/api'
import api from '../services/api'
import { translateRole } from '../utils/helpers'
import { clsx } from 'clsx'

const ROLES = [
  { value: 'viewer', label: 'مشاهد' },
  { value: 'salesperson', label: 'موظف مبيعات' },
  { value: 'warehouse_keeper', label: 'أمين مخزن' },
  { value: 'accountant', label: 'محاسب' },
  { value: 'manager', label: 'مدير' },
  { value: 'admin', label: 'مدير نظام' },
  { value: 'owner', label: 'مالك' },
  { value: 'employee', label: 'موظف' },
  { value: 'hr', label: 'موارد بشرية' },
]

const TABS = [
  { id: 'employees', label: 'الموظفين', icon: Users },
  { id: 'performance', label: 'الأداء', icon: BarChart3 },
  { id: 'attendance', label: 'الحضور', icon: Clock },
]

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('employees')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [analyzeResult, setAnalyzeResult] = useState(null)
  const menuRef = useRef(null)
  const analyzeMutation = useMutation({
    mutationFn: (id) => aiAPI.analyzeEmployee(id),
    onSuccess: (res) => setAnalyzeResult(res?.data?.data || res?.data || res),
    onError: () => setAnalyzeResult({ error: 'فشل التحليل' }),
  })

  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['users', { search }],
    queryFn: () => usersAPI.getAll({ search: search || undefined }),
  })

  // HR Analytics queries
  const { data: hrStats } = useQuery({
    queryKey: ['hr-stats'],
    queryFn: () => api.get('/users/analytics/hr-stats').then(r => r.data?.data || {}),
    staleTime: 60000,
  })
  const { data: attendanceData } = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: () => api.get('/users/analytics/attendance-summary').then(r => r.data?.data || {}),
    staleTime: 60000,
    enabled: activeTab === 'attendance' || activeTab === 'employees',
  })
  const { data: performanceData } = useQuery({
    queryKey: ['employee-performance'],
    queryFn: () => api.get('/users/analytics/employee-performance').then(r => r.data?.data || []),
    staleTime: 60000,
    enabled: activeTab === 'performance',
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowEditModal(false); setSelectedUser(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowDeleteConfirm(false); setShowDetailsModal(false); setSelectedUser(null) },
  })

  const { data: userTasksData } = useQuery({
    queryKey: ['user-tasks', selectedUser?.id],
    queryFn: () => usersAPI.getTasks(selectedUser.id),
    enabled: !!selectedUser?.id && showDetailsModal,
  })
  const userTasks = userTasksData?.data?.data || userTasksData?.data || []

  useEffect(() => {
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpenId(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const users = data?.data?.data || []
  const stats = hrStats || {}
  const attendance = attendanceData || {}

  return (
    <PageShell
      title="الموظفين"
      description="إدارة الموظفين والأداء والحضور"
      actions={<Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4" /> إضافة موظف</Button>}
    >
      {/* ═══ Stats Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="إجمالي الموظفين" value={stats.total || 0} color="sky" />
        <StatCard icon={UserCheck} label="نشط" value={stats.active || 0} color="emerald" />
        <StatCard icon={UserX} label="غير نشط" value={stats.inactive || 0} color="rose" />
        <StatCard icon={Clock} label="حاضرون اليوم" value={attendance.today?.present || 0} sub={`متأخرون: ${attendance.today?.late || 0}`} color="amber" />
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 mb-4">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-white dark:bg-neutral-800 text-primary-600 border-b-2 border-primary-500'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Tab Content ═══ */}
      {activeTab === 'employees' && (
        <>
          <PageShell.Toolbar>
            <SearchInput placeholder="البحث عن موظف..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </PageShell.Toolbar>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : users.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-neutral-500">لا يوجد موظفين</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(user => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                        <span className="text-primary-700 dark:text-primary-300 font-semibold text-lg">
                          {user.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">{user.full_name}</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.employee_code}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">البريد</span>
                      <span className="text-neutral-900 dark:text-white truncate max-w-[60%] text-left">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">القسم</span>
                      <span className="text-neutral-900 dark:text-white">{user.department_name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">المنصب</span>
                      <span className="text-neutral-900 dark:text-white">{user.position_title || '-'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                    <Badge variant={user.is_active ? 'success' : 'danger'} dot>{user.is_active ? 'نشط' : 'غير نشط'}</Badge>
                    <Badge>{translateRole(user.role)}</Badge>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedUser(user); setShowDetailsModal(true) }}>
                      <Eye className="w-4 h-4 ml-1" /> عرض
                    </Button>
                    <div className="relative" ref={menuOpenId === user.id ? menuRef : null}>
                      <button type="button" className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded" onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === user.id ? null : user.id) }}>
                        <MoreVertical className="w-5 h-5 text-neutral-400" />
                      </button>
                      {menuOpenId === user.id && (
                        <div className="absolute left-0 top-full mt-1 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-10">
                          <button type="button" className="w-full px-3 py-2 text-right text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2" onClick={() => { setSelectedUser(user); setShowEditModal(true); setMenuOpenId(null) }}>
                            <Edit className="w-4 h-4" /> تعديل
                          </button>
                          <button type="button" className="w-full px-3 py-2 text-right text-sm hover:bg-error-50 dark:hover:bg-error-900/20 text-error-600 flex items-center gap-2" onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); setMenuOpenId(null) }}>
                            <Trash2 className="w-4 h-4" /> حذف
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'performance' && <PerformanceTab data={performanceData || []} />}
      {activeTab === 'attendance' && <AttendanceTab data={attendance} />}

      {/* ═══ Modals ═══ */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="إضافة موظف" size="md">
        <AddEmployeeForm onClose={() => setShowAddModal(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowAddModal(false) }} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedUser(null) }} title="تعديل الموظف" size="md">
        {selectedUser && <EditEmployeeForm user={selectedUser} onClose={() => { setShowEditModal(false); setSelectedUser(null) }} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowEditModal(false); setSelectedUser(null) }} updateMutation={updateMutation} />}
      </Modal>

      <Modal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setSelectedUser(null) }} title="تأكيد الحذف" size="sm">
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-neutral-600 dark:text-neutral-400">هل أنت متأكد من حذف الموظف <strong>{selectedUser.full_name}</strong>؟</p>
            {deleteMutation.isError && <div className="p-3 rounded-lg bg-error-50 text-error-700 text-sm">{deleteMutation.error?.response?.data?.error || deleteMutation.error?.message}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setSelectedUser(null) }}>إلغاء</Button>
              <Button variant="danger" onClick={() => selectedUser.id && deleteMutation.mutate(selectedUser.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedUser(null); setAnalyzeResult(null); }} title={selectedUser ? `تفاصيل: ${selectedUser.full_name}` : ''} size="md">
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-neutral-500">البريد</p><p className="font-medium">{selectedUser.email}</p></div>
              <div><p className="text-neutral-500">الهاتف</p><p className="font-medium">{selectedUser.phone || '-'}</p></div>
              <div><p className="text-neutral-500">القسم</p><p className="font-medium">{selectedUser.department_name || '-'}</p></div>
              <div><p className="text-neutral-500">الدور</p><p className="font-medium">{translateRole(selectedUser.role)}</p></div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">المهام المسندة</h4>
              {userTasks.length === 0 ? <p className="text-neutral-500 text-sm">لا توجد مهام</p> : (
                <ul className="space-y-1 text-sm">
                  {userTasks.slice(0, 10).map(t => <li key={t.id} className="flex justify-between"><span>{t.title}</span><Badge variant={t.status === 'completed' ? 'success' : 'default'} size="sm">{t.status}</Badge></li>)}
                  {userTasks.length > 10 && <li className="text-neutral-500">+{userTasks.length - 10} أخرى</li>}
                </ul>
              )}
            </div>
            {analyzeResult && (
              <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm">
                {analyzeResult.error ? <p className="text-red-600">{analyzeResult.error}</p> : (
                  <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{typeof analyzeResult === 'string' ? analyzeResult : (analyzeResult.summary || analyzeResult.analysis || JSON.stringify(analyzeResult))}</p>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setAnalyzeResult(null); analyzeMutation.mutate(selectedUser.id); }} disabled={analyzeMutation.isPending}>
                <Sparkles className="w-4 h-4 ml-1" /> تحليل أداء بالذكاء الاصطناعي
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowDetailsModal(false); setShowEditModal(true) }}><Edit className="w-4 h-4 ml-1" /> تعديل</Button>
              <Button variant="danger" size="sm" onClick={() => { setShowDetailsModal(false); setShowDeleteConfirm(true) }}><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  )
}

// ═══ STAT CARD ═══
function StatCard({ icon: Icon, label, value, sub, color = 'sky' }) {
  const colors = {
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
  }
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
      <div className="flex items-center gap-3">
        <div className={clsx('p-2 rounded-lg', colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-neutral-400">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-[10px] text-neutral-400">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ═══ PERFORMANCE TAB ═══
function PerformanceTab({ data }) {
  if (!data || data.length === 0) {
    return <Card className="text-center py-8"><p className="text-neutral-500">لا توجد بيانات أداء حالياً</p></Card>
  }
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary-500" /> أداء الموظفين</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-700/50">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-neutral-600 dark:text-neutral-300">الموظف</th>
              <th className="text-right px-4 py-3 font-medium text-neutral-600 dark:text-neutral-300">القسم</th>
              <th className="text-center px-4 py-3 font-medium text-neutral-600 dark:text-neutral-300">المهام المنجزة</th>
              <th className="text-center px-4 py-3 font-medium text-neutral-600 dark:text-neutral-300">الفواتير</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-300">إجمالي المبيعات</th>
              <th className="text-center px-4 py-3 font-medium text-neutral-600 dark:text-neutral-300">الإنتاجية</th>
            </tr>
          </thead>
          <tbody>
            {data.map((emp, i) => {
              const productivity = emp.total_tasks > 0 ? Math.round((emp.tasks_completed / emp.total_tasks) * 100) : 0
              return (
                <tr key={emp.id || i} className="border-t border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
                        {emp.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-[10px] text-neutral-400">{translateRole(emp.role)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{emp.department_name || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-emerald-600 font-semibold">{emp.tasks_completed}</span>
                    <span className="text-neutral-400">/{emp.total_tasks}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{emp.invoices_created}</td>
                  <td className="px-4 py-3 text-left font-semibold">{Number(emp.total_sales || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <div className="w-16 h-2 bg-neutral-200 dark:bg-neutral-600 rounded-full overflow-hidden">
                        <div className={clsx('h-full rounded-full', productivity >= 80 ? 'bg-emerald-500' : productivity >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                          style={{ width: `${productivity}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-neutral-500">{productivity}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══ ATTENDANCE TAB ═══
function AttendanceTab({ data }) {
  const today = data?.today || {}
  const monthly = data?.monthly || {}
  const totalToday = (today.present || 0) + (today.late || 0) + (today.absent || 0)

  return (
    <div className="space-y-4">
      {/* Today's Attendance */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-primary-500" /> حضور اليوم</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{today.present || 0}</p>
            <p className="text-xs text-emerald-600">حاضر</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{today.late || 0}</p>
            <p className="text-xs text-amber-600">متأخر</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <UserX className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{today.absent || 0}</p>
            <p className="text-xs text-red-600">غائب</p>
          </div>
        </div>
        {totalToday > 0 && (
          <div className="mt-3 w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${(today.present / totalToday) * 100}%` }} />
            <div className="bg-amber-500 h-full" style={{ width: `${(today.late / totalToday) * 100}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${(today.absent / totalToday) * 100}%` }} />
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary-500" /> ملخص الشهر</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-700/50 text-center">
            <p className="text-xs text-neutral-400">أيام العمل</p>
            <p className="text-xl font-bold">{monthly.working_days || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
            <p className="text-xs text-emerald-500">حضور</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{monthly.present_days || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-center">
            <p className="text-xs text-amber-500">تأخير</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{monthly.late_days || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-center">
            <p className="text-xs text-red-500">غياب</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">{monthly.absent_days || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══ ADD EMPLOYEE FORM ═══
function AddEmployeeForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', role: 'salesperson', department_name: '' })
  const createMutation = useMutation({
    mutationFn: (data) => usersAPI.create(data),
    onSuccess: () => { onSuccess?.() },
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.full_name?.trim() || !form.email?.trim() || !form.password?.trim()) return
    createMutation.mutate({
      full_name: form.full_name.trim(), email: form.email.trim(), password: form.password,
      phone: form.phone?.trim() || undefined, role: form.role || 'salesperson',
      department_name: form.department_name?.trim() || undefined,
    })
  }
  const field = (label, key, type = 'text', required = false, minLength) => (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{label}</label>
      <input type={type} className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800"
        value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))} required={required} minLength={minLength} />
    </div>
  )
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {createMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      {field('الاسم الكامل', 'full_name', 'text', true)}
      {field('البريد الإلكتروني', 'email', 'email', true)}
      {field('كلمة المرور', 'password', 'password', true, 6)}
      {field('الهاتف', 'phone', 'tel')}
      {field('القسم', 'department_name')}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الدور</label>
        <select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
          {ROLES.filter(r => r.value !== 'owner').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
      </div>
    </form>
  )
}

// ═══ EDIT EMPLOYEE FORM ═══
function EditEmployeeForm({ user, onClose, onSuccess, updateMutation }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '', email: user?.email || '', password: '',
    phone: user?.phone || '', role: user?.role || 'employee', department_name: user?.department_name || '',
  })
  useEffect(() => {
    setForm({ full_name: user?.full_name || '', email: user?.email || '', password: '', phone: user?.phone || '', role: user?.role || 'employee', department_name: user?.department_name || '' })
  }, [user])
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!user?.id || !form.full_name?.trim() || !form.email?.trim()) return
    const data = { full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone?.trim() || undefined, role: form.role || 'employee', department_name: form.department_name?.trim() || undefined }
    if (form.password?.trim()) data.password = form.password
    updateMutation.mutate({ id: user.id, data })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {updateMutation.isError && (
        <div className="p-3 rounded-lg bg-error-50 text-error-700 text-sm">{updateMutation.error?.response?.data?.error || updateMutation.error?.message}</div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">الاسم الكامل</label>
        <input className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
        <input type="email" className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">كلمة مرور جديدة (اختياري)</label>
        <input type="password" className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} minLength={6} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">الهاتف</label>
        <input type="tel" className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">القسم</label>
        <input className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.department_name} onChange={(e) => setForm(f => ({ ...f, department_name: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">الدور</label>
        <select className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
          {ROLES.filter(r => r.value !== 'owner').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
      </div>
    </form>
  )
}
