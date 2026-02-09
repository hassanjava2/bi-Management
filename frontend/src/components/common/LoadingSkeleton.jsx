import { clsx } from 'clsx'

export default function LoadingSkeleton({ className, ...props }) {
  return (
    <div
      className={clsx('skeleton rounded', className)}
      {...props}
    >
      &nbsp;
    </div>
  )
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-surface-900 rounded-card border border-surface-200/80 dark:border-surface-800 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="skeleton h-4 w-20 mb-3">&nbsp;</div>
              <div className="skeleton h-8 w-28">&nbsp;</div>
            </div>
            <div className="skeleton w-10 h-10 rounded-xl">&nbsp;</div>
          </div>
        </div>
      ))}
    </div>
  )
}
