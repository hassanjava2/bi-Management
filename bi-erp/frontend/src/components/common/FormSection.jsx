import { clsx } from 'clsx'

/**
 * Form section: title and optional description, groups form fields.
 */
export default function FormSection({ title, description, children, className }) {
  return (
    <div className={clsx('space-y-4', className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-section-title font-semibold" style={{ color: 'var(--light)' }}>
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm" style={{ color: 'var(--gray)' }}>{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
