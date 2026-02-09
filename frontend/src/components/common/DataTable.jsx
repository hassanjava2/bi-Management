import { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import { ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Search, Inbox } from 'lucide-react'
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
  // Sorting
  sortKey,
  sortOrder = 'asc',
  onSort,
  // Filtering
  filterable = false,
  globalFilterPlaceholder = 'بحث...',
  onGlobalFilterChange,
  globalFilterValue,
  // Bulk actions
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  bulkActions,
}) {
  const [localFilter, setLocalFilter] = useState(globalFilterValue ?? '')
  const filterValue = globalFilterValue !== undefined ? globalFilterValue : localFilter
  const setFilter = onGlobalFilterChange ?? setLocalFilter

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3.5'
  const headerPadding = compact ? 'px-3 py-2.5' : 'px-4 py-3'

  const filteredData = useMemo(() => {
    if (!filterable || !filterValue?.trim()) return data
    const q = filterValue.trim().toLowerCase()
    return data.filter((row) =>
      columns.some((col) => {
        const val = col.render ? col.render(row) : row[col.key]
        return String(val ?? '').toLowerCase().includes(q)
      })
    )
  }, [data, columns, filterable, filterValue])

  const handleSort = (key) => {
    if (!onSort) return
    onSort(key, sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const toggleSelectAll = () => {
    if (!onSelectionChange) return
    if (selectedRows.length >= filteredData.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(filteredData.map((r) => r.id ?? r))
    }
  }

  const toggleRow = (row) => {
    if (!onSelectionChange) return
    const id = row.id ?? row
    const set = new Set(selectedRows)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onSelectionChange(Array.from(set))
  }

  if (loading) {
    return (
      <div
        className={clsx(
          'overflow-hidden rounded-card border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900',
          className
        )}
      >
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
              {selectable && (
                <th className={clsx(headerPadding, 'w-10')} />
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    headerPadding,
                    'text-end text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide',
                    col.headerClassName
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50">
                {selectable && <td className={cellPadding}><div className="skeleton h-4 w-4 rounded" /> </td>}
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

  if (!filteredData || filteredData.length === 0) {
    return (
      <div
        className={clsx(
          'rounded-card border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8',
          className
        )}
      >
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      </div>
    )
  }

  const totalFiltered = filteredData.length
  const useClientPagination = filterable && pagination
  const displayData = useClientPagination
    ? filteredData.slice(
        (pagination.page - 1) * pagination.perPage,
        pagination.page * pagination.perPage
      )
    : filteredData
  const paginationTotal = useClientPagination ? totalFiltered : (pagination?.total ?? data.length)
  const showPagination = pagination && paginationTotal > pagination.perPage

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-card border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900',
        className
      )}
    >
      {(filterable || (selectable && selectedRows.length > 0)) && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
          {filterable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="search"
                value={filterValue}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={globalFilterPlaceholder}
                className="w-full rounded-input border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-2 pe-10 ps-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              />
            </div>
          )}
          {selectable && selectedRows.length > 0 && bulkActions && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {selectedRows.length} محدد
              </span>
              {bulkActions}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50/80 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
              {selectable && (
                <th className={clsx(headerPadding, 'w-10')}>
                  <input
                    type="checkbox"
                    checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((col) => {
                const sortable = onSort && (col.sortable !== false) && col.key
                const isActive = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    className={clsx(
                      headerPadding,
                      'text-end text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide',
                      sortable && 'cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-200',
                      col.headerClassName
                    )}
                    onClick={sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortable && (
                        <span className="inline-flex shrink-0">
                          {isActive && sortOrder === 'asc' && <ChevronUp className="w-3.5 h-3.5" />}
                          {isActive && sortOrder === 'desc' && <ChevronDown className="w-3.5 h-3.5" />}
                          {!isActive && <ChevronUp className="w-3.5 h-3.5 opacity-30" />}
                        </span>
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, rowIndex) => {
              const rowId = row.id ?? rowIndex
              const isSelected = selectable && selectedRows.includes(rowId)
              return (
                <tr
                  key={rowId}
                  onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                  className={clsx(
                    'border-b border-neutral-50 dark:border-neutral-800/50 last:border-0',
                    'transition-colors duration-100',
                    onRowClick && 'cursor-pointer',
                    onRowClick
                      ? 'hover:bg-primary-50/50 dark:hover:bg-primary-900/10'
                      : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30',
                    striped && rowIndex % 2 === 1 && 'bg-neutral-50/30 dark:bg-neutral-800/20',
                    isSelected && 'bg-primary-50/50 dark:bg-primary-900/20'
                  )}
                >
                  {selectable && (
                    <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row)}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(cellPadding, 'text-sm text-neutral-700 dark:text-neutral-300', col.className)}
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/30">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            عرض {(pagination.page - 1) * pagination.perPage + 1} -{' '}
            {Math.min(pagination.page * pagination.perPage, paginationTotal)} من {paginationTotal}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {pagination.page}
            </span>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.perPage >= paginationTotal}
              className="p-1.5 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
