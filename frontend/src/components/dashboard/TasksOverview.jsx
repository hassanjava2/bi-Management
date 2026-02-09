import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import Card from '../common/Card'
import Spinner from '../common/Spinner'
import { tasksAPI } from '../../services/api'
import { translateStatus, getStatusColor } from '../../utils/helpers'

export default function TasksOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['taskStats'],
    queryFn: () => tasksAPI.getStats(),
  })

  const stats = data?.data?.data

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </Card>
    )
  }

  const items = [
    { label: 'قيد الانتظار', value: stats?.pending || 0, icon: Clock, color: 'text-yellow-500' },
    { label: 'جاري العمل', value: stats?.in_progress || 0, icon: AlertCircle, color: 'text-blue-500' },
    { label: 'مكتملة', value: stats?.completed || 0, icon: CheckCircle, color: 'text-green-500' },
    { label: 'متأخرة', value: stats?.overdue || 0, icon: XCircle, color: 'text-red-500' },
  ]

  return (
    <Card>
      <Card.Header>
        <Card.Title>نظرة عامة على المهام</Card.Title>
      </Card.Header>
      <Card.Body>
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/50"
            >
              <item.icon className={clsx('w-8 h-8', item.color)} />
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {item.value}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Today's tasks */}
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">مهام اليوم</span>
            <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
              {stats?.today || 0}
            </span>
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}
