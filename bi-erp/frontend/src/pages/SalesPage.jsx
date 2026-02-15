/**
 * BI Management - Sales Page (Premium Redesign)
 * صفحة المبيعات والفواتير — تصميم متطور
 */
import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Receipt, Plus, Download, Eye, Printer, Trash2,
  Truck, TrendingUp, DollarSign, BarChart3, Wallet,
  ShoppingCart, CreditCard, ArrowLeftRight, Clock,
  Building2, RefreshCw, ChevronDown, Search, Calendar,
  FileText, Filter, X, ScanBarcode
} from 'lucide-react'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import PageShell from '../components/common/PageShell'
import { invoiceTypes, invoiceStatuses } from '../components/sales/salesConstants'
import NewInvoiceForm from '../components/sales/NewInvoiceForm'
import InvoiceDetailsContent from '../components/sales/InvoiceDetailsContent'
import CancelInvoiceForm from '../components/sales/CancelInvoiceForm'
import InstallmentsTab from '../components/sales/InstallmentsTab'
import ReportsPanel from '../components/sales/ReportsPanel'
import { salesAPI } from '../services/api'
import { exportToCSV } from '../utils/helpers'

const quickInvoiceTypes = [
  { type: 'sale', label: 'بيع نقدي', icon: Wallet, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/25' },
  { type: 'sale_credit', label: 'بيع آجل', icon: Clock, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/25' },
  { type: 'sale_installment', label: 'أقساط', icon: CreditCard, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/25' },
  { type: 'sale_wholesale', label: 'جملة', icon: Building2, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/25' },
  { type: 'purchase', label: 'شراء', icon: ShoppingCart, gradient: 'from-cyan-500 to-teal-600', shadow: 'shadow-cyan-500/25' },
  { type: 'exchange_same', label: 'استبدال', icon: ArrowLeftRight, gradient: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/25' },
]

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState('invoices')
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
  const [showFilters, setShowFilters] = useState(false)
  const queryClient = useQueryClient()

  const openInvoiceDetails = (invoice) => { setSelectedInvoiceId(invoice?.id ?? invoice); setShowDetailsModal(true) }
  const openCancelModal = (invoice) => { setSelectedInvoiceId(invoice?.id ?? invoice); setShowCancelModal(true); setShowDetailsModal(false) }
  const handleNewInvoice = useCallback((type) => { setNewInvoiceType(type); setShowNewInvoiceModal(true) }, [])

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', searchTerm, selectedType, selectedStatus, dateRange],
    queryFn: () => salesAPI.getInvoices({ search: searchTerm, type: selectedType !== 'all' ? selectedType : 'sale', status: selectedStatus !== 'all' ? selectedStatus : undefined, ...dateRange }),
    retry: 1, staleTime: 30000,
  })
  const { data: statsData } = useQuery({
    queryKey: ['sales-stats'], queryFn: () => salesAPI.getStats(), retry: 1, staleTime: 60000,
  })

  const invoices = invoicesData?.data?.data?.invoices || invoicesData?.data?.invoices || invoicesData?.data?.data || []
  const rawStats = statsData?.data?.data || statsData?.data || {}
  const stats = {
    today_sales: rawStats.today?.total || 0,
    today_count: rawStats.today?.count || 0,
    month_sales: rawStats.this_month?.total || 0,
    pending_deliveries: rawStats.pending_deliveries || 0,
  }

  const tabs = [
    { id: 'invoices', label: 'الفواتير', icon: Receipt },
    { id: 'pending', label: 'قيد التوصيل', icon: Truck, badge: stats.pending_deliveries },
    { id: 'installments', label: 'الأقساط', icon: CreditCard },
  ]

  return (
    <PageShell title="المبيعات والفواتير" description="إدارة جميع أنواع الفواتير والمبيعات" actions={<>
      <Button variant="outline" onClick={() => exportToCSV(invoices || [], 'invoices.csv')}><Download className="w-4 h-4 ml-2" /> تصدير</Button>
      <Button variant="outline" onClick={() => setShowReportsPanel((v) => !v)}><BarChart3 className="w-4 h-4 ml-2" /> التقارير</Button>
    </>}>

      {/* Quick Stats Row — Premium Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCardPremium
          title="مبيعات اليوم"
          value={stats.today_sales}
          format="currency"
          icon={DollarSign}
          gradient="from-emerald-500 to-green-600"
        />
        <StatCardPremium
          title="فواتير اليوم"
          value={stats.today_count}
          icon={Receipt}
          gradient="from-blue-500 to-indigo-600"
        />
        <StatCardPremium
          title="مبيعات الشهر"
          value={stats.month_sales}
          format="million"
          icon={TrendingUp}
          gradient="from-violet-500 to-purple-600"
        />
        <StatCardPremium
          title="بانتظار التوصيل"
          value={stats.pending_deliveries}
          icon={Truck}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* Quick Invoice Type Buttons — The Star Feature */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
            <Plus className="w-4 h-4" /> فاتورة جديدة سريعة
          </h3>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickInvoiceTypes.map((qt) => (
            <button
              key={qt.type}
              type="button"
              onClick={() => handleNewInvoice(qt.type)}
              className={`group relative overflow-hidden rounded-2xl p-4 text-white transition-all duration-300 hover:scale-[1.04] hover:shadow-xl active:scale-[0.97] bg-gradient-to-br ${qt.gradient} ${qt.shadow}`}
              style={{ boxShadow: 'var(--shadow)' }}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
              <qt.icon className="w-6 h-6 mb-2 mx-auto drop-shadow" />
              <p className="text-xs font-bold text-center leading-tight">{qt.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 mb-4">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all ${activeTab === t.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.badge ? <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-bold">{t.badge}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'invoices' && (
        <>
          {/* Search + Filters — Premium Bar */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 p-4 mb-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="بحث برقم الفاتورة، اسم الزبون، أو السيريال..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFilters
                    ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/20 dark:border-primary-700 dark:text-primary-400'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                  }`}
              >
                <Filter className="w-4 h-4" />
                فلاتر
                {(selectedType !== 'all' || selectedStatus !== 'all' || dateRange.from || dateRange.to) && (
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                )}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 animate-slide-up">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">نوع الفاتورة</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm"
                  >
                    <option value="all">الكل</option>
                    {Object.entries(invoiceTypes).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">الحالة</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm"
                  >
                    <option value="all">الكل</option>
                    {Object.entries(invoiceStatuses).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">من تاريخ</label>
                  <input type="date" value={dateRange.from} onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">إلى تاريخ</label>
                  <input type="date" value={dateRange.to} onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Invoices Table — Premium */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-800/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700">
                    <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">الفاتورة</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">النوع</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">الزبون</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">المبلغ</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">الحالة</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">التاريخ</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                  {isLoading ? (
                    <tr><td colSpan={7} className="py-12 text-center"><Spinner size="md" /></td></tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <Receipt className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                        <p className="text-neutral-500 font-medium">لا توجد فواتير</p>
                        <p className="text-neutral-400 text-xs mt-1">أنشئ فاتورة جديدة من الأزرار أعلاه</p>
                      </td>
                    </tr>
                  ) : invoices.map((row) => {
                    const t = invoiceTypes[row.type] || invoiceTypes.sale
                    const s = invoiceStatuses[row.status] || invoiceStatuses.draft
                    return (
                      <tr
                        key={row.id}
                        onClick={() => openInvoiceDetails(row)}
                        className="cursor-pointer hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">{row.invoice_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${t.color}`}>
                            <t.icon className="w-3 h-3" />{t.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{row.customer_name || row.supplier_name || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">{(row.total || 0).toLocaleString()}</span>
                          <span className="text-xs text-neutral-500 mr-1">د.ع</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${s.color}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3 text-neutral-500 text-xs">
                          {new Date(row.created_at).toLocaleDateString('ar-IQ')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => openInvoiceDetails(row)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors" title="تفاصيل">
                              <Eye className="w-4 h-4 text-neutral-500" />
                            </button>
                            <button type="button" onClick={() => openInvoiceDetails(row)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors" title="طباعة">
                              <Printer className="w-4 h-4 text-neutral-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'installments' && <InstallmentsTab />}
      {showReportsPanel && <ReportsPanel onClose={() => setShowReportsPanel(false)} />}

      {/* Details Modal */}
      <Modal isOpen={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedInvoiceId(null) }} title="تفاصيل الفاتورة" size="xl">
        {selectedInvoiceId && <InvoiceDetailsContent invoiceId={selectedInvoiceId} onClose={() => { setShowDetailsModal(false); setSelectedInvoiceId(null) }} onCancel={() => openCancelModal(selectedInvoiceId)} onPrinted={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })} />}
      </Modal>
      <Modal isOpen={showCancelModal} onClose={() => { setShowCancelModal(false); setSelectedInvoiceId(null) }} title="إلغاء الفاتورة">
        {selectedInvoiceId && <CancelInvoiceForm invoiceId={selectedInvoiceId} onClose={() => { setShowCancelModal(false); setSelectedInvoiceId(null) }} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setShowCancelModal(false); setSelectedInvoiceId(null) }} />}
      </Modal>
      <Modal isOpen={showNewInvoiceModal} onClose={() => setShowNewInvoiceModal(false)} title={`فاتورة جديدة - ${invoiceTypes[newInvoiceType]?.label || 'بيع'}`} size="xl">
        <NewInvoiceForm type={newInvoiceType} onClose={() => setShowNewInvoiceModal(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setShowNewInvoiceModal(false) }} />
      </Modal>
    </PageShell>
  )
}

/**
 * Premium Stat Card with gradient icon backdrop
 */
function StatCardPremium({ title, value, icon: Icon, gradient, format }) {
  let displayValue = value || 0
  if (format === 'currency') displayValue = (value || 0).toLocaleString() + ' د.ع'
  else if (format === 'million') displayValue = ((value || 0) / 1000000).toFixed(1) + 'M'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 group hover:shadow-lg transition-all duration-300">
      <div className={`absolute -top-3 -left-3 w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} opacity-15 group-hover:opacity-25 transition-opacity duration-300 rotate-12`} />
      <div className="flex items-center justify-between relative">
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{title}</p>
          <p className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{displayValue}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}
