import { forwardRef } from 'react'
import { clsx } from 'clsx'

const Input = forwardRef(function Input({
  label,
  error,
  hint,
  icon: Icon,
  required,
  className,
  ...props
}, ref) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          {label}
          {required && <span className="text-error-500 mr-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 text-surface-400" />
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            'block w-full rounded-input border bg-white px-3.5 py-2.5',
            'text-sm text-surface-900 placeholder:text-surface-400',
            'transition-all duration-150',
            'focus:border-primary-500 focus:shadow-input-focus focus:outline-none',
            'dark:bg-surface-900 dark:border-surface-700 dark:text-white dark:placeholder:text-surface-500',
            'dark:focus:border-primary-500',
            'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
            Icon && 'pr-10',
            error 
              ? 'border-error-300 focus:border-error-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' 
              : 'border-surface-200 dark:border-surface-700',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-error-600 dark:text-error-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-surface-500">{hint}</p>
      )}
    </div>
  )
})

export default Input
