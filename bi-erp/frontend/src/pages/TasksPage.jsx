/**
 * BI Management - Tasks Page (Enhanced Sprint 8)
 * صفحة المهام — إحصائيات + لوحة كانبان + عرض قائمة + تعيين موظف
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Eye, Edit, Trash2, Clock, CheckCircle, AlertTriangle,
  LayoutGrid, List, Calendar, User, MessageSquare, ArrowRight, Flag
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Badge from '../components/common/Badge'
import Spinner from '../components/common/Spinner'
import Modal from '../components/common/Modal'
import PageShell from '../components/common/PageShell'
import { tasksAPI, usersAPI } from '../services/api'
import { translateStatus, translatePriority, getStatusColor, getPriorityColor, formatDate } from '../utils/helpers'
import { clsx } from 'clsx'

const STATUS_OPTIONS = [
  { value: '', label: 'الكل', icon: LayoutGrid },
  { value: 'pending', label: 'قيد الانتظار', icon: Clock, color: 'amber' },
  { value: 'in_progress', label: 'جاري العمل', icon: ArrowRight, color: 'blue' },
  { value: 'completed', label: 'مكتمل', icon: CheckCircle, color: 'emerald' },
  { value: 'overdue', label: 'متأخر', icon: AlertTriangle, color: 'red' },
]

const KANBAN_COLS = [
  { status: 'pending', label: 'قيد الانتظار', color: 'amber', icon: Clock },
  { status: 'in_progress', label: 'جاري العمل', color: 'blue', icon: ArrowRight },
  { status: 'completed', label: 'مكتمل', color: 'emerald', icon: CheckCircle },
]

export default function TasksPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState('list') // list | kanban
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [commentText, setCommentText] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', { status: statusFilter }],
    queryFn: () => tasksAPI.getAll({ status: statusFilter || undefined }),
  })

  const { data: taskDetailsData } = useQuery({
    queryKey: ['task', selectedTask?.id],
    queryFn: () => tasksAPI.getById(selectedTask.id),
    enabled: !!selectedTask?.id && (showDetailsModal || showEditModal),
  })
  const taskDetails = taskDetailsData?.data?.data || taskDetailsData?.data

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => tasksAPI.updateStatus(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => tasksAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowEditModal(false); setSelectedTask(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => tasksAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowDeleteConfirm(false); setShowDetailsModal(false); setSelectedTask(null) },
  })
  const addCommentMutation = useMutation({
    mutationFn: ({ id, data }) => tasksAPI.addComment(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['task', selectedTask?.id] }); setCommentText('') },
  })

  const tasks = data?.data?.data || []
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))

  // Stats
  const totalTasks = tasks.length
  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const overdueCount = tasks.filter(t => {
    if (t.status === 'completed' || t.status === 'cancelled') return false
    return t.due_date && new Date(t.due_date) < new Date()
  }).length

  const isOverdue = (task) => {
    if (task.status === 'completed' || task.status === 'cancelled') return false
    return task.due_date && new Date(task.due_date) < new Date()
  }

  return (
    <PageShell
      title="المهام"
      description="إدارة مهام الموظفين والمتابعة"
      actions={<Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> إضافة مهمة</Button>}
    >
      {/* ═══ Stats Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <StatCard label="إجمالي المهام" value={totalTasks} icon={LayoutGrid} color="sky" />
        <StatCard label="قيد الانتظار" value={pendingCount} icon={Clock} color="amber" />
        <StatCard label="جاري العمل" value={inProgressCount} icon={ArrowRight} color="blue" />
        <StatCard label="مكتملة" value={completedCount} icon={CheckCircle} color="emerald" />
        <StatCard label="متأخرة" value={overdueCount} icon={AlertTriangle} color="red" />
      </div>

      {/* ═══ Toolbar ═══ */}
      <Card padding={false} className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="البحث عن مهمة..." value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} />
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-lg p-0.5">
              <button onClick={() => setViewMode('list')}
                className={clsx('p-1.5 rounded', viewMode === 'list' ? 'bg-white dark:bg-neutral-600 shadow-sm' : '')}
              ><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('kanban')}
                className={clsx('p-1.5 rounded', viewMode === 'kanban' ? 'bg-white dark:bg-neutral-600 shadow-sm' : '')}
              ><LayoutGrid className="w-4 h-4" /></button>
            </div>
            {/* Status filter */}
            <div className="flex gap-1 overflow-x-auto">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                    statusFilter === opt.value
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  )}
                >{opt.label}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ═══ Content ═══ */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filteredTasks.length === 0 ? (
        <Card className="text-center py-12"><p className="text-neutral-500">لا توجد مهام</p></Card>
      ) : viewMode === 'kanban' ? (
        // ═══ KANBAN VIEW ═══
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {KANBAN_COLS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.status)
            const colors = {
              amber: 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10',
              blue: 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10',
              emerald: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10',
            }
            const headerColors = {
              amber: 'text-amber-700 dark:text-amber-300',
              blue: 'text-blue-700 dark:text-blue-300',
              emerald: 'text-emerald-700 dark:text-emerald-300',
            }
            return (
              <div key={col.status} className={clsx('rounded-xl border-2 p-3 min-h-[200px]', colors[col.color])}>
                <div className={clsx('flex items-center gap-2 mb-3 font-bold text-sm', headerColors[col.color])}>
                  <col.icon className="w-4 h-4" />
                  {col.label}
                  <span className="ml-auto bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(task => (
                    <div key={task.id}
                      onClick={() => { setSelectedTask(task); setShowDetailsModal(true) }}
                      className={clsx(
                        'bg-white dark:bg-neutral-800 rounded-lg p-3 shadow-sm border cursor-pointer hover:shadow-md transition-shadow',
                        isOverdue(task) ? 'border-red-300 dark:border-red-700' : 'border-neutral-200 dark:border-neutral-700'
                      )}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <div className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', getPriorityColor(task.priority))} />
                        <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-neutral-400">
                        {task.assigned_to_name && (
                          <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{task.assigned_to_name}</span>
                        )}
                        {task.due_date && (
                          <span className={clsx('flex items-center gap-0.5', isOverdue(task) ? 'text-red-500 font-semibold' : '')}>
                            <Calendar className="w-3 h-3" />{new Date(task.due_date).toLocaleDateString('ar-IQ')}
                          </span>
                        )}
                      </div>
                      {isOverdue(task) && (
                        <div className="mt-1.5 text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> متأخرة
                        </div>
                      )}
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-xs text-neutral-400 text-center py-4">لا توجد مهام</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // ═══ LIST VIEW ═══
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div key={task.id}
              className={clsx(
                'bg-white dark:bg-neutral-800 rounded-xl border p-4 hover:shadow-md transition-shadow',
                isOverdue(task) ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10' : 'border-neutral-200 dark:border-neutral-700'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedTask(task); setShowDetailsModal(true) }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', getPriorityColor(task.priority))} />
                    <h3 className="font-semibold text-neutral-900 dark:text-white truncate">{task.title}</h3>
                    {isOverdue(task) && (
                      <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> متأخرة
                      </span>
                    )}
                  </div>
                  {task.description && <p className="text-neutral-500 text-sm mb-2 line-clamp-1">{task.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                    {task.assigned_to_name && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{task.assigned_to_name}</span>}
                    {task.due_date && <span className={clsx('flex items-center gap-1', isOverdue(task) ? 'text-red-500' : '')}><Calendar className="w-3.5 h-3.5" />{formatDate(task.due_date)}</span>}
                    <Badge className={getStatusColor(task.status)} size="sm">{translateStatus(task.status)}</Badge>
                    <Badge className={getPriorityColor(task.priority)} size="sm">{translatePriority(task.priority)}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" onClick={() => { setSelectedTask(task); setShowDetailsModal(true) }} className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"><Eye className="w-4 h-4 text-neutral-400" /></button>
                  <button type="button" onClick={() => { setSelectedTask(task); setShowEditModal(true) }} className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"><Edit className="w-4 h-4 text-neutral-400" /></button>
                  <button type="button" onClick={() => { setSelectedTask(task); setShowDeleteConfirm(true) }} className="p-1.5 rounded hover:bg-error-50 dark:hover:bg-error-900/20 text-error-600"><Trash2 className="w-4 h-4" /></button>
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <select value={task.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: task.id, status: e.target.value })}
                      className="text-xs border rounded px-2 py-1 dark:bg-neutral-700 dark:border-neutral-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="pending">قيد الانتظار</option>
                      <option value="in_progress">جاري العمل</option>
                      <option value="completed">مكتمل</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Modals ═══ */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة مهمة جديدة">
        <AddTaskForm onClose={() => setShowModal(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowModal(false) }} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTask(null) }} title="تعديل المهمة" size="md">
        {selectedTask && <EditTaskForm task={taskDetails || selectedTask} onClose={() => { setShowEditModal(false); setSelectedTask(null) }} updateMutation={updateMutation} />}
      </Modal>

      <Modal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setSelectedTask(null) }} title="تأكيد الحذف" size="sm">
        {selectedTask && (
          <div className="space-y-4">
            <p className="text-neutral-600 dark:text-neutral-400">هل أنت متأكد من حذف المهمة <strong>{selectedTask.title}</strong>؟</p>
            {deleteMutation.isError && <div className="p-3 rounded-lg bg-error-50 text-error-700 text-sm">{deleteMutation.error?.response?.data?.error || deleteMutation.error?.message}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setSelectedTask(null) }}>إلغاء</Button>
              <Button variant="danger" onClick={() => selectedTask.id && deleteMutation.mutate(selectedTask.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedTask(null) }} title={selectedTask ? selectedTask.title : ''} size="lg">
        {selectedTask && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getStatusColor(selectedTask.status)}>{translateStatus(selectedTask.status)}</Badge>
              <Badge className={getPriorityColor(selectedTask.priority)}>{translatePriority(selectedTask.priority)}</Badge>
              {isOverdue(selectedTask) && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> متأخرة
                </span>
              )}
            </div>
            {(taskDetails?.description || selectedTask.description) && (
              <p className="text-neutral-600 dark:text-neutral-400 text-sm bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-lg">
                {(taskDetails || selectedTask).description}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700/50">
                <p className="text-neutral-400 text-xs">المسؤول</p>
                <p className="font-medium flex items-center gap-1"><User className="w-3.5 h-3.5 text-primary-500" />{taskDetails?.assigned_to_name || selectedTask.assigned_to_name || '-'}</p>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700/50">
                <p className="text-neutral-400 text-xs">الموعد</p>
                <p className={clsx('font-medium flex items-center gap-1', isOverdue(selectedTask) ? 'text-red-500' : '')}>
                  <Calendar className="w-3.5 h-3.5 text-primary-500" />{formatDate(taskDetails?.due_date || selectedTask.due_date) || '-'}
                </p>
              </div>
            </div>

            {/* Comments */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-1"><MessageSquare className="w-4 h-4 text-primary-500" /> التعليقات</h4>
              {taskDetails?.comments?.length > 0 && (
                <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                  {taskDetails.comments.map((c, i) => (
                    <div key={i} className="text-sm p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                      <span className="font-medium text-primary-600">{c.user_name || 'مستخدم'}</span>
                      <span className="text-neutral-400 text-xs mr-2">{c.created_at ? new Date(c.created_at).toLocaleDateString('ar-IQ') : ''}</span>
                      <p className="text-neutral-600 dark:text-neutral-300 mt-0.5">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); if (commentText?.trim() && selectedTask.id) addCommentMutation.mutate({ id: selectedTask.id, data: { content: commentText.trim() } }); }} className="flex gap-2">
                <input type="text" className="flex-1 px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600 text-sm" placeholder="اكتب تعليقاً..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                <Button type="submit" size="sm" disabled={addCommentMutation.isPending || !commentText?.trim()}>إرسال</Button>
              </form>
            </div>
            <div className="flex gap-2 pt-2 border-t">
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
function StatCard({ label, value, icon: Icon, color = 'sky' }) {
  const colors = {
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
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

// ═══ ADD TASK FORM ═══
function AddTaskForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' })
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersAPI.getAll(),
  })
  const employees = usersData?.data?.data || []

  const createMutation = useMutation({
    mutationFn: (data) => tasksAPI.create(data),
    onSuccess: () => onSuccess?.(),
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title?.trim()) return
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      priority: form.priority || 'medium',
      due_date: form.due_date || undefined,
      assigned_to: form.assigned_to || undefined,
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
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">العنوان</label>
        <input className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الوصف</label>
        <textarea rows={3} className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الأولوية</label>
          <select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800" value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">تاريخ الاستحقاق</label>
          <input type="date" className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">تعيين إلى</label>
        <select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800" value={form.assigned_to} onChange={(e) => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
          <option value="">-- غير محدد --</option>
          {employees.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
      </div>
    </form>
  )
}

// ═══ EDIT TASK FORM ═══
function EditTaskForm({ task, onClose, updateMutation }) {
  const [form, setForm] = useState({
    title: task?.title || '', description: task?.description || '',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? (task.due_date + '').slice(0, 10) : '',
    assigned_to: task?.assigned_to || '',
  })
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersAPI.getAll(),
  })
  const employees = usersData?.data?.data || []

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!task?.id || !form.title?.trim()) return
    updateMutation.mutate({
      id: task.id,
      data: {
        title: form.title.trim(), description: form.description?.trim() || undefined,
        priority: form.priority || 'medium', due_date: form.due_date || undefined,
        assigned_to: form.assigned_to || undefined,
      },
    })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {updateMutation.isError && <div className="p-3 rounded-lg bg-error-50 text-error-700 text-sm">{updateMutation.error?.response?.data?.error || updateMutation.error?.message}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">العنوان</label>
        <input className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">الوصف</label>
        <textarea rows={3} className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">الأولوية</label>
          <select className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">تاريخ الاستحقاق</label>
          <input type="date" className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">تعيين إلى</label>
        <select className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={form.assigned_to} onChange={(e) => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
          <option value="">-- غير محدد --</option>
          {employees.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
      </div>
    </form>
  )
}
