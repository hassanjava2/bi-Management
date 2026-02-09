import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { useDarkMode } from '../../hooks/useDarkMode'
import NotificationBell from '../notifications/NotificationBell'
import CommandPalette from './CommandPalette'
import Breadcrumb from '../common/Breadcrumb'
import Dropdown, { DropdownItem, DropdownDivider } from '../common/Dropdown'
import { Settings, LogOut } from 'lucide-react'

const pageTitles = {
  '/dashboard': 'لوحة التحكم',
  '/executive-dashboard': 'لوحة المدير التنفيذي',
  '/sales': 'المبيعات',
  '/sales/new': 'فاتورة جديدة',
  '/sales/waiting': 'فواتير الانتظار',
  '/purchases': 'المشتريات',
  '/purchases/new': 'فاتورة مشتريات',
  '/inventory': 'المخزون',
  '/returns': 'المرتجعات',
  '/customers': 'العملاء',
  '/suppliers': 'الموردين',
  '/delivery': 'التوصيل',
  '/warranty': 'الضمان',
  '/accounting': 'المحاسبة',
  '/reports': 'التقارير',
  '/calculator': 'الحاسبة',
  '/employees': 'الموظفين',
  '/attendance': 'الحضور والانصراف',
  '/tasks': 'المهام',
  '/training': 'التدريب',
  '/goals': 'الأهداف',
  '/approvals': 'الموافقات',
  '/fixed-assets': 'المواد الثابتة',
  '/shares': 'الأسهم والشراكة',
  '/permissions': 'الصلاحيات',
  '/audit': 'سجل العمليات',
  '/settings': 'الإعدادات',
  '/bot': 'البوت الذكي',
  '/notifications': 'الإشعارات',
  '/rep-dashboard': 'لوحة المندوب',
}

function getBreadcrumbItems(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: 'لوحة التحكم' }]
  const items = [{ label: 'الرئيسية', href: '/dashboard' }]
  let path = ''
  for (let i = 0; i < segments.length; i++) {
    path += '/' + segments[i]
    const title = pageTitles[path] || segments[i]
    items.push(i === segments.length - 1 ? { label: title } : { label: title, href: path })
  }
  return items
}

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dark, toggleDark] = useDarkMode()
  const [commandOpen, setCommandOpen] = useState(false)
  const location = useLocation()

  const currentTitle = pageTitles[location.pathname] || 'لوحة التحكم'
  const breadcrumbItems = getBreadcrumbItems(location.pathname)

  return (
    <>
      <header className="h-16 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/60 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden transition-colors shrink-0"
            aria-label="فتح القائمة"
          >
            <Menu className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>

          <div className="min-w-0 hidden sm:block">
            <Breadcrumb items={breadcrumbItems} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <div className="sm:hidden">
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white truncate">
              {currentTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="بحث سريع (Ctrl+K)"
          >
            <Search className="w-[18px] h-[18px] text-neutral-500 dark:text-neutral-400" />
          </button>

          <button
            type="button"
            onClick={toggleDark}
            className="p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
          >
            {dark ? (
              <Sun className="w-[18px] h-[18px] text-neutral-500 dark:text-neutral-400" />
            ) : (
              <Moon className="w-[18px] h-[18px] text-neutral-500 dark:text-neutral-400" />
            )}
          </button>

          <NotificationBell />

          <Dropdown
            align="end"
            trigger={
              <button
                type="button"
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
              </button>
            }
          >
            {({ close }) => (
              <>
                <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate max-w-[200px]">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">
                    {user?.email}
                  </p>
                </div>
                <DropdownItem
                  icon={Settings}
                  close={close}
                  onClick={() => navigate('/settings')}
                >
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
