import { clsx } from 'clsx'

export default function PageHeader({ title, subtitle, children, className }) {
  return (
    <div className={clsx('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--light)' }}>{title}</h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray)' }}>{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
