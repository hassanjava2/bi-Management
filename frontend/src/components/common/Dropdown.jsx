import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

export default function Dropdown({
  trigger,
  children,
  align = 'end',
  className,
  menuClassName,
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

  return (
    <div className={clsx('relative inline-block', className)} ref={ref}>
      <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={clsx(
            'absolute z-50 mt-1 min-w-[160px] py-1 rounded-button border border-neutral-200 dark:border-neutral-700',
            'bg-white dark:bg-neutral-900 shadow-modal animate-slide-down',
            align === 'end' && 'end-0',
            align === 'start' && 'start-0',
            menuClassName
          )}
          role="menu"
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  icon: Icon,
  children,
  onClick,
  disabled,
  className,
  close,
}) {
  const handleClick = () => {
    if (disabled) return
    onClick?.()
    close?.()
  }
  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleClick}
      disabled={disabled}
      className={clsx(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-right transition-colors',
        'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  )
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" role="separator" />
}
