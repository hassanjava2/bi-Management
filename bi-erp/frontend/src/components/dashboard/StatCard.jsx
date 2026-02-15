import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown } from 'lucide-react'

const colorStyles = {
  primary: {
    icon: 'text-primary-500/25 dark:text-primary-400/20',
    iconBox: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
  },
  success: {
    icon: 'text-success-500/25 dark:text-success-400/20',
    iconBox: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
  },
  warning: {
    icon: 'text-warning-500/25 dark:text-warning-400/20',
    iconBox: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400',
  },
  danger: {
    icon: 'text-error-500/25 dark:text-error-400/20',
    iconBox: 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400',
  },
  info: {
    icon: 'text-info-500/25 dark:text-info-400/20',
    iconBox: 'bg-info-50 text-info-600 dark:bg-info-500/10 dark:text-info-400',
  },
}

function useAnimatedValue(target, isNumeric, duration = 600) {
  const [display, setDisplay] = useState(isNumeric ? 0 : target)
  useEffect(() => {
    if (!isNumeric) { setDisplay(target); return }
    const num = Number(target)
    if (Number.isNaN(num)) { setDisplay(target); return }
    const start = performance.now()
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - (1 - p) ** 3
      setDisplay(Math.round(ease * num))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, isNumeric, duration])
  return isNumeric ? String(display) : display
}

export default function StatCard({
  title, value, icon: Icon, trend, trendValue,
  color = 'primary', animate = false, className,
}) {
  const c = colorStyles[color] || colorStyles.primary
  const isNumeric = animate && typeof value === 'number' && !Number.isNaN(value)
  const displayValue = useAnimatedValue(value, isNumeric)

  return (
    <div
      className={clsx(
        'stat-card rounded-[16px] p-6 relative overflow-hidden',
        'border shadow-sm',
        'transition-all duration-300',
        className
      )}
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
    >
      {Icon && (
        <div className={clsx('absolute end-4 bottom-4 opacity-[0.07] pointer-events-none', c.icon)} aria-hidden>
          <Icon className="w-16 h-16" />
        </div>
      )}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--gray)' }}>
            {title}
          </p>
          <p className="mt-3 text-4xl font-bold tabular-nums stat-value">
            {displayValue}
          </p>
          {(trend || trendValue) && (
            <div className={clsx(
              'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
              trend === 'up' ? 'text-success-600 dark:text-success-400' :
                trend === 'down' ? 'text-error-600 dark:text-error-400' :
                  ''
            )} style={!trend ? { color: 'var(--gray)' } : undefined}>
              {trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
              {trend === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('p-3 rounded-xl shrink-0', c.iconBox)}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  )
}
