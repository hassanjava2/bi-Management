import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { notificationsAPI } from '../../services/api'
import { formatRelativeTime } from '../../utils/helpers'
import Spinner from '../common/Spinner'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const queryClient = useQueryClient()

  // Get unread count
  const { data: countData } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => notificationsAPI.getUnreadCount(),
    refetchInterval: 30000,
  })

  // Get recent notifications
  const { data: notifData, isLoading } = useQuery({
    queryKey: ['recentNotifications'],
    queryFn: () => notificationsAPI.getAll({ limit: 5 }),
    enabled: isOpen,
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['unreadCount'])
      queryClient.invalidateQueries(['recentNotifications'])
    },
  })

  const unreadCount = countData?.data?.data?.count || 0
  const notifications = notifData?.data?.data || []

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getTypeColor = (type) => {
    const colors = {
      info: 'bg-blue-100 text-blue-600',
      task: 'bg-primary-100 text-primary-600',
      reminder: 'bg-yellow-100 text-yellow-600',
      alert: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600',
      warning: 'bg-orange-100 text-orange-600',
      success: 'bg-green-100 text-green-600',
    }
    return colors[type] || colors.info
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 relative transition-colors"
      >
        <Bell className={clsx(
          'w-5 h-5 transition-colors',
          isOpen ? 'text-primary-600' : 'text-neutral-600 dark:text-neutral-400'
        )} />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 z-50 animate-slideIn overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              الإشعارات
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs text-primary-600 dark:text-primary-400">
                {unreadCount} جديد
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد إشعارات</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={clsx(
                      'px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors',
                      !notif.is_read && 'bg-primary-50/50 dark:bg-primary-900/10'
                    )}
                    onClick={() => {
                      if (!notif.is_read) {
                        markAsReadMutation.mutate(notif.id)
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={clsx('p-1.5 rounded-lg', getTypeColor(notif.type))}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx(
                          'text-sm',
                          notif.is_read 
                            ? 'text-neutral-600 dark:text-neutral-400' 
                            : 'text-neutral-900 dark:text-white font-medium'
                        )}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                          {notif.body}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-2 px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 text-sm text-primary-600 dark:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            عرض الكل
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
