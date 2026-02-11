import { clsx } from 'clsx'

export default function Tabs({ tabs = [], activeId, onChange, className }) {
  return (
    <div
      className={clsx(
        'flex gap-1 p-1 rounded-xl',
        className
      )}
      style={{ background: 'var(--darker)' }}
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
              isActive ? 'shadow-sm' : 'hover:opacity-80'
            )}
            style={isActive ? { background: 'var(--card-bg)', color: 'var(--light)' } : { color: 'var(--gray)' }}
          >
            {tab.icon && <tab.icon className="w-4 h-4 shrink-0" />}
            {tab.label}
            {tab.badge != null && tab.badge !== '' && (
              <span
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                style={isActive ? { background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary)' } : { background: 'var(--darker)', color: 'var(--gray)' }}
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
