import { useQuery } from '@tanstack/react-query'
import { Trophy, TrendingUp, Star, ArrowUp } from 'lucide-react'
import { clsx } from 'clsx'
import Card from '../common/Card'
import Spinner from '../common/Spinner'
import { goalsAPI } from '../../services/api'

export default function PointsCard({ compact = false }) {
  const { data, isLoading } = useQuery({
    queryKey: ['myPoints'],
    queryFn: () => goalsAPI.getMyPoints(),
  })

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-40">
        <Spinner />
      </Card>
    )
  }

  const points = data?.data?.data

  if (!points) return null

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl">
        <div className="text-2xl">{points.level?.badge || '⭐'}</div>
        <div>
          <p className="text-sm text-surface-600 dark:text-surface-400">نقاطي</p>
          <p className="text-xl font-bold text-amber-600">{points.total_points || 0}</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 -m-6 mb-6 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-100 text-sm">المستوى {points.level?.level}</p>
            <h3 className="text-2xl font-bold">{points.level?.name}</h3>
          </div>
          <div className="text-5xl">{points.level?.badge}</div>
        </div>
      </div>

      {/* Points */}
      <div className="text-center mb-6">
        <p className="text-sm text-surface-500 dark:text-surface-400">إجمالي النقاط</p>
        <p className="text-4xl font-bold text-surface-900 dark:text-white">
          {points.total_points?.toLocaleString() || 0}
        </p>
        <p className="text-sm text-green-500 mt-1">
          +{points.monthly_points || 0} هذا الشهر
        </p>
      </div>

      {/* Progress to next level */}
      {points.next_level && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">للمستوى التالي</span>
            <span className="text-amber-600 font-medium">
              {points.points_to_next} نقطة
            </span>
          </div>
          <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${points.progress_to_next}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-surface-400">
            <span>{points.level?.name}</span>
            <span>{points.next_level?.name} {points.next_level?.badge}</span>
          </div>
        </div>
      )}
    </Card>
  )
}
