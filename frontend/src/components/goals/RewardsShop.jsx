import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, ShoppingBag, Check, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import Card from '../common/Card'
import Button from '../common/Button'
import Modal from '../common/Modal'
import Spinner from '../common/Spinner'
import Alert from '../common/Alert'
import { goalsAPI } from '../../services/api'

export default function RewardsShop() {
  const [selectedReward, setSelectedReward] = useState(null)
  const [message, setMessage] = useState(null)
  const queryClient = useQueryClient()

  const { data: pointsData } = useQuery({
    queryKey: ['myPoints'],
    queryFn: () => goalsAPI.getMyPoints(),
  })

  const { data: rewardsData, isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => goalsAPI.getRewards(),
  })

  const redeemMutation = useMutation({
    mutationFn: (rewardId) => goalsAPI.redeemReward(rewardId),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'تم طلب المكافأة بنجاح! سيتواصل معك HR قريباً.' })
      setSelectedReward(null)
      queryClient.invalidateQueries(['myPoints'])
    },
    onError: (err) => {
      setMessage({ type: 'error', text: err.response?.data?.message || 'فشل طلب المكافأة' })
    }
  })

  const myPoints = pointsData?.data?.data?.total_points || 0
  const rewards = rewardsData?.data?.data || []

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            <Card.Title>متجر المكافآت</Card.Title>
          </div>
          <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <span className="text-sm font-bold text-amber-600">
              رصيدك: {myPoints.toLocaleString()} نقطة
            </span>
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        {message && (
          <Alert variant={message.type} onClose={() => setMessage(null)} className="mb-4">
            {message.text}
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-surface-400" />
            <p className="text-surface-500">لا توجد مكافآت متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => {
              const canAfford = myPoints >= reward.points_required
              
              return (
                <div
                  key={reward.id}
                  className={clsx(
                    'p-4 rounded-xl border-2 transition-all',
                    canAfford 
                      ? 'border-green-200 dark:border-green-800 hover:border-green-400 cursor-pointer' 
                      : 'border-surface-200 dark:border-surface-700 opacity-60'
                  )}
                  onClick={() => canAfford && setSelectedReward(reward)}
                >
                  {/* Image or Icon */}
                  <div className="h-32 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-5xl">{reward.icon || '🎁'}</span>
                  </div>

                  {/* Info */}
                  <h4 className="font-semibold text-surface-900 dark:text-white">{reward.name}</h4>
                  <p className="text-sm text-surface-500 mt-1 line-clamp-2">{reward.description}</p>

                  {/* Points & Action */}
                  <div className="flex items-center justify-between mt-4">
                    <span className={clsx(
                      'font-bold',
                      canAfford ? 'text-green-600' : 'text-surface-400'
                    )}>
                      {reward.points_required.toLocaleString()} نقطة
                    </span>
                    
                    {canAfford ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        متاح
                      </span>
                    ) : (
                      <span className="text-xs text-surface-400">
                        ينقصك {(reward.points_required - myPoints).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Quantity */}
                  {reward.quantity !== null && (
                    <p className="text-xs text-orange-500 mt-2">
                      متبقي: {reward.quantity}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card.Body>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!selectedReward}
        onClose={() => setSelectedReward(null)}
        title="تأكيد الاستبدال"
        size="sm"
      >
        {selectedReward && (
          <div className="text-center">
            <div className="text-6xl mb-4">{selectedReward.icon || '🎁'}</div>
            <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
              {selectedReward.name}
            </h3>
            <p className="text-surface-500 mb-4">{selectedReward.description}</p>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-6">
              <p className="text-sm text-surface-600 dark:text-surface-400">ستستبدل</p>
              <p className="text-2xl font-bold text-amber-600">
                {selectedReward.points_required.toLocaleString()} نقطة
              </p>
              <p className="text-xs text-surface-500 mt-1">
                رصيدك المتبقي: {(myPoints - selectedReward.points_required).toLocaleString()} نقطة
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setSelectedReward(null)}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                loading={redeemMutation.isPending}
                onClick={() => redeemMutation.mutate(selectedReward.id)}
              >
                تأكيد الاستبدال
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  )
}
