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
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--light)' }}
        >
          {label}
          {required && <span className="text-error-500 mr-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
    </div>
  )
}
