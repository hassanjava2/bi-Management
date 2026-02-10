import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { Search } from 'lucide-react'

const SearchInput = forwardRef(function SearchInput(
  { placeholder = 'بحث...', className, ...props },
  ref
) {
  return (
    <div className={clsx('relative flex-1 min-w-0 max-w-sm', className)}>
      <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className={clsx(
          'w-full rounded-xl border border-neutral-200 dark:border-neutral-700',
          'bg-white dark:bg-neutral-900',
          'py-2.5 pe-10 ps-4 text-sm',
          'text-neutral-900 dark:text-white placeholder:text-neutral-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
          'transition-colors'
        )}
        {...props}
      />
    </div>
  )
})

export default SearchInput
