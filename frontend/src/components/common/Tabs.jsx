import { clsx } from 'clsx'

export default function Tabs({ tabs = [], activeId, onChange, className }) {
  return (
    <div className={clsx('flex gap-1 p-1 bg-surface-100/80 dark:bg-surface-800 rounded-xl', className)}>
      {tabs.map((tab) => {
        const isActive = activeId === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              'relative px-4 py-2 rounded-button text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge !== '' && (
              <span className={clsx(
                'mr-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                isActive 
                  ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                  : 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
