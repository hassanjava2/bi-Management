/**
 * BI Management - Device Inspection Form
 * واجهة فحص الجهاز — مقارنة مواصفات متوقعة vs فعلية + صور + اختلافات
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, XCircle, AlertTriangle, Camera,
  Cpu, HardDrive, Monitor, Battery, Keyboard, Laptop,
  Loader2, Save
} from 'lucide-react'
import { clsx } from 'clsx'
import Button from '../common/Button'
import { inventoryAPI } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const conditionOptions = [
  { value: 'excellent', label: 'ممتاز', color: 'text-emerald-600 bg-emerald-50' },
  { value: 'good', label: 'جيد', color: 'text-blue-600 bg-blue-50' },
  { value: 'fair', label: 'متوسط', color: 'text-amber-600 bg-amber-50' },
  { value: 'poor', label: 'سيء', color: 'text-red-600 bg-red-50' },
]

const resultOptions = [
  { value: 'pass', label: 'مطابق — جاهز للتجهيز', icon: CheckCircle2, color: 'bg-emerald-600' },
  { value: 'pass_with_notes', label: 'قبول مع ملاحظات', icon: AlertTriangle, color: 'bg-amber-600' },
  { value: 'fail', label: 'معيب — للمخزن المعيب', icon: XCircle, color: 'bg-red-600' },
  { value: 'return_to_supplier', label: 'إرجاع للمورد', icon: XCircle, color: 'bg-red-800' },
]

const specFields = [
  { key: 'processor', label: 'المعالج', icon: Cpu, placeholder: 'مثال: i7-1165G7' },
  { key: 'processor_gen', label: 'الجيل', icon: Cpu, placeholder: 'مثال: 11' },
  { key: 'ram_size', label: 'الرام (GB)', icon: HardDrive, placeholder: 'مثال: 16', type: 'number' },
  { key: 'ram_type', label: 'نوع الرام', icon: HardDrive, placeholder: 'DDR4 / DDR5' },
  { key: 'storage_size', label: 'التخزين (GB)', icon: HardDrive, placeholder: 'مثال: 512', type: 'number' },
  { key: 'storage_type', label: 'نوع التخزين', icon: HardDrive, placeholder: 'SSD / HDD / NVMe' },
  { key: 'screen_size', label: 'حجم الشاشة', icon: Monitor, placeholder: 'مثال: 15.6' },
  { key: 'screen_type', label: 'نوع الشاشة', icon: Monitor, placeholder: 'Touch / Non-touch / 2K / 4K' },
  { key: 'graphics', label: 'كرت الشاشة', icon: Monitor, placeholder: 'مثال: Intel Iris Xe' },
]

export default function InspectionForm({ device, onClose, onSuccess }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  // المواصفات الفعلية
  const [specs, setSpecs] = useState(() => {
    const initial = {}
    specFields.forEach(f => { initial[f.key] = '' })
    return initial
  })

  // حالة الجهاز الفيزيائية
  const [condition, setCondition] = useState({
    screen: 'good',
    keyboard: 'good',
    body: 'good',
    battery_health: '',
  })

  // الاختلافات
  const [discrepancies, setDiscrepancies] = useState([])

  // النتيجة النهائية
  const [result, setResult] = useState('')
  const [notes, setNotes] = useState('')

  const inspectMutation = useMutation({
    mutationFn: (data) => {
      const fn = inventoryAPI.inspectDevice || ((id, body) =>
        import('../../services/api').then(m => m.default.post(`/inventory/devices/${id}/inspect`, body))
      )
      return typeof fn === 'function' && fn.length === 2
        ? fn(device.id, data)
        : import('../../services/api').then(m => m.default.post(`/inventory/devices/${device.id}/inspect`, data))
    },
    onSuccess: () => {
      toast.success('تم حفظ نتيجة الفحص')
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onSuccess?.()
      onClose?.()
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'فشل حفظ الفحص'),
  })

  const handleSubmit = () => {
    if (!result) {
      toast.warning('اختر نتيجة الفحص')
      return
    }
    inspectMutation.mutate({
      result,
      actual_specs: specs,
      condition,
      discrepancies,
      condition_notes: notes,
    })
  }

  // إضافة اختلاف
  const addDiscrepancy = () => {
    setDiscrepancies([...discrepancies, { spec: '', expected: '', actual: '', action: 'accept' }])
  }

  const updateDiscrepancy = (index, field, value) => {
    const newList = [...discrepancies]
    newList[index] = { ...newList[index], [field]: value }
    setDiscrepancies(newList)
  }

  const removeDiscrepancy = (index) => {
    setDiscrepancies(discrepancies.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto">
      {/* معلومات الجهاز */}
      <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Laptop className="w-8 h-8 text-primary-600" />
          <div>
            <p className="font-bold text-primary-900 dark:text-primary-100">{device?.product_name || device?.serial_number || 'جهاز'}</p>
            <p className="text-sm text-primary-600 dark:text-primary-400 font-mono">{device?.serial_number}</p>
          </div>
        </div>
      </div>

      {/* المواصفات الفعلية */}
      <div>
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary-600" />
          المواصفات الفعلية (بعد الفحص)
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {specFields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-neutral-500 mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={specs[f.key]}
                onChange={(e) => setSpecs(s => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* الحالة الفيزيائية */}
      <div>
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary-600" />
          الحالة الفيزيائية
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'screen', label: 'الشاشة', icon: Monitor },
            { key: 'keyboard', label: 'الكيبورد', icon: Keyboard },
            { key: 'body', label: 'الهيكل', icon: Laptop },
          ].map(item => (
            <div key={item.key}>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">{item.label}</label>
              <div className="flex gap-1.5">
                {conditionOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCondition(c => ({ ...c, [item.key]: opt.value }))}
                    className={clsx(
                      'px-2 py-1 rounded-lg text-xs font-medium transition-all',
                      condition[item.key] === opt.value ? opt.color + ' ring-2 ring-offset-1' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">صحة البطارية %</label>
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-neutral-400" />
              <input
                type="number"
                value={condition.battery_health}
                onChange={(e) => setCondition(c => ({ ...c, battery_health: e.target.value }))}
                placeholder="85"
                min="0" max="100"
                className="w-20 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-center text-sm"
              />
              <span className="text-sm text-neutral-500">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* الاختلافات */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            الاختلافات المكتشفة
          </h4>
          <button type="button" onClick={addDiscrepancy}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium">
            + إضافة اختلاف
          </button>
        </div>
        {discrepancies.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-3">لا توجد اختلافات — الجهاز مطابق للمتوقع</p>
        )}
        {discrepancies.map((d, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-2 items-end">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">المواصفة</label>
              <input value={d.spec} onChange={(e) => updateDiscrepancy(i, 'spec', e.target.value)}
                placeholder="مثال: الرام" className="w-full px-2 py-1.5 border rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">متوقع</label>
              <input value={d.expected} onChange={(e) => updateDiscrepancy(i, 'expected', e.target.value)}
                placeholder="32GB" className="w-full px-2 py-1.5 border rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">فعلي</label>
              <input value={d.actual} onChange={(e) => updateDiscrepancy(i, 'actual', e.target.value)}
                placeholder="16GB" className="w-full px-2 py-1.5 border rounded-lg text-xs" />
            </div>
            <div className="flex gap-1">
              <select value={d.action} onChange={(e) => updateDiscrepancy(i, 'action', e.target.value)}
                className="flex-1 px-2 py-1.5 border rounded-lg text-xs">
                <option value="accept">قبول</option>
                <option value="compensate">تعويض</option>
                <option value="return">إرجاع</option>
              </select>
              <button type="button" onClick={() => removeDiscrepancy(i)}
                className="px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* ملاحظات */}
      <div>
        <label className="block text-sm font-medium mb-1">ملاحظات الفحص</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="ملاحظات إضافية عن الجهاز..."
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-sm resize-none"
        />
      </div>

      {/* النتيجة النهائية */}
      <div>
        <h4 className="font-bold text-sm mb-3">نتيجة الفحص</h4>
        <div className="grid grid-cols-2 gap-2">
          {resultOptions.map(opt => {
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setResult(opt.value)}
                className={clsx(
                  'flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-right text-sm',
                  result === opt.value
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300'
                )}
              >
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-white', opt.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* أزرار الحفظ */}
      <div className="flex gap-3 pt-2 border-t">
        <Button onClick={handleSubmit} disabled={inspectMutation.isPending} className="flex-1">
          {inspectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
          حفظ نتيجة الفحص
        </Button>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
      </div>
    </div>
  )
}
