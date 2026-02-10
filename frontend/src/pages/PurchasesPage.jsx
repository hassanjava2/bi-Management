/**
 * BI Management - Purchases Page
 * صفحة إدارة فواتير الشراء — عرض شامل مع إحصائيات وworkflow
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingCart, Plus, Search, Eye, Package, Building2, TrendingUp,
  Clock, CheckCircle2, AlertTriangle, FileText, Truck, ClipboardCheck,
  Filter, Calendar, ChevronDown, MoreVertical, DollarSign, BarChart3,
  ArrowUpDown, Download, Printer, XCircle, Loader2
} from 'lucide-react'
import PageShell from '../components/common/PageShell'
import StatsGrid from '../components/common/StatsGrid'
import DataTable from '../components/common/DataTable'
import SearchInput from '../components/common/SearchInput'
import FilterSelect from '../components/common/FilterSelect'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { salesAPI, suppliersAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { clsx } from 'clsx'

const formatNumber = (num) => new Intl.NumberFormat('ar-IQ').format(Math.round(num || 0))
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

// حالات فاتورة الشراء
const purchaseStatuses = {
  draft: { label: 'مسودة', color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200', icon: FileText },
  waiting: { label: 'بانتظار الأسعار', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  confirmed: { label: 'مؤكدة', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle2 },
  receiving: { label: 'قيد الاستلام', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: Truck },
  inspecting: { label: 'قيد الفحص', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', icon: ClipboardCheck },
  completed: { label: 'مكتملة', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  cancelled: { label: 'ملغاة', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
}

// شارة حالة مرئية
function StatusBadge({ status }) {
  const config = purchaseStatuses[status] || purchaseStatuses.draft
  const Icon = config.icon
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium', config.color)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}

// نافذة تفاصيل الفاتورة
function InvoiceDetailModal({ invoice, isOpen, onClose }) {
  const { data: detailData } = useQuery({
    queryKey: ['invoice-detail', invoice?.id],
    queryFn: () => salesAPI.getInvoice(invoice?.id),
    enabled: !!invoice?.id && isOpen,
  })

  const detail = detailData?.data?.data
  const items = detail?.items || []

  if (!invoice) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`فاتورة شراء ${invoice.invoice_number}`} size="lg">
      <div className="space-y-6">
        {/* معلومات أساسية */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3">
            <p className="text-xs text-neutral-500 mb-1">المورد</p>
            <p className="font-medium text-sm">{invoice.supplier_name || '—'}</p>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3">
            <p className="text-xs text-neutral-500 mb-1">التاريخ</p>
            <p className="font-medium text-sm">{formatDate(invoice.created_at)}</p>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3">
            <p className="text-xs text-neutral-500 mb-1">الحالة</p>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3">
            <p className="text-xs text-neutral-500 mb-1">الإجمالي</p>
            <p className="font-bold text-primary-600">{formatNumber(invoice.total)} د.ع</p>
          </div>
        </div>

        {/* بنود الفاتورة */}
        <div>
          <h4 className="font-bold text-sm mb-3">البنود ({items.length})</h4>
          {items.length > 0 ? (
            <div className="border dark:border-neutral-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="px-3 py-2 text-right text-xs text-neutral-500">#</th>
                    <th className="px-3 py-2 text-right text-xs text-neutral-500">المنتج</th>
                    <th className="px-3 py-2 text-center text-xs text-neutral-500">الكمية</th>
                    <th className="px-3 py-2 text-center text-xs text-neutral-500">السعر</th>
                    <th className="px-3 py-2 text-center text-xs text-neutral-500">المجموع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                  {items.map((item, i) => (
                    <tr key={item.id || i}>
                      <td className="px-3 py-2 text-neutral-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{item.product_name || item.description || '—'}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-center">{formatNumber(item.unit_price)}</td>
                      <td className="px-3 py-2 text-center font-medium">{formatNumber(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm text-center py-4">لا توجد بنود</p>
          )}
        </div>

        {/* ملخص مالي */}
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <span className="text-primary-700 dark:text-primary-300 font-medium">الإجمالي</span>
            <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">{formatNumber(detail?.invoice?.total || invoice.total)} د.ع</span>
          </div>
          {(invoice.notes) && (
            <p className="mt-2 text-sm text-primary-600 dark:text-primary-400 border-t border-primary-200 dark:border-primary-800 pt-2">
              ملاحظات: {invoice.notes}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}

// نافذة إضافة مصاريف
function AddExpenseModal({ invoiceId, isOpen, onClose, onSuccess }) {
  const [expenseType, setExpenseType] = useState('shipping')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const toast = useToast()

  const mutation = useMutation({
    mutationFn: (data) => salesAPI.addInvoiceExpense
      ? salesAPI.addInvoiceExpense(invoiceId, data)
      : import('../services/api').then(m => m.default.post(`/invoices/${invoiceId}/expenses`, data)),
    onSuccess: () => {
      toast.success('تم إضافة المصروف')
      setAmount('')
      setNotes('')
      onClose()
      onSuccess?.()
    },
    onError: () => toast.error('فشل إضافة المصروف'),
  })

  const expenseTypes = [
    { value: 'shipping', label: 'شحن ونقل' },
    { value: 'customs', label: 'جمرك' },
    { value: 'loading', label: 'تحميل وتنزيل' },
    { value: 'insurance', label: 'تأمين' },
    { value: 'other', label: 'أخرى' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة مصروف للفاتورة">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">نوع المصروف</label>
          <select value={expenseType} onChange={e => setExpenseType(e.target.value)}
            className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800">
            {expenseTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">المبلغ (د.ع)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800"
            placeholder="0" min="0" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">ملاحظات</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800"
            placeholder="ملاحظات اختيارية..." />
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={() => mutation.mutate({ expense_type: expenseType, amount: parseFloat(amount), notes })}
            disabled={!amount || mutation.isPending} className="flex-1">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إضافة'}
          </Button>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function PurchasesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [expenseInvoiceId, setExpenseInvoiceId] = useState(null)

  // جلب فواتير الشراء
  const { data, isLoading } = useQuery({
    queryKey: ['purchases', searchTerm, statusFilter, supplierFilter],
    queryFn: () => salesAPI.getInvoices({
      type: 'purchase',
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      supplier_id: supplierFilter !== 'all' ? supplierFilter : undefined,
    }),
  })

  // جلب إحصائيات المشتريات
  const { data: statsData } = useQuery({
    queryKey: ['purchase-stats'],
    queryFn: () => salesAPI.getInvoices({ type: 'purchase', limit: 9999 }),
    select: (res) => {
      const invoices = res?.data?.data?.invoices || res?.data?.data || []
      const arr = Array.isArray(invoices) ? invoices : []
      const thisMonth = arr.filter(i => {
        const d = new Date(i.created_at)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      const pending = arr.filter(i => ['draft', 'waiting', 'confirmed'].includes(i.status))
      const totalSpent = arr.filter(i => i.status === 'completed').reduce((s, i) => s + (parseFloat(i.total) || 0), 0)
      return {
        total: arr.length,
        thisMonth: thisMonth.length,
        pending: pending.length,
        totalSpent,
      }
    },
  })

  // جلب الموردين للفلتر
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => suppliersAPI.getSuppliers({ limit: 200 }),
    select: (res) => {
      const list = res?.data?.data || []
      return Array.isArray(list) ? list : []
    },
  })

  const raw = data?.data?.data || data?.data || {}
  const invoices = Array.isArray(raw.invoices || raw) ? (raw.invoices || raw) : []

  const stats = statsData || { total: 0, thisMonth: 0, pending: 0, totalSpent: 0 }

  // بطاقات الإحصائيات
  const statsItems = [
    { label: 'إجمالي الفواتير', value: stats.total, icon: ShoppingCart, color: 'primary' },
    { label: 'هذا الشهر', value: stats.thisMonth, icon: Calendar, color: 'blue' },
    { label: 'قيد المعالجة', value: stats.pending, icon: Clock, color: 'amber' },
    { label: 'إجمالي المصروف', value: `${formatNumber(stats.totalSpent)} د.ع`, icon: DollarSign, color: 'emerald' },
  ]

  // أعمدة الجدول
  const columns = [
    {
      key: 'invoice_number',
      label: 'رقم الفاتورة',
      render: (r) => (
        <span className="font-mono font-medium text-primary-600 dark:text-primary-400">{r.invoice_number}</span>
      ),
    },
    {
      key: 'supplier_name',
      label: 'المورد',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-3.5 h-3.5 text-primary-600" />
          </div>
          <span className="truncate">{r.supplier_name || '—'}</span>
        </div>
      ),
    },
    {
      key: 'items_count',
      label: 'البنود',
      render: (r) => (
        <span className="text-neutral-500">{r.items_count || '—'}</span>
      ),
    },
    {
      key: 'total',
      label: 'المبلغ',
      render: (r) => (
        <span className="font-bold">{formatNumber(r.total)} <span className="text-xs text-neutral-400 font-normal">د.ع</span></span>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'created_at',
      label: 'التاريخ',
      render: (r) => <span className="text-neutral-500 text-sm">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedInvoice(r); setShowDetail(true) }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 hover:text-primary-600 transition-colors"
            title="عرض التفاصيل"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setExpenseInvoiceId(r.id); setShowExpense(true) }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 hover:text-amber-600 transition-colors"
            title="إضافة مصاريف"
          >
            <DollarSign className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  // خيارات فلتر الحالة
  const statusOptions = [
    { value: 'all', label: 'كل الحالات' },
    ...Object.entries(purchaseStatuses).map(([k, v]) => ({ value: k, label: v.label })),
  ]

  // خيارات فلتر المورد
  const supplierOptions = useMemo(() => {
    const list = suppliersData || []
    return [
      { value: 'all', label: 'كل الموردين' },
      ...list.map(s => ({ value: s.id, label: s.name })),
    ]
  }, [suppliersData])

  return (
    <PageShell
      title="فواتير الشراء"
      description="إدارة فواتير الشراء من الموردين — تتبع الطلبات والفحص والاستلام"
      actions={
        <Button onClick={() => navigate('/purchases/new')}>
          <Plus className="w-4 h-4 ml-2" />
          فاتورة شراء جديدة
        </Button>
      }
    >
      <div className="space-y-6">
        {/* بطاقات الإحصائيات */}
        <StatsGrid items={statsItems} />

        {/* شريط الفلاتر */}
        <PageShell.Toolbar>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="بحث برقم الفاتورة أو المورد..."
            className="flex-1"
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="الحالة"
          />
          <FilterSelect
            value={supplierFilter}
            onChange={setSupplierFilter}
            options={supplierOptions}
            placeholder="المورد"
          />
        </PageShell.Toolbar>

        {/* جدول الفواتير */}
        <PageShell.Content>
          <DataTable
            columns={columns}
            data={invoices}
            loading={isLoading}
            onRowClick={(row) => { setSelectedInvoice(row); setShowDetail(true) }}
            emptyTitle="لا توجد فواتير شراء"
            emptyDescription="أضف فاتورة شراء جديدة لبدء تتبع المشتريات من الموردين"
            emptyActionLabel="فاتورة شراء جديدة"
            onEmptyAction={() => navigate('/purchases/new')}
          />
        </PageShell.Content>
      </div>

      {/* نوافذ منبثقة */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedInvoice(null) }}
      />
      <AddExpenseModal
        invoiceId={expenseInvoiceId}
        isOpen={showExpense}
        onClose={() => { setShowExpense(false); setExpenseInvoiceId(null) }}
        onSuccess={() => queryClient.invalidateQueries(['purchases'])}
      />
    </PageShell>
  )
}
