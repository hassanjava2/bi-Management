import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import Button from '../common/Button'
import Spinner from '../common/Spinner'
import { inventoryAPI, suppliersAPI } from '../../services/api'
import { deviceStatuses, warehouses } from './inventoryConstants'

export function AddDeviceForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({ product_id: '', serial_number: '', supplier_id: '', purchase_price: '', warehouse_id: 'main' })
  const { data: productsRes } = useQuery({ queryKey: ['inventory-products'], queryFn: () => inventoryAPI.getProducts() })
  const { data: suppliersRes } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersAPI.getSuppliers() })
  const products = productsRes?.data?.data || []
  const suppliers = suppliersRes?.data?.data || []
  const createMutation = useMutation({ mutationFn: (data) => inventoryAPI.createDevice(data), onSuccess: () => onSuccess?.() })
  const handleSubmit = (e) => { e.preventDefault(); if (!form.product_id) return; createMutation.mutate({ product_id: form.product_id, serial_number: form.serial_number || undefined, supplier_id: form.supplier_id || undefined, purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : undefined, warehouse_id: form.warehouse_id || 'main' }) }
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {createMutation.isError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ'}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">المنتج</label><select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={form.product_id} onChange={(e) => setForm(f => ({ ...f, product_id: e.target.value }))} required><option value="">اختر المنتج...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name || p.name_ar}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">السيريال</label><input type="text" placeholder="BI-2025-XXXXXX" className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={form.serial_number} onChange={(e) => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
        <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">المورد</label><select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={form.supplier_id} onChange={(e) => setForm(f => ({ ...f, supplier_id: e.target.value }))}><option value="">اختر المورد...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">سعر الشراء</label><input type="number" placeholder="0" className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={form.purchase_price} onChange={(e) => setForm(f => ({ ...f, purchase_price: e.target.value }))} /></div>
        <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">المخزن</label><select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={form.warehouse_id} onChange={(e) => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>{warehouses.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}</select></div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الجهاز'}</Button></div>
    </form>
  )
}

export function EditDeviceForm({ device, onClose, onSuccess }) {
  const [form, setForm] = useState({ serial_number: device?.serial_number ?? '', status: device?.status ?? 'available', warehouse_id: device?.warehouse_id ?? 'main' })
  const updateMutation = useMutation({ mutationFn: (data) => inventoryAPI.updateDevice(device.id, data), onSuccess: () => onSuccess?.() })
  const handleSubmit = (e) => { e.preventDefault(); updateMutation.mutate({ serial_number: form.serial_number?.trim() || undefined, status: form.status, warehouse_id: form.warehouse_id }) }
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {updateMutation.isError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{updateMutation.error?.response?.data?.error || updateMutation.error?.message || 'حدث خطأ'}</div>}
      <div className="grid grid-cols-1 gap-4">
        <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">السيريال</label><input type="text" className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={form.serial_number} onChange={(e) => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
        <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الحالة</label><select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>{Object.entries(deviceStatuses).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">المخزن</label><select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={form.warehouse_id} onChange={(e) => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>{warehouses.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}</select></div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button></div>
    </form>
  )
}

export function TransferDeviceForm({ device, onClose, onSuccess }) {
  const [form, setForm] = useState({ warehouse_id: device?.warehouse_id ?? 'main', reason: '' })
  const transferMutation = useMutation({ mutationFn: (data) => inventoryAPI.transferDevice(device.id, data), onSuccess: () => onSuccess?.() })
  const handleSubmit = (e) => { e.preventDefault(); if (!form.warehouse_id) return; transferMutation.mutate({ warehouse_id: form.warehouse_id, reason: form.reason || undefined }) }
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {transferMutation.isError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{transferMutation.error?.response?.data?.error || transferMutation.error?.message || 'حدث خطأ'}</div>}
      <p className="text-sm text-neutral-600 dark:text-neutral-400">نقل الجهاز <strong className="text-neutral-900 dark:text-white">{device?.serial_number}</strong> إلى مخزن آخر.</p>
      <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">المخزن الهدف</label><select className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={form.warehouse_id} onChange={(e) => setForm(f => ({ ...f, warehouse_id: e.target.value }))} required>{warehouses.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}</select></div>
      <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">السبب (اختياري)</label><input type="text" placeholder="مثال: نقل للتجهيز" className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
      <div className="flex justify-end gap-2 pt-4 border-t"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={transferMutation.isPending}>{transferMutation.isPending ? 'جاري النقل...' : 'نقل'}</Button></div>
    </form>
  )
}

