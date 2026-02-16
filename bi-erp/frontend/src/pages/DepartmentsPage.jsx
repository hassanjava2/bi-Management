/**
 * BI Management - Departments Page
 * صفحة إدارة الأقسام — CRUD + إحصائيات
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrAPI, usersAPI } from '../services/api'
import { Building2, Plus, Users, Edit2, Trash2, X, ChevronLeft } from 'lucide-react'

const Card = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 ${className}`}>{children}</div>
)
const Button = ({ children, variant = 'primary', className = '', ...props }) => (
    <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${variant === 'outline' ? 'border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700' : variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-sky-600 text-white hover:bg-sky-700'} ${className}`} {...props}>{children}</button>
)

export default function DepartmentsPage() {
    const qc = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)
    const [selected, setSelected] = useState(null)

    const { data: departments = [], isLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: () => hrAPI.getDepartments().then(r => r.data?.data || []),
    })
    const { data: managers = [] } = useQuery({
        queryKey: ['users-managers'],
        queryFn: () => usersAPI.getAll({ role: 'manager' }).then(r => r.data?.data || []),
    })
    const { data: detail } = useQuery({
        queryKey: ['department', selected],
        queryFn: () => hrAPI.getDepartment(selected).then(r => r.data?.data),
        enabled: !!selected,
    })

    const createMut = useMutation({
        mutationFn: (data) => hrAPI.createDepartment(data),
        onSuccess: () => { qc.invalidateQueries(['departments']); setShowForm(false) },
    })
    const updateMut = useMutation({
        mutationFn: ({ id, data }) => hrAPI.updateDepartment(id, data),
        onSuccess: () => { qc.invalidateQueries(['departments']); setEditing(null) },
    })
    const deleteMut = useMutation({
        mutationFn: (id) => hrAPI.deleteDepartment(id),
        onSuccess: () => { qc.invalidateQueries(['departments']); setSelected(null) },
    })

    if (selected && detail) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelected(null)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{detail.name}</h1>
                        {detail.name_en && <p className="text-sm text-neutral-500">{detail.name_en}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4"><div className="text-sm text-neutral-500">المدير</div><div className="font-medium mt-1">{detail.manager_name || 'غير محدد'}</div></Card>
                    <Card className="p-4"><div className="text-sm text-neutral-500">الموظفين</div><div className="font-medium mt-1">{detail.employees?.length || 0}</div></Card>
                    <Card className="p-4"><div className="text-sm text-neutral-500">الوصف</div><div className="font-medium mt-1">{detail.description || '—'}</div></Card>
                </div>
                {detail.employees?.length > 0 && (
                    <Card className="p-3">
                        <h3 className="font-medium mb-3 text-neutral-700 dark:text-neutral-300">الموظفين</h3>
                        <div className="space-y-2">
                            {detail.employees.map(e => (
                                <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                    <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 font-medium text-sm">
                                        {e.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{e.full_name}</div>
                                        <div className="text-xs text-neutral-500">{e.email}</div>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-700">{e.role}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">الأقسام</h1>
                        <p className="text-sm text-neutral-500">{departments.length} قسم</p>
                    </div>
                </div>
                <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 ml-1 inline" /> إضافة قسم</Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-neutral-500">جاري التحميل...</div>
            ) : departments.length === 0 ? (
                <Card className="p-12 text-center">
                    <Building2 className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                    <p className="text-neutral-500">لا توجد أقسام بعد</p>
                    <Button className="mt-4" onClick={() => setShowForm(true)}>إضافة أول قسم</Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map(d => (
                        <Card key={d.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(d.id)}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-sky-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 dark:text-white">{d.name}</h3>
                                        {d.name_en && <p className="text-xs text-neutral-500">{d.name_en}</p>}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setEditing(d) }} className="p-1.5 text-neutral-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm('حذف القسم؟')) deleteMut.mutate(d.id) }} className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-sm text-neutral-500">
                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {d.employee_count || 0} موظف</span>
                                {d.manager_name && <span>مدير: {d.manager_name}</span>}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showForm || editing) && (
                <DeptForm dept={editing} managers={managers} departments={departments}
                    onClose={() => { setShowForm(false); setEditing(null) }}
                    onSubmit={(data) => editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data)}
                    loading={createMut.isPending || updateMut.isPending}
                    error={createMut.error || updateMut.error} />
            )}
        </div>
    )
}

function DeptForm({ dept, managers, departments, onClose, onSubmit, loading, error }) {
    const [form, setForm] = useState({
        name: dept?.name || '', name_en: dept?.name_en || '', description: dept?.description || '',
        manager_id: dept?.manager_id || '', parent_id: dept?.parent_id || '',
    })
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">{dept ? 'تعديل القسم' : 'إضافة قسم جديد'}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"><X className="w-5 h-5" /></button>
                </div>
                {error && <div className="p-3 mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">{error?.response?.data?.error || error?.message}</div>}
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-3">
                    <div><label className="block text-sm font-medium mb-1">اسم القسم *</label>
                        <input className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                    <div><label className="block text-sm font-medium mb-1">الاسم بالإنجليزي</label>
                        <input className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
                    <div><label className="block text-sm font-medium mb-1">الوصف</label>
                        <textarea className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                    <div><label className="block text-sm font-medium mb-1">المدير</label>
                        <select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}>
                            <option value="">— اختر —</option>
                            {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                        </select></div>
                    <div><label className="block text-sm font-medium mb-1">القسم الأعلى</label>
                        <select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700" value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
                            <option value="">— لا يوجد —</option>
                            {departments.filter(d => d.id !== dept?.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select></div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                        <Button variant="outline" type="button" onClick={onClose}>إلغاء</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'جاري الحفظ...' : 'حفظ'}</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
