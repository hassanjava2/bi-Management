/**
 * BI Management - New Invoice Form (Premium + Barcode Scanner)
 * فورم إنشاء فاتورة جديدة مع ماسح الباركود وتفاصيل الجهاز
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, XCircle, CheckCircle2, Printer, Search, Package,
  ScanBarcode, Trash2, ChevronDown, Percent, MessageSquare,
  Wallet, Clock, CreditCard, Building2, AlertCircle, User,
  Cpu, HardDrive, Smartphone, Monitor, Zap, Tag, Info, X,
  Loader2
} from 'lucide-react'
import Button from '../common/Button'
import { salesAPI, inventoryAPI, customersAPI, suppliersAPI } from '../../services/api'

const paymentMethods = [
  { value: 'cash', label: 'نقدي', icon: Wallet, color: 'text-emerald-600' },
  { value: 'credit', label: 'آجل', icon: Clock, color: 'text-blue-600' },
  { value: 'installment', label: 'أقساط', icon: CreditCard, color: 'text-purple-600' },
  { value: 'transfer', label: 'تحويل', icon: Building2, color: 'text-amber-600' },
]

export default function NewInvoiceForm({ type, onClose, onSuccess }) {
  const [items, setItems] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [installmentPlatform, setInstallmentPlatform] = useState('aqsaty')
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState('amount')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState('')
  // Scanner state
  const [scanInput, setScanInput] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResults, setScanResults] = useState(null)
  const [scanError, setScanError] = useState('')
  const [showDeviceDetail, setShowDeviceDetail] = useState(null) // device/product detail view
  const scanInputRef = useRef(null)
  const scanTimerRef = useRef(null)
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

  const isPurchase = type === 'purchase' || type === 'purchase_return'

  // === BARCODE SCANNER LOGIC ===
  // Auto-scan: when user types fast (barcode scanner speed), auto-trigger search
  const handleScanInput = (e) => {
    const val = e.target.value
    setScanInput(val)
    setScanError('')
    setScanResults(null)

    // Clear previous timer
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current)

    if (val.length >= 3) {
      // Auto-search after 500ms of no typing (barcode scanners type very fast)
      scanTimerRef.current = setTimeout(() => {
        performScan(val)
      }, 500)
    }
  }

  const handleScanKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (scanInput.trim().length >= 2) {
        performScan(scanInput.trim())
      }
    }
  }

  const performScan = async (code) => {
    setScanLoading(true)
    setScanError('')
    setScanResults(null)
    try {
      const res = await inventoryAPI.scanDevice(code)
      const data = res?.data
      if (data?.success && data?.data?.length > 0) {
        if (data.data.length === 1) {
          // Auto-add single result
          addScannedItem(data.data[0], data.source)
          setScanInput('')
        } else {
          // Multiple results — show picker
          setScanResults({ items: data.data, source: data.source })
        }
      } else {
        setScanError('لم يتم العثور على منتج بهذا الكود')
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setScanError('لم يتم العثور على منتج بهذا الكود')
      } else {
        setScanError(err?.response?.data?.message || err?.message || 'خطأ في البحث')
      }
    } finally {
      setScanLoading(false)
    }
  }

  // Add item from scan result
  const addScannedItem = useCallback((item, source) => {
    const isDevice = source === 'device'
    const productId = item.product_id
    const deviceId = isDevice ? item.id : null
    const price = parseFloat(item.selling_price) || parseFloat(item.product_price) || 0

    // Check for duplicate device
    if (isDevice && items.some(it => it.device_id === deviceId)) {
      setScanError('هذا الجهاز مضاف مسبقاً!')
      return
    }

    setItems(prev => [...prev, {
      id: Date.now(),
      product_id: productId,
      device_id: deviceId,
      product_name: item.product_name || '',
      serial: item.serial_number || '',
      brand: item.brand || '',
      model: item.model || '',
      specs: item.actual_specs || null,
      category: item.category_name || '',
      warehouse: item.warehouse_name || '',
      status: item.status || '',
      qty: 1,
      price,
      source,
    }])

    setScanResults(null)
    setScanInput('')
    setScanError('')
    // Focus back on scanner
    setTimeout(() => scanInputRef.current?.focus(), 100)
  }, [items])

  // Manual add
  const addEmptyItem = () => {
    setItems(prev => [...prev, {
      id: Date.now(), product_id: '', device_id: null, product_name: '',
      serial: '', brand: '', model: '', specs: null, category: '', warehouse: '',
      status: '', qty: 1, price: 0, source: 'manual',
    }])
  }

  const updateItem = (index, field, value) => {
    setItems(items.map((it, i) => {
      if (i !== index) return it
      const updated = { ...it, [field]: value }
      if (field === 'qty') updated.qty = Math.max(1, Number(updated.qty) || 1)
      if (field === 'price') updated.price = parseFloat(updated.price) || 0
      return updated
    }))
  }

  const setItemProduct = (index, productId) => {
    const p = products.find(pr => pr.id === productId)
    setItems(items.map((it, i) =>
      i === index ? { ...it, product_id: productId, price: p?.price ?? it.price, product_name: p?.name || p?.product_name || '' } : it
    ))
  }

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))

  // Totals
  const subtotal = items.reduce((sum, item) => sum + ((item.qty || 1) * (item.price || 0)), 0)
  const discountAmount = discountType === 'percent' ? (subtotal * (discount || 0) / 100) : (discount || 0)
  const total = Math.max(0, subtotal - discountAmount)

  const handleSubmit = (e) => {
    e.preventDefault()
    setValidationError('')
    const partyId = isPurchase ? supplierId : customerId
    if (!partyId) { setValidationError(isPurchase ? 'اختر المورد أولاً' : 'اختر الزبون أولاً'); return }
    if (!items.length) { setValidationError('أضف منتجاً واحداً على الأقل'); return }
    if (items.some(it => !it.product_id)) { setValidationError('اختر المنتج لكل البنود'); return }

    createMutation.mutate({
      type: type || 'sale',
      customer_id: isPurchase ? null : partyId,
      supplier_id: isPurchase ? partyId : null,
      payment_method: paymentMethod,
      installment_platform: paymentMethod === 'installment' ? installmentPlatform : undefined,
      subtotal, discount_amount: discountAmount, discount_type: discountType,
      tax_amount: 0, total,
      paid_amount: paymentMethod === 'cash' ? total : 0,
      remaining_amount: paymentMethod === 'cash' ? 0 : total,
      notes: notes || undefined,
      items: items.map(i => ({
        product_id: i.product_id, device_id: i.device_id || undefined,
        quantity: i.qty || 1, unit_price: i.price || 0,
        serial_number: i.serial || undefined,
      })),
    })
  }

  const displayError = validationError || (createMutation.isError ? (createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ') : '')

  // Auto-focus scanner on mount
  useEffect(() => { scanInputRef.current?.focus() }, [])

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Error Alert */}
      {displayError && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{displayError}</span>
          <button type="button" onClick={() => setValidationError('')} className="mr-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Row 1: Customer + Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            <User className="w-4 h-4" />
            {isPurchase ? 'المورد' : 'الزبون'}
          </label>
          <div className="relative">
            <select
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              value={isPurchase ? supplierId : customerId}
              onChange={(e) => isPurchase ? setSupplierId(e.target.value) : setCustomerId(e.target.value)}
            >
              <option value="">— اختر {isPurchase ? 'المورد' : 'الزبون'} —</option>
              {(isPurchase ? suppliers : customers).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            <Wallet className="w-4 h-4" /> طريقة الدفع
          </label>
          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.map((pm) => (
              <button key={pm.value} type="button" onClick={() => setPaymentMethod(pm.value)}
                className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${paymentMethod === pm.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                  }`}>
                <pm.icon className={`w-4 h-4 ${paymentMethod === pm.value ? pm.color : ''}`} />
                {pm.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Installment Platform */}
      {paymentMethod === 'installment' && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <label className="block text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3">منصة الأقساط</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" value="aqsaty" checked={installmentPlatform === 'aqsaty'} onChange={(e) => setInstallmentPlatform(e.target.value)} className="text-purple-600" />
              <span className="font-medium">أقساطي</span>
              <span className="text-xs text-purple-600 bg-purple-100 dark:bg-purple-800 px-2 py-0.5 rounded-full">15%</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" value="jenny" checked={installmentPlatform === 'jenny'} onChange={(e) => setInstallmentPlatform(e.target.value)} className="text-purple-600" />
              <span className="font-medium">جني (SuperKey)</span>
              <span className="text-xs text-purple-600 bg-purple-100 dark:bg-purple-800 px-2 py-0.5 rounded-full">11.5%</span>
            </label>
          </div>
        </div>
      )}

      {/* ========= BARCODE SCANNER SECTION ========= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            <Package className="w-4 h-4" />
            المنتجات
            {items.length > 0 && <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full text-xs font-bold">{items.length}</span>}
          </label>
          <Button type="button" size="sm" variant="outline" onClick={addEmptyItem}>
            <Plus className="w-4 h-4 ml-1" /> إضافة يدوي
          </Button>
        </div>

        {/* Scanner Input — The Star Feature */}
        <div className="relative mb-3">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${scanLoading ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10' :
              scanError ? 'border-red-400 bg-red-50 dark:bg-red-900/10' :
                'border-primary-300 dark:border-primary-700 bg-gradient-to-l from-primary-50 to-blue-50 dark:from-primary-900/10 dark:to-blue-900/10'
            }`}>
            {scanLoading ? (
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
            ) : (
              <ScanBarcode className="w-5 h-5 text-primary-500 shrink-0" />
            )}
            <input
              ref={scanInputRef}
              type="text"
              placeholder="امسح الباركود أو أدخل السيريال / كود المنتج... (Enter للبحث)"
              value={scanInput}
              onChange={handleScanInput}
              onKeyDown={handleScanKeyDown}
              className="flex-1 bg-transparent outline-none text-sm font-medium placeholder-neutral-400"
              autoFocus
            />
            {scanInput && (
              <button type="button" onClick={() => { setScanInput(''); setScanResults(null); setScanError('') }}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>

          {/* Scan Error */}
          {scanError && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {scanError}
            </p>
          )}

          {/* Multiple Scan Results Dropdown */}
          {scanResults && scanResults.items.length > 0 && (
            <div className="absolute z-20 w-full mt-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl max-h-80 overflow-y-auto">
              <div className="p-3 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500">
                  {scanResults.items.length} نتيجة — {scanResults.source === 'device' ? 'أجهزة' : 'منتجات'}
                </span>
                <button type="button" onClick={() => setScanResults(null)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                  <X className="w-3 h-3" />
                </button>
              </div>
              {scanResults.items.map((item, idx) => (
                <button
                  key={item.id || item.product_id || idx}
                  type="button"
                  onClick={() => addScannedItem(item, scanResults.source)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors border-b border-neutral-50 dark:border-neutral-700/50 last:border-0"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shrink-0">
                    {scanResults.source === 'device' ? <Smartphone className="w-5 h-5 text-white" /> : <Package className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{item.product_name || '—'}</p>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                      {item.serial_number && <span className="font-mono bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded">{item.serial_number}</span>}
                      {item.brand && <span>{item.brand}</span>}
                      {item.model && <span>· {item.model}</span>}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-bold text-primary-600 text-sm">{(parseFloat(item.selling_price) || parseFloat(item.product_price) || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-neutral-400">د.ع</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60">
              <tr>
                <th className="px-3 py-2.5 text-right font-semibold text-neutral-500 w-10">#</th>
                <th className="px-3 py-2.5 text-right font-semibold text-neutral-500">المنتج / الجهاز</th>
                <th className="px-3 py-2.5 text-right font-semibold text-neutral-500 w-20">الكمية</th>
                <th className="px-3 py-2.5 text-right font-semibold text-neutral-500 w-28">السعر</th>
                <th className="px-3 py-2.5 text-right font-semibold text-neutral-500 w-28">المجموع</th>
                <th className="px-3 py-2.5 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <ScanBarcode className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 font-bold text-sm">امسح باركود الجهاز لإضافته</p>
                    <p className="text-neutral-400 text-xs mt-1">أو اكتب السيريال / كود المنتج في حقل البحث أعلاه</p>
                  </td>
                </tr>
              ) : items.map((item, index) => (
                <tr key={item.id} className="group hover:bg-primary-50/30 dark:hover:bg-primary-900/5 transition-colors">
                  <td className="px-3 py-3 text-center text-neutral-400 font-mono text-xs">{index + 1}</td>
                  <td className="px-3 py-3">
                    {item.source === 'manual' && !item.product_name ? (
                      <select
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
                        value={item.product_id || ''}
                        onChange={(e) => setItemProduct(index, e.target.value)}
                      >
                        <option value="">اختر المنتج</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name || p.product_name}</option>)}
                      </select>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          {item.source === 'device' ? (
                            <Smartphone className="w-4 h-4 text-primary-500 shrink-0" />
                          ) : (
                            <Package className="w-4 h-4 text-neutral-400 shrink-0" />
                          )}
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">{item.product_name}</span>
                        </div>
                        {/* Device details row */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.serial && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              <Tag className="w-2.5 h-2.5" /> {item.serial}
                            </span>
                          )}
                          {item.brand && (
                            <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded">{item.brand}</span>
                          )}
                          {item.model && (
                            <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded">{item.model}</span>
                          )}
                          {item.category && (
                            <span className="text-[10px] text-neutral-400">{item.category}</span>
                          )}
                        </div>
                        {/* Specs if available */}
                        {item.specs && typeof item.specs === 'object' && Object.keys(item.specs).length > 0 && (
                          <button type="button" onClick={() => setShowDeviceDetail(item)}
                            className="mt-1 text-[10px] text-primary-500 hover:text-primary-700 flex items-center gap-1">
                            <Info className="w-3 h-3" /> عرض مواصفات الجهاز
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {item.source === 'device' ? (
                      <span className="text-center block font-bold text-neutral-600">1</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => updateItem(index, 'qty', item.qty - 1)}
                          className="w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-600 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-xs font-bold"
                          disabled={item.qty <= 1}>—</button>
                        <input type="number" value={item.qty} min="1"
                          className="w-10 text-center py-1 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm font-bold"
                          onChange={(e) => updateItem(index, 'qty', e.target.value)} />
                        <button type="button" onClick={() => updateItem(index, 'qty', item.qty + 1)}
                          className="w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-600 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-xs font-bold">+</button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <input type="number" placeholder="0"
                      className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm text-left"
                      value={item.price || ''} onChange={(e) => updateItem(index, 'price', e.target.value)} />
                  </td>
                  <td className="px-3 py-3 font-bold text-neutral-800 dark:text-neutral-200">
                    {((item.qty || 1) * (item.price || 0)).toLocaleString()}
                  </td>
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => removeItem(index)}
                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Detail Modal */}
      {showDeviceDetail && (
        <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300 text-sm">
              <Monitor className="w-4 h-4" /> مواصفات الجهاز — {showDeviceDetail.product_name}
            </h4>
            <button type="button" onClick={() => setShowDeviceDetail(null)} className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {showDeviceDetail.serial && (
              <SpecItem icon={Tag} label="السيريال" value={showDeviceDetail.serial} />
            )}
            {showDeviceDetail.brand && (
              <SpecItem icon={Zap} label="البراند" value={showDeviceDetail.brand} />
            )}
            {showDeviceDetail.model && (
              <SpecItem icon={Smartphone} label="الموديل" value={showDeviceDetail.model} />
            )}
            {showDeviceDetail.category && (
              <SpecItem icon={Package} label="الفئة" value={showDeviceDetail.category} />
            )}
            {showDeviceDetail.warehouse && (
              <SpecItem icon={Building2} label="المخزن" value={showDeviceDetail.warehouse} />
            )}
            {showDeviceDetail.status && (
              <SpecItem icon={CheckCircle2} label="الحالة" value={showDeviceDetail.status} />
            )}
            {/* Dynamic specs from actual_specs JSON */}
            {showDeviceDetail.specs && typeof showDeviceDetail.specs === 'object' && Object.entries(showDeviceDetail.specs).map(([key, val]) => (
              val && <SpecItem key={key} icon={HardDrive} label={key} value={String(val)} />
            ))}
          </div>
        </div>
      )}

      {/* Discount + Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            <Percent className="w-4 h-4" /> الخصم
          </label>
          <div className="flex gap-2">
            <input type="number" value={discount || ''} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} placeholder="0"
              className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm" />
            <div className="flex rounded-xl border border-neutral-200 dark:border-neutral-600 overflow-hidden">
              <button type="button" onClick={() => setDiscountType('amount')}
                className={`px-3 py-2 text-xs font-medium transition-all ${discountType === 'amount' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-neutral-800 text-neutral-500'}`}>
                د.ع
              </button>
              <button type="button" onClick={() => setDiscountType('percent')}
                className={`px-3 py-2 text-xs font-medium transition-all ${discountType === 'percent' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-neutral-800 text-neutral-500'}`}>
                %
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            <MessageSquare className="w-4 h-4" /> ملاحظات
          </label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية..."
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm" />
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-2xl border-2 border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/10 p-5">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
            <span>المجموع الفرعي ({items.length} منتج)</span>
            <span className="font-medium">{subtotal.toLocaleString()} د.ع</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>الخصم {discountType === 'percent' ? `(${discount}%)` : ''}</span>
              <span>- {discountAmount.toLocaleString()} د.ع</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t-2 border-primary-200 dark:border-primary-700">
            <span className="text-lg font-bold">الإجمالي</span>
            <span className="text-2xl font-black text-primary-600 dark:text-primary-400">{total.toLocaleString()} <span className="text-sm font-bold">د.ع</span></span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={createMutation.isPending} className="min-w-[140px]">
          {createMutation.isPending ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</span>
          ) : (
            <><CheckCircle2 className="w-4 h-4 ml-2" /> حفظ الفاتورة</>
          )}
        </Button>
      </div>
    </form>
  )
}

function SpecItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-white/60 dark:bg-neutral-800/40 rounded-lg px-3 py-2">
      <Icon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      <div>
        <p className="text-[10px] text-neutral-400">{label}</p>
        <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{value}</p>
      </div>
    </div>
  )
}
