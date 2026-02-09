import { clsx } from 'clsx'
import { Inbox } from 'lucide-react'
import Button from './Button'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'لا توجد بيانات',
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-5 shadow-card">
        <Icon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm" ripple>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
