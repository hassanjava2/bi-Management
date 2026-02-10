import { clsx } from 'clsx'
import { User, Bot, CheckSquare, CheckCircle, XCircle } from 'lucide-react'
import { formatTime } from '../../utils/helpers'
import { Link } from 'react-router-dom'

export default function ChatMessage({ message, isUser, onConfirmTask, confirmTaskPending }) {
  const tasks = message.suggested_tasks || []
  const actionResult = message.action_result

  return (
    <div className={clsx(
      'flex gap-3 mb-4',
      isUser ? 'flex-row-reverse' : ''
    )}>
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isUser 
          ? 'bg-primary-100 dark:bg-primary-900 text-primary-600' 
          : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className={clsx(
        'max-w-[80%] rounded-2xl px-4 py-2',
        isUser 
          ? 'bg-primary-600 text-white rounded-br-sm' 
          : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-bl-sm'
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {actionResult && (
          <div className={clsx(
            'mt-2 rounded-lg px-3 py-2 text-sm flex items-start gap-2',
            actionResult.success
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          )}>
            {actionResult.success ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <span>
              {actionResult.success && actionResult.result?.message
                ? actionResult.result.message
                : actionResult.error || (actionResult.success ? 'تم التنفيذ.' : 'فشل التنفيذ.')}
            </span>
            {actionResult.success && actionResult.result?.id && (
              <Link
                to="/accounting?tab=vouchers"
                className="text-primary-600 dark:text-primary-400 hover:underline flex-shrink-0"
              >
                عرض السندات
              </Link>
            )}
          </div>
        )}
        {tasks.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">مهام مقترحة بناءً على مشكلتك:</p>
            {tasks.map((item, idx) => {
              const task = item.suggested_task || item
              const created = item._created
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 p-2 text-right"
                >
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{task.title}</p>
                  {task.description && <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{task.description}</p>}
                  {item.assignee_suggestion?.employee_name && (
                    <p className="text-xs text-neutral-500 mt-1">المقترح: {item.assignee_suggestion.employee_name}</p>
                  )}
                  {created ? (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5" /> تم إنشاء المهمة
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onConfirmTask?.(task)}
                      disabled={confirmTaskPending}
                      className="mt-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                    >
                      إنشاء المهمة
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <p className={clsx(
          'text-xs mt-1',
          isUser ? 'text-primary-200' : 'text-neutral-500 dark:text-neutral-400'
        )}>
          {formatTime(message.timestamp || message.created_at)}
        </p>
      </div>
    </div>
  )
}
