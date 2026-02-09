import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Badge from '../components/common/Badge'
import Spinner from '../components/common/Spinner'
import Modal from '../components/common/Modal'
import { tasksAPI } from '../services/api'
import { translateStatus, translatePriority, getStatusColor, getPriorityColor, formatDate } from '../utils/helpers'

export default function TasksPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
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
  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  const statusOptions = [
    { value: '', label: 'الكل' },
    { value: 'pending', label: 'قيد الانتظار' },
    { value: 'in_progress', label: 'جاري العمل' },
    { value: 'completed', label: 'مكتمل' },
    { value: 'overdue', label: 'متأخر' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">المهام</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">إدارة مهام الموظفين</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          إضافة مهمة
        </Button>
      </div>

      {/* Filters */}
      <Card padding={false} className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="البحث عن مهمة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>
          <div className="flex gap-2">
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-surface-500">لا توجد مهام</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map(task => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0" onClick={() => { setSelectedTask(task); setShowDetailsModal(true) }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && (setSelectedTask(task), setShowDetailsModal(true))}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                    <h3 className="font-semibold text-surface-900 dark:text-white truncate">
                      {task.title}
                    </h3>
                  </div>
                  {task.description && (
                    <p className="text-surface-500 dark:text-surface-400 text-sm mb-3 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-surface-500">
                    {task.assigned_to_name && <span>المسؤول: {task.assigned_to_name}</span>}
                    {task.due_date && <span>الموعد: {formatDate(task.due_date)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => { setSelectedTask(task); setShowDetailsModal(true) }} className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700" title="عرض"><Eye className="w-4 h-4 text-surface-500" /></button>
                  <button type="button" onClick={() => { setSelectedTask(task); setShowEditModal(true) }} className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700" title="تعديل"><Edit className="w-4 h-4 text-surface-500" /></button>
                  <button type="button" onClick={() => { setSelectedTask(task); setShowDeleteConfirm(true) }} className="p-1.5 rounded hover:bg-error-50 dark:hover:bg-error-900/20 text-error-600" title="حذف"><Trash2 className="w-4 h-4" /></button>
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <select value={task.status} onChange={(e) => updateStatusMutation.mutate({ id: task.id, status: e.target.value })} className="text-xs border rounded px-2 py-1 dark:bg-surface-700 dark:border-surface-600" onClick={(e) => e.stopPropagation()}>
                      <option value="pending">قيد الانتظار</option>
                      <option value="in_progress">جاري العمل</option>
                      <option value="completed">مكتمل</option>
                    </select>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة مهمة جديدة">
        <AddTaskForm onClose={() => setShowModal(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowModal(false) }} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTask(null) }} title="تعديل المهمة" size="md">
        {selectedTask && <EditTaskForm task={taskDetails || selectedTask} onClose={() => { setShowEditModal(false); setSelectedTask(null) }} updateMutation={updateMutation} />}
      </Modal>

      <Modal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setSelectedTask(null) }} title="تأكيد الحذف" size="sm">
        {selectedTask && (
          <div className="space-y-4">
            <p className="text-surface-600 dark:text-surface-400">هل أنت متأكد من حذف المهمة <strong>{selectedTask.title}</strong>؟</p>
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
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(selectedTask.status)}>{translateStatus(selectedTask.status)}</Badge>
              <Badge className={getPriorityColor(selectedTask.priority)}>{translatePriority(selectedTask.priority)}</Badge>
            </div>
            {(taskDetails?.description || selectedTask.description) && <p className="text-surface-600 dark:text-surface-400 text-sm">{(taskDetails || selectedTask).description}</p>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-surface-500">المسؤول</p><p className="font-medium">{taskDetails?.assigned_to_name || selectedTask.assigned_to_name || '-'}</p></div>
              <div><p className="text-surface-500">الموعد</p><p className="font-medium">{formatDate(taskDetails?.due_date || selectedTask.due_date) || '-'}</p></div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">إضافة تعليق</h4>
              <form onSubmit={(e) => { e.preventDefault(); if (commentText?.trim() && selectedTask.id) addCommentMutation.mutate({ id: selectedTask.id, data: { content: commentText.trim() } }); }} className="flex gap-2">
                <input type="text" className="flex-1 px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600" placeholder="اكتب تعليقاً..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                <Button type="submit" size="sm" disabled={addCommentMutation.isPending || !commentText?.trim()}>إرسال</Button>
              </form>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setShowDetailsModal(false); setShowEditModal(true) }}><Edit className="w-4 h-4 ml-1" /> تعديل</Button>
              <Button variant="danger" size="sm" onClick={() => { setShowDetailsModal(false); setShowDeleteConfirm(true) }}><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function AddTaskForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' })
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
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">العنوان</label>
        <input className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg dark:bg-surface-800" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">الوصف</label>
        <textarea rows={3} className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg dark:bg-surface-800" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">الأولوية</label>
          <select className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg dark:bg-surface-800" value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">تاريخ الاستحقاق</label>
          <input type="date" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg dark:bg-surface-800" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
      </div>
    </form>
  )
}

function EditTaskForm({ task, onClose, updateMutation }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? (task.due_date + '').slice(0, 10) : '',
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!task?.id || !form.title?.trim()) return
    updateMutation.mutate({
      id: task.id,
      data: {
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        priority: form.priority || 'medium',
        due_date: form.due_date || undefined,
      },
    })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {updateMutation.isError && <div className="p-3 rounded-lg bg-error-50 text-error-700 text-sm">{updateMutation.error?.response?.data?.error || updateMutation.error?.message}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">العنوان</label>
        <input className="w-full px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">الوصف</label>
        <textarea rows={3} className="w-full px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">الأولوية</label>
          <select className="w-full px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600" value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">تاريخ الاستحقاق</label>
          <input type="date" className="w-full px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
      </div>
    </form>
  )
}
