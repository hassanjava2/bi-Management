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
    <div className={clsx('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-surface-400 dark:text-surface-500" />
      </div>
      <h3 className="text-base font-semibold text-surface-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
