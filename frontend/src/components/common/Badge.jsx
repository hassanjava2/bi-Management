import { clsx } from 'clsx'

const variants = {
  default: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  success: 'bg-success-50 text-success-700 dark:bg-success-600/20 dark:text-success-400',
  warning: 'bg-warning-50 text-warning-700 dark:bg-warning-600/20 dark:text-warning-400',
  danger: 'bg-error-50 text-error-700 dark:bg-error-600/20 dark:text-error-400',
  info: 'bg-info-50 text-info-700 dark:bg-info-600/20 dark:text-info-400',
}

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot = false,
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold rounded-badge',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' && 'bg-success-500',
          variant === 'warning' && 'bg-warning-500',
          variant === 'danger' && 'bg-error-500',
          variant === 'info' && 'bg-info-500',
          variant === 'primary' && 'bg-primary-500',
          variant === 'default' && 'bg-surface-500',
        )} />
      )}
      {children}
    </span>
  )
}
