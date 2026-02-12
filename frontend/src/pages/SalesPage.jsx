/**
 * Bi Management - Sales Page
 * صفحة المبيعات والفواتير بكل أنواعها
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Receipt, Plus, Download, Eye, Edit, Printer,
  Truck, TrendingUp, DollarSign, BarChart3
} from 'lucide-react'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import PageShell from '../components/common/PageShell'
import SearchInput from '../components/common/SearchInput'
import FilterSelect from '../components/common/FilterSelect'
import StatsGrid from '../components/common/StatsGrid'
import DataTable from '../components/common/DataTable'
import { invoiceTypes, invoiceStatuses } from '../components/sales/salesConstants'
import NewInvoiceForm from '../components/sales/NewInvoiceForm'
import InvoiceDetailsContent from '../components/sales/InvoiceDetailsContent'
import CancelInvoiceForm from '../components/sales/CancelInvoiceForm'
import InstallmentsTab from '../components/sales/InstallmentsTab'
import ReportsPanel from '../components/sales/ReportsPanel'
import { salesAPI } from '../services/api'
import { exportToCSV } from '../utils/helpers'

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
  const queryClient = useQueryClient()

  const openInvoiceDetails = (invoice) => { setSelectedInvoiceId(invoice?.id ?? invoice); setShowDetailsModal(true) }
  const openCancelModal = (invoice) => { setSelectedInvoiceId(invoice?.id ?? invoice); setShowCancelModal(true); setShowDetailsModal(false) }
  const handleNewInvoice = (type) => { setNewInvoiceType(type); setShowNewInvoiceModal(true) }

  const { data: invoicesData, isLoading, error: invoicesError } = useQuery({
    queryKey: ['invoices', searchTerm, selectedType, selectedStatus, dateRange],
    queryFn: () => salesAPI.getInvoices({ search: searchTerm, type: selectedType !== 'all' ? selectedType : 'sale', status: selectedStatus !== 'all' ? selectedStatus : undefined, ...dateRange }),
    retry: 1, staleTime: 30000,
  })
  const { data: statsData, error: statsError } = useQuery({
    queryKey: ['sales-stats'], queryFn: () => salesAPI.getStats(), retry: 1, staleTime: 60000,
  })

  const invoices = invoicesData?.data?.data?.invoices || invoicesData?.data?.invoices || invoicesData?.data?.data || []
  const rawStats = statsData?.data?.data || statsData?.data || {}
  const stats = { today_sales: rawStats.today?.total || 0, today_count: rawStats.today?.count || 0, month_sales: rawStats.this_month?.total || 0, pending_deliveries: rawStats.pending_deliveries || 0 }

  if (isLoading && activeTab === 'invoices') return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  if (invoicesError || statsError) return (
    <div className="flex flex-col items-center justify-center h-64 text-red-500">
      <p>خطأ في تحميل البيانات</p>
      <p className="text-sm">{invoicesError?.message || statsError?.message}</p>
      <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">إعادة المحاولة</button>
    </div>
  )

  const typeOptions = Object.entries(invoiceTypes).map(([k, v]) => ({ value: k, label: v.label }))
  const statusOptions = Object.entries(invoiceStatuses).map(([k, v]) => ({ value: k, label: v.label }))

  const salesColumns = [
    { key: 'invoice_number', label: 'رقم الفاتورة', render: (r) => <span className="font-mono font-medium text-primary-600">{r.invoice_number}</span> },
    { key: 'type', label: 'النوع', render: (r) => { const t = invoiceTypes[r.type] || invoiceTypes.sale; return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${t.color}`}><t.icon className="w-3 h-3" />{t.label}</span> } },
    { key: 'customer_name', label: 'الزبون/المورد', render: (r) => r.customer_name || r.supplier_name || '\u2014' },
    { key: 'items_count', label: 'المنتجات', render: (r) => `${r.items_count || 1} منتج` },
    { key: 'total', label: 'المبلغ', render: (r) => <><span className="font-semibold">{(r.total || 0).toLocaleString()}</span><span className="text-xs text-neutral-500 me-1">د.ع</span></> },
    { key: 'status', label: 'الحالة', render: (r) => { const s = invoiceStatuses[r.status] || invoiceStatuses.draft; return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span> } },
    { key: 'created_at', label: 'التاريخ', render: (r) => new Date(r.created_at).toLocaleDateString('ar-IQ') },
    { key: 'actions', label: 'إجراءات', render: (r) => (
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => openInvoiceDetails(r)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title="تفاصيل"><Eye className="w-4 h-4 text-neutral-500" /></button>
        <button type="button" onClick={() => openInvoiceDetails(r)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title="طباعة"><Printer className="w-4 h-4 text-neutral-500" /></button>
        <button type="button" onClick={() => openInvoiceDetails(r)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title="تعديل"><Edit className="w-4 h-4 text-neutral-500" /></button>
      </div>
    ) },
  ]

  const salesStatsItems = [
    { title: 'مبيعات اليوم', value: (stats.today_sales || 0).toLocaleString(), icon: DollarSign, color: 'success' },
    { title: 'فواتير اليوم', value: stats.today_count ?? 0, icon: Receipt, color: 'primary' },
    { title: 'مبيعات الشهر', value: `${(stats.month_sales / 1000000 || 0).toFixed(1)}M`, icon: TrendingUp, color: 'info' },
    { title: 'بانتظار التوصيل', value: stats.pending_deliveries ?? 0, icon: Truck, color: 'warning' },
  ]

  return (
    <PageShell title="المبيعات والفواتير" description="إدارة جميع أنواع الفواتير والمبيعات" actions={<>
      <Button variant="outline" onClick={() => exportToCSV(invoices || [], 'invoices.csv')}><Download className="w-4 h-4 ml-2" /> تصدير CSV</Button>
      <Button variant="outline" onClick={() => setShowReportsPanel((v) => !v)}><BarChart3 className="w-4 h-4 ml-2" /> التقارير</Button>
      <Button onClick={() => handleNewInvoice('sale')}><Plus className="w-4 h-4 ml-2" /> فاتورة جديدة</Button>
    </>}>
      <StatsGrid items={salesStatsItems} columns={4} />

      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <nav className="flex gap-4">
          {[{ id: 'invoices', label: 'الفواتير' }, { id: 'pending', label: 'قيد التوصيل', badge: stats.pending_deliveries }, { id: 'installments', label: 'الأقساط' }].map((t) => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} className={`px-4 py-2 border-b-2 font-medium transition-colors ${activeTab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
              {t.label} {t.badge ? <span className="mr-2 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs">{t.badge}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'invoices' && (
        <>
          <PageShell.Toolbar>
            <SearchInput placeholder="بحث برقم الفاتورة، اسم الزبون، أو السيريال..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <FilterSelect options={typeOptions} value={selectedType === 'all' ? null : selectedType} onChange={(v) => setSelectedType(v ?? 'all')} placeholder="كل الأنواع" />
            <FilterSelect options={statusOptions} value={selectedStatus === 'all' ? null : selectedStatus} onChange={(v) => setSelectedStatus(v ?? 'all')} placeholder="كل الحالات" />
            <input type="date" value={dateRange.from} onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-2.5 px-4 text-sm" />
            <input type="date" value={dateRange.to} onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-2.5 px-4 text-sm" />
          </PageShell.Toolbar>
          <PageShell.Content>
            <DataTable columns={salesColumns} data={invoices || []} loading={isLoading} onRowClick={(row) => openInvoiceDetails(row)} emptyTitle="لا توجد فواتير مطابقة للبحث" />
          </PageShell.Content>
        </>
      )}

      {activeTab === 'installments' && <InstallmentsTab />}
      {showReportsPanel && <ReportsPanel onClose={() => setShowReportsPanel(false)} />}

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
