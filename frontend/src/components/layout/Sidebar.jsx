import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useState } from 'react'
import {
  LayoutDashboard, Users, CheckSquare, Clock, Bell, Settings,
  Building2, Trophy, GraduationCap, Shield, Activity, Package,
  Receipt, RefreshCw, DollarSign, Truck, Wrench, UserCircle,
  ChevronDown, ShoppingCart, FileCheck, CreditCard, BarChart3,
  Calculator, Bot, Boxes, X, LogOut, Search,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { notificationsAPI } from '../../services/api'

const navSections = [
  {
    id: 'main', label: 'الرئيسية',
    items: [
      { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
      { name: 'لوحة المدير', href: '/executive-dashboard', icon: BarChart3, roles: ['owner', 'admin', 'manager'] },
    ],
  },
  {
    id: 'commerce', label: 'التجارة',
    items: [
      { name: 'المبيعات', href: '/sales', icon: Receipt, roles: ['owner', 'admin', 'manager', 'sales'] },
      { name: 'المشتريات', href: '/purchases', icon: ShoppingCart, roles: ['owner', 'admin', 'manager', 'inventory'] },
      { name: 'المخزون', href: '/inventory', icon: Package, roles: ['owner', 'admin', 'manager', 'inventory'] },
      { name: 'المرتجعات', href: '/returns', icon: RefreshCw, roles: ['owner', 'admin', 'manager', 'inventory'] },
    ],
  },
  {
    id: 'people', label: 'العلاقات',
    items: [
      { name: 'العملاء', href: '/customers', icon: UserCircle, roles: ['owner', 'admin', 'manager', 'sales'] },
      { name: 'الموردين', href: '/suppliers', icon: Building2, roles: ['owner', 'admin', 'manager'] },
      { name: 'التوصيل', href: '/delivery', icon: Truck, roles: ['owner', 'admin', 'manager'] },
      { name: 'الضمان', href: '/warranty', icon: Wrench, roles: ['owner', 'admin', 'manager', 'inventory'] },
    ],
  },
  {
    id: 'finance', label: 'المالية',
    items: [
      { name: 'المحاسبة', href: '/accounting', icon: DollarSign, roles: ['owner', 'admin'], secure: true },
      { name: 'التقارير', href: '/reports', icon: BarChart3 },
      { name: 'الحاسبة', href: '/calculator', icon: Calculator },
    ],
  },
  {
    id: 'hr', label: 'الموارد البشرية',
    items: [
      { name: 'الموظفين', href: '/employees', icon: Users, roles: ['owner', 'admin', 'hr', 'manager'] },
      { name: 'الحضور', href: '/attendance', icon: Clock, roles: ['owner', 'admin', 'hr', 'manager'] },
      { name: 'المهام', href: '/tasks', icon: CheckSquare },
      { name: 'التدريب', href: '/training', icon: GraduationCap, roles: ['owner', 'admin', 'hr'] },
      { name: 'Bi Goals', href: '/goals', icon: Trophy },
    ],
  },
  {
    id: 'admin', label: 'الإدارة', roles: ['owner', 'admin'],
    items: [
      { name: 'الموافقات', href: '/approvals', icon: FileCheck },
      { name: 'المواد الثابتة', href: '/fixed-assets', icon: Boxes },
      { name: 'الأسهم', href: '/shares', icon: CreditCard },
      { name: 'الصلاحيات', href: '/permissions', icon: Shield },
      { name: 'سجل العمليات', href: '/audit', icon: Activity },
      { name: 'الإعدادات', href: '/settings', icon: Settings },
      { name: 'البوت الذكي', href: '/bot', icon: Bot },
    ],
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
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200',
        isActive
          ? 'bg-primary-500/20 text-white'
          : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
      )}
    >
      {isActive && <div className="absolute end-0 top-2 bottom-2 w-1 rounded-s-full bg-primary-400" aria-hidden />}
      <item.icon className={clsx(
        'w-5 h-5 flex-shrink-0 transition-colors',
        isActive ? 'text-primary-400' : 'text-neutral-500 group-hover:text-neutral-300'
      )} />
      <span className="flex-1 truncate">{item.name}</span>
      {item.secure && !isActive && <Shield className="w-3 h-3 text-amber-400/60 shrink-0" />}
    </NavLink>
  )
}

