/**
 * BI Management - New Invoice Form (Premium Redesign)
 * فورم إنشاء فاتورة جديدة — تصميم متطور
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, XCircle, CheckCircle2, Printer, Search, Package,
  ScanBarcode, Trash2, ChevronDown, Percent, MessageSquare,
  Wallet, Clock, CreditCard, Building2, AlertCircle, User, Truck
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
  const [discountType, setDiscountType] = useState('amount') // 'amount' or 'percent'
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState('')
  const [searchProduct, setSearchProduct] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const productSearchRef = useRef(null)
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

  // Filtered products based on search
  const filteredProducts = searchProduct
    ? products.filter(p => (p.name || p.product_name || '').includes(searchProduct) || (p.code || '').includes(searchProduct) || (p.serial_number || '').includes(searchProduct))
    : products.slice(0, 20)

  // Add product to items
  const addProductById = useCallback((productId) => {
    const p = products.find(pr => pr.id === productId)
    if (!p) return
    // Check if already added
    const existingIndex = items.findIndex(it => it.product_id === productId)
    if (existingIndex >= 0) {
      setItems(items.map((it, i) => i === existingIndex ? { ...it, qty: it.qty + 1 } : it))
    } else {
      setItems([...items, {
        id: Date.now(),
        product_id: productId,
        product_name: p.name || p.product_name,
        serial: p.serial_number || '',
        qty: 1,
        price: p.price || 0,
      }])
    }
    setSearchProduct('')
    setShowProductDropdown(false)
  }, [items, products])

  const addEmptyItem = () => {
    setItems([...items, {
      id: Date.now(),
      product_id: '',
      product_name: '',
      serial: '',
      qty: 1,
      price: 0,
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

  // Calculate totals
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
      subtotal,
      discount_amount: discountAmount,
      discount_type: discountType,
      tax_amount: 0,
      total,
      paid_amount: paymentMethod === 'cash' ? total : 0,
      remaining_amount: paymentMethod === 'cash' ? 0 : total,
      notes: notes || undefined,
      items: items.map(i => ({ product_id: i.product_id, quantity: i.qty || 1, unit_price: i.price || 0, serial_number: i.serial || undefined })),
    })
  }

  const displayError = validationError || (createMutation.isError ? (createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ') : '')

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Error Alert */}
      {displayError && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm animate-slide-up">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{displayError}</span>
          <button type="button" onClick={() => setValidationError('')} className="mr-auto"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* Row 1: Customer/Supplier + Payment Method */}
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
              onChange={(e) => { isPurchase ? setSupplierId(e.target.value) : setCustomerId(e.target.value) }}
            >
              <option value="">— اختر {isPurchase ? 'المورد' : 'الزبون'} —</option>
              {(isPurchase ? suppliers : customers).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            <Wallet className="w-4 h-4" />
            طريقة الدفع
          </label>
          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setPaymentMethod(pm.value)}
                className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${paymentMethod === pm.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                  }`}
              >
                <pm.icon className={`w-4 h-4 ${paymentMethod === pm.value ? pm.color : ''}`} />
                {pm.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Installment Platform */}
      {paymentMethod === 'installment' && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 animate-slide-up">
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

      {/* Product Quick Add */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            <Package className="w-4 h-4" />
            المنتجات
            {items.length > 0 && <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full text-xs font-bold">{items.length}</span>}
          </label>
          <Button type="button" size="sm" onClick={addEmptyItem}>
            <Plus className="w-4 h-4 ml-1" /> إضافة يدوي
          </Button>
        </div>

        {/* Product Search Bar */}
        <div className="relative mb-3">
          <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            ref={productSearchRef}
            type="text"
            placeholder="ابحث عن المنتج بالاسم، الكود، أو امسح الباركود..."
            value={searchProduct}
            onChange={(e) => { setSearchProduct(e.target.value); setShowProductDropdown(true) }}
            onFocus={() => { if (searchProduct) setShowProductDropdown(true) }}
            onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
            className="w-full pr-10 pl-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
          {showProductDropdown && filteredProducts.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addProductById(p.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors border-b border-neutral-100 dark:border-neutral-700/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                      <Package className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{p.name || p.product_name}</p>
                      {p.code && <p className="text-xs text-neutral-400 font-mono">{p.code}</p>}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-primary-600">{(p.price || 0).toLocaleString()} <span className="text-xs font-normal">د.ع</span></p>
                    <p className="text-xs text-neutral-400">المخزون: {p.quantity ?? '—'}</p>
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
                <th className="px-3 py-2.5 text-right font-semibold text-neutral-500">المنتج</th>
                <th className="px-3 py-2.5 text-right font-semibold text-neutral-500 w-20">الكمية</th>
                <th className="px-3 py-2.5 text-right font-semibold text-neutral-500 w-28">السعر</th>
                <th className="px-3 py-2.5 text-right font-semibold text-neutral-500 w-28">المجموع</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Package className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                    <p className="text-neutral-400 text-sm">ابحث عن المنتج أعلاه أو اضغط "إضافة يدوي"</p>
                  </td>
                </tr>
              ) : items.map((item, index) => (
                <tr key={item.id} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-700/20 transition-colors">
                  <td className="px-3 py-2.5 text-center text-neutral-400 font-mono text-xs">{index + 1}</td>
                  <td className="px-3 py-2.5">
                    {item.product_name ? (
                      <div>
                        <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.product_name}</p>
                        {item.serial && <p className="text-[10px] text-neutral-400 font-mono">{item.serial}</p>}
                      </div>
                    ) : (
                      <select
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
                        value={item.product_id || ''}
                        onChange={(e) => setItemProduct(index, e.target.value)}
                      >
                        <option value="">اختر المنتج</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name || p.product_name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
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
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="number" placeholder="0"
                      className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm text-left"
                      value={item.price || ''} onChange={(e) => updateItem(index, 'price', e.target.value)} />
                  </td>
                  <td className="px-3 py-2.5 font-bold text-neutral-800 dark:text-neutral-200">
                    {(item.qty * item.price).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
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

      {/* Discount + Notes Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            <Percent className="w-4 h-4" />
            الخصم
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="number" value={discount || ''} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} placeholder="0"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm" />
            </div>
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
            <MessageSquare className="w-4 h-4" />
            ملاحظات
          </label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية (اختياري)..."
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm" />
        </div>
      </div>

      {/* Totals Summary — Premium Card */}
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
            <span className="text-lg font-bold text-neutral-800 dark:text-neutral-100">الإجمالي</span>
            <span className="text-2xl font-black text-primary-600 dark:text-primary-400">{total.toLocaleString()} <span className="text-sm font-bold">د.ع</span></span>
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="button" variant="outline"><Printer className="w-4 h-4 ml-2" /> معاينة</Button>
        <Button type="submit" disabled={createMutation.isPending} className="min-w-[140px]">
          {createMutation.isPending ? (
            <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</span>
          ) : (
            <><CheckCircle2 className="w-4 h-4 ml-2" /> حفظ الفاتورة</>
          )}
        </Button>
      </div>
    </form>
  )
}
