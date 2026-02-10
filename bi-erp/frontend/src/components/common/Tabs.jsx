import { clsx } from 'clsx'

export default function Tabs({ tabs = [], activeId, onChange, className }) {
  return (
    <div
      className={clsx(
        'flex gap-1 p-1 bg-neutral-100/80 dark:bg-neutral-800 rounded-xl',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'relative px-4 py-2 rounded-button text-sm font-medium transition-all duration-smooth inline-flex items-center gap-2',
              isActive
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            {tab.icon && <tab.icon className="w-4 h-4 shrink-0" />}
            {tab.label}
            {tab.badge != null && tab.badge !== '' && (
              <span
                className={clsx(
                  'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
