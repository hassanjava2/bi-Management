/**
 * BI Management - Notifications Page
 * صفحة الإشعارات مع التنبيهات الذكية
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, Check, CheckCheck, Trash2, Package, DollarSign,
  AlertTriangle, TrendingUp, ClipboardList, Filter, RefreshCw,
  ShieldAlert, Clock, CircleDot
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Spinner from '../components/common/Spinner'
import EmptyState from '../components/common/EmptyState'
import { notificationsAPI } from '../services/api'
import api from '../services/api'
import { formatRelativeTime } from '../utils/helpers'
import { clsx } from 'clsx'
import PageShell from '../components/common/PageShell'

const ALERT_CONFIG = {
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  urgent: { icon: ShieldAlert, bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', iconColor: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  alert: { icon: Clock, bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700', iconColor: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  info: { icon: DollarSign, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  task: { icon: ClipboardList, bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  success: { icon: TrendingUp, bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-700', iconColor: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  reminder: { icon: Bell, bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', iconColor: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
}

const NOTIF_CATEGORIES = [
  { id: 'all', label: 'الكل', icon: Bell },
  { id: 'inventory', label: 'المخزون', icon: Package },
  { id: 'finance', label: 'المالية', icon: DollarSign },
  { id: 'operations', label: 'العمليات', icon: ClipboardList },
  { id: 'sales', label: 'المبيعات', icon: TrendingUp },
]

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [activeCategory, setActiveCategory] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll(),
  })

  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['smart-alerts'],
    queryFn: () => api.get('/notifications/smart-alerts').then(r => r.data),
    staleTime: 60000,
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
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  })

  const notifications = data?.data?.data || []
  const unreadCount = data?.data?.unread_count || 0
  const smartAlerts = alertsData?.data || []

  const filteredAlerts = activeCategory === 'all'
    ? smartAlerts
    : smartAlerts.filter(a => a.category === activeCategory)

  return (
    <PageShell
      title="الإشعارات والتنبيهات"
      description={unreadCount > 0 ? `لديك ${unreadCount} إشعارات غير مقروءة` : 'نظام التنبيهات الذكية'}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchAlerts()} disabled={alertsLoading}>
            <RefreshCw className={`w-4 h-4 ml-1 ${alertsLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          {unreadCount > 0 && (
            <Button variant="secondary" onClick={() => markAllAsReadMutation.mutate()} loading={markAllAsReadMutation.isPending}>
              <CheckCheck className="w-4 h-4 ml-1" />
              تحديد الكل كمقروء
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* ═══ Smart Alerts Panel ═══ */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            تنبيهات النظام الذكية
          </h2>

          {/* Category Tabs */}
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            {NOTIF_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all',
                  activeCategory === cat.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                )}
              >
                <cat.icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            ))}
          </div>

          {alertsLoading ? (
            <div className="flex justify-center py-6"><Spinner size="md" /></div>
          ) : filteredAlerts.length === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
              <p className="text-emerald-700 dark:text-emerald-300 font-medium">✅ لا توجد تنبيهات — كل شيء يعمل بشكل طبيعي</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredAlerts.map(alert => {
                const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.info
                const Icon = config.icon
                return (
                  <div key={alert.id} className={clsx('rounded-xl border p-4 transition-all hover:shadow-md', config.bg, config.border)}>
                    <div className="flex items-start gap-3">
                      <div className={clsx('p-2 rounded-lg', config.badge)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{alert.title}</h4>
                          {alert.count > 0 && (
                            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-bold', config.badge)}>
                              {alert.count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">{alert.body}</p>
                      </div>
                      {alert.priority === 'critical' && (
                        <span className="animate-pulse w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ═══ Notification History ═══ */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-500" />
            سجل الإشعارات
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : notifications.length === 0 ? (
            <Card className="text-center py-8">
              <EmptyState title="لا توجد إشعارات" description="ستظهر الإشعارات هنا عند وصولها" />
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map(notif => {
                const config = ALERT_CONFIG[notif.type] || ALERT_CONFIG.info
                const Icon = config.icon
                return (
                  <div key={notif.id}
                    className={clsx(
                      'bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 transition-all hover:shadow-sm',
                      !notif.is_read && 'border-r-4 border-r-primary-500'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={clsx('p-1.5 rounded-lg', config.badge)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={clsx('text-sm font-medium', notif.is_read ? 'text-neutral-500' : 'text-neutral-900 dark:text-white')}>
                          {notif.title}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{notif.body}</p>
                        <p className="text-[10px] text-neutral-300 mt-1">{formatRelativeTime(notif.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {!notif.is_read && (
                          <button onClick={() => markAsReadMutation.mutate(notif.id)}
                            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg" title="تحديد كمقروء"
                          >
                            <Check className="w-3.5 h-3.5 text-neutral-400" />
                          </button>
                        )}
                        <button onClick={() => deleteMutation.mutate(notif.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
