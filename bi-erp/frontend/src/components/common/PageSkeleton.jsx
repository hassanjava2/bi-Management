import { clsx } from 'clsx'

export default function PageSkeleton({ rows = 5, hasStats = true, className }) {
  return (
    <div className={clsx('space-y-6 animate-fade-in', className)}>
      {/* Title skeleton */}
      <div className="flex justify-between items-center">
        <div>
          <div className="skeleton h-7 w-48 mb-2">&nbsp;</div>
          <div className="skeleton h-4 w-32">&nbsp;</div>
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-10 w-24 rounded-xl">&nbsp;</div>
          <div className="skeleton h-10 w-28 rounded-xl">&nbsp;</div>
        </div>
      </div>
      {/* Stats skeleton */}
      {hasStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-6 shadow-sm" style={{ background: 'var(--card-bg)' }}>
              <div className="skeleton h-3 w-20 mb-3">&nbsp;</div>
              <div className="skeleton h-8 w-24">&nbsp;</div>
            </div>
          ))}
        </div>
      )}
      {/* Table skeleton */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="skeleton h-4 w-full max-w-[200px]">&nbsp;</div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
            <div className="skeleton h-4 w-24">&nbsp;</div>
            <div className="skeleton h-4 flex-1 max-w-[180px]">&nbsp;</div>
            <div className="skeleton h-4 w-16">&nbsp;</div>
            <div className="skeleton h-4 w-20">&nbsp;</div>
          </div>
        ))}
      </div>
    </div>
  )
}
