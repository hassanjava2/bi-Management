/**
 * Bi Management - صفحة إنشاء فاتورة جديدة
 * واجهة احترافية كاملة
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { clsx } from 'clsx'
import {
  Receipt, Search, Plus, Minus, Trash2, User, Phone, MapPin,
  CreditCard, Wallet, Calculator, ArrowLeftRight, Save, Printer,
  X, Check, AlertCircle, Package, ChevronDown, Loader2, ShoppingCart, Building2
} from 'lucide-react'
import api from '../services/api'
import { customersAPI, suppliersAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

// أنواع الفواتير
const invoiceTypes = {
  cash: { name: 'بيع نقدي', icon: Wallet, color: 'emerald' },
  credit: { name: 'بيع آجل', icon: CreditCard, color: 'blue' },
  installment: { name: 'أقساط', icon: Calculator, color: 'purple' },
  exchange: { name: 'استبدال', icon: ArrowLeftRight, color: 'amber' },
  purchase: { name: 'شراء', icon: ShoppingCart, color: 'amber' },
}

// منصات الأقساط
const installmentPlatforms = [
  { id: 'aqsaty', name: 'أقساطي', fee: 15, downPayment: 11.5 },
  { id: 'jenny', name: 'جني', fee: 11.5, downPayment: 0 },
]

// تنسيق الأرقام
const formatNumber = (num) => {
  return new Intl.NumberFormat('ar-IQ').format(Math.round(num || 0))
}

// مكون البحث عن المنتجات (مع اختصارات لوحة المفاتيح)
function ProductSearch({ onSelect, productSearchInputRef }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const listRef = useRef(null)

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['products-search', query],
    queryFn: async () => {
      if (query.length < 2) return []
      const res = await api.get(`/products/search?q=${encodeURIComponent(query)}&limit=15`)
      return res.data.data || []
    },
    enabled: query.length >= 2,
  })

  const results = searchResults || []

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, results.length])

  const handleSelect = (product) => {
    onSelect(product)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Escape') setIsOpen(false)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(results[selectedIndex])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % results.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + results.length) % results.length)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          ref={(el) => {
            inputRef.current = el
            if (productSearchInputRef) productSearchInputRef.current = el
          }}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="ابحث عن منتج بالاسم... (Enter إضافة، Esc إغلاق)"
          className="w-full pr-10 pl-4 py-3 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
        />
        {isLoading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500 animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div ref={listRef} className="absolute z-50 w-full mt-2 bg-white dark:bg-surface-800 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-600 max-h-96 overflow-y-auto">
          {results.map((product, i) => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleSelect(product)}
              className={clsx(
                'w-full px-4 py-3 text-right border-b border-surface-100 dark:border-surface-700 last:border-0 flex items-center gap-4 transition-colors',
                i === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-900 dark:text-white truncate">{product.name}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400">{product.group_name}</p>
              </div>
              <div className="text-left flex-shrink-0">
                <p className="font-bold text-primary-600">{formatNumber(product.sale_price)}</p>
                <p className="text-xs text-surface-400">د.ع</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-surface-800 rounded-xl shadow-xl border border-surface-200 dark:border-surface-600 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-surface-300 mx-auto mb-2" />
          <p className="text-surface-500 dark:text-surface-400">لا توجد نتائج</p>
        </div>
      )}
    </div>
  )
}

// مكون البحث عن العميل (ربط بقاعدة العملاء)
function CustomerSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers-search', query],
    queryFn: async () => {
      if (query.length < 2) return []
      const res = await customersAPI.getCustomers({ search: query })
      return res.data?.data || []
    },
    enabled: query.length >= 2,
  })

  const results = customersData || []

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, results.length])

  const handleSelect = (c) => {
    onSelect({ id: c.id, name: c.name, phone: c.phone || c.phone2 || '' })
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Escape') setIsOpen(false)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(results[selectedIndex])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % results.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + results.length) % results.length)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="ابحث بالاسم أو رقم الهاتف (حرفين على الأقل)"
          className="w-full pr-10 pl-4 py-3 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
        />
        {isLoading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500 animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-surface-800 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-600 max-h-64 overflow-y-auto">
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className={clsx(
                'w-full px-4 py-3 text-right hover:bg-surface-50 dark:hover:bg-surface-700/50 border-b border-surface-100 dark:border-surface-700 last:border-0 flex items-center gap-3 transition-colors',
                i === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/30' : ''
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-900 dark:text-white truncate">{c.name}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400">{c.phone || c.phone2 || '—'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-surface-800 rounded-xl shadow-xl border border-surface-200 dark:border-surface-600 p-4 text-center">
          <p className="text-surface-500 dark:text-surface-400 text-sm">لا يوجد عميل بهذا الاسم أو الرقم. اترك فارغاً للعميل النقدي.</p>
        </div>
      )}
    </div>
  )
}

// مكون البحث عن المورد
function SupplierSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers-search', query],
    queryFn: async () => {
      if (query.length < 2) return []
      const res = await suppliersAPI.getSuppliers({ search: query })
      return res.data?.data || []
    },
    enabled: query.length >= 2,
  })

  const results = suppliersData || []

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { setSelectedIndex(0) }, [query, results.length])

  const handleSelect = (s) => {
    onSelect({ id: s.id, name: s.name, phone: s.phone || s.phone2 || '' })
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) { if (e.key === 'Escape') setIsOpen(false); return }
    if (e.key === 'Enter') { e.preventDefault(); handleSelect(results[selectedIndex]); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => (i + 1) % results.length); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => (i - 1 + results.length) % results.length); return }
    if (e.key === 'Escape') { e.preventDefault(); setIsOpen(false) }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="ابحث عن مورد بالاسم أو الهاتف"
          className="w-full pr-10 pl-4 py-3 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
        />
        {isLoading && <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500 animate-spin" />}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-surface-800 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-600 max-h-64 overflow-y-auto">
          {results.map((s, i) => (
            <button key={s.id} type="button" onClick={() => handleSelect(s)} className={clsx('w-full px-4 py-3 text-right border-b border-surface-100 dark:border-surface-700 last:border-0 flex items-center gap-3', i === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-surface-50 dark:hover:bg-surface-700/50')}>
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-900 dark:text-white truncate">{s.name}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400">{s.phone || s.phone2 || '—'}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// مكون بند الفاتورة
function InvoiceItem({ item, index, onUpdate, onRemove, showBuyPrice }) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <tr className="hover:bg-surface-50 transition-colors">
      <td className="px-4 py-3 text-center font-medium text-surface-500">
        {index + 1}
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-surface-900">{item.name}</p>
          <p className="text-sm text-surface-500">{item.group_name}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onUpdate(index, { quantity: Math.max(1, item.quantity - 1) })}
            className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdate(index, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-16 text-center border border-surface-300 rounded-lg py-1 font-medium"
            min="1"
          />
          <button
            onClick={() => onUpdate(index, { quantity: item.quantity + 1 })}
            className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </td>
      {showBuyPrice && (
        <td className="px-4 py-3 text-center text-surface-500">
          {formatNumber(item.buy_price)}
        </td>
      )}
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="number"
            value={item.unit_price}
            onChange={(e) => onUpdate(index, { unit_price: parseFloat(e.target.value) || 0 })}
            onBlur={() => setIsEditing(false)}
            autoFocus
            className="w-28 text-center border border-primary-500 rounded-lg py-1 font-medium"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-28 text-center py-1 font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            {formatNumber(item.unit_price)}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-center font-bold text-surface-900">
        {formatNumber(item.quantity * item.unit_price)}
      </td>
      {showBuyPrice && (
        <td className="px-4 py-3 text-center">
          <span className={clsx(
            'font-medium',
            item.unit_price > item.buy_price ? 'text-emerald-600' : 'text-red-600'
          )}>
            {formatNumber((item.unit_price - item.buy_price) * item.quantity)}
          </span>
        </td>
      )}
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onRemove(index)}
          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors mx-auto"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

// الصفحة الرئيسية
export default function NewInvoicePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()
  const initialType = pathname?.includes('purchases/new') ? 'purchase' : (searchParams.get('type') || 'cash')

  // حالة الفاتورة
  const [invoiceType, setInvoiceType] = useState(initialType)
  const [items, setItems] = useState([])
  const [customer, setCustomer] = useState(null)
  const [supplier, setSupplier] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState('amount') // amount or percent
  const [notes, setNotes] = useState('')
  const [platform, setPlatform] = useState('aqsaty')
  const [showBuyPrice, setShowBuyPrice] = useState(false)

  // إضافة منتج
  const addProduct = (product) => {
    const existingIndex = items.findIndex(i => i.product_id === product.id)
    
    if (existingIndex >= 0) {
      const newItems = [...items]
      newItems[existingIndex].quantity += 1
      setItems(newItems)
    } else {
      setItems([...items, {
        product_id: product.id,
        name: product.name,
        group_name: product.group_name,
        buy_price: product.buy_price,
        unit_price: product.sale_price,
        quantity: 1,
      }])
    }
  }

  // تحديث بند
  const updateItem = (index, updates) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    setItems(newItems)
  }

  // حذف بند
  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // حسابات الفاتورة
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.buy_price), 0)
  
  const discountAmount = discountType === 'percent' 
    ? (subtotal * discount / 100) 
    : discount

  let total = subtotal - discountAmount
  let platformFee = 0
  let downPayment = 0

  // حساب الأقساط
  if (invoiceType === 'installment') {
    const selectedPlatform = installmentPlatforms.find(p => p.id === platform)
    if (selectedPlatform) {
      platformFee = total * selectedPlatform.fee / 100
      downPayment = total * selectedPlatform.downPayment / 100
      total = total + platformFee
    }
  }

  const profit = total - totalCost - discountAmount

  const productSearchInputRef = useRef(null)
  const handleSaveRef = useRef(() => {})

  // تركيز على بحث المنتج عند فتح الصفحة
  useEffect(() => {
    const t = setTimeout(() => productSearchInputRef.current?.focus(), 300)
    return () => clearTimeout(t)
  }, [])

  // اختصار الحفظ: Ctrl+S
  useEffect(() => {
    handleSaveRef.current = handleSave
  })
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (items.length > 0 && !saveMutation.isPending) handleSaveRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [items.length, saveMutation.isPending])

  // حفظ الفاتورة
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/invoices', data)
      return res.data
    },
    onSuccess: (data) => {
      toast.success('تم حفظ الفاتورة بنجاح')
      navigate(`/sales?invoice=${data.data?.id}`)
    },
  })

  const handleSave = () => {
    if (items.length === 0) {
      toast.warning('أضف منتج واحد على الأقل')
      return
    }

    const invoiceData = {
      type: invoiceType === 'purchase' ? 'purchase' : invoiceType === 'cash' ? 'sale' : invoiceType === 'credit' ? 'sale_credit' : invoiceType === 'installment' ? 'sale_installment' : 'exchange',
      customer_id: invoiceType === 'purchase' ? undefined : customer?.id,
      supplier_id: invoiceType === 'purchase' ? supplier?.id : undefined,
      items: items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        buy_price: item.buy_price,
      })),
      subtotal,
      discount_amount: discountAmount,
      total,
      platform: invoiceType === 'installment' ? platform : null,
      platform_fee: platformFee,
      down_payment: downPayment,
      notes,
    }

    saveMutation.mutate(invoiceData)
  }

  const typeConfig = invoiceTypes[invoiceType] || invoiceTypes.cash
  const TypeIcon = typeConfig.icon

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <div className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  `bg-${typeConfig.color}-100`
                )}>
                  <TypeIcon className={`w-6 h-6 text-${typeConfig.color}-600`} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-surface-900 dark:text-white">
                    فاتورة {typeConfig.name}
                  </h1>
                  <p className="text-sm text-surface-500">
                    {new Date().toLocaleDateString('ar-IQ', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBuyPrice}
                  onChange={(e) => setShowBuyPrice(e.target.checked)}
                  className="rounded text-primary-600"
                />
                عرض سعر الشراء
              </label>
              
              <button
                onClick={handleSave}
                disabled={items.length === 0 || saveMutation.isPending}
                className={clsx(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all',
                  items.length > 0
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-surface-200 text-surface-400 cursor-not-allowed'
                )}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                حفظ الفاتورة (Ctrl+S)
              </button>
            </div>
            {saveMutation.isError && (
              <div className="mt-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  {saveMutation.error?.response?.data?.message
                    || saveMutation.error?.response?.data?.error
                    || (saveMutation.error?.message && saveMutation.error.message.includes('Network')
                      ? 'تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مرة أخرى.'
                      : 'حدث خطأ عند الحفظ. راجع البيانات وحاول مرة أخرى.')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* القسم الأيسر - البنود */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* اختيار نوع الفاتورة */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm">
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(invoiceTypes).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setInvoiceType(key)}
                    className={clsx(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      invoiceType === key
                        ? `border-${config.color}-500 bg-${config.color}-50`
                        : 'border-surface-200 hover:border-surface-300'
                    )}
                  >
                    <config.icon className={clsx(
                      'w-6 h-6',
                      invoiceType === key ? `text-${config.color}-600` : 'text-surface-400'
                    )} />
                    <span className={clsx(
                      'text-sm font-medium',
                      invoiceType === key ? `text-${config.color}-700` : 'text-surface-600'
                    )}>
                      {config.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* منصة الأقساط */}
            {invoiceType === 'installment' && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4">
                <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-3">
                  اختر منصة الأقساط
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {installmentPlatforms.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={clsx(
                        'p-4 rounded-xl border-2 transition-all text-right',
                        platform === p.id
                          ? 'border-purple-500 bg-white'
                          : 'border-purple-200 hover:border-purple-300 bg-white/50'
                      )}
                    >
                      <p className="font-bold text-purple-900">{p.name}</p>
                      <p className="text-sm text-purple-600">
                        نسبة الرفع: {p.fee}%
                        {p.downPayment > 0 && ` | مقدمة: ${p.downPayment}%`}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* البحث عن المنتجات */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-600" />
                إضافة منتجات
              </h3>
              <ProductSearch onSelect={addProduct} productSearchInputRef={productSearchInputRef} />
            </div>

            {/* جدول البنود */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-sm overflow-hidden">
              {items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-50 dark:bg-surface-700">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium text-surface-500 uppercase w-12">#</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-surface-500 uppercase">المنتج</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-surface-500 uppercase w-32">الكمية</th>
                        {showBuyPrice && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-surface-500 uppercase w-28">الشراء</th>
                        )}
                        <th className="px-4 py-3 text-center text-xs font-medium text-surface-500 uppercase w-28">السعر</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-surface-500 uppercase w-28">المجموع</th>
                        {showBuyPrice && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-surface-500 uppercase w-24">الربح</th>
                        )}
                        <th className="px-4 py-3 text-center text-xs font-medium text-surface-500 uppercase w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                      {items.map((item, index) => (
                        <InvoiceItem
                          key={`${item.product_id}-${index}`}
                          item={item}
                          index={index}
                          onUpdate={updateItem}
                          onRemove={removeItem}
                          showBuyPrice={showBuyPrice}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Package className="w-16 h-16 text-surface-300 mx-auto mb-4" />
                  <p className="text-surface-500 text-lg">لا توجد منتجات</p>
                  <p className="text-surface-400 text-sm">ابحث وأضف منتجات من الأعلى</p>
                </div>
              )}
            </div>
          </div>

          {/* القسم الأيمن - الملخص */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* بيانات العميل / المورد */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                {invoiceType === 'purchase' ? <Building2 className="w-5 h-5 text-primary-600" /> : <User className="w-5 h-5 text-primary-600" />}
                {invoiceType === 'purchase' ? 'المورد' : 'العميل'}
              </h3>
              
              {invoiceType === 'purchase' ? (
                supplier ? (
                  <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-surface-900 dark:text-white">{supplier.name}</p>
                      <p className="text-sm text-surface-500">{supplier.phone}</p>
                    </div>
                    <button type="button" onClick={() => setSupplier(null)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <SupplierSearch onSelect={setSupplier} />
                    <p className="text-sm text-surface-500 dark:text-surface-400 text-center">اختر المورد</p>
                  </div>
                )
              ) : customer ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-surface-900 dark:text-white">{customer.name}</p>
                      <p className="text-sm text-surface-500">{customer.phone}</p>
                    </div>
                    <button type="button" onClick={() => setCustomer(null)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <CustomerSearch onSelect={setCustomer} />
                  <p className="text-sm text-surface-500 dark:text-surface-400 text-center">
                    ابحث واختر عميلاً من القائمة، أو اترك فارغاً للعميل النقدي
                  </p>
                </div>
              )}
            </div>

            {/* الخصم */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-surface-900 dark:text-white mb-4">الخصم</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-4 py-2 border border-surface-300 rounded-xl text-center font-medium"
                  placeholder="0"
                  min="0"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="px-4 py-2 border border-surface-300 rounded-xl"
                >
                  <option value="amount">د.ع</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>

            {/* الملخص المالي */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 text-white shadow-lg">
              <h3 className="font-bold text-white/90 mb-4">ملخص الفاتورة</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-white/80">
                  <span>المجموع الفرعي</span>
                  <span>{formatNumber(subtotal)} د.ع</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-200">
                    <span>الخصم</span>
                    <span>- {formatNumber(discountAmount)} د.ع</span>
                  </div>
                )}
                
                {invoiceType === 'installment' && (
                  <>
                    <div className="flex justify-between text-purple-200">
                      <span>رسوم المنصة ({installmentPlatforms.find(p => p.id === platform)?.fee}%)</span>
                      <span>+ {formatNumber(platformFee)} د.ع</span>
                    </div>
                    {downPayment > 0 && (
                      <div className="flex justify-between text-white/80">
                        <span>المقدمة ({installmentPlatforms.find(p => p.id === platform)?.downPayment}%)</span>
                        <span>{formatNumber(downPayment)} د.ع</span>
                      </div>
                    )}
                  </>
                )}
                
                <div className="border-t border-white/20 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">الإجمالي</span>
                    <span className="text-3xl font-bold">{formatNumber(total)}</span>
                  </div>
                  <p className="text-left text-white/60 text-sm">دينار عراقي</p>
                </div>
                
                {showBuyPrice && (
                  <div className="border-t border-white/20 pt-3 mt-3">
                    <div className="flex justify-between text-white/80">
                      <span>التكلفة</span>
                      <span>{formatNumber(totalCost)} د.ع</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="font-medium">الربح</span>
                      <span className={clsx(
                        'font-bold',
                        profit >= 0 ? 'text-emerald-300' : 'text-red-300'
                      )}>
                        {formatNumber(profit)} د.ع
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ملاحظات */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-surface-900 dark:text-white mb-4">ملاحظات</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-surface-300 rounded-xl resize-none focus:ring-2 focus:ring-primary-500"
                placeholder="ملاحظات إضافية..."
              />
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={items.length === 0}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg transition-all',
                  items.length > 0
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-surface-200 text-surface-400 cursor-not-allowed'
                )}
              >
                <Check className="w-6 h-6" />
                حفظ
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg bg-blue-600 text-white hover:bg-blue-700 transition-all">
                <Printer className="w-6 h-6" />
                طباعة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
