import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Medal, Award, Crown } from 'lucide-react'
import { clsx } from 'clsx'
import Card from '../common/Card'
import Spinner from '../common/Spinner'
import { goalsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const RANK_ICONS = {
  1: { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  2: { icon: Medal, color: 'text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-700' },
  3: { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
}

export default function Leaderboard({ limit = 10 }) {
  const [period, setPeriod] = useState('monthly')
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period, limit],
    queryFn: () => goalsAPI.getLeaderboard({ period, limit }),
  })

  const leaders = data?.data?.data || []

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">المتصدرون</h3>
        </div>
        
        <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
          <button
            onClick={() => setPeriod('monthly')}
            className={clsx(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              period === 'monthly' 
                ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm' 
                : 'text-neutral-600 dark:text-neutral-400'
            )}
          >
            الشهر
          </button>
          <button
            onClick={() => setPeriod('all_time')}
            className={clsx(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              period === 'all_time' 
                ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm' 
                : 'text-neutral-600 dark:text-neutral-400'
            )}
          >
            الكل
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : leaders.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          لا توجد بيانات
        </div>
      ) : (
        <div className="space-y-3">
          {leaders.map((leader) => {
            const rankConfig = RANK_ICONS[leader.rank]
            const isCurrentUser = leader.id === user?.id
            const RankIcon = rankConfig?.icon || null

            return (
              <div
                key={leader.id}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl transition-colors',
                  isCurrentUser 
                    ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                )}
              >
                {/* Rank */}
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  rankConfig?.bg || 'bg-neutral-100 dark:bg-neutral-700'
                )}>
                  {RankIcon ? (
                    <RankIcon className={clsx('w-5 h-5', rankConfig?.color)} />
                  ) : (
                    <span className="font-bold text-neutral-600 dark:text-neutral-400">
                      {leader.rank}
                    </span>
                  )}
                </div>

                {/* Avatar & Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={clsx(
                      'font-medium truncate',
                      isCurrentUser ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-900 dark:text-white'
                    )}>
                      {leader.full_name}
                      {isCurrentUser && <span className="text-xs mr-1">(أنت)</span>}
                    </p>
                    <span className="text-lg">{leader.level?.badge}</span>
                  </div>
                  <p className="text-xs text-neutral-500">{leader.department_name || '-'}</p>
                </div>

                {/* Points */}
                <div className="text-left">
                  <p className="font-bold text-amber-600">{leader.points?.toLocaleString()}</p>
                  <p className="text-xs text-neutral-500">نقطة</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
