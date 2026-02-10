/**
 * BI Management - Settings Page
 * صفحة الإعدادات
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, Loader2, Printer, Building2, DollarSign } from 'lucide-react'
import PageShell from '../components/common/PageShell'
import Button from '../components/common/Button'
import FormField from '../components/common/FormField'
import Card from '../components/common/Card'
import { settingsAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editingKey, setEditingKey] = useState(null)
  const [editValue, setEditValue] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll().then((r) => r.data?.data || {}),
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, value }) => settingsAPI.update(key, value),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries(['settings'])
      setEditingKey(null)
      toast.success('تم حفظ الإعداد')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'فشل الحفظ')
    },
  })

  const settings = data || {}
  const categories = Object.keys(settings)

  const handleSave = (key) => {
    updateMutation.mutate({ key, value: editValue })
  }

  if (isLoading) {
    return (
      <PageShell title="الإعدادات" description="إعدادات النظام">
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="الإعدادات"
      description="إعدادات النظام حسب الفئة"
    >
      <div className="space-y-6">
        {/* إعدادات الطباعة */}
        <PrintSettings />

        {/* إعدادات النظام */}
        {categories.length === 0 ? (
          <Card>
            <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">لا توجد إعدادات مسجلة</p>
          </Card>
        ) : (
          categories.map((category) => (
            <Card key={category} padding>
              <Card.Title className="capitalize">{category || 'عام'}</Card.Title>
              <Card.Body>
                <div className="space-y-4">
                  {Object.entries(settings[category] || {}).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-neutral-100 dark:border-neutral-700 pb-4 last:border-0 last:pb-0">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:w-48">{key}</label>
                      {editingKey === key ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-input bg-white dark:bg-neutral-800"
                          />
                          <Button size="sm" onClick={() => handleSave(key)} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingKey(null)}>إلغاء</Button>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-neutral-900 dark:text-white">{String(value)}</span>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingKey(key); setEditValue(String(value)) }}>
                            تعديل
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          ))
        )}
      </div>
    </PageShell>
  )
}

// إعدادات الطباعة
function PrintSettings() {
  const toast = useToast()
  const [printConfig, setPrintConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bi-print-config') || '{}')
    } catch { return {} }
  })

  const updateConfig = (key, value) => {
    const newConfig = { ...printConfig, [key]: value }
    setPrintConfig(newConfig)
    localStorage.setItem('bi-print-config', JSON.stringify(newConfig))
  }

  const handleSave = () => {
    localStorage.setItem('bi-print-config', JSON.stringify(printConfig))
    toast.success('تم حفظ إعدادات الطباعة')
  }

  const field = (label, key, placeholder = '', type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{label}</label>
      <input
        type={type}
        value={printConfig[key] || ''}
        onChange={(e) => updateConfig(key, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
      />
    </div>
  )

  return (
    <Card padding>
      <div className="flex items-center gap-2 mb-4">
        <Printer className="w-5 h-5 text-primary-600" />
        <h3 className="font-bold text-lg">إعدادات الطباعة</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-neutral-500 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> معلومات الشركة
          </h4>
          {field('اسم الشركة', 'company_name', 'BI Company')}
          {field('العنوان', 'company_address', 'بغداد، العراق')}
          {field('رقم الهاتف', 'company_phone', '+964 XXX XXX XXXX')}
          {field('البريد الإلكتروني', 'company_email', 'info@bicompany.com')}
        </div>
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-neutral-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> إعدادات مالية
          </h4>
          {field('العملة الافتراضية', 'default_currency', 'IQD')}
          {field('سعر صرف الدولار', 'usd_exchange_rate', '1480', 'number')}
          {field('نسبة الضريبة %', 'tax_rate', '0', 'number')}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">قالب الطباعة الافتراضي</label>
            <select
              value={printConfig.default_template || 'a4'}
              onChange={(e) => updateConfig('default_template', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
            >
              <option value="a4">A4 كامل</option>
              <option value="thermal">حراري (80mm)</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-4 pt-4 border-t">
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 ml-2" />
          حفظ الإعدادات
        </Button>
      </div>
    </Card>
  )
}
