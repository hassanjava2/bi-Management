import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, XCircle, CheckCircle2, Printer } from 'lucide-react'
import Button from '../common/Button'
import { salesAPI, inventoryAPI, customersAPI, suppliersAPI } from '../../services/api'

export default function NewInvoiceForm({ type, onClose, onSuccess }) {
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

  const addItem = () => setItems([...items, { id: Date.now(), product_id: (products[0]?.id || ''), serial: '', product: '', qty: 1, price: 0, upgrades: [] }])
  const updateItem = (index, field, value) => {
    setItems(items.map((it, i) => {
      if (i !== index) return it
      const updated = { ...it, [field]: value }
      if (field === 'qty') updated.qty = Number(updated.qty) || 1
      if (field === 'price') updated.price = parseFloat(updated.price) || 0
      return updated
    }))
  }
  const setItemProduct = (index, productId) => {
    const p = products.find(pr => pr.id === productId)
    const next = [...items]
    next[index] = { ...next[index], product_id: productId, price: p?.price != null ? p.price : next[index].price }
    setItems(next)
  }
  const calculateTotal = () => items.reduce((sum, item) => sum + ((item.qty || 1) * (item.price || 0)), 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    setValidationError('')
    const partyId = type === 'purchase' ? supplierId : customerId
    if (!partyId) { setValidationError(type === 'purchase' ? 'اختر المورد' : 'اختر الزبون'); return }
    if (!items.length) { setValidationError('أضف منتجا واحدا على الاقل'); return }
    const total = calculateTotal()
    createMutation.mutate({
      type: type === 'purchase' ? 'purchase' : 'sale',
      customer_id: type === 'purchase' ? null : partyId,
      supplier_id: type === 'purchase' ? partyId : null,
      payment_method: paymentMethod,
      subtotal: total, discount_amount: 0, tax_amount: 0, total,
      paid_amount: paymentMethod === 'cash' ? total : 0,
      remaining_amount: paymentMethod === 'cash' ? 0 : total,
      items: items.map(i => ({ product_id: i.product_id || (products[0]?.id || '1'), quantity: i.qty || 1, unit_price: i.price || 0 })),
    })
  }

  const displayError = validationError || (createMutation.isError ? (createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطا') : '')

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {displayError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{displayError}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{type === 'purchase' ? 'المورد' : 'الزبون'}</label>
          <select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={type === 'purchase' ? supplierId : customerId} onChange={(e) => { const val = e.target.value; if (type === 'purchase') { setSupplierId(val); setSelectedCustomer(suppliers.find(s => s.id === val)) } else { setCustomerId(val); setSelectedCustomer(customers.find(c => c.id === val)) } }}>
            <option value="">اختر...</option>
            {(type === 'purchase' ? suppliers : customers).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">طريقة الدفع</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700">
            <option value="cash">نقدي</option><option value="credit">آجل</option><option value="installment">أقساط</option><option value="transfer">تحويل</option>
          </select>
        </div>
      </div>
      {paymentMethod === 'installment' && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <label className="block text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">منصة الأقساط</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" value="aqsaty" checked={installmentPlatform === 'aqsaty'} onChange={(e) => setInstallmentPlatform(e.target.value)} className="text-purple-600" /><span>أقساطي (15%)</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" value="jenny" checked={installmentPlatform === 'jenny'} onChange={(e) => setInstallmentPlatform(e.target.value)} className="text-purple-600" /><span>جني (11.5%)</span></label>
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">المنتجات</label>
          <Button type="button" size="sm" onClick={addItem}><Plus className="w-4 h-4 ml-1" /> إضافة منتج</Button>
        </div>
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-700/50"><tr><th className="px-3 py-2 text-right text-sm font-medium text-neutral-500">السيريال</th><th className="px-3 py-2 text-right text-sm font-medium text-neutral-500">المنتج</th><th className="px-3 py-2 text-right text-sm font-medium text-neutral-500 w-20">الكمية</th><th className="px-3 py-2 text-right text-sm font-medium text-neutral-500 w-32">السعر</th><th className="px-3 py-2 text-right text-sm font-medium text-neutral-500 w-24">المجموع</th><th className="px-3 py-2 w-10"></th></tr></thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {items.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-6 text-center text-neutral-500">اضغط "إضافة منتج" لإضافة منتجات للفاتورة</td></tr>
              ) : items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-3 py-2"><input type="text" placeholder="مسح أو إدخال..." className="w-full px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded text-sm" /></td>
                  <td className="px-3 py-2"><select className="w-full px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded text-sm" value={item.product_id || ''} onChange={(e) => setItemProduct(index, e.target.value)}><option value="">اختر المنتج</option>{products.map(p => <option key={p.id} value={p.id}>{p.name || p.product_name}</option>)}</select></td>
                  <td className="px-3 py-2"><input type="number" value={item.qty} min="1" className="w-full px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-center" onChange={(e) => updateItem(index, 'qty', e.target.value)} /></td>
                  <td className="px-3 py-2"><input type="number" placeholder="0" className="w-full px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded text-sm" value={item.price || ''} onChange={(e) => updateItem(index, 'price', e.target.value)} /></td>
                  <td className="px-3 py-2 font-medium">{(item.qty * item.price).toLocaleString()}</td>
                  <td className="px-3 py-2"><button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-1 hover:bg-red-100 rounded text-red-500"><XCircle className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
        <div className="flex justify-between items-center text-lg font-bold"><span>المجموع الكلي:</span><span className="text-primary-600">{calculateTotal().toLocaleString()} د.ع</span></div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="button" variant="outline"><Printer className="w-4 h-4 ml-2" /> معاينة</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري الحفظ...' : (<><CheckCircle2 className="w-4 h-4 ml-2" /> حفظ الفاتورة</>)}</Button>
      </div>
    </form>
  )
}
