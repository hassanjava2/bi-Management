/**
 * Bi Management - Customers Page
 * صفحة إدارة العملاء
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Search, Plus, Phone, Mail, MapPin, Download,
  Star, ShoppingCart, CreditCard, Clock, AlertTriangle,
  Eye, Edit, Trash2, DollarSign, Receipt, History, Crown
} from 'lucide-react'
import { exportToCSV } from '../utils/helpers'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import PageShell from '../components/common/PageShell'
import SearchInput from '../components/common/SearchInput'
import FilterSelect from '../components/common/FilterSelect'
import { clsx } from 'clsx'
import { customersAPI } from '../services/api'

// مستويات العملاء
const customerTiers = {
  bronze: { label: 'برونزي', color: 'bg-amber-100 text-amber-800', min: 0 },
  silver: { label: 'فضي', color: 'bg-neutral-200 text-neutral-800', min: 5000000 },
  gold: { label: 'ذهبي', color: 'bg-yellow-100 text-yellow-800', min: 15000000 },
  platinum: { label: 'بلاتيني', color: 'bg-purple-100 text-purple-800', min: 30000000 },
}

export default function CustomersPage() {
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTier, setSelectedTier] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsTab, setDetailsTab] = useState('info')
  const [addForm, setAddForm] = useState({ name: '', phone: '', type: 'retail', address: '', credit_limit: '' })
  const [editForm, setEditForm] = useState({ name: '', phone: '', type: 'retail', address: '', credit_limit: '' })
  const [adjustBalanceForm, setAdjustBalanceForm] = useState({ amount: '', note: '' })

  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: (data) => customersAPI.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] })
      setShowAddModal(false)
      setAddForm({ name: '', phone: '', type: 'retail', address: '', credit_limit: '' })
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customersAPI.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] })
      setShowEditModal(false)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => customersAPI.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] })
      setShowDeleteConfirm(false)
      setShowDetailsModal(false)
      setSelectedCustomer(null)
    },
  })
  const adjustBalanceMutation = useMutation({
    mutationFn: ({ id, data }) => customersAPI.adjustBalance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-details', selectedCustomer?.id] })
      setAdjustBalanceForm({ amount: '', note: '' })
    },
  })

  const handleAddCustomer = (e) => {
    e.preventDefault()
    if (!addForm.name?.trim() || !addForm.phone?.trim()) return
    createMutation.mutate({
      name: addForm.name.trim(),
      phone: addForm.phone.trim(),
      type: addForm.type || 'retail',
      address: addForm.address?.trim() || undefined,
      credit_limit: addForm.credit_limit ? parseFloat(addForm.credit_limit) : 0,
    })
  }

  useEffect(() => {
    if (searchParams.get('open') === 'new') setShowAddModal(true)
  }, [searchParams])

  // جلب العملاء
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', searchTerm, selectedTier],
    queryFn: () => customersAPI.getCustomers({ search: searchTerm, tier: selectedTier }),
  })

  // جلب إحصائيات
  const { data: statsData } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: () => customersAPI.getStats(),
  })

  // تفاصيل العميل (فواتير ومعاملات) عند فتح modal التفاصيل
  const { data: invoicesData } = useQuery({
    queryKey: ['customer-invoices', selectedCustomer?.id],
    queryFn: () => customersAPI.getInvoices(selectedCustomer.id),
    enabled: !!selectedCustomer?.id && showDetailsModal,
  })
  const { data: transactionsData } = useQuery({
    queryKey: ['customer-transactions', selectedCustomer?.id],
    queryFn: () => customersAPI.getTransactions(selectedCustomer.id),
    enabled: !!selectedCustomer?.id && showDetailsModal,
  })

  const customers = customersData?.data?.data || []
  const stats = statsData?.data?.data || { total: 0, with_balance: 0, total_receivables: 0 }
  const customerInvoices = invoicesData?.data?.data || invoicesData?.data || []
  const customerTransactions = transactionsData?.data?.data || transactionsData?.data || []

  const getCustomerTier = (totalPurchases) => {
    if (totalPurchases >= 30000000) return 'platinum'
    if (totalPurchases >= 15000000) return 'gold'
    if (totalPurchases >= 5000000) return 'silver'
    return 'bronze'
  }

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer)
    setDetailsTab('info')
    setShowDetailsModal(true)
  }

  const handleEditCustomer = (e, customer) => {
    e?.stopPropagation?.()
    setSelectedCustomer(customer)
    const addr = customer.addresses ?? customer.address ?? ''
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || '',
      type: customer.type || 'retail',
      address: typeof addr === 'string' ? addr : (Array.isArray(addr) ? addr[0]?.address || '' : ''),
      credit_limit: customer.credit_limit ?? '',
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = (e) => {
    e.preventDefault()
    if (!selectedCustomer?.id || !editForm.name?.trim()) return
    updateMutation.mutate({
      id: selectedCustomer.id,
      data: {
        name: editForm.name.trim(),
        phone: editForm.phone?.trim() || undefined,
        type: editForm.type || 'retail',
        addresses: editForm.address?.trim() ? editForm.address.trim() : undefined,
        credit_limit: editForm.credit_limit ? parseFloat(editForm.credit_limit) : 0,
      },
    })
  }

  const handleDeleteClick = (e, customer) => {
    e?.stopPropagation?.()
    setSelectedCustomer(customer)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (selectedCustomer?.id) deleteMutation.mutate(selectedCustomer.id)
  }

  const handleAdjustBalance = (e) => {
    e.preventDefault()
    if (!selectedCustomer?.id || !adjustBalanceForm.amount) return
    adjustBalanceMutation.mutate({
      id: selectedCustomer.id,
      data: { amount: parseFloat(adjustBalanceForm.amount), note: adjustBalanceForm.note?.trim() || undefined },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const customerStatsItems = [
    { title: 'إجمالي العملاء', value: stats.total ?? 0, icon: Users, color: 'primary' },
    { title: 'عملاء بذمم', value: stats.with_balance ?? 0, icon: AlertTriangle, color: 'warning' },
    { title: 'إجمالي الذمم', value: `${(stats.total_receivables / 1000000 || 0).toFixed(1)}M`, icon: DollarSign, color: 'danger' },
    { title: 'VIP', value: stats.vip_count ?? 0, icon: Crown, color: 'info' },
  ]
  const tierOptions = Object.entries(customerTiers).map(([k, v]) => ({ value: k, label: v.label }))

  return (
    <PageShell
      title="إدارة العملاء"
      description="إدارة العملاء والذمم والولاء"
      actions={
        <>
          <Button variant="outline" onClick={() => exportToCSV(customers, 'customers.csv')}><Download className="w-4 h-4 ml-2" /> تصدير CSV</Button>
          <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4 ml-2" /> إضافة عميل</Button>
        </>
      }
    >
      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="إجمالي العملاء" value={stats.total ?? 0} icon={Users} color="sky" />
        <StatCard label="عملاء بذمم" value={stats.with_balance ?? 0} icon={AlertTriangle} color="amber" />
        <StatCard label="إجمالي الذمم" value={`${(stats.total_receivables / 1000000 || 0).toFixed(1)}M`} icon={DollarSign} color="red" />
        <StatCard label="VIP" value={stats.vip_count ?? 0} icon={Crown} color="purple" />
      </div>

      <PageShell.Toolbar>
        <SearchInput placeholder="بحث بالاسم أو الهاتف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <FilterSelect options={tierOptions} value={selectedTier === 'all' ? null : selectedTier} onChange={(v) => setSelectedTier(v ?? 'all')} placeholder="كل المستويات" />
      </PageShell.Toolbar>

      {/* Customers Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-700/50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">الهاتف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">المستوى</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">المشتريات</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">الرصيد</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">آخر شراء</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-neutral-500">
                    لا يوجد عملاء
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const tier = customerTiers[getCustomerTier(customer.total_purchases)] || customerTiers.bronze
                  return (
                    <tr key={customer.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                            <span className="font-medium text-primary-600">
                              {customer.name?.charAt(0) || 'ع'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">{customer.name}</p>
                            <p className="text-sm text-neutral-500">{customer.type === 'wholesale' ? 'جملة' : 'مفرد'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-neutral-400" />
                          <span>{customer.phone || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tier.color}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{(customer.total_purchases || 0).toLocaleString()}</p>
                          <p className="text-xs text-neutral-500">{customer.purchase_count || 0} فاتورة</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${(customer.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {Math.abs(customer.balance || 0).toLocaleString()}
                          {(customer.balance || 0) > 0 && <span className="text-xs mr-1">علينا</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-500">
                        {customer.last_purchase ? new Date(customer.last_purchase).toLocaleDateString('ar-IQ') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewCustomer(customer)}
                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                            title="عرض"
                          >
                            <Eye className="w-4 h-4 text-neutral-500" />
                          </button>
                          <button
                            onClick={(e) => handleEditCustomer(e, customer)}
                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4 text-neutral-500" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(e, customer)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="إضافة عميل جديد"
        size="md"
      >
        <form className="space-y-4" onSubmit={handleAddCustomer}>
          {createMutation.isError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              {createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ'}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">اسم العميل</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الهاتف</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع العميل</label>
              <select
                className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
                value={addForm.type}
                onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="retail">مفرد</option>
                <option value="wholesale">جملة</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
              value={addForm.address}
              onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">حد الائتمان</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
              placeholder="0"
              value={addForm.credit_limit}
              onChange={(e) => setAddForm((f) => ({ ...f, credit_limit: e.target.value }))}
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

      {/* Edit Customer Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="تعديل العميل"
        size="md"
      >
        <form className="space-y-4" onSubmit={handleSaveEdit}>
          {updateMutation.isError && (
            <div className="p-3 rounded-lg bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 text-sm">
              {updateMutation.error?.response?.data?.error || updateMutation.error?.message || 'حدث خطأ'}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">اسم العميل</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الهاتف</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع العميل</label>
              <select
                className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
                value={editForm.type}
                onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="retail">مفرد</option>
                <option value="wholesale">جملة</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
              value={editForm.address}
              onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">حد الائتمان</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
              value={editForm.credit_limit}
              onChange={(e) => setEditForm((f) => ({ ...f, credit_limit: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>إلغاء</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="تأكيد الحذف"
        size="sm"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <p className="text-neutral-600 dark:text-neutral-400">
              هل أنت متأكد من حذف العميل <strong>{selectedCustomer.name}</strong>؟ لا يمكن التراجع.
            </p>
            {deleteMutation.isError && (
              <div className="p-3 rounded-lg bg-error-50 dark:bg-error-900/20 text-error-700 text-sm">
                {deleteMutation.error?.response?.data?.error || deleteMutation.error?.message}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>إلغاء</Button>
              <Button variant="danger" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={selectedCustomer ? `تفاصيل: ${selectedCustomer.name}` : ''}
        size="lg"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
              {['info', 'invoices', 'transactions', 'balance'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDetailsTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${detailsTab === tab
                      ? 'bg-primary-600 text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                >
                  {tab === 'info' && 'البيانات'}
                  {tab === 'invoices' && 'الفواتير'}
                  {tab === 'transactions' && 'المعاملات'}
                  {tab === 'balance' && 'تعديل الرصيد'}
                </button>
              ))}
            </div>
            {detailsTab === 'info' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">الهاتف</p>
                  <p className="font-medium">{selectedCustomer.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">العنوان</p>
                  <p className="font-medium">{selectedCustomer.addresses || selectedCustomer.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">إجمالي المشتريات</p>
                  <p className="font-medium">{(selectedCustomer.total_purchases || 0).toLocaleString()} د.ع</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">الرصيد الحالي</p>
                  <p className={`font-bold ${(selectedCustomer.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Math.abs(selectedCustomer.balance || 0).toLocaleString()} د.ع
                  </p>
                </div>
                <div className="col-span-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowDetailsModal(false); handleEditCustomer(null, selectedCustomer); setShowEditModal(true); }}>
                    <Edit className="w-4 h-4 ml-1" /> تعديل
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => { setShowDetailsModal(false); handleDeleteClick(null, selectedCustomer); setShowDeleteConfirm(true); }}>
                    <Trash2 className="w-4 h-4 ml-1" /> حذف
                  </Button>
                </div>
              </div>
            )}
            {detailsTab === 'invoices' && (
              <div className="max-h-64 overflow-y-auto">
                {customerInvoices.length === 0 ? (
                  <p className="text-neutral-500 text-center py-4">لا توجد فواتير</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2">رقم الفاتورة</th>
                        <th className="text-right py-2">التاريخ</th>
                        <th className="text-right py-2">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-neutral-100">
                          <td className="py-2">{inv.invoice_number || inv.id}</td>
                          <td className="py-2">{inv.created_at ? new Date(inv.created_at).toLocaleDateString('ar-IQ') : '-'}</td>
                          <td className="py-2">{(inv.total || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {detailsTab === 'transactions' && (
              <div className="max-h-64 overflow-y-auto">
                {customerTransactions.length === 0 ? (
                  <p className="text-neutral-500 text-center py-4">لا توجد معاملات</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2">النوع</th>
                        <th className="text-right py-2">التاريخ</th>
                        <th className="text-right py-2">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerTransactions.map((tr, i) => (
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
            {detailsTab === 'balance' && (
              <form onSubmit={handleAdjustBalance} className="space-y-4">
                <p className="text-sm text-neutral-500">الرصيد الحالي: <strong className="text-neutral-900 dark:text-white">{(selectedCustomer.balance || 0).toLocaleString()} د.ع</strong></p>
                <div>
                  <label className="block text-sm font-medium mb-1">المبلغ (موجب = إضافة للذمة، سالب = خصم)</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
                    placeholder="0"
                    value={adjustBalanceForm.amount}
                    onChange={(e) => setAdjustBalanceForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ملاحظة</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-600"
                    value={adjustBalanceForm.note}
                    onChange={(e) => setAdjustBalanceForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>
                {adjustBalanceMutation.isError && (
                  <p className="text-sm text-error-600">{adjustBalanceMutation.error?.response?.data?.error || adjustBalanceMutation.error?.message}</p>
                )}
                <Button type="submit" disabled={adjustBalanceMutation.isPending || !adjustBalanceForm.amount}>
                  {adjustBalanceMutation.isPending ? 'جاري...' : 'تسجيل التعديل'}
                </Button>
              </form>
            )}
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
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
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
