import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown } from 'lucide-react'

const colorStyles = {
  primary: {
    icon: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    gradient: 'from-primary-500 to-primary-600',
  },
  success: {
    icon: 'bg-success-100 text-success-600 dark:bg-success-600/20 dark:text-success-400',
    gradient: 'from-success-500 to-success-600',
  },
  warning: {
    icon: 'bg-warning-100 text-warning-600 dark:bg-warning-600/20 dark:text-warning-400',
    gradient: 'from-warning-500 to-warning-600',
  },
  danger: {
    icon: 'bg-error-100 text-error-600 dark:bg-error-600/20 dark:text-error-400',
    gradient: 'from-error-500 to-error-600',
  },
  info: {
    icon: 'bg-info-100 text-info-600 dark:bg-info-600/20 dark:text-info-400',
    gradient: 'from-info-500 to-info-600',
  },
}

function useAnimatedValue(target, isNumeric, duration = 500) {
  const [display, setDisplay] = useState(isNumeric ? 0 : target)
  useEffect(() => {
    if (!isNumeric) {
      setDisplay(target)
      return
    }
    const num = Number(target)
    if (Number.isNaN(num)) {
      setDisplay(target)
      return
    }
    const start = performance.now()
    const step = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - (1 - progress) ** 2
      setDisplay(Math.round(easeOut * num))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, isNumeric, duration])
  return isNumeric ? String(display) : display
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
  animate = false,
  className,
}) {
  const c = colorStyles[color] || colorStyles.primary
  const isNumeric = animate && typeof value === 'number' && !Number.isNaN(value)
  const displayValue = useAnimatedValue(value, isNumeric)

  return (
    <div
      className={clsx(
        'bg-white dark:bg-neutral-900 rounded-card p-5',
        'border border-neutral-200/80 dark:border-neutral-800',
        'shadow-card hover:shadow-card-hover transition-all duration-smooth',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {displayValue}
          </p>

          {trend && (
            <div
              className={clsx(
                'mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                trend === 'up'
                  ? 'bg-success-50 text-success-700 dark:bg-success-600/20 dark:text-success-400'
                  : 'bg-error-50 text-error-700 dark:bg-error-600/20 dark:text-error-400'
              )}
            >
              {trend === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={clsx('p-2.5 rounded-xl', c.icon)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  )
}
