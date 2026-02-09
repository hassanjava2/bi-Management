import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Spinner from '../components/common/Spinner'
import { notificationsAPI } from '../services/api'
import { formatRelativeTime } from '../utils/helpers'
import { clsx } from 'clsx'

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll(),
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      queryClient.invalidateQueries(['unreadCount'])
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      queryClient.invalidateQueries(['unreadCount'])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => notificationsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
    },
  })

  const notifications = data?.data?.data || []
  const unreadCount = data?.data?.unread_count || 0

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">الإشعارات</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            {unreadCount > 0 ? `لديك ${unreadCount} إشعارات غير مقروءة` : 'لا توجد إشعارات جديدة'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="secondary"
            onClick={() => markAllAsReadMutation.mutate()}
            loading={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="text-center py-12">
          <Bell className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500">لا توجد إشعارات</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <Card 
              key={notif.id} 
              className={clsx(
                'transition-all hover:shadow-md',
                !notif.is_read && 'border-r-4 border-r-primary-500'
              )}
            >
              <div className="flex items-start gap-4">
                <div className={clsx('p-2 rounded-lg', getTypeColor(notif.type))}>
                  <Bell className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={clsx(
                        'font-medium',
                        notif.is_read 
                          ? 'text-surface-600 dark:text-surface-400' 
                          : 'text-surface-900 dark:text-white'
                      )}>
                        {notif.title}
                      </h3>
                      <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                        {notif.body}
                      </p>
                      <p className="text-xs text-surface-400 mt-2">
                        {formatRelativeTime(notif.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {!notif.is_read && (
                        <button
                          onClick={() => markAsReadMutation.mutate(notif.id)}
                          className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg"
                          title="تحديد كمقروء"
                        >
                          <Check className="w-4 h-4 text-surface-400" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(notif.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
