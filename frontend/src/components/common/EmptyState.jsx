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
        'flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in',
        className
      )}
    >
      <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center mb-6 border border-neutral-200/50 dark:border-neutral-700/50">
        <Icon className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
      </div>
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
