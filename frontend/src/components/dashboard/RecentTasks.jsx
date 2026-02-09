import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import Card from '../common/Card'
import Badge from '../common/Badge'
import Spinner from '../common/Spinner'
import { tasksAPI } from '../../services/api'
import { translateStatus, translatePriority, getStatusColor, formatRelativeTime } from '../../utils/helpers'

export default function RecentTasks() {
  const { data, isLoading } = useQuery({
    queryKey: ['myTasks'],
    queryFn: () => tasksAPI.getMyTasks(),
  })

  const tasks = data?.data?.data?.slice(0, 5) || []

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </Card>
    )
  }

  return (
    <Card>
      <Card.Header className="flex items-center justify-between">
        <Card.Title>مهامي الأخيرة</Card.Title>
        <Link 
          to="/tasks"
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          عرض الكل
          <ArrowLeft className="w-4 h-4 rtl-flip" />
        </Link>
      </Card.Header>
      <Card.Body className="p-0">
        {tasks.length === 0 ? (
          <div className="p-6 text-center text-surface-500">
            لا توجد مهام
          </div>
        ) : (
          <div className="divide-y divide-surface-200 dark:divide-surface-700">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-surface-50 dark:hover:bg-surface-700/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-surface-900 dark:text-white truncate">
                      {task.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-2 text-sm text-surface-500">
                      <Clock className="w-4 h-4" />
                      <span>{formatRelativeTime(task.due_date)}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(task.status)}>
                    {translateStatus(task.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
