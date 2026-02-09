/**
 * Bi Management - Sales Page
 * صفحة المبيعات والفواتير بكل أنواعها
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Receipt, Plus, Search, Filter, Download, Eye, Edit,
  Printer, CreditCard, Wallet, Building2, Clock, CheckCircle2,
  XCircle, Truck, RefreshCw, ArrowLeftRight, Package, User,
  Calendar, TrendingUp, DollarSign, ShoppingCart, BarChart3
} from 'lucide-react'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { salesAPI, inventoryAPI, customersAPI, suppliersAPI } from '../services/api'
import { exportToCSV } from '../utils/helpers'

// أنواع الفواتير
const invoiceTypes = {
  sale: { label: 'بيع نقدي', color: 'bg-green-100 text-green-800', icon: Wallet },
  sale_credit: { label: 'بيع آجل', color: 'bg-blue-100 text-blue-800', icon: Clock },
  sale_installment: { label: 'بيع أقساط', color: 'bg-purple-100 text-purple-800', icon: CreditCard },
  sale_wholesale: { label: 'بيع جملة', color: 'bg-indigo-100 text-indigo-800', icon: Building2 },
  sale_return: { label: 'مرتجع بيع', color: 'bg-red-100 text-red-800', icon: RefreshCw },
  purchase: { label: 'شراء', color: 'bg-amber-100 text-amber-800', icon: ShoppingCart },
  purchase_return: { label: 'مرتجع شراء', color: 'bg-orange-100 text-orange-800', icon: RefreshCw },
  exchange_same: { label: 'استبدال (نفس الموديل)', color: 'bg-cyan-100 text-cyan-800', icon: ArrowLeftRight },
  exchange_different: { label: 'استبدال (موديل مختلف)', color: 'bg-teal-100 text-teal-800', icon: ArrowLeftRight },
  trade_in: { label: 'شراء + بيع', color: 'bg-pink-100 text-pink-800', icon: ArrowLeftRight },
}

// حالات الفاتورة
const invoiceStatuses = {
  draft: { label: 'مسودة', color: 'bg-surface-100 text-surface-800' },
  confirmed: { label: 'مؤكدة', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'قيد التجهيز', color: 'bg-yellow-100 text-yellow-800' },
  shipped: { label: 'تم الشحن', color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'تم التوصيل', color: 'bg-green-100 text-green-800' },
  completed: { label: 'مكتملة', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'ملغية', color: 'bg-red-100 text-red-800' },
  returned: { label: 'مرتجعة', color: 'bg-orange-100 text-orange-800' },
}

// منصات الأقساط
const installmentPlatforms = {
  aqsaty: { name: 'أقساطي', fee: '15%', downPayment: '11.5%', logo: '💳' },
  jenny: { name: 'جني (SuperKey)', fee: '11.5%', downPayment: '0%', logo: '🏦' },
}

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState('invoices') // invoices, new, stats
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false)
  const [newInvoiceType, setNewInvoiceType] = useState('sale')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showReportsPanel, setShowReportsPanel] = useState(false)
  const queryClient = useQueryClient()

  const openInvoiceDetails = (invoice) => {
    setSelectedInvoiceId(invoice?.id ?? invoice)
    setShowDetailsModal(true)
  }
  const openCancelModal = (invoice) => {
    setSelectedInvoiceId(invoice?.id ?? invoice)
    setShowCancelModal(true)
    setShowDetailsModal(false)
  }

  // جلب الفواتير
  const { data: invoicesData, isLoading, error: invoicesError } = useQuery({
    queryKey: ['invoices', searchTerm, selectedType, selectedStatus, dateRange],
    queryFn: () => salesAPI.getInvoices({ 
      search: searchTerm, 
      type: selectedType !== 'all' ? selectedType : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      ...dateRange
    }),
    retry: 1,
    staleTime: 30000,
  })

  // جلب إحصائيات المبيعات
  const { data: statsData, error: statsError } = useQuery({
    queryKey: ['sales-stats'],
    queryFn: () => salesAPI.getStats(),
    retry: 1,
    staleTime: 60000,
  })

  // البيانات تأتي بصيغة { data: { invoices: [], pagination: {} } }
  const invoices = invoicesData?.data?.data?.invoices || invoicesData?.data?.invoices || invoicesData?.data?.data || []
  const rawStats = statsData?.data?.data || statsData?.data || {}
  const stats = {
    today_sales: rawStats.today?.total || 0,
    today_count: rawStats.today?.count || 0,
    month_sales: rawStats.this_month?.total || 0,
    pending_deliveries: rawStats.pending_deliveries || 0
  }

  const handleNewInvoice = (type) => {
    setNewInvoiceType(type)
    setShowNewInvoiceModal(true)
  }

  if (isLoading && activeTab === 'invoices') {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (invoicesError || statsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p>خطأ في تحميل البيانات</p>
        <p className="text-sm">{invoicesError?.message || statsError?.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-8 h-8 text-primary-600" />
            المبيعات والفواتير
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            إدارة جميع أنواع الفواتير والمبيعات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToCSV(invoices || [], 'invoices.csv')}>
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </Button>
          <Button variant="outline" onClick={() => setShowReportsPanel((v) => !v)}>
            <BarChart3 className="w-4 h-4 ml-2" />
            التقارير
          </Button>
          <div className="relative group">
            <Button onClick={() => handleNewInvoice('sale')}>
              <Plus className="w-4 h-4 ml-2" />
              فاتورة جديدة
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions - New Invoice Types */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button 
          onClick={() => handleNewInvoice('sale')}
          className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <Wallet className="w-8 h-8 text-green-600" />
          <div className="text-right">
            <p className="font-semibold text-green-900 dark:text-green-100">بيع نقدي</p>
            <p className="text-sm text-green-600 dark:text-green-400">فاتورة فورية</p>
          </div>
        </button>
        <button 
          onClick={() => handleNewInvoice('sale_credit')}
          className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Clock className="w-8 h-8 text-blue-600" />
          <div className="text-right">
            <p className="font-semibold text-blue-900 dark:text-blue-100">بيع آجل</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">دفع لاحق</p>
          </div>
        </button>
        <button 
          onClick={() => handleNewInvoice('sale_installment')}
          className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <CreditCard className="w-8 h-8 text-purple-600" />
          <div className="text-right">
            <p className="font-semibold text-purple-900 dark:text-purple-100">أقساط</p>
            <p className="text-sm text-purple-600 dark:text-purple-400">أقساطي / جني</p>
          </div>
        </button>
        <button 
          onClick={() => handleNewInvoice('exchange_same')}
          className="flex items-center gap-3 p-4 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
        >
          <ArrowLeftRight className="w-8 h-8 text-cyan-600" />
          <div className="text-right">
            <p className="font-semibold text-cyan-900 dark:text-cyan-100">استبدال</p>
            <p className="text-sm text-cyan-600 dark:text-cyan-400">جهاز بجهاز</p>
          </div>
        </button>
        <button 
          onClick={() => handleNewInvoice('purchase')}
          className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <ShoppingCart className="w-8 h-8 text-amber-600" />
          <div className="text-right">
            <p className="font-semibold text-amber-900 dark:text-amber-100">شراء</p>
            <p className="text-sm text-amber-600 dark:text-amber-400">من مورد/زبون</p>
          </div>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400">مبيعات اليوم</p>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {(stats.today_sales || 0).toLocaleString()}
              </p>
              <p className="text-xs text-surface-500">د.ع</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400">فواتير اليوم</p>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.today_count || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400">مبيعات الشهر</p>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {(stats.month_sales / 1000000 || 0).toFixed(1)}M
              </p>
              <p className="text-xs text-surface-500">د.ع</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400">بانتظار التوصيل</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending_deliveries || 0}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-200 dark:border-surface-700">
        <nav className="flex gap-4">
          <button 
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'invoices' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            الفواتير
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'pending' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            قيد التوصيل
            <span className="mr-2 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs">
              {stats.pending_deliveries || 0}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('installments')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'installments' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            الأقساط
          </button>
        </nav>
      </div>

      {/* Filters */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث برقم الفاتورة، اسم الزبون، أو السيريال..."
                className="w-full pr-10 pl-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
            >
              <option value="all">كل الأنواع</option>
              {Object.entries(invoiceTypes).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
            >
              <option value="all">كل الحالات</option>
              {Object.entries(invoiceStatuses).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
            />
          </div>
        </div>
      )}

      {/* Invoices Table */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 dark:bg-surface-700/50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">رقم الفاتورة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">النوع</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">الزبون/المورد</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">المنتجات</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">المبلغ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">التاريخ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                {!invoices || invoices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-surface-500">
                      {isLoading ? 'جاري التحميل...' : 'لا توجد فواتير مطابقة للبحث'}
                    </td>
                  </tr>
                ) : (
                  Array.isArray(invoices) && invoices.map((invoice) => {
                    const type = invoiceTypes[invoice.type] || invoiceTypes.sale
                    const status = invoiceStatuses[invoice.status] || invoiceStatuses.draft
                    return (
                      <tr key={invoice.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-primary-600">
                            {invoice.invoice_number}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${type.color}`}>
                            <type.icon className="w-3 h-3" />
                            {type.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-surface-400" />
                            <span>{invoice.customer_name || invoice.supplier_name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-surface-400" />
                            <span>{invoice.items_count || 1} منتج</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-surface-900 dark:text-white">
                            {(invoice.total || 0).toLocaleString()}
                          </span>
                          <span className="text-xs text-surface-500 mr-1">د.ع</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-500">
                          {new Date(invoice.created_at).toLocaleDateString('ar-IQ')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openInvoiceDetails(invoice)}
                              className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                              title="تفاصيل"
                            >
                              <Eye className="w-4 h-4 text-surface-500" />
                            </button>
                            <button
                              onClick={() => openInvoiceDetails(invoice)}
                              className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                              title="طباعة"
                            >
                              <Printer className="w-4 h-4 text-surface-500" />
                            </button>
                            <button
                              onClick={() => openInvoiceDetails(invoice)}
                              className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4 text-surface-500" />
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
      )}

      {/* Installments Tab */}
      {activeTab === 'installments' && (
        <InstallmentsTab />
      )}

      {/* Invoice Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedInvoiceId(null); }}
        title="تفاصيل الفاتورة"
        size="xl"
      >
        {selectedInvoiceId && (
          <InvoiceDetailsContent
            invoiceId={selectedInvoiceId}
            onClose={() => { setShowDetailsModal(false); setSelectedInvoiceId(null); }}
            onCancel={() => openCancelModal(selectedInvoiceId)}
            onPrinted={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
          />
        )}
      </Modal>

      {/* Cancel Invoice Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setSelectedInvoiceId(null); }}
        title="إلغاء الفاتورة"
      >
        {selectedInvoiceId && (
          <CancelInvoiceForm
            invoiceId={selectedInvoiceId}
            onClose={() => { setShowCancelModal(false); setSelectedInvoiceId(null); }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['invoices'] })
              setShowCancelModal(false)
              setSelectedInvoiceId(null)
            }}
          />
        )}
      </Modal>

      {/* Reports Panel */}
      {showReportsPanel && (
        <ReportsPanel onClose={() => setShowReportsPanel(false)} />
      )}

      {/* New Invoice Modal */}
      <Modal
        isOpen={showNewInvoiceModal}
        onClose={() => setShowNewInvoiceModal(false)}
        title={`فاتورة جديدة - ${invoiceTypes[newInvoiceType]?.label || 'بيع'}`}
        size="xl"
      >
        <NewInvoiceForm type={newInvoiceType} onClose={() => setShowNewInvoiceModal(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setShowNewInvoiceModal(false) }} />
      </Modal>
    </div>
  )
}

// فورم فاتورة جديدة
function NewInvoiceForm({ type, onClose, onSuccess }) {
  const [items, setItems] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerId, setCustomerId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [installmentPlatform, setInstallmentPlatform] = useState('aqsaty')
  const [validationError, setValidationError] = useState('')
  const queryClient = useQueryClient()
  const { data: customersRes } = useQuery({ queryKey: ['customers'], queryFn: () => customersAPI.getCustomers() })
  const { data: suppliersRes } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersAPI.getSuppliers() })
  const { data: productsRes } = useQuery({ queryKey: ['inventory', 'products'], queryFn: () => inventoryAPI.getProducts() })
  const customers = customersRes?.data?.data || []
  const suppliers = suppliersRes?.data?.data || []
  const products = productsRes?.data?.data || productsRes?.data || []
  const createMutation = useMutation({
    mutationFn: (data) => salesAPI.createInvoice(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); onSuccess?.() },
  })

  const addItem = () => {
    setItems([...items, { id: Date.now(), product_id: (products[0]?.id || ''), serial: '', product: '', qty: 1, price: 0, upgrades: [] }])
  }

  const updateItem = (index, field, value) => {
    const next = items.map((it, i) => {
      if (i !== index) return it
      const updated = { ...it, [field]: value }
      if (field === 'qty') updated.qty = Number(updated.qty) || 1
      if (field === 'price') updated.price = parseFloat(updated.price) || 0
      return updated
    })
    setItems(next)
  }

  const setItemProduct = (index, productId) => {
    const p = products.find(pr => pr.id === productId)
    const next = [...items]
    next[index] = { ...next[index], product_id: productId, price: p?.price != null ? p.price : next[index].price }
    setItems(next)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + ((item.qty || 1) * (item.price || 0)), 0)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setValidationError('')
    const partyId = type === 'purchase' ? supplierId : customerId
    if (!partyId) {
      setValidationError(type === 'purchase' ? 'اختر المورد' : 'اختر الزبون')
      return
    }
    if (!items.length) {
      setValidationError('أضف منتجاً واحداً على الأقل')
      return
    }
    const total = calculateTotal()
    const payload = {
      type: type === 'purchase' ? 'purchase' : 'sale',
      customer_id: type === 'purchase' ? null : partyId,
      supplier_id: type === 'purchase' ? partyId : null,
      payment_method: paymentMethod,
      subtotal: total,
      discount_amount: 0,
      tax_amount: 0,
      total,
      paid_amount: paymentMethod === 'cash' ? total : 0,
      remaining_amount: paymentMethod === 'cash' ? 0 : total,
      items: items.length ? items.map(i => ({ product_id: i.product_id || (products[0]?.id || '1'), quantity: i.qty || 1, unit_price: i.price || 0 })) : [{ product_id: products[0]?.id || '1', quantity: 1, unit_price: 0 }],
    }
      createMutation.mutate(payload)
  }

  const displayError = validationError || (createMutation.isError ? (createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ') : '')

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {displayError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {displayError}
        </div>
      )}
      {/* Customer Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            {type === 'purchase' ? 'المورد' : 'الزبون'}
          </label>
          <select
            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
            value={type === 'purchase' ? supplierId : customerId}
            onChange={(e) => {
              const val = e.target.value
              if (type === 'purchase') { setSupplierId(val); setSelectedCustomer(suppliers.find(s => s.id === val)) }
              else { setCustomerId(val); setSelectedCustomer(customers.find(c => c.id === val)) }
            }}
          >
            <option value="">اختر...</option>
            {(type === 'purchase' ? suppliers : customers).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            طريقة الدفع
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
          >
            <option value="cash">نقدي</option>
            <option value="credit">آجل</option>
            <option value="installment">أقساط</option>
            <option value="transfer">تحويل</option>
          </select>
        </div>
      </div>

      {/* Installment Platform */}
      {paymentMethod === 'installment' && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <label className="block text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
            منصة الأقساط
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="aqsaty"
                checked={installmentPlatform === 'aqsaty'}
                onChange={(e) => setInstallmentPlatform(e.target.value)}
                className="text-purple-600"
              />
              <span>💳 أقساطي (15%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="jenny"
                checked={installmentPlatform === 'jenny'}
                onChange={(e) => setInstallmentPlatform(e.target.value)}
                className="text-purple-600"
              />
              <span>🏦 جني (11.5%)</span>
            </label>
          </div>
        </div>
      )}

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
            المنتجات
          </label>
          <Button type="button" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 ml-1" />
            إضافة منتج
          </Button>
        </div>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 dark:bg-surface-700/50">
              <tr>
                <th className="px-3 py-2 text-right text-sm font-medium text-surface-500">السيريال</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-surface-500">المنتج</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-surface-500 w-20">الكمية</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-surface-500 w-32">السعر</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-surface-500">ترقيات</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-surface-500 w-24">المجموع</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-surface-500">
                    اضغط "إضافة منتج" لإضافة منتجات للفاتورة
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="مسح أو إدخال..."
                        className="w-full px-2 py-1 border border-surface-300 dark:border-surface-600 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full px-2 py-1 border border-surface-300 dark:border-surface-600 rounded text-sm"
                        value={item.product_id || ''}
                        onChange={(e) => setItemProduct(index, e.target.value)}
                      >
                        <option value="">اختر المنتج</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name || p.product_name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.qty}
                        min="1"
                        className="w-full px-2 py-1 border border-surface-300 dark:border-surface-600 rounded text-sm text-center"
                        onChange={(e) => updateItem(index, 'qty', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full px-2 py-1 border border-surface-300 dark:border-surface-600 rounded text-sm"
                        value={item.price || ''}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button type="button" variant="outline" size="sm">
                        + ترقية
                      </Button>
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {(item.qty * item.price).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-surface-50 dark:bg-surface-700/50 rounded-lg p-4">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>المجموع الكلي:</span>
          <span className="text-primary-600">{calculateTotal().toLocaleString()} د.ع</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="button" variant="outline">
          <Printer className="w-4 h-4 ml-2" />
          معاينة
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'جاري الحفظ...' : (<><CheckCircle2 className="w-4 h-4 ml-2" /> حفظ الفاتورة</>)}
        </Button>
      </div>
    </form>
  )
}

// تفاصيل الفاتورة + طباعة + workflow
function InvoiceDetailsContent({ invoiceId, onClose, onCancel, onPrinted }) {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => salesAPI.getInvoice(invoiceId),
    enabled: !!invoiceId,
  })
  const invoice = data?.data?.invoice || data?.data
  const items = data?.data?.items || []
  const type = invoice ? (invoiceTypes[invoice.type] || invoiceTypes.sale) : null
  const status = invoice ? (invoiceStatuses[invoice.status] || invoiceStatuses.draft) : null
  const canWorkflow = invoice && ['draft', 'waiting', 'confirmed'].includes(invoice.status)
  const handleWorkflow = (action) => {
    const fn = action === 'prepare' ? salesAPI.prepareInvoice : action === 'convert' ? salesAPI.convertInvoiceToActive : (id) => salesAPI.transitionInvoice(id, {})
    fn(invoiceId).then(() => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); refetch(); onPrinted?.(); }).catch(() => {})
  }

  const handlePrint = () => {
    salesAPI.printInvoice(invoiceId).then((res) => {
      const { invoice: inv, items: its, company } = res?.data?.data || res?.data || {}
      const printWindow = window.open('', '_blank')
      if (!printWindow) return
      printWindow.document.write(`
        <!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>فاتورة ${inv?.invoice_number || ''}</title>
        <style>body{font-family:system-ui;padding:20px;max-width:800px;margin:0 auto}
        table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:right}
        .header{text-align:center;margin-bottom:24px}.total{font-weight:bold;font-size:1.2em}</style></head><body>
        <div class="header"><h2>${company?.name || 'BI'}</h2><p>${company?.address || ''} | ${company?.phone || ''}</p></div>
        <h3>فاتورة رقم: ${inv?.invoice_number || ''}</h3>
        <p>الزبون: ${inv?.customer_name || inv?.supplier_name || '-'} | التاريخ: ${inv?.created_at ? new Date(inv.created_at).toLocaleDateString('ar-IQ') : ''}</p>
        <table><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead><tbody>
        ${(its || []).map(i => `<tr><td>${i.product_name || '-'}</td><td>${i.quantity || 0}</td><td>${(i.unit_price || 0).toLocaleString()}</td><td>${((i.quantity || 0) * (i.unit_price || 0)).toLocaleString()}</td></tr>`).join('')}
        </tbody></table>
        <p class="total">الإجمالي: ${(inv?.total || 0).toLocaleString()} د.ع</p>
        </body></html>`)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.afterPrint = () => printWindow.close()
      onPrinted?.()
    }).catch(() => {})
  }

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>
  if (error || !invoice) return <p className="text-surface-500 py-4">تعذر تحميل الفاتورة.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <p className="text-sm text-surface-500">رقم الفاتورة</p>
          <p className="font-mono font-semibold text-primary-600">{invoice.invoice_number}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${type?.color}`}>
            <type?.icon className="w-3 h-3" />
            {type?.label}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status?.color}`}>{status?.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-surface-500">الزبون/المورد:</span> {invoice.customer_name || invoice.supplier_name || '-'}</div>
        <div><span className="text-surface-500">التاريخ:</span> {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('ar-IQ') : '-'}</div>
        <div><span className="text-surface-500">المبلغ:</span> <strong>{(invoice.total || 0).toLocaleString()} د.ع</strong></div>
      </div>
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-50 dark:bg-surface-700/50">
            <tr>
              <th className="px-3 py-2 text-right">المنتج</th>
              <th className="px-3 py-2 text-right">الكمية</th>
              <th className="px-3 py-2 text-right">السعر</th>
              <th className="px-3 py-2 text-right">المجموع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
            {(items || []).map((i, idx) => (
              <tr key={i.id || idx}>
                <td className="px-3 py-2">{i.product_name || '-'}</td>
                <td className="px-3 py-2">{i.quantity || 0}</td>
                <td className="px-3 py-2">{(i.unit_price || 0).toLocaleString()}</td>
                <td className="px-3 py-2">{((i.quantity || 0) * (i.unit_price || 0)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canWorkflow && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => handleWorkflow('prepare')}>تجهيز الفاتورة</Button>
          <Button variant="outline" size="sm" onClick={() => handleWorkflow('convert')}>تحويل لفعالة</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button variant="outline" onClick={handlePrint} data-print-invoice>
          <Printer className="w-4 h-4 ml-2" />
          طباعة
        </Button>
        {invoice.status !== 'cancelled' && (
          <Button variant="danger" onClick={onCancel}>
            <XCircle className="w-4 h-4 ml-2" />
            إلغاء الفاتورة
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>إغلاق</Button>
      </div>
    </div>
  )
}

// إلغاء الفاتورة مع سبب
function CancelInvoiceForm({ invoiceId, onClose, onSuccess }) {
  const [reason, setReason] = useState('')
  const cancelMutation = useMutation({
    mutationFn: (data) => salesAPI.cancelInvoice(invoiceId, data),
    onSuccess: () => onSuccess?.(),
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    cancelMutation.mutate({ reason: reason.trim() || undefined })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-surface-600 dark:text-surface-400">إلغاء الفاتورة رقم <strong>{invoiceId}</strong>. يُفضّل ذكر السبب.</p>
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">سبب الإلغاء (اختياري)</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="مثال: طلب العميل"
        />
      </div>
      {cancelMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {cancelMutation.error?.response?.data?.error || cancelMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" variant="danger" disabled={cancelMutation.isPending}>
          {cancelMutation.isPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
        </Button>
      </div>
    </form>
  )
}

// تبويب الأقساط - إحصائيات + تحويلات معلقة
function InstallmentsTab() {
  const queryClient = useQueryClient()
  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['installment-stats'],
    queryFn: () => salesAPI.getInstallmentStats(),
  })
  const { data: pendingRes, isLoading: pendingLoading } = useQuery({
    queryKey: ['installment-pending-transfers'],
    queryFn: () => salesAPI.getPendingTransfers(),
  })
  const confirmMutation = useMutation({
    mutationFn: ({ id, data }) => salesAPI.confirmTransfer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-pending-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['installment-stats'] })
    },
  })
  const stats = statsRes?.data?.data || statsRes?.data || {}
  const pendingList = Array.isArray(pendingRes?.data?.data) ? pendingRes.data.data : (Array.isArray(pendingRes?.data) ? pendingRes.data : [])
  const platformStats = stats.by_platform || stats.platforms || {}
  const defaultPlatforms = Object.entries(installmentPlatforms).map(([key, platform]) => ({
    key,
    ...platform,
    count: platformStats[key]?.count ?? platformStats[key]?.invoices_count ?? 0,
    pending: platformStats[key]?.pending ?? 0,
    total: platformStats[key]?.total ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {defaultPlatforms.map(({ key, name, logo, fee, count, pending, total }) => (
          <div key={key} className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{logo}</span>
                <div>
                  <h3 className="font-semibold text-lg">{name}</h3>
                  <p className="text-sm text-surface-500">نسبة الرفع: {fee}</p>
                </div>
              </div>
            </div>
            {statsLoading ? (
              <Spinner size="sm" />
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-surface-50 dark:bg-surface-700/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">{count ?? 0}</p>
                  <p className="text-xs text-surface-500">فواتير الشهر</p>
                </div>
                <div className="bg-surface-50 dark:bg-surface-700/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-600">{pending ?? 0}</p>
                  <p className="text-xs text-surface-500">بانتظار التحويل</p>
                </div>
                <div className="bg-surface-50 dark:bg-surface-700/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-purple-600">{(total / 1000000 || 0).toFixed(1)}M</p>
                  <p className="text-xs text-surface-500">إجمالي الشهر</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-6">
        <h3 className="font-semibold text-lg mb-4">التحويلات المنتظرة</h3>
        {pendingLoading ? (
          <Spinner size="sm" />
        ) : pendingList.length === 0 ? (
          <div className="text-center text-surface-500 py-8">لا توجد تحويلات منتظرة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 dark:bg-surface-700/50">
                <tr>
                  <th className="px-3 py-2 text-right">الفاتورة/العميل</th>
                  <th className="px-3 py-2 text-right">المبلغ</th>
                  <th className="px-3 py-2 text-right">التاريخ</th>
                  <th className="px-3 py-2 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                {pendingList.map((t) => (
                  <tr key={t.id || t.invoice_id}>
                    <td className="px-3 py-2">{t.invoice_number || t.customer_name || t.id}</td>
                    <td className="px-3 py-2">{(t.amount || t.total || 0).toLocaleString()}</td>
                    <td className="px-3 py-2">{t.date || t.created_at ? new Date(t.date || t.created_at).toLocaleDateString('ar-IQ') : '-'}</td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        onClick={() => confirmMutation.mutate({ id: t.id, data: {} })}
                        disabled={confirmMutation.isPending}
                      >
                        تأكيد التحويل
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// لوحة التقارير اليومية والشهرية
function ReportsPanel({ onClose }) {
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10))
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1)
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear())
  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['sales-daily-report', dailyDate],
    queryFn: () => salesAPI.getDailyReport(dailyDate),
    enabled: !!dailyDate,
  })
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['sales-monthly-report', monthlyMonth, monthlyYear],
    queryFn: () => salesAPI.getMonthlyReport(monthlyMonth, monthlyYear),
    enabled: !!monthlyMonth && !!monthlyYear,
  })
  const daily = dailyData?.data?.data || dailyData?.data || {}
  const monthly = monthlyData?.data?.data || monthlyData?.data || {}

  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">التقارير</h3>
        <Button variant="outline" size="sm" onClick={onClose}>إغلاق</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-2">التقرير اليومي</h4>
          <input
            type="date"
            value={dailyDate}
            onChange={(e) => setDailyDate(e.target.value)}
            className="mb-3 px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
          />
          {dailyLoading ? <Spinner size="sm" /> : (
            <div className="text-sm space-y-1">
              <p>إجمالي المبيعات: <strong>{(daily.total || daily.sales_total || 0).toLocaleString()} د.ع</strong></p>
              <p>عدد الفواتير: <strong>{daily.count || daily.invoices_count || 0}</strong></p>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-2">التقرير الشهري</h4>
          <div className="flex gap-2 mb-3">
            <select
              value={monthlyMonth}
              onChange={(e) => setMonthlyMonth(Number(e.target.value))}
              className="px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={monthlyYear}
              onChange={(e) => setMonthlyYear(Number(e.target.value))}
              className="px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {monthlyLoading ? <Spinner size="sm" /> : (
            <div className="text-sm space-y-1">
              <p>إجمالي المبيعات: <strong>{(monthly.total || monthly.sales_total || 0).toLocaleString()} د.ع</strong></p>
              <p>عدد الفواتير: <strong>{monthly.count || monthly.invoices_count || 0}</strong></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
