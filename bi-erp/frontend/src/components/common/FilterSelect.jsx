import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

/**
 * Unified filter dropdown. options: [{ value, label }]
 * value/onChange work like controlled select.
 */
export default function FilterSelect({
  options = [],
  value,
  onChange,
  placeholder = 'الكل',
  label,
  className,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const selected = options.find((o) => o.value === value)
  const displayLabel = selected ? selected.label : placeholder

  return (
    <div className={clsx('relative', className)} ref={ref}>
      {label && (
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'inline-flex items-center justify-between gap-2 min-w-[140px]',
          'rounded-xl border py-2.5 px-4 text-sm text-right',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
          'transition-colors'
        )}
        style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--light)' }}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={clsx('w-4 h-4 shrink-0 text-neutral-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          className="absolute top-full end-0 mt-1 min-w-[180px] py-1 rounded-xl border shadow-lg z-50 animate-slide-up"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
          role="listbox"
        >
          <button
            type="button"
            role="option"
            aria-selected={value == null || value === ''}
            onClick={() => {
              onChange?.(null)
              setOpen(false)
            }}
            className={clsx(
              'w-full text-right px-4 py-2.5 text-sm transition-colors',
              (value == null || value === '') ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            )}
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange?.(opt.value)
                setOpen(false)
              }}
              className={clsx(
                'w-full text-right px-4 py-2.5 text-sm transition-colors',
                value === opt.value ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
