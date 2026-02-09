import { clsx } from 'clsx'

const variants = {
  default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
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

const dotColors = {
  default: 'bg-neutral-500',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-error-500',
  info: 'bg-info-500',
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
        'inline-flex items-center gap-1.5 font-semibold rounded-badge transition-colors duration-smooth',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}
