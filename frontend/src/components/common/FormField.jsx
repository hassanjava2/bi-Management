import { clsx } from 'clsx'

/**
 * Form field wrapper: label, optional error, RTL-friendly.
 */
export default function FormField({ label, error, required, children, className, htmlFor }) {
  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
        >
          {label}
          {required && <span className="text-error-500 mr-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-sm text-error-600 dark:text-error-400">{error}</p>
      )}
    </div>
  )
}
