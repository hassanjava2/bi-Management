import { clsx } from 'clsx'
import Spinner from './Spinner'

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-button hover:shadow-md',
  secondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700',
  outline: 'border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-300',
  success: 'bg-success-600 text-white hover:bg-success-700 shadow-button',
  danger: 'bg-error-600 text-white hover:bg-error-700 shadow-button',
  ghost: 'bg-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
  'ghost-primary': 'bg-transparent text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20',
}

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs gap-1',
  sm: 'px-3 py-2 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2',
  xl: 'px-6 py-3.5 text-base gap-2.5',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  ripple = false,
  className,
  icon: Icon,
  iconPosition = 'start',
  ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium',
        'rounded-button transition-all duration-smooth ease-smooth',
        'focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        ripple && 'btn-ripple',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {!loading && Icon && iconPosition === 'start' && <Icon className="w-4 h-4 shrink-0" />}
      {children}
      {!loading && Icon && iconPosition === 'end' && <Icon className="w-4 h-4 shrink-0" />}
    </button>
  )
}
