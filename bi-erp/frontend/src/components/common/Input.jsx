import { forwardRef, useState } from 'react'
import { clsx } from 'clsx'

const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    icon: Icon,
    required,
    floatingLabel = false,
    className,
    ...props
  },
  ref
) {
  const [focused, setFocused] = useState(false)
  const hasValue = props.value !== undefined && props.value !== '' && props.value !== null
  const showFloating = floatingLabel && (focused || hasValue || (props.defaultValue && props.defaultValue !== ''))

  return (
    <div className="w-full">
      {label && !floatingLabel && (
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--light)' }}>
          {label}
          {required && <span className="text-error-500 ms-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 end-0 flex items-center pointer-events-none pe-3">
            <Icon className="h-4 w-4 text-neutral-400" />
          </div>
        )}
        <input
          ref={ref}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
          className={clsx(
            'block w-full rounded-input border px-3.5 py-2.5 text-sm transition-all duration-smooth',
            'focus:border-primary-500 focus:shadow-input-focus focus:outline-none',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            Icon && 'pe-10',
            floatingLabel && 'pt-5',
            error && 'border-error-500 focus:border-error-500',
            className
          )}
          style={{
            borderColor: error ? undefined : 'var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--light)',
          }}
          placeholder={floatingLabel && !showFloating ? undefined : props.placeholder}
          {...props}
        />
        {floatingLabel && label && (
          <label
            className={clsx(
              'absolute start-3.5 transition-all duration-smooth pointer-events-none',
              showFloating
                ? 'top-1.5 text-[11px] font-medium'
                : 'top-1/2 -translate-y-1/2 text-sm'
            )}
            style={{ color: 'var(--gray)' }}
          >
            {required && <span className="text-error-500 ms-0.5">*</span>}
            {label}
          </label>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-error-600 dark:text-error-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      )}
    </div>
  )
})

export default Input
