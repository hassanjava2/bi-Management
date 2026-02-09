import { useQuery } from '@tanstack/react-query'
import { Award } from 'lucide-react'
import { clsx } from 'clsx'
import Card from '../common/Card'
import Spinner from '../common/Spinner'
import { goalsAPI } from '../../services/api'
import { formatDate } from '../../utils/helpers'

export default function BadgesGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ['myBadges'],
    queryFn: () => goalsAPI.getMyBadges(),
  })

  const badges = data?.data?.data || []

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-500" />
          <Card.Title>الشارات والإنجازات</Card.Title>
        </div>
      </Card.Header>
      <Card.Body>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : badges.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 opacity-50">🏅</div>
            <p className="text-surface-500">لم تحصل على شارات بعد</p>
            <p className="text-sm text-surface-400">أكمل المهام واحضر بانتظام للحصول على شارات</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={clsx(
                  'p-4 rounded-xl text-center',
                  'bg-gradient-to-br from-purple-50 to-indigo-50',
                  'dark:from-purple-900/20 dark:to-indigo-900/20',
                  'border border-purple-200 dark:border-purple-800',
                  'hover:shadow-lg transition-shadow'
                )}
              >
                <div className="text-4xl mb-2">{badge.icon}</div>
                <h4 className="font-semibold text-surface-900 dark:text-white text-sm">
                  {badge.name}
                </h4>
                <p className="text-xs text-surface-500 mt-1">{badge.description}</p>
                {badge.earned_at && (
                  <p className="text-xs text-purple-600 mt-2">
                    {formatDate(badge.earned_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