export function DeleteDeviceConfirm({ device, onClose, onSuccess }) {
  const deleteMutation = useMutation({ mutationFn: () => inventoryAPI.deleteDevice(device.id), onSuccess: () => onSuccess?.() })
  return (
    <div className="space-y-4">
      <p className="text-neutral-600 dark:text-neutral-400">هل أنت متأكد من حذف الجهاز <strong className="text-neutral-900 dark:text-white">{device.serial_number}</strong> ({device.product_name})؟ لا يمكن التراجع.</p>
      {deleteMutation.isError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{deleteMutation.error?.response?.data?.error || deleteMutation.error?.message || 'حدث خطأ'}</div>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>إلغاء</Button><Button variant="danger" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}</Button></div>
    </div>
  )
}

export function DeviceDetails({ device, onEdit, onDelete, onTransfer, onClose }) {
  const [activeTab, setActiveTab] = useState('info')
  const status = deviceStatuses[device.status] || deviceStatuses.new
  const { data: historyRes, isLoading: historyLoading } = useQuery({ queryKey: ['device-history', device.id], queryFn: () => inventoryAPI.getDeviceHistory(device.id), enabled: activeTab === 'history' && !!device.id })
  const historyList = historyRes?.data?.data ?? []
  const tabs = [{ id: 'info', label: 'المعلومات' }, { id: 'history', label: 'السجل' }, { id: 'photos', label: 'الصور' }, { id: 'maintenance', label: 'الصيانة' }]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center"><Package className="w-8 h-8 text-neutral-400" /></div>
          <div><h3 className="text-xl font-bold text-neutral-900 dark:text-white">{device.product_name || 'Dell Latitude 7410'}</h3><p className="font-mono text-primary-600 dark:text-primary-400">{device.serial_number}</p></div>
        </div>
        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}><status.icon className="w-4 h-4" />{status.label}</span>
      </div>
      <div className="border-b border-neutral-200 dark:border-neutral-700"><nav className="flex gap-4">{tabs.map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 border-b-2 font-medium ${activeTab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'}`}>{t.label}</button>)}</nav></div>
      {activeTab === 'history' && (
        <div className="min-h-[120px]">
          {historyLoading ? <div className="flex justify-center py-8"><Spinner size="md" /></div> : historyList.length === 0 ? <p className="text-center text-neutral-500 py-6">لا توجد سجلات لهذا الجهاز.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-neutral-50 dark:bg-neutral-700/50"><tr><th className="px-3 py-2 text-right text-neutral-500">التاريخ</th><th className="px-3 py-2 text-right text-neutral-500">الإجراء</th><th className="px-3 py-2 text-right text-neutral-500">ملاحظات</th></tr></thead><tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">{historyList.map((h, i) => <tr key={h.id || i}><td className="px-3 py-2">{h.created_at ? new Date(h.created_at).toLocaleString('ar-IQ') : '\u2014'}</td><td className="px-3 py-2">{h.action || h.type || '\u2014'}</td><td className="px-3 py-2">{h.notes || '\u2014'}</td></tr>)}</tbody></table></div>
          )}
        </div>
      )}
      {activeTab === 'info' && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-neutral-500">المنتج:</span> <strong>{device.product_name}</strong></div>
          <div><span className="text-neutral-500">البراند:</span> {device.brand} {device.model}</div>
          <div><span className="text-neutral-500">المعالج:</span> {device.processor || '-'}</div>
          <div><span className="text-neutral-500">الرام:</span> {device.ram_size || '-'}GB</div>
          <div><span className="text-neutral-500">التخزين:</span> {device.storage_size || '-'}GB</div>
          <div><span className="text-neutral-500">المخزن:</span> {warehouses.find(w => w.id === device.warehouse_id)?.name || 'الرئيسي'}</div>
          <div><span className="text-neutral-500">الذمة:</span> {device.custody_employee || '-'}</div>
        </div>
      )}
      {activeTab === 'photos' && <p className="text-center text-neutral-500 py-6">لا توجد صور بعد.</p>}
      {activeTab === 'maintenance' && <p className="text-center text-neutral-500 py-6">لا توجد سجلات صيانة.</p>}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onEdit}>تعديل</Button>
        <Button variant="outline" onClick={onTransfer}>نقل</Button>
        <Button variant="danger" onClick={onDelete}>حذف</Button>
        <Button variant="outline" onClick={onClose}>إغلاق</Button>
      </div>
    </div>
  )
}
