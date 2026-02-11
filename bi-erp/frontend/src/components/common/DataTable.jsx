import { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import { ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Search } from 'lucide-react'
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
  striped = false,
  compact = false,
  sortKey,
  sortOrder = 'asc',
  onSort,
  filterable = false,
  globalFilterPlaceholder = 'بحث...',
  onGlobalFilterChange,
  globalFilterValue,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  bulkActions,
}) {
  const [localFilter, setLocalFilter] = useState(globalFilterValue ?? '')
  const filterValue = globalFilterValue !== undefined ? globalFilterValue : localFilter
  const setFilter = onGlobalFilterChange ?? setLocalFilter

  const cellPadding = compact ? 'px-4 py-2.5' : 'px-5 py-4'
  const headerPadding = compact ? 'px-4 py-3' : 'px-5 py-4'

  // Safety: ensure data is always an array
  const safeData = Array.isArray(data) ? data : []
  const safeColumns = Array.isArray(columns) ? columns : []

  const filteredData = useMemo(() => {
    if (!filterable || !filterValue?.trim()) return safeData
    const q = filterValue.trim().toLowerCase()
    return safeData.filter((row) =>
      safeColumns.some((col) => {
        const val = col.render ? col.render(row) : row[col.key]
        return String(val ?? '').toLowerCase().includes(q)
      })
    )
  }, [safeData, safeColumns, filterable, filterValue])

  const handleSort = (key) => {
    if (!onSort) return
    onSort(key, sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const toggleSelectAll = () => {
    if (!onSelectionChange) return
    const items = Array.isArray(filteredData) ? filteredData : []
    onSelectionChange(selectedRows.length >= items.length ? [] : items.map((r) => r.id ?? r))
  }

  const toggleRow = (row) => {
    if (!onSelectionChange) return
    const id = row.id ?? row
    const set = new Set(selectedRows)
    set.has(id) ? set.delete(id) : set.add(id)
    onSelectionChange(Array.from(set))
  }

  if (loading) {
    return (
      <div className={clsx('rounded-[16px] border overflow-hidden', className)} style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--primary)' }}>
              {safeColumns.map((col) => (
                <th key={col.key} className={clsx(headerPadding, 'text-end text-[11px] font-semibold uppercase tracking-wider text-white', col.headerClassName)}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
                {safeColumns.map((col) => (
                  <td key={col.key} className={cellPadding}>
                    <div className="skeleton h-4 w-full max-w-[140px]">&nbsp;</div>
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
      <div className={clsx('rounded-[16px] border p-8', className)} style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <EmptyState title={emptyTitle} description={emptyDescription} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
      </div>
    )
  }

  const totalFiltered = filteredData.length
  const useClientPagination = filterable && pagination
  const displayData = useClientPagination
    ? filteredData.slice((pagination.page - 1) * pagination.perPage, pagination.page * pagination.perPage)
    : filteredData
  const paginationTotal = useClientPagination ? totalFiltered : (pagination?.total ?? data.length)
  const showPagination = pagination && paginationTotal > pagination.perPage

  return (
    <div className={clsx('rounded-[16px] border overflow-hidden', className)} style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
      {/* Toolbar */}
      {(filterable || (selectable && selectedRows.length > 0)) && (
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          {filterable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="search"
                value={filterValue}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={globalFilterPlaceholder}
                className="w-full rounded-lg border py-2 pe-10 ps-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                style={{ borderColor: 'var(--border)', background: 'var(--darker)', color: 'var(--light)' }}
              />
            </div>
          )}
          {selectable && selectedRows.length > 0 && bulkActions && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">{selectedRows.length} محدد</span>
              {bulkActions}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--primary)' }}>
              {selectable && (
                <th className={clsx(headerPadding, 'w-10')}>
                  <input type="checkbox" checked={selectedRows.length === filteredData.length && filteredData.length > 0} onChange={toggleSelectAll} className="rounded border-white/50 text-white focus:ring-primary-500 bg-white/20" />
                </th>
              )}
              {safeColumns.map((col) => {
                const sortable = onSort && col.sortable !== false && col.key
                const isActive = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    className={clsx(headerPadding, 'text-end text-[11px] font-semibold uppercase tracking-wider text-white', sortable && 'cursor-pointer select-none hover:opacity-90', col.headerClassName)}
                    onClick={sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortable && (
                        <span className="inline-flex shrink-0">
                          {isActive && sortOrder === 'asc' && <ChevronUp className="w-3.5 h-3.5" />}
                          {isActive && sortOrder === 'desc' && <ChevronDown className="w-3.5 h-3.5" />}
                          {!isActive && <ChevronUp className="w-3.5 h-3.5 opacity-20" />}
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
                    'border-b last:border-0 transition-colors duration-100 hover:bg-[var(--darker)]',
                    onRowClick && 'cursor-pointer',
                    striped && rowIndex % 2 === 1 && 'bg-black/5',
                    isSelected && '!bg-primary-500/20'
                  )}
                  style={{ borderColor: 'var(--border)' }}
                >
                  {selectable && (
                    <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(row)} className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                    </td>
                  )}
                  {safeColumns.map((col) => (
                    <td key={col.key} className={cellPadding + ' text-sm ' + (col.className || '')} style={{ color: 'var(--light)' }}>
                      {col.render ? col.render(row) : (
                        <span className="block truncate">{row[col.key] ?? '—'}</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--gray)' }}>
            عرض {(pagination.page - 1) * pagination.perPage + 1} - {Math.min(pagination.page * pagination.perPage, paginationTotal)} من {paginationTotal}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => pagination.onPageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg border disabled:opacity-30 transition-colors hover:bg-[var(--darker)]" style={{ borderColor: 'var(--border)' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-semibold" style={{ color: 'var(--light)' }}>{pagination.page}</span>
            <button type="button" onClick={() => pagination.onPageChange(pagination.page + 1)} disabled={pagination.page * pagination.perPage >= paginationTotal} className="p-1.5 rounded-lg border disabled:opacity-30 transition-colors hover:bg-[var(--darker)]" style={{ borderColor: 'var(--border)' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
