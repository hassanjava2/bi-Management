import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, Search, Command } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { useDarkMode } from '../../hooks/useDarkMode'
import NotificationBell from '../notifications/NotificationBell'
import CommandPalette from './CommandPalette'
import Dropdown, { DropdownItem, DropdownDivider } from '../common/Dropdown'
import { Settings, LogOut } from 'lucide-react'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dark, toggleDark] = useDarkMode()
  const [commandOpen, setCommandOpen] = useState(false)

  return (
    <>
      <header className="h-12 bg-white dark:bg-neutral-900 border-b border-neutral-200/60 dark:border-neutral-800/60 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
        {/* Right: menu only */}
        <div className="flex items-center min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden transition-colors shrink-0"
            aria-label="فتح القائمة"
          >
            <Menu className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Left */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search bar - wider */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors text-sm min-w-[200px] sm:min-w-[240px]"
          >
            <Search className="w-4 h-4" />
            <span>بحث...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded">
              Ctrl+K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="sm:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Search className="w-[18px] h-[18px] text-neutral-500" />
          </button>

          {/* Dark mode */}
          <button
            type="button"
            onClick={toggleDark}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
          >
            {dark ? (
              <Sun className="w-[18px] h-[18px] text-neutral-500 dark:text-neutral-400" />
            ) : (
              <Moon className="w-[18px] h-[18px] text-neutral-500" />
            )}
          </button>

          <NotificationBell />

          {/* User */}
          <Dropdown
            align="end"
            trigger={
              <button type="button" className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-neutral-200 dark:hover:ring-neutral-700 transition-all">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
              </button>
            }
          >
            {({ close }) => (
              <>
                <div className="px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{user?.full_name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user?.email}</p>
                </div>
                <DropdownItem icon={Settings} close={close} onClick={() => navigate('/settings')}>
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
