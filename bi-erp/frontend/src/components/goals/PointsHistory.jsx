import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import Card from '../common/Card'
import Spinner from '../common/Spinner'
import { goalsAPI } from '../../services/api'
import { formatDate, formatTime } from '../../utils/helpers'

export default function PointsHistory({ limit = 10 }) {
  const { data, isLoading } = useQuery({
    queryKey: ['pointsHistory', limit],
    queryFn: () => goalsAPI.getMyHistory({ limit }),
  })

  const history = data?.data?.data || []

  return (
    <Card>
      <Card.Header>
        <Card.Title>سجل النقاط</Card.Title>
      </Card.Header>
      <Card.Body className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            لا توجد سجلات
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {history.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-4">
                {/* Icon */}
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  item.points > 0 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                )}>
                  {item.points > 0 ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white truncate">
                    {item.description}
                  </p>
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.created_at)} {formatTime(item.created_at)}
                  </p>
                </div>

                {/* Points */}
                <p className={clsx(
                  'font-bold text-lg',
                  item.points > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {item.points > 0 ? '+' : ''}{item.points}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
