import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Sun, Moon, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../notifications/NotificationBell'

// Page titles map
const pageTitles = {
  '/dashboard': 'لوحة التحكم',
  '/executive-dashboard': 'لوحة المدير التنفيذي',
  '/sales': 'المبيعات',
  '/purchases': 'المشتريات',
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

export default function Header({ onMenuClick }) {
  const { user } = useAuth()
  const [darkMode, setDarkMode] = useState(false)
  const location = useLocation()

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  const currentTitle = pageTitles[location.pathname] || 'لوحة التحكم'

  return (
    <header className="h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200/60 dark:border-surface-800/60 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Right side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5 text-surface-600 dark:text-surface-400" />
        </button>
        
        <div>
          <h1 className="text-lg font-bold text-surface-900 dark:text-white">
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* Left side */}
      <div className="flex items-center gap-1.5">
        {/* Search button */}
        <button
          className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          title="بحث"
        >
          <Search className="w-[18px] h-[18px] text-surface-500 dark:text-surface-400" />
        </button>

        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          title={darkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          {darkMode ? (
            <Sun className="w-[18px] h-[18px] text-surface-500 dark:text-surface-400" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-surface-500 dark:text-surface-400" />
          )}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* User avatar - small */}
        <div className="mr-1 w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
          <span className="text-white font-semibold text-xs">
            {user?.full_name?.charAt(0) || 'U'}
          </span>
        </div>
      </div>
    </header>
  )
}
