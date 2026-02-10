import { clsx } from 'clsx'
import { Link } from 'react-router-dom'

export default function Breadcrumb({ items = [], separator = '/', className }) {
  if (!items.length) return null
  return (
    <nav aria-label="مسار التنقل" className={clsx('flex items-center gap-2 text-sm', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const content = (
          <span
            className={clsx(
              'transition-colors',
              isLast
                ? 'font-medium text-neutral-900 dark:text-white'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            {item.label}
          </span>
        )
        return (
          <span key={i} className="inline-flex items-center gap-2">
            {i > 0 && (
              <span className="text-neutral-400 dark:text-neutral-500 select-none" aria-hidden>
                {separator}
              </span>
            )}
            {item.href && !isLast ? (
              <Link to={item.href} className="inline-flex">
                {content}
              </Link>
            ) : (
              content
            )}
          </span>
        )
      })}
    </nav>
  )
}
