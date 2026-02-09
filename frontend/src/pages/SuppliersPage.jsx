/**
 * Bi Management - Suppliers Page
 * صفحة إدارة الموردين
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Building2, Search, Plus, Phone, Mail, MapPin, Download,
  Star, TrendingUp, Package, Clock, AlertTriangle,
  Eye, Edit, Trash2, DollarSign, Receipt, History
} from 'lucide-react'
import { exportToCSV } from '../utils/helpers'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { suppliersAPI } from '../services/api'

export default function SuppliersPage() {
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsTab, setDetailsTab] = useState('info')
  const [addForm, setAddForm] = useState({ name: '', contact_person: '', type: 'company', phone: '', phone2: '', address: '', notes: '' })
  const [editForm, setEditForm] = useState({ name: '', contact_person: '', type: 'company', phone: '', phone2: '', address: '', notes: '' })

  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: (data) => suppliersAPI.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setShowAddModal(false)
      setAddForm({ name: '', contact_person: '', type: 'company', phone: '', phone2: '', address: '', notes: '' })
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => suppliersAPI.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setShowEditModal(false)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => suppliersAPI.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setShowDeleteConfirm(false)
      setShowDetailsModal(false)
      setSelectedSupplier(null)
    },
  })

  const handleAddSupplier = (e) => {
    e.preventDefault()
    if (!addForm.name?.trim()) return
    createMutation.mutate({
      name: addForm.name.trim(),
      contact_person: addForm.contact_person?.trim() || undefined,
      type: addForm.type || 'company',
      phone: addForm.phone?.trim() || undefined,
      phone2: addForm.phone2?.trim() || undefined,
      address: addForm.address?.trim() || undefined,
      notes: addForm.notes?.trim() || undefined,
    })
  }

  useEffect(() => {
    if (searchParams.get('open') === 'new') setShowAddModal(true)
  }, [searchParams])

  // جلب الموردين
  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers', searchTerm],
    queryFn: () => suppliersAPI.getSuppliers({ search: searchTerm }),
  })

  const { data: transactionsData } = useQuery({
    queryKey: ['supplier-transactions', selectedSupplier?.id],
    queryFn: () => suppliersAPI.getTransactions(selectedSupplier.id),
    enabled: !!selectedSupplier?.id && showDetailsModal,
  })
  const { data: returnsData } = useQuery({
    queryKey: ['supplier-returns', selectedSupplier?.id],
    queryFn: () => suppliersAPI.getReturns(selectedSupplier.id),
    enabled: !!selectedSupplier?.id && showDetailsModal,
  })
  const { data: supplierStatsData } = useQuery({
    queryKey: ['supplier-stats', selectedSupplier?.id],
    queryFn: () => suppliersAPI.getStats(selectedSupplier.id),
    enabled: !!selectedSupplier?.id && showDetailsModal,
  })

  const suppliers = suppliersData?.data?.data || []
  const supplierTransactions = transactionsData?.data?.data || transactionsData?.data || []
  const supplierReturns = returnsData?.data?.data || returnsData?.data || []
  const supplierStats = supplierStatsData?.data?.data || supplierStatsData?.data || {}

  const handleViewSupplier = (supplier) => {
    setSelectedSupplier(supplier)
    setDetailsTab('info')
    setShowDetailsModal(true)
  }

  const handleEditSupplier = (e, supplier) => {
    e?.stopPropagation?.()
    setSelectedSupplier(supplier)
    setEditForm({
      name: supplier.name || '',
      contact_person: supplier.contact_person || '',
      type: supplier.type || 'company',
      phone: supplier.phone || '',
      phone2: supplier.phone2 || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = (e) => {
    e.preventDefault()
    if (!selectedSupplier?.id || !editForm.name?.trim()) return
    updateMutation.mutate({
      id: selectedSupplier.id,
      data: {
        name: editForm.name.trim(),
        contact_person: editForm.contact_person?.trim() || undefined,
        type: editForm.type || 'company',
        phone: editForm.phone?.trim() || undefined,
        phone2: editForm.phone2?.trim() || undefined,
        address: editForm.address?.trim() || undefined,
        notes: editForm.notes?.trim() || undefined,
      },
    })
  }

  const handleDeleteClick = (e, supplier) => {
    e?.stopPropagation?.()
    setSelectedSupplier(supplier)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (selectedSupplier?.id) deleteMutation.mutate(selectedSupplier.id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary-600" />
            إدارة الموردين
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            إدارة الموردين ومراكز الصيانة
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportToCSV(suppliers, 'suppliers.csv')}>
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مورد
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف..."
          className="w-full pr-10 pl-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((supplier) => (
          <div 
            key={supplier.id}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">{supplier.name}</h3>
                  <p className="text-sm text-neutral-500">{supplier.contact_person || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium">{supplier.rating || '4.5'}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{supplier.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{supplier.address || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg text-center text-sm mb-4">
              <div>
                <p className="font-bold text-neutral-900 dark:text-white">{supplier.total_purchases || 0}</p>
                <p className="text-xs text-neutral-500">مشتريات</p>
              </div>
              <div>
                <p className="font-bold text-amber-600">{supplier.pending_returns || 0}</p>
                <p className="text-xs text-neutral-500">مرتجعات</p>
              </div>
              <div>
                <p className={`font-bold ${(supplier.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(supplier.balance || 0).toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500">{(supplier.balance || 0) >= 0 ? 'لنا' : 'علينا'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewSupplier(supplier)}>
                <Eye className="w-4 h-4 ml-1" />
                تفاصيل
              </Button>
              <Button variant="outline" size="sm" onClick={(e) => handleEditSupplier(e, supplier)} title="تعديل">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="danger" size="sm" onClick={(e) => handleDeleteClick(e, supplier)} title="حذف">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {suppliers.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          لا يوجد موردين مسجلين
        </div>
      )}

      {/* Add Supplier Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="إضافة مورد جديد"
        size="md"
      >
        <form className="space-y-4" onSubmit={handleAddSupplier}>
          {createMutation.isError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              {createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ'}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">اسم المورد / الشركة</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
              placeholder="مثل: العربي للحاسبات"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الشخص المسؤول</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
                placeholder="الاسم"
                value={addForm.contact_person}
                onChange={(e) => setAddForm((f) => ({ ...f, contact_person: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع المورد</label>
              <select
                className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
                value={addForm.type}
                onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="company">شركة</option>
                <option value="individual">فرد</option>
                <option value="repair">مركز صيانة</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الهاتف</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
                placeholder="07XXXXXXXXX"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">هاتف 2</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
                placeholder="اختياري"
                value={addForm.phone2}
                onChange={(e) => setAddForm((f) => ({ ...f, phone2: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
              placeholder="العنوان الكامل"
              value={addForm.address}
              onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea
              rows="2"
              className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
              placeholder="أي ملاحظات..."
              value={addForm.notes}
              onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="تعديل المورد" size="md">
        <form className="space-y-4" onSubmit={handleSaveEdit}>
          {updateMutation.isError && (
            <div className="p-3 rounded-lg bg-error-50 dark:bg-error-900/20 text-error-700 text-sm">
              {updateMutation.error?.response?.data?.error || updateMutation.error?.message}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">اسم المورد / الشركة</label>
            <input type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الشخص المسؤول</label>
              <input type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={editForm.contact_person} onChange={(e) => setEditForm((f) => ({ ...f, contact_person: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع المورد</label>
              <select className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="company">شركة</option>
                <option value="individual">فرد</option>
                <option value="repair">مركز صيانة</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الهاتف</label>
              <input type="tel" className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">هاتف 2</label>
              <input type="tel" className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={editForm.phone2} onChange={(e) => setEditForm((f) => ({ ...f, phone2: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea rows="2" className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600" value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>إلغاء</Button>
            <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="تأكيد الحذف" size="sm">
        {selectedSupplier && (
          <div className="space-y-4">
            <p className="text-neutral-600 dark:text-neutral-400">هل أنت متأكد من حذف المورد <strong>{selectedSupplier.name}</strong>؟</p>
            {deleteMutation.isError && <div className="p-3 rounded-lg bg-error-50 text-error-700 text-sm">{deleteMutation.error?.response?.data?.error || deleteMutation.error?.message}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>إلغاء</Button>
              <Button variant="danger" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Supplier Details Modal */}
      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title={selectedSupplier ? `تفاصيل: ${selectedSupplier.name}` : ''} size="lg">
        {selectedSupplier && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
              {['info', 'transactions', 'returns', 'stats'].map((tab) => (
                <button key={tab} type="button" onClick={() => setDetailsTab(tab)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${detailsTab === tab ? 'bg-primary-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                  {tab === 'info' && 'البيانات'}
                  {tab === 'transactions' && 'المعاملات'}
                  {tab === 'returns' && 'المرتجعات'}
                  {tab === 'stats' && 'إحصائيات'}
                </button>
              ))}
            </div>
            {detailsTab === 'info' && (
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-neutral-500">الشخص المسؤول</p><p className="font-medium">{selectedSupplier.contact_person || '-'}</p></div>
                <div><p className="text-sm text-neutral-500">الهاتف</p><p className="font-medium">{selectedSupplier.phone || '-'}</p></div>
                <div><p className="text-sm text-neutral-500">العنوان</p><p className="font-medium">{selectedSupplier.address || '-'}</p></div>
                <div><p className="text-sm text-neutral-500">الرصيد</p><p className={`font-bold ${(selectedSupplier.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.abs(selectedSupplier.balance || 0).toLocaleString()} د.ع</p></div>
                <div className="col-span-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowDetailsModal(false); handleEditSupplier(null, selectedSupplier); setShowEditModal(true); }}><Edit className="w-4 h-4 ml-1" /> تعديل</Button>
                  <Button variant="danger" size="sm" onClick={() => { setShowDetailsModal(false); handleDeleteClick(null, selectedSupplier); setShowDeleteConfirm(true); }}><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
                </div>
              </div>
            )}
            {detailsTab === 'transactions' && (
              <div className="max-h-64 overflow-y-auto">
                {supplierTransactions.length === 0 ? <p className="text-neutral-500 text-center py-4">لا توجد معاملات</p> : (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-right py-2">النوع</th><th className="text-right py-2">التاريخ</th><th className="text-right py-2">المبلغ</th></tr></thead>
                    <tbody>
                      {supplierTransactions.map((tr, i) => (
                        <tr key={tr.id || i} className="border-b border-neutral-100">
                          <td className="py-2">{tr.type || tr.description || '-'}</td>
                          <td className="py-2">{tr.created_at ? new Date(tr.created_at).toLocaleDateString('ar-IQ') : '-'}</td>
                          <td className="py-2">{(tr.amount || tr.total || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {detailsTab === 'returns' && (
              <div className="max-h-64 overflow-y-auto">
                {supplierReturns.length === 0 ? <p className="text-neutral-500 text-center py-4">لا توجد مرتجعات</p> : (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-right py-2">رقم المرتجع</th><th className="text-right py-2">التاريخ</th><th className="text-right py-2">الحالة</th></tr></thead>
                    <tbody>
                      {supplierReturns.map((r) => (
                        <tr key={r.id} className="border-b border-neutral-100">
                          <td className="py-2">{r.return_number || r.id}</td>
                          <td className="py-2">{r.created_at ? new Date(r.created_at).toLocaleDateString('ar-IQ') : '-'}</td>
                          <td className="py-2">{r.status || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {detailsTab === 'stats' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"><p className="text-sm text-neutral-500">إجمالي المشتريات</p><p className="font-bold">{(supplierStats.total_purchases || selectedSupplier.total_purchases || 0).toLocaleString()}</p></div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"><p className="text-sm text-neutral-500">المرتجعات</p><p className="font-bold text-amber-600">{supplierStats.total_returns ?? supplierStats.pending_returns ?? 0}</p></div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"><p className="text-sm text-neutral-500">المعلقة</p><p className="font-bold">{supplierStats.pending_returns ?? 0}</p></div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"><p className="text-sm text-neutral-500">التقييم</p><p className="font-bold">{supplierStats.quality_score ?? selectedSupplier.rating ?? '-'}</p></div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
