import { clsx } from 'clsx'
import { ChevronRight, ChevronLeft, Inbox } from 'lucide-react'
import EmptyState from './EmptyState'

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onRowClick,
  pagination,
  className,
  striped = true,
  compact = false,
}) {
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3.5'
  const headerPadding = compact ? 'px-3 py-2.5' : 'px-4 py-3'

  if (loading) {
    return (
      <div className={clsx('overflow-hidden rounded-card border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900', className)}>
        <table className="w-full">
          <thead>
            <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-800">
              {columns.map((col) => (
                <th key={col.key} className={clsx(headerPadding, 'text-right text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide', col.headerClassName)}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-surface-50 dark:border-surface-800/50">
                {columns.map((col) => (
                  <td key={col.key} className={cellPadding}>
                    <div className="skeleton h-5 w-full max-w-[140px]">&nbsp;</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={clsx('rounded-card border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 p-8', className)}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      </div>
    )
  }

  return (
    <div className={clsx('overflow-hidden rounded-card border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-50/80 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    headerPadding,
                    'text-right text-[11px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide',
                    col.headerClassName
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                className={clsx(
                  'border-b border-surface-50 dark:border-surface-800/50 last:border-0',
                  'transition-colors duration-100',
                  onRowClick && 'cursor-pointer',
                  onRowClick ? 'hover:bg-primary-50/50 dark:hover:bg-primary-900/10' : 'hover:bg-surface-50/50 dark:hover:bg-surface-800/30',
                  striped && rowIndex % 2 === 1 && 'bg-surface-50/30 dark:bg-surface-800/20'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(cellPadding, 'text-sm text-surface-700 dark:text-surface-300', col.className)}
                  >
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > pagination.perPage && (
        <div className="px-4 py-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between bg-surface-50/50 dark:bg-surface-800/30">
          <span className="text-xs text-surface-500 dark:text-surface-400">
            عرض {(pagination.page - 1) * pagination.perPage + 1} - {Math.min(pagination.page * pagination.perPage, pagination.total)} من {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg text-sm font-medium border border-surface-200 dark:border-surface-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-surface-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-surface-700 dark:text-surface-300">
              {pagination.page}
            </span>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.perPage >= pagination.total}
              className="p-1.5 rounded-lg text-sm font-medium border border-surface-200 dark:border-surface-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-surface-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
