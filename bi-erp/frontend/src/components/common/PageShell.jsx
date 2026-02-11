import { clsx } from 'clsx'

/**
 * Unified page wrapper: title, description, actions, optional toolbar, content.
 * Use PageShell.Toolbar and PageShell.Content for consistent layout.
 */
export default function PageShell({ title, description, actions, children, className }) {
  return (
    <div className={clsx('space-y-6 animate-fade-in', className)}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--light)' }}>
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm" style={{ color: 'var(--gray)' }}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

PageShell.Toolbar = function PageShellToolbar({ children, className }) {
  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-3 py-3',
        className
      )}
    >
      {children}
    </div>
  )
}

PageShell.Content = function PageShellContent({ children, className }) {
  return (
    <div className={clsx('mt-2', className)}>
      {children}
    </div>
  )
}
