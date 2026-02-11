import { clsx } from 'clsx'
import Spinner from './Spinner'

const variants = {
  primary: 'text-white shadow-md hover:shadow-[var(--neon-glow)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200',
  secondary: 'hover:opacity-80 transition-all duration-200',
  outline: 'border bg-transparent hover:opacity-90 transition-all duration-200',
  success: 'bg-success-500 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md transition-all duration-200',
  danger: 'bg-error-500 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md transition-all duration-200',
  ghost: 'bg-transparent hover:opacity-80 transition-all duration-200',
  'ghost-primary': 'bg-transparent hover:opacity-90 transition-all duration-200',
}

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs gap-1',
  sm: 'px-3 py-2 text-sm gap-1.5',
  md: 'px-4 py-3 text-sm gap-2',
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
  const variantStyles = {
    primary: { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' },
    secondary: { background: 'var(--darker)', color: 'var(--light)' },
    outline: { borderColor: 'var(--border)', color: 'var(--light)', background: 'var(--card-bg)' },
    ghost: { color: 'var(--gray)' },
    'ghost-primary': { color: 'var(--primary)' },
  }

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium',
        'rounded-xl transition-all duration-smooth ease-smooth',
        'focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        ripple && 'btn-ripple',
        variants[variant],
        sizes[size],
        className
      )}
      style={variantStyles[variant]}
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
