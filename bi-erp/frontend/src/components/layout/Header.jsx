import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Search, Palette } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import NotificationBell from '../notifications/NotificationBell'
import CommandPalette from './CommandPalette'
import Dropdown, { DropdownItem, DropdownDivider } from '../common/Dropdown'
import Breadcrumb from '../common/Breadcrumb'
import { Settings, LogOut } from 'lucide-react'

const pathBreadcrumbs = {
  '/dashboard': [{ label: 'لوحة التحكم' }],
  '/executive-dashboard': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'لوحة المدير' }],
  '/sales': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المبيعات' }],
  '/purchases': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المشتريات' }],
  '/inventory': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المخزون' }],
  '/returns': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المرتجعات' }],
  '/customers': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'العملاء' }],
  '/suppliers': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الموردين' }],
  '/delivery': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'التوصيل' }],
  '/warranty': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الضمان' }],
  '/accounting': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المحاسبة' }],
  '/reports': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'التقارير' }],
  '/calculator': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الحاسبة' }],
  '/employees': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الموظفين' }],
  '/attendance': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الحضور' }],
  '/tasks': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المهام' }],
  '/training': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'التدريب' }],
  '/goals': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'Bi Goals' }],
  '/approvals': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الموافقات' }],
  '/fixed-assets': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المواد الثابتة' }],
  '/shares': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الأسهم' }],
  '/permissions': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الصلاحيات' }],
  '/audit': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'سجل العمليات' }],
  '/settings': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الإعدادات' }],
  '/bot': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'البوت الذكي' }],
  '/ai-distribution': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'التوزيع الذكي' }],
  '/ai-chats': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'دردشات الذكاء' }],
  '/notifications': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الإشعارات' }],
  '/new-invoice': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المبيعات', href: '/sales' }, { label: 'فاتورة جديدة' }],
  '/waiting-invoices': [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المبيعات', href: '/sales' }, { label: 'فواتير قيد الانتظار' }],
}

function getBreadcrumb(pathname) {
  const base = pathname.split('?')[0]
  if (pathBreadcrumbs[base]) return pathBreadcrumbs[base]
  // Fallback: first segment as label
  const segment = base.split('/').filter(Boolean)[0] || 'الرئيسية'
  return [{ label: 'لوحة التحكم', href: '/dashboard' }, { label: segment }]
}

function LiveTime() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <time
      className="text-sm tabular-nums"
      style={{ color: 'var(--gray)' }}
      dateTime={now.toISOString()}
    >
      {now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </time>
  )
}

export default function Header({ onMenuClick, paneOpen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, setTheme, themes } = useTheme()
  const [commandOpen, setCommandOpen] = useState(false)

  const breadcrumbItems = getBreadcrumb(location.pathname)

  return (
    <>
      <header className={clsx('layout-header', paneOpen && 'pane-open')}>
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button
            type="button"
            onClick={onMenuClick}
            className="p-2 rounded-xl hover:bg-white/10 lg:hidden transition-colors shrink-0"
            aria-label="فتح القائمة"
          >
            <Menu className="w-5 h-5" style={{ color: 'var(--sidebar-text)' }} />
          </button>

          <div className="hidden sm:block text-sm" style={{ color: 'var(--light)' }}>
            <Breadcrumb items={breadcrumbItems} />
          </div>

          <LiveTime />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border text-sm min-w-[180px] transition-colors"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--gray)',
            }}
          >
            <Search className="w-4 h-4" />
            <span>بحث...</span>
            <kbd className="hidden md:inline px-1.5 py-0.5 text-[10px] font-mono rounded opacity-70" style={{ background: 'var(--darker)' }}>Ctrl+K</kbd>
          </button>
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="sm:hidden p-2 rounded-xl hover:bg-white/10 transition-colors"
            style={{ color: 'var(--sidebar-text)' }}
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Theme switcher */}
          <Dropdown
            align="end"
            trigger={
              <button
                type="button"
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="تغيير الثيم"
                style={{ color: 'var(--sidebar-text)' }}
              >
                <Palette className="w-5 h-5" />
              </button>
            }
          >
            {({ close }) => (
              <>
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--light)' }}>الثيم</p>
                </div>
                <div className="p-2 grid grid-cols-2 gap-1 max-h-[280px] overflow-y-auto">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setTheme(t.id); close(); }}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-start text-sm transition-colors',
                        theme === t.id ? 'ring-2 ring-primary-500' : 'hover:bg-[var(--darker)]'
                      )}
                      style={{ color: 'var(--light)', ...(theme === t.id ? { background: 'rgba(var(--primary-rgb), 0.1)' } : {}) }}
                    >
                      <span className="w-6 h-6 rounded-md shrink-0 border" style={{ borderColor: 'var(--border)', background: 'var(--darker)' }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Dropdown>

          <NotificationBell />

          <Dropdown
            align="end"
            trigger={
              <button type="button" className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 transition-all" style={{ ringColor: 'var(--border)' }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
                >
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
              </button>
            }
          >
            {({ close }) => (
              <>
                <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--light)' }}>{user?.full_name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--gray)' }}>{user?.email}</p>
                </div>
                <DropdownItem icon={Settings} close={close} onClick={() => { navigate('/settings'); close(); }}>
                  الإعدادات
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem icon={LogOut} close={close} onClick={logout}>
                  تسجيل الخروج
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      </header>

      <CommandPalette open={commandOpen} onClose={setCommandOpen} />
    </>
  )
}
