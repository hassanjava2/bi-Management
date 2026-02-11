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
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border" style={{ background: 'var(--darker)', borderColor: 'var(--border)' }}>
        <Icon className="w-10 h-10" style={{ color: 'var(--gray)' }} />
      </div>
      <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--light)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-sm mb-6 leading-relaxed" style={{ color: 'var(--gray)' }}>
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
