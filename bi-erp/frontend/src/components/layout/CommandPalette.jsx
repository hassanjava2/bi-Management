import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  BarChart3,
  Receipt,
  ShoppingCart,
  Package,
  RefreshCw,
  UserCircle,
  Building2,
  Truck,
  Wrench,
  DollarSign,
  Calculator,
  Users,
  Clock,
  CheckSquare,
  GraduationCap,
  Trophy,
  FileCheck,
  Boxes,
  CreditCard,
  Shield,
  Activity,
  Settings,
  Bot,
  Bell,
  Workflow,
} from 'lucide-react'

const pageTitles = [
  { path: '/dashboard', title: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/executive-dashboard', title: 'لوحة المدير التنفيذي', icon: BarChart3 },
  { path: '/sales', title: 'المبيعات', icon: Receipt },
  { path: '/sales/new', title: 'فاتورة جديدة', icon: Receipt },
  { path: '/sales/waiting', title: 'فواتير الانتظار', icon: Receipt },
  { path: '/purchases', title: 'المشتريات', icon: ShoppingCart },
  { path: '/purchases/new', title: 'فاتورة مشتريات جديدة', icon: ShoppingCart },
  { path: '/inventory', title: 'المخزون', icon: Package },
  { path: '/returns', title: 'المرتجعات', icon: RefreshCw },
  { path: '/customers', title: 'العملاء', icon: UserCircle },
  { path: '/suppliers', title: 'الموردين', icon: Building2 },
  { path: '/delivery', title: 'التوصيل', icon: Truck },
  { path: '/warranty', title: 'الضمان', icon: Wrench },
  { path: '/accounting', title: 'المحاسبة', icon: DollarSign },
  { path: '/reports', title: 'التقارير', icon: BarChart3 },
  { path: '/calculator', title: 'الحاسبة', icon: Calculator },
  { path: '/employees', title: 'الموظفين', icon: Users },
  { path: '/attendance', title: 'الحضور والانصراف', icon: Clock },
  { path: '/tasks', title: 'المهام', icon: CheckSquare },
  { path: '/training', title: 'التدريب', icon: GraduationCap },
  { path: '/goals', title: 'الأهداف', icon: Trophy },
  { path: '/approvals', title: 'الموافقات', icon: FileCheck },
  { path: '/fixed-assets', title: 'المواد الثابتة', icon: Boxes },
  { path: '/shares', title: 'الأسهم والشراكة', icon: CreditCard },
  { path: '/permissions', title: 'الصلاحيات', icon: Shield },
  { path: '/audit', title: 'سجل العمليات', icon: Activity },
  { path: '/settings', title: 'الإعدادات', icon: Settings },
  { path: '/notifications', title: 'الإشعارات', icon: Bell },
  { path: '/bot', title: 'البوت الذكي', icon: Bot },
  { path: '/ai-distribution', title: 'التوزيع الذكي', icon: Workflow },
  { path: '/rep-dashboard', title: 'لوحة المندوب', icon: BarChart3 },
]

export default function CommandPalette({ open, onClose }) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onClose?.((v) => !v)
      }
      if (e.key === 'Escape') onClose?.(false)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [onClose])

  if (!open) return null

  const filtered = pageTitles.filter(
    (p) =>
      p.title.toLowerCase().includes(search.trim().toLowerCase()) ||
      p.path.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      <div
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onClose?.(false)}
        aria-hidden
      />
      <Command
        className={clsx(
          'relative w-full max-w-xl rounded-2xl border border-neutral-200 dark:border-neutral-700',
          'bg-white dark:bg-neutral-900 shadow-modal overflow-hidden animate-scale-in'
        )}
        label="بحث سريع"
        onSelect={(value) => {
          const page = pageTitles.find((p) => `${p.title} ${p.path}` === value)
          if (page) {
            navigate(page.path)
            onClose?.(false)
          }
        }}
      >
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="ابحث عن صفحة..."
          className="w-full px-4 py-3.5 text-base bg-transparent border-b border-neutral-100 dark:border-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          autoFocus
        />
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-neutral-500">
            لا توجد نتائج
          </Command.Empty>
          {filtered.map((p) => (
            <Command.Item
              key={p.path}
              value={`${p.title} ${p.path}`}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-button cursor-pointer',
                'data-[selected=true]:bg-primary-50 dark:data-[selected=true]:bg-primary-900/20',
                'data-[selected=true]:text-primary-700 dark:data-[selected=true]:text-primary-300'
              )}
            >
              <p.icon className="w-4 h-4 shrink-0 text-neutral-400" />
              <span>{p.title}</span>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  )
}
