import { useState, useRef, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Users, CheckSquare, Clock, Bell, Settings,
  Building2, Trophy, GraduationCap, Shield, Activity, Package,
  Receipt, RefreshCw, DollarSign, Truck, Wrench, UserCircle,
  ChevronDown, ShoppingCart, FileCheck, CreditCard, BarChart3,
  Calculator, Bot, Boxes, X, LogOut, Search, Workflow, MessageCircle, Banknote,
  ArrowLeftRight, Tag, FileX, Landmark,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { notificationsAPI } from '../../services/api'

const navSections = [
  {
    id: 'main',
    label: 'الرئيسية',
    stripIcon: LayoutDashboard,
    stripLabel: 'الرئيسية',
    items: [
      { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
      { name: 'لوحة المدير', href: '/executive-dashboard', icon: BarChart3, roles: ['owner', 'admin', 'manager'] },
    ],
  },
  {
    id: 'commerce',
    label: 'التجارة',
    stripIcon: ShoppingCart,
    stripLabel: 'التجارة',
    items: [
      { name: 'المبيعات', href: '/sales', icon: Receipt, roles: ['owner', 'admin', 'manager', 'sales'] },
      { name: 'بيع نقدي', href: '/sales/new?type=cash', icon: Banknote, roles: ['owner', 'admin', 'manager', 'sales'], sub: true },
      { name: 'بيع آجل', href: '/sales/new?type=credit', icon: CreditCard, roles: ['owner', 'admin', 'manager', 'sales'], sub: true },
      { name: 'أقساط', href: '/sales/new?type=installment', icon: Calculator, roles: ['owner', 'admin', 'manager', 'sales'], sub: true },
      { name: 'استبدال', href: '/sales/new?type=exchange', icon: ArrowLeftRight, roles: ['owner', 'admin', 'manager', 'sales'], sub: true },
      { name: 'عرض أسعار', href: '/sales/new?type=quote', icon: Tag, roles: ['owner', 'admin', 'manager', 'sales'], sub: true },
      { name: 'تالف / مستهلك', href: '/sales/new?type=scrap', icon: FileX, roles: ['owner', 'admin', 'manager', 'inventory'], sub: true },
      { name: 'المشتريات', href: '/purchases', icon: ShoppingCart, roles: ['owner', 'admin', 'manager', 'inventory'] },
      { name: 'فاتورة شراء', href: '/purchases/new?type=purchase', icon: ShoppingCart, roles: ['owner', 'admin', 'manager', 'inventory'], sub: true },
      { name: 'المخزون', href: '/inventory', icon: Package, roles: ['owner', 'admin', 'manager', 'inventory'] },
      { name: 'المرتجعات', href: '/returns', icon: RefreshCw, roles: ['owner', 'admin', 'manager', 'inventory'] },
    ],
  },
  {
    id: 'people',
    label: 'العلاقات',
    stripIcon: UserCircle,
    stripLabel: 'العلاقات',
    items: [
      { name: 'العملاء', href: '/customers', icon: UserCircle, roles: ['owner', 'admin', 'manager', 'sales'] },
      { name: 'الموردين', href: '/suppliers', icon: Building2, roles: ['owner', 'admin', 'manager'] },
      { name: 'التوصيل', href: '/delivery', icon: Truck, roles: ['owner', 'admin', 'manager'] },
      { name: 'الضمان', href: '/warranty', icon: Wrench, roles: ['owner', 'admin', 'manager', 'inventory'] },
    ],
  },
  {
    id: 'finance',
    label: 'المالية',
    stripIcon: DollarSign,
    stripLabel: 'المالية',
    items: [
      { name: 'المحاسبة', href: '/accounting', icon: DollarSign, roles: ['owner', 'admin'], secure: true },
      { name: 'سند قبض', href: '/accounting?tab=vouchers&action=receipt', icon: FileCheck, roles: ['owner', 'admin'], sub: true },
      { name: 'سند دفع', href: '/accounting?tab=vouchers&action=payment', icon: FileX, roles: ['owner', 'admin'], sub: true },
      { name: 'صيرفة', href: '/accounting?tab=vouchers&action=exchange', icon: Banknote, roles: ['owner', 'admin'], sub: true },
      { name: 'حوالة', href: '/accounting?tab=vouchers&action=transfer', icon: Landmark, roles: ['owner', 'admin'], sub: true },
      { name: 'التقارير', href: '/reports', icon: BarChart3 },
      { name: 'الحاسبة', href: '/calculator', icon: Calculator },
    ],
  },
  {
    id: 'hr',
    label: 'الموارد البشرية',
    stripIcon: Clock,
    stripLabel: 'الموارد البشرية',
    items: [
      { name: 'الموظفين', href: '/employees', icon: Users, roles: ['owner', 'admin', 'hr', 'manager'] },
      { name: 'الحضور', href: '/attendance', icon: Clock, roles: ['owner', 'admin', 'hr', 'manager'] },
      { name: 'المهام', href: '/tasks', icon: CheckSquare },
      { name: 'التدريب', href: '/training', icon: GraduationCap, roles: ['owner', 'admin', 'hr'] },
      { name: 'Bi Goals', href: '/goals', icon: Trophy },
    ],
  },
  {
    id: 'admin',
    label: 'الإدارة',
    stripIcon: Shield,
    stripLabel: 'الإدارة',
    roles: ['owner', 'admin', 'manager'],
    items: [
      { name: 'الموافقات', href: '/approvals', icon: FileCheck },
      { name: 'المواد الثابتة', href: '/fixed-assets', icon: Boxes },
      { name: 'الأسهم', href: '/shares', icon: CreditCard },
      { name: 'الصلاحيات', href: '/permissions', icon: Shield },
      { name: 'سجل العمليات', href: '/audit', icon: Activity },
      { name: 'الإعدادات', href: '/settings', icon: Settings },
      { name: 'البوت الذكي', href: '/bot', icon: Bot },
      { name: 'التوزيع الذكي', href: '/ai-distribution', icon: Workflow },
      { name: 'دردشات الموظفين مع الذكاء', href: '/ai-chats', icon: MessageCircle, roles: ['owner', 'admin', 'manager'] },
    ],
  },
]

function PaneLink({ item, onClose }) {
  const location = useLocation()
  const baseHref = item.href?.split('?')[0]
  const isActive = location.pathname === baseHref ||
    (baseHref && baseHref !== '/' && location.pathname.startsWith(baseHref + '/'))

  if (item.sub) {
    return (
      <NavLink
        to={item.href}
        onClick={onClose}
        className={clsx('pane-link text-xs opacity-75 hover:opacity-100 pr-6', isActive && 'active')}
      >
        <item.icon className="w-3.5 h-3.5 shrink-0" />
        <span>{item.name}</span>
      </NavLink>
    )
  }

  return (
    <NavLink
      to={item.href}
      onClick={onClose}
      className={clsx('pane-link', isActive && 'active')}
    >
      <item.icon className="w-5 h-5 shrink-0" />
      <span>{item.name}</span>
      {item.secure && !isActive && <Shield className="w-3.5 h-3.5 text-amber-400/80 shrink-0 ms-auto" />}
    </NavLink>
  )
}

export default function Sidebar({ paneOpen, onPaneChange, stripOpen, onStripToggle, onClose }) {
  const { user, logout, isAdmin, isHR, isManager } = useAuth()
  const leaveTimer = useRef(null)

  const { data: countData } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => notificationsAPI.getUnreadCount(),
    refetchInterval: 30000,
  })
  const unreadCount = countData?.data?.data?.count ?? 0

  const handleStripEnter = useCallback((paneId) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    onPaneChange(paneId)
  }, [onPaneChange])

  const handleStripLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => onPaneChange(null), 200)
  }, [onPaneChange])

  const handlePaneAreaEnter = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
  }, [])

  const handlePaneAreaLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => onPaneChange(null), 150)
  }, [onPaneChange])

  const location = useLocation()
  const path = location.pathname

  const isPathInSection = (section) =>
    section.items.some((item) => {
      const base = item.href?.split('?')[0]
      return path === base || (base && base !== '/' && path.startsWith(base + '/'))
    })

  return (
    <>
      {/* Mobile overlay */}
      {(stripOpen || paneOpen) && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1004] lg:hidden animate-fade-in"
          onClick={() => { onStripToggle(false); onPaneChange(null); onClose?.(); }}
          aria-hidden
        />
      )}

      {/* Command Strip */}
      <aside
        className={clsx('command-strip', stripOpen && 'open')}
        onMouseLeave={handleStripLeave}
      >
        <NavLink to="/dashboard" className="cs-logo" onClick={onClose}>
          <Building2 className="w-6 h-6 text-white" />
        </NavLink>

        {navSections.map((section) => {
          if (section.roles) {
            const hasAccess = section.roles.some((r) => {
              if (r === 'admin' || r === 'owner') return isAdmin || user?.role === 'owner'
              if (r === 'hr') return isHR
              if (r === 'manager') return isManager
              return user?.role === r
            })
            if (!hasAccess) return null
          }
          const Icon = section.stripIcon
          const isActive = paneOpen === section.id || isPathInSection(section)
          return (
            <button
              key={section.id}
              type="button"
              className={clsx('cs-item', isActive && 'active')}
              title={section.stripLabel}
              onMouseEnter={() => handleStripEnter(section.id)}
              onClick={() => onPaneChange(paneOpen === section.id ? null : section.id)}
            >
              <Icon className="w-5 h-5" />
            </button>
          )
        })}

        <div className="flex-1 min-h-[1rem]" />

        <NavLink
          to="/notifications"
          onClick={onClose}
          className={clsx('cs-item', path.startsWith('/notifications') && 'active')}
          title="الإشعارات"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -start-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold rounded-full bg-[var(--danger)] text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </NavLink>
        <NavLink to="/settings" onClick={onClose} className={clsx('cs-item', path.startsWith('/settings') && 'active')} title="الإعدادات">
          <Settings className="w-5 h-5" />
        </NavLink>
        <button type="button" className="cs-item" onClick={logout} title="تسجيل الخروج">
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* Navigation Panes (Tier 2) */}
      {navSections.map((section) => {
        if (section.roles) {
          const hasAccess = section.roles.some((r) => {
            if (r === 'admin' || r === 'owner') return isAdmin || user?.role === 'owner'
            if (r === 'hr') return isHR
            if (r === 'manager') return isManager
            return user?.role === r
          })
          if (!hasAccess) return null
        }
        const visibleItems = section.items.filter((item) => {
          const hasRole = !item.roles || item.roles.some((r) => {
            if (r === 'admin' || r === 'owner') return isAdmin || user?.role === 'owner'
            if (r === 'hr') return isHR
            if (r === 'manager') return isManager
            return user?.role === r
          })
          return hasRole
        })
        if (visibleItems.length === 0) return null

        return (
          <div
            key={section.id}
            className={clsx('nav-pane', paneOpen === section.id && 'active')}
            id={`pane-${section.id}`}
            onMouseEnter={handlePaneAreaEnter}
            onMouseLeave={handlePaneAreaLeave}
          >
            <div className="pane-header">
              <h3>{section.label}</h3>
              <p>انتقل إلى الصفحات ذات الصلة</p>
            </div>
            <div className="pane-links">
              <div className="pane-section-title">{section.label}</div>
              {visibleItems.map((item) => (
                <PaneLink key={item.href} item={item} onClose={onClose} />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
