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
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
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
            'block w-full rounded-input border bg-white px-3.5 py-2.5',
            'text-sm text-neutral-900 placeholder:text-neutral-400',
            'transition-all duration-smooth',
            'focus:border-primary-500 focus:shadow-input-focus focus:outline-none',
            'dark:bg-neutral-900 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500',
            'dark:focus:border-primary-500',
            'disabled:bg-neutral-50 dark:disabled:bg-neutral-800/50 disabled:text-neutral-400 disabled:cursor-not-allowed',
            Icon && 'pe-10',
            floatingLabel && 'pt-5',
            error
              ? 'border-error-300 focus:border-error-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)] dark:border-error-600'
              : 'border-neutral-200 dark:border-neutral-700',
            className
          )}
          placeholder={floatingLabel && !showFloating ? undefined : props.placeholder}
          {...props}
        />
        {floatingLabel && label && (
          <label
            className={clsx(
              'absolute start-3.5 transition-all duration-smooth pointer-events-none',
              showFloating
                ? 'top-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400'
                : 'top-1/2 -translate-y-1/2 text-sm text-neutral-400 dark:text-neutral-500'
            )}
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
