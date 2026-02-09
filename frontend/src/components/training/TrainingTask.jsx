import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Circle, Play, FileText, HelpCircle, Users, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import Button from '../common/Button'
import Modal from '../common/Modal'
import { trainingAPI } from '../../services/api'

const TYPE_ICONS = {
  video: Play,
  task: CheckCircle,
  reading: FileText,
  quiz: HelpCircle,
  meeting: Users,
}

const TYPE_LABELS = {
  video: 'فيديو',
  task: 'مهمة',
  reading: 'قراءة',
  quiz: 'اختبار',
  meeting: 'اجتماع',
}

export default function TrainingTask({ task, index, onComplete }) {
  const [showModal, setShowModal] = useState(false)
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const completeMutation = useMutation({
    mutationFn: () => trainingAPI.completeTask(index, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['trainingProgress'])
      setShowModal(false)
      if (onComplete) onComplete()
    }
  })

  const Icon = TYPE_ICONS[task.type] || Circle
  const typeLabel = TYPE_LABELS[task.type] || task.type

  return (
    <>
      <div className={clsx(
        'p-4 rounded-xl border-2 transition-all',
        task.completed 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-primary-300'
      )}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            task.completed 
              ? 'bg-green-100 dark:bg-green-900/50 text-green-600'
              : 'bg-primary-100 dark:bg-primary-900/50 text-primary-600'
          )}>
            {task.completed ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <Icon className="w-6 h-6" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={clsx(
                'font-semibold',
                task.completed 
                  ? 'text-green-700 dark:text-green-300 line-through' 
                  : 'text-neutral-900 dark:text-white'
              )}>
                {task.title}
              </h4>
              <span className={clsx(
                'text-xs px-2 py-0.5 rounded-full',
                task.completed
                  ? 'bg-green-200 text-green-700'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
              )}>
                {typeLabel}
              </span>
            </div>
            
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
              {task.description}
            </p>

            {/* Action */}
            {!task.completed && (
              <Button 
                size="sm" 
                onClick={() => setShowModal(true)}
              >
                إكمال المهمة
              </Button>
            )}

            {task.completed && task.completed_at && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                تم الإكمال: {new Date(task.completed_at).toLocaleDateString('ar-IQ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="إكمال المهمة"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
            <h4 className="font-semibold text-neutral-900 dark:text-white">
              {task.title}
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {task.description}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg 
                         bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white
                         focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="أي ملاحظات أو أسئلة؟"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowModal(false)}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              تأكيد الإكمال
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
