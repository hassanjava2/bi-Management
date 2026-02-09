import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, MoreVertical, Eye, Edit, Trash2, Sparkles } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Badge from '../components/common/Badge'
import Spinner from '../components/common/Spinner'
import Modal from '../components/common/Modal'
import { usersAPI, aiAPI } from '../services/api'
import { translateRole } from '../utils/helpers'

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

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">الموظفين</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">إدارة موظفي الشركة</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          إضافة موظف
        </Button>
      </div>

      {/* Search */}
      <Card padding={false} className="p-4">
        <Input
          placeholder="البحث عن موظف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </Card>

      {/* Employees Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-surface-500">لا يوجد موظفين</p>
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
                    <h3 className="font-semibold text-surface-900 dark:text-white">
                      {user.full_name}
                    </h3>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {user.employee_code}
                    </p>
                  </div>
                </div>
                <button className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded">
                  <MoreVertical className="w-5 h-5 text-surface-400" />
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-500">البريد</span>
                  <span className="text-surface-900 dark:text-white">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">القسم</span>
                  <span className="text-surface-900 dark:text-white">{user.department_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">المنصب</span>
                  <span className="text-surface-900 dark:text-white">{user.position_title || '-'}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 flex items-center justify-between">
                <Badge variant={user.is_active ? 'success' : 'danger'} dot>
                  {user.is_active ? 'نشط' : 'غير نشط'}
                </Badge>
                <Badge>{translateRole(user.role)}</Badge>
              </div>

              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedUser(user); setShowDetailsModal(true) }}>
                  <Eye className="w-4 h-4 ml-1" /> عرض
                </Button>
                <div className="relative" ref={menuOpenId === user.id ? menuRef : null}>
                  <button type="button" className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded" onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === user.id ? null : user.id) }}>
                    <MoreVertical className="w-5 h-5 text-surface-400" />
                  </button>
                  {menuOpenId === user.id && (
                    <div className="absolute left-0 top-full mt-1 w-40 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                      <button type="button" className="w-full px-3 py-2 text-right text-sm hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2" onClick={() => { setSelectedUser(user); setShowEditModal(true); setMenuOpenId(null) }}>
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

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="إضافة موظف" size="md">
        <AddEmployeeForm onClose={() => setShowAddModal(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowAddModal(false) }} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedUser(null) }} title="تعديل الموظف" size="md">
        {selectedUser && <EditEmployeeForm user={selectedUser} onClose={() => { setShowEditModal(false); setSelectedUser(null) }} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowEditModal(false); setSelectedUser(null) }} updateMutation={updateMutation} />}
      </Modal>

      <Modal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setSelectedUser(null) }} title="تأكيد الحذف" size="sm">
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-surface-600 dark:text-surface-400">هل أنت متأكد من حذف الموظف <strong>{selectedUser.full_name}</strong>؟</p>
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
              <div><p className="text-surface-500">البريد</p><p className="font-medium">{selectedUser.email}</p></div>
              <div><p className="text-surface-500">الهاتف</p><p className="font-medium">{selectedUser.phone || '-'}</p></div>
              <div><p className="text-surface-500">القسم</p><p className="font-medium">{selectedUser.department_name || '-'}</p></div>
              <div><p className="text-surface-500">الدور</p><p className="font-medium">{translateRole(selectedUser.role)}</p></div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">المهام المسندة</h4>
              {userTasks.length === 0 ? <p className="text-surface-500 text-sm">لا توجد مهام</p> : (
                <ul className="space-y-1 text-sm">
                  {userTasks.slice(0, 10).map(t => <li key={t.id} className="flex justify-between"><span>{t.title}</span><Badge variant={t.status === 'completed' ? 'success' : 'default'} size="sm">{t.status}</Badge></li>)}
                  {userTasks.length > 10 && <li className="text-surface-500">+{userTasks.length - 10} أخرى</li>}
                </ul>
              )}
            </div>
            {analyzeResult && (
              <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm">
                {analyzeResult.error ? <p className="text-red-600">{analyzeResult.error}</p> : (
                  <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{typeof analyzeResult === 'string' ? analyzeResult : (analyzeResult.summary || analyzeResult.analysis || JSON.stringify(analyzeResult))}</p>
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
    </div>
  )
}

function AddEmployeeForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', role: 'salesperson' })
  const createMutation = useMutation({
    mutationFn: (data) => usersAPI.create(data),
    onSuccess: () => { onSuccess?.() },
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.full_name?.trim() || !form.email?.trim() || !form.password?.trim()) return
    createMutation.mutate({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone?.trim() || undefined,
      role: form.role || 'salesperson',
    })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {createMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">الاسم الكامل</label>
        <input className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg dark:bg-surface-800" value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">البريد الإلكتروني</label>
        <input type="email" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg dark:bg-surface-800" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">كلمة المرور</label>
        <input type="password" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg dark:bg-surface-800" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">الهاتف</label>
        <input type="tel" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg dark:bg-surface-800" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">الدور</label>
        <select className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg dark:bg-surface-800" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
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

function EditEmployeeForm({ user, onClose, onSuccess, updateMutation }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    password: '',
    phone: user?.phone || '',
    role: user?.role || 'employee',
  })
  useEffect(() => {
    setForm({ full_name: user?.full_name || '', email: user?.email || '', password: '', phone: user?.phone || '', role: user?.role || 'employee' })
  }, [user])
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!user?.id || !form.full_name?.trim() || !form.email?.trim()) return
    const data = { full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone?.trim() || undefined, role: form.role || 'employee' }
    if (form.password?.trim()) data.password = form.password
    updateMutation.mutate({ id: user.id, data })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {updateMutation.isError && (
        <div className="p-3 rounded-lg bg-error-50 text-error-700 text-sm">
          {updateMutation.error?.response?.data?.error || updateMutation.error?.message}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">الاسم الكامل</label>
        <input className="w-full px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600" value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
        <input type="email" className="w-full px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">كلمة مرور جديدة (اختياري)</label>
        <input type="password" className="w-full px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} minLength={6} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">الهاتف</label>
        <input type="tel" className="w-full px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">الدور</label>
        <select className="w-full px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
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
