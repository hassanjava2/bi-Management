import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { X, Bell, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const icons = {
  info: Info,
  task: Bell,
  reminder: AlertCircle,
  alert: AlertTriangle,
  urgent: AlertTriangle,
  warning: AlertTriangle,
  success: CheckCircle,
}

const colors = {
  info: 'bg-blue-500',
  task: 'bg-primary-500',
  reminder: 'bg-yellow-500',
  alert: 'bg-orange-500',
  urgent: 'bg-red-500',
  warning: 'bg-orange-500',
  success: 'bg-green-500',
}

export default function NotificationToast({ notification, onDismiss, duration = 5000 }) {
  const [isExiting, setIsExiting] = useState(false)
  const Icon = icons[notification.type] || Bell

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(notification.id)
    }, 300)
  }

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700',
        'transform transition-all duration-300 max-w-sm',
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      )}
    >
      <div className={clsx('p-2 rounded-lg text-white', colors[notification.type] || 'bg-neutral-500')}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-neutral-900 dark:text-white text-sm">
          {notification.title}
        </h4>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1 line-clamp-2">
          {notification.body}
        </p>
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
      >
        <X className="w-4 h-4 text-neutral-400" />
      </button>
    </div>
  )
}

// Container for all toasts
export function NotificationToastContainer({ notifications, onDismiss }) {
  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 left-4 z-50 space-y-3">
      {notifications.slice(0, 5).map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}
