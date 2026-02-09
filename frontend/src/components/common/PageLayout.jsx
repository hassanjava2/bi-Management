import { clsx } from 'clsx'

/**
 * Standard page layout: title, optional description, actions area, content.
 */
export default function PageLayout({ title, description, actions, children, className }) {
  return (
    <div className={clsx('space-y-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-page-title font-bold text-neutral-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