function NavSection({ section, onClose, user, isAdmin, isHR, isManager, filterQuery }) {
  const [collapsed, setCollapsed] = useState(false)

  if (section.roles) {
    const hasAccess = section.roles.some((role) => {
      if (role === 'admin' || role === 'owner') return isAdmin || user?.role === 'owner'
      if (role === 'hr') return isHR
      if (role === 'manager') return isManager
      return user?.role === role
    })
    if (!hasAccess) return null
  }

  const visibleItems = section.items.filter((item) => {
    const hasRole = !item.roles || item.roles.some((role) => {
      if (role === 'admin' || role === 'owner') return isAdmin || user?.role === 'owner'
      if (role === 'hr') return isHR
      if (role === 'manager') return isManager
      return user?.role === role
    })
    if (!hasRole) return false
    if (!filterQuery) return true
    return item.name.toLowerCase().includes(filterQuery.toLowerCase())
  })

  if (visibleItems.length === 0) return null

  return (
    <div className="mb-2 pt-2 first:pt-0 border-t border-white/5 first:border-t-0">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-400 transition-colors"
      >
        <span className="flex-1 text-end">{section.label}</span>
        <ChevronDown className={clsx('w-3 h-3 transition-transform duration-200', collapsed && '-rotate-90')} />
      </button>
      <div className={clsx(
        'overflow-hidden transition-all duration-200',
        collapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
      )}>
        <div className="space-y-0.5 mt-0.5">
          {visibleItems.map((item) => (
            <NavItem key={item.href} item={item} onClose={onClose} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin, isHR, isManager } = useAuth()
  const [filterQuery, setFilterQuery] = useState('')

  const { data: countData } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => notificationsAPI.getUnreadCount(),
    refetchInterval: 30000,
  })
  const unreadCount = countData?.data?.data?.count ?? 0

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside className={clsx(
        'fixed inset-y-0 end-0 z-50 w-[260px] flex flex-col',
        'bg-neutral-900 dark:bg-neutral-950',
        'transition-transform duration-300 ease-out',
        'lg:static lg:z-auto lg:translate-x-0',
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-bold text-white">BI</span>
              <span className="text-base font-light text-neutral-400 ms-1">Management</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 lg:hidden transition-colors"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="بحث..."
              className="w-full rounded-lg border-0 bg-white/5 py-2 pe-9 ps-3 text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-500/40"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-visible px-3 pb-4 space-y-0.5 sidebar-nav scrollbar-hide">
          {navSections.map((section) => (
            <NavSection
              key={section.id}
              section={section}
              onClose={onClose}
              user={user}
              isAdmin={isAdmin}
              isHR={isHR}
              isManager={isManager}
              filterQuery={filterQuery}
            />
          ))}
        </nav>

        {/* Notifications */}
        <div className="px-3 pb-1">
          <NavLink
            to="/notifications"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <Bell className="w-5 h-5 text-neutral-500" />
            <span className="flex-1">الإشعارات</span>
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold rounded-full bg-primary-500 text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        </div>

        {/* User */}
        <div className="flex-shrink-0 px-3 py-3 border-t border-white/5">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
              <span className="text-white font-semibold text-sm">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-[11px] text-neutral-500 truncate">
                {user?.role === 'owner' ? 'المالك' :
                 user?.role === 'admin' ? 'مدير النظام' :
                 user?.role === 'manager' ? 'مشرف' :
                 user?.role === 'hr' ? 'موارد بشرية' : 'موظف'}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-error-500/20 text-neutral-500 hover:text-error-400 transition-colors"
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
