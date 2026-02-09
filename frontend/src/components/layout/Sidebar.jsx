import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useState, useRef, useEffect } from 'react'
import { 
  LayoutDashboard, Users, CheckSquare, Clock, Bell, Settings,
  Building2, Trophy, GraduationCap, Shield, Activity, Package,
  Receipt, RefreshCw, DollarSign, Truck, Wrench, UserCircle,
  ChevronLeft, ShoppingCart, FileCheck, CreditCard, BarChart3,
  Wallet, Calculator, Bot, Boxes, X, LogOut, ChevronDown
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// Navigation grouped by sections
const navSections = [
  {
    id: 'main',
    label: 'الرئيسية',
    items: [
      { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
      { name: 'لوحة المدير', href: '/executive-dashboard', icon: BarChart3, roles: ['owner', 'admin', 'manager'] },
    ]
  },
  {
    id: 'commerce',
    label: 'التجارة',
    items: [
      { name: 'المبيعات', href: '/sales', icon: Receipt, roles: ['owner', 'admin', 'manager', 'sales'] },
      { name: 'المشتريات', href: '/purchases', icon: ShoppingCart, roles: ['owner', 'admin', 'manager', 'inventory'] },
      { name: 'المخزون', href: '/inventory', icon: Package, roles: ['owner', 'admin', 'manager', 'inventory'] },
      { name: 'المرتجعات', href: '/returns', icon: RefreshCw, roles: ['owner', 'admin', 'manager', 'inventory'] },
    ]
  },
  {
    id: 'people',
    label: 'العلاقات',
    items: [
      { name: 'العملاء', href: '/customers', icon: UserCircle, roles: ['owner', 'admin', 'manager', 'sales'] },
      { name: 'الموردين', href: '/suppliers', icon: Building2, roles: ['owner', 'admin', 'manager'] },
      { name: 'التوصيل', href: '/delivery', icon: Truck, roles: ['owner', 'admin', 'manager'] },
      { name: 'الضمان', href: '/warranty', icon: Wrench, roles: ['owner', 'admin', 'manager', 'inventory'] },
    ]
  },
  {
    id: 'finance',
    label: 'المالية',
    items: [
      { name: 'المحاسبة', href: '/accounting', icon: DollarSign, roles: ['owner', 'admin'], secure: true },
      { name: 'التقارير', href: '/reports', icon: BarChart3 },
      { name: 'الحاسبة', href: '/calculator', icon: Calculator },
    ]
  },
  {
    id: 'hr',
    label: 'الموارد البشرية',
    items: [
      { name: 'الموظفين', href: '/employees', icon: Users, roles: ['owner', 'admin', 'hr', 'manager'] },
      { name: 'الحضور', href: '/attendance', icon: Clock, roles: ['owner', 'admin', 'hr', 'manager'] },
      { name: 'المهام', href: '/tasks', icon: CheckSquare },
      { name: 'التدريب', href: '/training', icon: GraduationCap, roles: ['owner', 'admin', 'hr'] },
      { name: 'Bi Goals', href: '/goals', icon: Trophy },
    ]
  },
  {
    id: 'admin',
    label: 'الإدارة',
    roles: ['owner', 'admin'],
    items: [
      { name: 'الموافقات', href: '/approvals', icon: FileCheck },
      { name: 'المواد الثابتة', href: '/fixed-assets', icon: Boxes },
      { name: 'الأسهم', href: '/shares', icon: CreditCard },
      { name: 'الصلاحيات', href: '/permissions', icon: Shield },
      { name: 'سجل العمليات', href: '/audit', icon: Activity },
      { name: 'الإعدادات', href: '/settings', icon: Settings },
      { name: 'البوت الذكي', href: '/bot', icon: Bot },
    ]
  },
]

function NavItem({ item, onClose }) {
  const location = useLocation()
  const baseHref = item.href?.split('?')[0]
  const isActive = location.pathname === baseHref || 
                   (baseHref && baseHref !== '/' && location.pathname.startsWith(baseHref + '/'))

  return (
    <NavLink
      to={item.href}
      onClick={onClose}
      className={clsx(
        'group flex items-center gap-3 px-3 py-2.5 rounded-button text-[13px] font-medium',
        'transition-all duration-150',
        isActive
          ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/25'
          : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
      )}
    >
      <item.icon className={clsx(
        'w-[18px] h-[18px] flex-shrink-0 transition-colors',
        isActive ? 'text-white' : 'text-surface-400 dark:text-surface-500 group-hover:text-primary-500'
      )} />
      <span className="flex-1 truncate">{item.name}</span>
      {item.secure && !isActive && (
        <Shield className="w-3 h-3 text-amber-500" />
      )}
    </NavLink>
  )
}

function NavSection({ section, onClose, user, isAdmin, isHR, isManager }) {
  const [collapsed, setCollapsed] = useState(false)
  
  // Check section-level roles
  if (section.roles) {
    const hasAccess = section.roles.some(role => {
      if (role === 'admin' || role === 'owner') return isAdmin || user?.role === 'owner'
      if (role === 'hr') return isHR
      if (role === 'manager') return isManager
      return user?.role === role
    })
    if (!hasAccess) return null
  }

  // Filter items by roles
  const visibleItems = section.items.filter(item => {
    if (!item.roles) return true
    return item.roles.some(role => {
      if (role === 'admin' || role === 'owner') return isAdmin || user?.role === 'owner'
      if (role === 'hr') return isHR
      if (role === 'manager') return isManager
      return user?.role === role
    })
  })

  if (visibleItems.length === 0) return null

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-400 transition-colors"
      >
        <span className="flex-1 text-right">{section.label}</span>
        <ChevronDown className={clsx('w-3 h-3 transition-transform', collapsed && '-rotate-90')} />
      </button>
      {!collapsed && (
        <div className="space-y-0.5 mt-0.5">
          {visibleItems.map(item => (
            <NavItem key={item.href} item={item} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin, isHR, isManager } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-surface-900/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 right-0 z-50 w-[260px]',
        'bg-white dark:bg-surface-900',
        'border-l border-surface-200/80 dark:border-surface-800',
        'shadow-sidebar',
        'transform transition-transform duration-300 ease-out lg:translate-x-0',
        'lg:static lg:z-auto flex flex-col',
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-surface-100 dark:border-surface-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-surface-900 dark:text-white">
                BI
              </span>
              <span className="text-base font-light text-surface-500 dark:text-surface-400 mr-1">
                Management
              </span>
            </div>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden transition-colors"
          >
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-visible px-3 py-4 space-y-1 scrollbar-hide">
          {navSections.map(section => (
            <NavSection
              key={section.id}
              section={section}
              onClose={onClose}
              user={user}
              isAdmin={isAdmin}
              isHR={isHR}
              isManager={isManager}
            />
          ))}
        </nav>

        {/* Notifications quick link */}
        <div className="px-3 pb-2">
          <NavLink
            to="/notifications"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-button text-[13px] font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <Bell className="w-[18px] h-[18px] text-surface-400" />
            <span className="flex-1">الإشعارات</span>
            <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold rounded-full bg-error-500 text-white">
              5
            </span>
          </NavLink>
        </div>

        {/* User info */}
        <div className="flex-shrink-0 px-3 py-3 border-t border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                {user?.full_name}
              </p>
              <p className="text-[11px] text-surface-400 dark:text-surface-500 truncate">
                {user?.role === 'owner' ? 'المالك' : 
                 user?.role === 'admin' ? 'مدير النظام' :
                 user?.role === 'manager' ? 'مشرف' : 
                 user?.role === 'hr' ? 'موارد بشرية' : 'موظف'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-error-50 dark:hover:bg-error-500/10 text-surface-400 hover:text-error-500 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
