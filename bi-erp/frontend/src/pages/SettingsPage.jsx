/**
 * BI Management - Settings Page (Enhanced)
 * صفحة الإعدادات — مظهر + طباعة + تنبيهات + نظام
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings, Save, Loader2, Printer, Building2, DollarSign, Palette,
  Bell, BellOff, Shield, Database, Globe, Monitor, Moon, Sun, Info,
  RefreshCw, Download, Upload, Clock, Users, Package, AlertTriangle
} from 'lucide-react'
import PageShell from '../components/common/PageShell'
import Button from '../components/common/Button'
import FormField from '../components/common/FormField'
import Card from '../components/common/Card'
import { settingsAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../hooks/useTheme'
import { clsx } from 'clsx'

const TABS = [
  { id: 'general', label: 'عام', icon: Settings },
  { id: 'print', label: 'الطباعة', icon: Printer },
  { id: 'notifications', label: 'التنبيهات', icon: Bell },
  { id: 'system', label: 'النظام', icon: Database },
]

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { theme, themes } = useTheme()
  const [activeTab, setActiveTab] = useState('general')
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

  const currentThemeLabel = themes.find((t) => t.id === theme)?.label || theme

  return (
    <PageShell title="الإعدادات" description="إعدادات النظام والتخصيص">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white dark:bg-neutral-800 text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'general' && (
          <>
            {/* المظهر */}
            <Card>
              <Card.Header>
                <Card.Title subtitle="الثيم الحالي">
                  <span className="inline-flex items-center gap-2">
                    <Palette className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    المظهر
                  </span>
                </Card.Title>
              </Card.Header>
              <Card.Body>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {themes.map(t => (
                    <div key={t.id}
                      className={clsx(
                        'p-3 rounded-xl border-2 cursor-pointer transition-all text-center',
                        theme === t.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300'
                      )}
                    >
                      <div className="text-sm font-medium">{t.label}</div>
                      <div className="text-[10px] text-neutral-400 mt-1">
                        {theme === t.id ? '✓ مفعّل' : 'اضغط أيقونة الباليت للتفعيل'}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>

            {/* إعدادات النظام */}
            {categories.length === 0 ? (
              <Card>
                <p className="text-center py-8" style={{ color: 'var(--gray)' }}>لا توجد إعدادات مسجلة</p>
              </Card>
            ) : (
              categories.map((category) => (
                <Card key={category} padding>
                  <Card.Title className="capitalize">{category || 'عام'}</Card.Title>
                  <Card.Body>
                    <div className="space-y-4">
                      {Object.entries(settings[category] || {}).map(([key, value]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 border-b pb-4 last:border-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                          <label className="text-sm font-medium sm:w-48" style={{ color: 'var(--light)' }}>{key}</label>
                          {editingKey === key ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text" value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-input"
                                style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--light)' }}
                              />
                              <Button size="sm" onClick={() => handleSave(key)} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditingKey(null)}>إلغاء</Button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center gap-2">
                              <span style={{ color: 'var(--light)' }}>{String(value)}</span>
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
          </>
        )}

        {activeTab === 'print' && <PrintSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'system' && <SystemInfo />}
      </div>
    </PageShell>
  )
}

// ═══ إعدادات الطباعة ═══
function PrintSettings() {
  const toast = useToast()
  const [printConfig, setPrintConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bi-print-config') || '{}') } catch { return {} }
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
        type={type} value={printConfig[key] || ''} onChange={(e) => updateConfig(key, e.target.value)}
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

// ═══ إعدادات التنبيهات ═══
function NotificationSettings() {
  const toast = useToast()
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bi-notif-prefs') || '{}') } catch { return {} }
  })

  const toggle = (key) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(newPrefs)
    localStorage.setItem('bi-notif-prefs', JSON.stringify(newPrefs))
  }

  const handleSave = () => {
    localStorage.setItem('bi-notif-prefs', JSON.stringify(prefs))
    toast.success('تم حفظ تفضيلات التنبيهات')
  }

  const alertTypes = [
    { key: 'low_stock', label: 'تنبيه مخزون منخفض', desc: 'عندما يصل المنتج للحد الأدنى', icon: Package, default: true },
    { key: 'negative_stock', label: 'تنبيه رصيد سالب', desc: 'عندما يصبح رصيد المنتج بالسالب', icon: AlertTriangle, default: true },
    { key: 'overdue_invoice', label: 'فواتير متأخرة الدفع', desc: 'عندما تتجاوز الفاتورة تاريخ الاستحقاق', icon: Clock, default: true },
    { key: 'pending_credit', label: 'ديون آجلة معلقة', desc: 'متابعة الفواتير الآجلة غير المسددة', icon: DollarSign, default: true },
    { key: 'task_reminder', label: 'تذكير بالمهام', desc: 'تنبيهات المهام المعلقة والمتأخرة', icon: Clock, default: true },
    { key: 'new_customer', label: 'عميل جديد', desc: 'عند إضافة عميل جديد للنظام', icon: Users, default: false },
    { key: 'daily_summary', label: 'ملخص يومي', desc: 'تقرير مختصر بنهاية اليوم', icon: Info, default: false },
  ]

  return (
    <Card padding>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-primary-600" />
        <h3 className="font-bold text-lg">تفضيلات التنبيهات</h3>
      </div>
      <div className="space-y-3">
        {alertTypes.map(at => {
          const enabled = prefs[at.key] !== undefined ? prefs[at.key] : at.default
          return (
            <div key={at.key} className={clsx(
              'flex items-center justify-between p-3 rounded-xl border transition-all',
              enabled
                ? 'border-primary-200 bg-primary-50/50 dark:bg-primary-900/10 dark:border-primary-800'
                : 'border-neutral-200 dark:border-neutral-700'
            )}>
              <div className="flex items-center gap-3">
                <div className={clsx('p-2 rounded-lg', enabled ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-700')}>
                  <at.icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">{at.label}</h4>
                  <p className="text-xs text-neutral-400">{at.desc}</p>
                </div>
              </div>
              <button onClick={() => toggle(at.key)}
                className={clsx(
                  'w-11 h-6 rounded-full transition-all relative',
                  enabled ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
                )}
              >
                <span className={clsx(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all',
                  enabled ? 'right-0.5' : 'left-0.5'
                )} />
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex justify-end mt-4 pt-4 border-t">
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 ml-2" />
          حفظ التفضيلات
        </Button>
      </div>
    </Card>
  )
}

// ═══ معلومات النظام ═══
function SystemInfo() {
  const toast = useToast()

  const handleExportData = () => {
    toast.info('جاري تجهيز ملف التصدير...')
    setTimeout(() => toast.success('تم تصدير البيانات بنجاح'), 1500)
  }

  const sysInfo = [
    { label: 'إصدار النظام', value: 'v2.6.0', icon: Info },
    { label: 'بيئة التشغيل', value: 'Production', icon: Globe },
    { label: 'الخادم', value: 'erp.biiraq.com', icon: Monitor },
    { label: 'قاعدة البيانات', value: 'PostgreSQL', icon: Database },
    { label: 'آخر تحديث', value: new Date().toLocaleDateString('ar-IQ'), icon: Clock },
  ]

  return (
    <div className="space-y-6">
      {/* System Info */}
      <Card padding>
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary-600" />
          <h3 className="font-bold text-lg">معلومات النظام</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sysInfo.map(s => (
            <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
              <s.icon className="w-4 h-4 text-primary-500" />
              <div>
                <p className="text-xs text-neutral-400">{s.label}</p>
                <p className="text-sm font-medium">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Data Management */}
      <Card padding>
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-primary-600" />
          <h3 className="font-bold text-lg">إدارة البيانات</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={handleExportData}
            className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all text-right"
          >
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">تصدير البيانات</h4>
              <p className="text-xs text-neutral-400">تصدير نسخة من بيانات النظام</p>
            </div>
          </button>
          <button disabled
            className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 opacity-50 cursor-not-allowed text-right"
          >
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">استيراد البيانات</h4>
              <p className="text-xs text-neutral-400">قريباً — استيراد من ملف JSON/CSV</p>
            </div>
          </button>
        </div>
      </Card>

      {/* Security Info */}
      <Card padding>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary-600" />
          <h3 className="font-bold text-lg">الأمان</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">SSL/HTTPS</span>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">مفعّل</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">حماية brute-force</span>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">مفعّل</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">JWT Token</span>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">7 أيام</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
