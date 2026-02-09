/**
 * Bi Management - Returns Tracking Page
 * صفحة تتبع المرتجعات - الأولوية القصوى!
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Package, Search, Plus, Filter, Download, AlertTriangle,
  Clock, CheckCircle2, XCircle, Send, RefreshCw, Phone,
  Eye, Edit, MessageSquare, Calendar, User, Building2,
  ChevronDown, ArrowRight, Camera, AlertCircle, Truck
} from 'lucide-react'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { returnsAPI, suppliersAPI } from '../services/api'
import { exportToCSV } from '../utils/helpers'
import PageShell from '../components/common/PageShell'

// حالات المرتجع
const returnStatuses = {
  pending: { label: 'بانتظار الإرسال', color: 'bg-neutral-100 text-neutral-800', icon: Clock },
  sent: { label: 'تم الإرسال', color: 'bg-blue-100 text-blue-800', icon: Send },
  in_repair: { label: 'قيد الإصلاح', color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
  repaired: { label: 'تم الإصلاح', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  replaced: { label: 'تم الاستبدال', color: 'bg-cyan-100 text-cyan-800', icon: RefreshCw },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800', icon: XCircle },
  returned: { label: 'عاد للمخزن', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  lost: { label: 'مفقود', color: 'bg-red-200 text-red-900', icon: AlertTriangle },
}

// مستويات التنبيه
const alertLevels = {
  normal: { days: 0, color: 'text-green-600', bg: 'bg-green-100' },
  warning: { days: 7, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  danger: { days: 14, color: 'text-red-600', bg: 'bg-red-100' },
  critical: { days: 30, color: 'text-red-900', bg: 'bg-red-200' },
}

export default function ReturnsPage() {
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showNewReturnModal, setShowNewReturnModal] = useState(false)
  const [showReturnDetailsModal, setShowReturnDetailsModal] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState(null)
  const [showAlertsOverdue, setShowAlertsOverdue] = useState(false)
  const queryClient = useQueryClient()
  const bulkReminderMutation = useMutation({
    mutationFn: (data) => returnsAPI.sendBulkReminder(data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] })
      queryClient.invalidateQueries({ queryKey: ['returns-stats'] })
    },
  })

  useEffect(() => {
    if (searchParams.get('open') === 'new') setShowNewReturnModal(true)
  }, [searchParams])

  // جلب بيانات المرتجعات
  const { data: returnsData, isLoading } = useQuery({
    queryKey: ['returns', searchTerm, selectedSupplier, selectedStatus],
    queryFn: () => returnsAPI.getReturns({ 
      search: searchTerm, 
      supplier: selectedSupplier,
      status: selectedStatus 
    }),
  })

  // جلب إحصائيات المرتجعات
  const { data: statsData } = useQuery({
    queryKey: ['returns-stats'],
    queryFn: () => returnsAPI.getStats(),
  })

  const returns = returnsData?.data?.data || []
  const stats = statsData?.data?.data || {
    total_pending: 0,
    over_7_days: 0,
    over_14_days: 0,
    over_30_days: 0
  }

  // حساب مدة المرتجع
  const calculateDays = (sentDate) => {
    if (!sentDate) return 0
    const sent = new Date(sentDate)
    const now = new Date()
    return Math.floor((now - sent) / (1000 * 60 * 60 * 24))
  }

  // تحديد مستوى التنبيه
  const getAlertLevel = (days) => {
    if (days >= 30) return 'critical'
    if (days >= 14) return 'danger'
    if (days >= 7) return 'warning'
    return 'normal'
  }

  const handleViewReturn = (returnItem) => {
    setSelectedReturn(returnItem)
    setShowReturnDetailsModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <PageShell
      title="تتبع المرتجعات"
      description="متابعة المرتجعات للموردين ومراكز الصيانة"
      actions={
        <>
          <Button variant="outline" onClick={() => bulkReminderMutation.mutate({})} disabled={bulkReminderMutation.isPending}>
            <Phone className="w-4 h-4 ml-2" />
            تذكير جماعي
          </Button>
          <Button variant="outline" onClick={() => setShowAlertsOverdue((v) => !v)}>
            <AlertCircle className="w-4 h-4 ml-2" />
            التنبيهات والمتأخرات
          </Button>
          <Button variant="outline" onClick={() => exportToCSV(returns, 'returns.csv')}>
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </Button>
          <Button onClick={() => setShowNewReturnModal(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إرسال مرتجع جديد
          </Button>
        </>
      }
    >

      {/* Alert Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">إجمالي المعلقة</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">{stats.total_pending || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border-2 border-yellow-300 dark:border-yellow-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                أكثر من 7 أيام
              </p>
              <p className="text-3xl font-bold text-yellow-600">{stats.over_7_days || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border-2 border-red-400 dark:border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                أكثر من 14 يوم
              </p>
              <p className="text-3xl font-bold text-red-600">{stats.over_14_days || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-red-600 dark:bg-red-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-100 flex items-center gap-1">
                🚨 إنذار! أكثر من 30 يوم
              </p>
              <p className="text-3xl font-bold text-white">{stats.over_30_days || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالسيريال، المنتج، أو رقم المرتجع..."
              className="w-full pr-10 pl-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
            />
          </div>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
          >
            <option value="all">كل الموردين</option>
            <option value="arabi">سيد أحمد - العربي</option>
            <option value="tamimi">سليم التميمي</option>
            <option value="alamia">أبو منتظر - العالمية</option>
            <option value="external">مراكز صيانة خارجية</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
          >
            <option value="all">كل الحالات</option>
            {Object.entries(returnStatuses).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <div className="flex border border-neutral-300 dark:border-neutral-600 rounded-lg overflow-hidden">
            <button className="px-3 py-2 bg-red-600 text-white text-sm">
              🔴 متأخرة ({stats.over_14_days || 0})
            </button>
            <button className="px-3 py-2 bg-yellow-500 text-white text-sm">
              🟡 تنبيه ({stats.over_7_days || 0})
            </button>
            <button className="px-3 py-2 bg-green-500 text-white text-sm">
              🟢 طبيعية
            </button>
          </div>
        </div>
      </div>

      {/* Alerts & Overdue Panel */}
      {showAlertsOverdue && (
        <AlertsOverduePanel onClose={() => setShowAlertsOverdue(false)} />
      )}

      {/* Returns List */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-700/50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">التنبيه</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">رقم المرتجع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">المنتج</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">السيريال</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">المورد</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">سبب الإرجاع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">تاريخ الإرسال</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">المدة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-500">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-neutral-500">
                    لا توجد مرتجعات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                returns.map((returnItem) => {
                  const days = calculateDays(returnItem.sent_date)
                  const alertLevel = getAlertLevel(days)
                  const alert = alertLevels[alertLevel]
                  const status = returnStatuses[returnItem.status] || returnStatuses.pending

                  return (
                    <tr key={returnItem.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        {alertLevel === 'critical' && (
                          <span className="w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full animate-pulse">
                            🚨
                          </span>
                        )}
                        {alertLevel === 'danger' && (
                          <span className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full">
                            🔴
                          </span>
                        )}
                        {alertLevel === 'warning' && (
                          <span className="w-8 h-8 flex items-center justify-center bg-yellow-100 text-yellow-600 rounded-full">
                            🟡
                          </span>
                        )}
                        {alertLevel === 'normal' && (
                          <span className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full">
                            🟢
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-primary-600">
                          {returnItem.return_number || `RTN-${returnItem.id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">{returnItem.product_name}</p>
                          <p className="text-sm text-neutral-500">{returnItem.brand} {returnItem.model}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {returnItem.serial_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-neutral-400" />
                          <span>{returnItem.supplier_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">
                        {returnItem.reason || 'عيب مصنعي'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(returnItem.sent_date).toLocaleDateString('ar-IQ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-sm font-bold ${alert.bg} ${alert.color}`}>
                          {days} يوم
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <status.icon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleViewReturn(returnItem)}
                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                            title="تفاصيل"
                          >
                            <Eye className="w-4 h-4 text-neutral-500" />
                          </button>
                          <button
                            onClick={() => returnsAPI.sendReminder(returnItem.id).then(() => queryClient.invalidateQueries({ queryKey: ['returns'] }))}
                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                            title="تذكير"
                          >
                            <Phone className="w-4 h-4 text-neutral-500" />
                          </button>
                          <button
                            onClick={() => handleViewReturn(returnItem)}
                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                            title="تحديث الحالة"
                          >
                            <RefreshCw className="w-4 h-4 text-neutral-500" />
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

      {/* New Return Modal */}
      <Modal
        isOpen={showNewReturnModal}
        onClose={() => setShowNewReturnModal(false)}
        title="إرسال مرتجع جديد"
        size="lg"
      >
        <NewReturnForm onClose={() => setShowNewReturnModal(false)} onSuccess={() => setShowNewReturnModal(false)} />
      </Modal>

      {/* Return Details Modal */}
      <Modal
        isOpen={showReturnDetailsModal}
        onClose={() => setShowReturnDetailsModal(false)}
        title={`تفاصيل المرتجع: ${selectedReturn?.return_number || ''}`}
        size="xl"
      >
        {selectedReturn && (
          <ReturnDetails
            returnItem={selectedReturn}
            onClose={() => setShowReturnDetailsModal(false)}
            onUpdated={() => { queryClient.invalidateQueries({ queryKey: ['returns'] }); queryClient.invalidateQueries({ queryKey: ['returns-stats'] }); }}
          />
        )}
      </Modal>
    </PageShell>
  )
}

// فورم مرتجع جديد
function NewReturnForm({ onClose, onSuccess }) {
  const [supplierId, setSupplierId] = useState('')
  const [returnType, setReturnType] = useState('defect')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])

  const queryClient = useQueryClient()
  const { data: suppliersRes } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersAPI.getSuppliers() })
  const suppliers = suppliersRes?.data?.data || []

  const createMutation = useMutation({
    mutationFn: (data) => returnsAPI.createReturn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] })
      queryClient.invalidateQueries({ queryKey: ['returns-stats'] })
      onSuccess?.()
      onClose?.()
    },
  })

  const addItem = () => {
    setItems([...items, { id: Date.now(), serial: '', product: '', reason: '' }])
  }

  const updateItem = (index, field, value) => {
    const next = [...items]
    next[index] = { ...next[index], [field]: value }
    setItems(next)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!supplierId?.trim()) return
    const payload = {
      supplier_id: supplierId.trim(),
      reason_category: returnType,
      reason_details: items.length ? items.map(i => i.reason).filter(Boolean).join('؛ ') : returnType,
      notes: notes.trim() || undefined,
      items: items.map(i => ({ condition_notes: i.reason || '', product_id: null, serial_id: null })),
    }
    createMutation.mutate(payload)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {createMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            المورد / مركز الصيانة
          </label>
          <select
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
          >
            <option value="">اختر...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} {s.contact_person ? `- ${s.contact_person}` : ''}</option>
            ))}
            {suppliers.length === 0 && (
              <>
                <option value="arabi">سيد أحمد - العربي للحاسبات</option>
                <option value="tamimi">سليم التميمي</option>
                <option value="alamia">أبو منتظر - العالمية</option>
                <option value="repair1">مركز صيانة 1</option>
              </>
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            نوع المرتجع
          </label>
          <select
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
            value={returnType}
            onChange={(e) => setReturnType(e.target.value)}
          >
            <option value="defect">عيب مصنعي</option>
            <option value="mismatch">اختلاف مواصفات</option>
            <option value="damage">تلف</option>
            <option value="repair">صيانة</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            الأجهزة المرتجعة
          </label>
          <Button type="button" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 ml-1" />
            إضافة جهاز
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex gap-2 items-center bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-lg">
              <input
                type="text"
                placeholder="السيريال..."
                className="flex-1 px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded text-sm dark:bg-neutral-800"
                value={item.serial}
                onChange={(e) => updateItem(index, 'serial', e.target.value)}
              />
              <input
                type="text"
                placeholder="المنتج..."
                className="flex-1 px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded text-sm dark:bg-neutral-800"
                value={item.product}
                onChange={(e) => updateItem(index, 'product', e.target.value)}
              />
              <input
                type="text"
                placeholder="سبب الإرجاع..."
                className="flex-1 px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded text-sm dark:bg-neutral-800"
                value={item.reason}
                onChange={(e) => updateItem(index, 'reason', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
                className="p-1 text-red-500 hover:bg-red-100 rounded"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-neutral-500 py-4">اضغط "إضافة جهاز" لإضافة أجهزة للمرتجع</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          صور قبل الإرسال
        </label>
        <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-6 text-center">
          <Camera className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
          <p className="text-sm text-neutral-500">اسحب الصور هنا أو اضغط للاختيار</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          ملاحظات
        </label>
        <textarea
          rows="3"
          placeholder="أي ملاحظات إضافية..."
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'جاري الإرسال...' : (
            <>
              <Send className="w-4 h-4 ml-2" />
              إرسال المرتجع
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// لوحة التنبيهات والمتأخرات
function AlertsOverduePanel({ onClose }) {
  const { data: alertsData } = useQuery({ queryKey: ['returns-alerts'], queryFn: () => returnsAPI.getAlerts() })
  const { data: overdueData } = useQuery({ queryKey: ['returns-overdue'], queryFn: () => returnsAPI.getOverdue() })
  const alerts = alertsData?.data?.data || alertsData?.data || []
  const overdue = overdueData?.data?.data || overdueData?.data || []
  const alertList = Array.isArray(alerts) ? alerts : []
  const overdueList = Array.isArray(overdue) ? overdue : []

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">التنبيهات والمتأخرات</h3>
        <Button variant="outline" size="sm" onClick={onClose}>إغلاق</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-2">تنبيهات</h4>
          {alertList.length === 0 ? <p className="text-neutral-500 text-sm">لا توجد تنبيهات</p> : (
            <ul className="space-y-2 text-sm">
              {alertList.slice(0, 10).map((a, i) => (
                <li key={a.id || i} className="flex justify-between p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded">
                  <span>{a.return_number || a.id}</span>
                  <span>{a.days != null ? `${a.days} يوم` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-2">متأخرات</h4>
          {overdueList.length === 0 ? <p className="text-neutral-500 text-sm">لا توجد متأخرات</p> : (
            <ul className="space-y-2 text-sm">
              {overdueList.slice(0, 10).map((o, i) => (
                <li key={o.id || i} className="flex justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <span>{o.return_number || o.id}</span>
                  <span>{(o.days != null ? o.days : 0)} يوم</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// تفاصيل المرتجع
function ReturnDetails({ returnItem, onClose, onUpdated }) {
  const [statusSelect, setStatusSelect] = useState(returnItem.status || 'pending')
  const [followUpContent, setFollowUpContent] = useState('')
  const queryClient = useQueryClient()
  const days = Math.floor((new Date() - new Date(returnItem.sent_date || Date.now())) / (1000 * 60 * 60 * 24))
  const status = returnStatuses[returnItem.status] || returnStatuses.pending

  const updateStatusMutation = useMutation({
    mutationFn: (data) => returnsAPI.updateStatus(returnItem.id, data),
    onSuccess: () => { onUpdated?.(); queryClient.invalidateQueries({ queryKey: ['returns'] }) },
  })
  const addFollowUpMutation = useMutation({
    mutationFn: (data) => returnsAPI.addFollowUp(returnItem.id, data),
    onSuccess: () => { setFollowUpContent(''); onUpdated?.(); queryClient.invalidateQueries({ queryKey: ['returns'] }) },
  })
  const receiveMutation = useMutation({
    mutationFn: (data) => returnsAPI.receiveReturn(returnItem.id, data || {}),
    onSuccess: () => { onUpdated?.(); queryClient.invalidateQueries({ queryKey: ['returns'] }) },
  })
  const sendReminderMutation = useMutation({
    mutationFn: () => returnsAPI.sendReminder(returnItem.id),
    onSuccess: () => { onUpdated?.(); queryClient.invalidateQueries({ queryKey: ['returns'] }) },
  })

  const handleUpdateStatus = () => updateStatusMutation.mutate({ status: statusSelect })
  const handleAddFollowUp = (e) => { e.preventDefault(); if (followUpContent.trim()) addFollowUpMutation.mutate({ content: followUpContent.trim() }); }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-lg text-primary-600">{returnItem.return_number || `RTN-${returnItem.id}`}</p>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{returnItem.product_name}</h3>
          <p className="text-sm text-neutral-500">السيريال: {returnItem.serial_number}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-medium ${status.color}`}>
          <status.icon className="w-4 h-4" />
          {status.label}
        </span>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
        <h4 className="font-semibold mb-4">سجل المتابعة</h4>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
            <div className="flex-1">
              <p className="font-medium">تم الإرسال</p>
              <p className="text-sm text-neutral-500">{returnItem.sent_date ? new Date(returnItem.sent_date).toLocaleDateString('ar-IQ') : '-'}</p>
              <p className="text-sm text-neutral-600">إلى: {returnItem.supplier_name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1.5 animate-pulse"></div>
            <div className="flex-1">
              <p className="font-medium">قيد المتابعة</p>
              <p className="text-sm text-neutral-500">منذ {days} يوم</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-neutral-500">المورد:</p><p className="font-medium">{returnItem.supplier_name}</p></div>
        <div><p className="text-neutral-500">سبب الإرجاع:</p><p className="font-medium">{returnItem.reason || 'عيب مصنعي'}</p></div>
        <div><p className="text-neutral-500">تاريخ الإرسال:</p><p className="font-medium">{returnItem.sent_date ? new Date(returnItem.sent_date).toLocaleDateString('ar-IQ') : '-'}</p></div>
        <div><p className="text-neutral-500">المدة:</p><p className="font-medium text-red-600">{days} يوم</p></div>
      </div>

      {/* تحديث الحالة */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={statusSelect} onChange={(e) => setStatusSelect(e.target.value)} className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700">
          {Object.entries(returnStatuses).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>تحديث الحالة</Button>
      </div>

      {/* إضافة متابعة */}
      <form onSubmit={handleAddFollowUp} className="flex gap-2">
        <input type="text" placeholder="إضافة متابعة..." className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg" value={followUpContent} onChange={(e) => setFollowUpContent(e.target.value)} />
        <Button type="submit" variant="outline" disabled={addFollowUpMutation.isPending || !followUpContent.trim()}>إضافة متابعة</Button>
      </form>

      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => sendReminderMutation.mutate()} disabled={sendReminderMutation.isPending}>
          <Phone className="w-4 h-4 ml-2" /> تذكير
        </Button>
        <Button onClick={() => receiveMutation.mutate()} disabled={receiveMutation.isPending}>
          <CheckCircle2 className="w-4 h-4 ml-2" /> استلام مرتجع
        </Button>
        {onClose && <Button variant="outline" onClick={onClose}>إغلاق</Button>}
      </div>
    </div>
  )
}
