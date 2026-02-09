import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown } from 'lucide-react'

const colorStyles = {
  primary: {
    border: 'border-s-primary-500',
    icon: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
  },
  success: {
    border: 'border-s-success-500',
    icon: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
  },
  warning: {
    border: 'border-s-warning-500',
    icon: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400',
  },
  danger: {
    border: 'border-s-error-500',
    icon: 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400',
  },
  info: {
    border: 'border-s-info-500',
    icon: 'bg-info-50 text-info-600 dark:bg-info-500/10 dark:text-info-400',
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
    <div className={clsx(
      'bg-white dark:bg-neutral-900 rounded-xl p-5',
      'border border-neutral-100 dark:border-neutral-800',
      'border-s-[3px]', c.border,
      'hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50',
      'transition-all duration-300',
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-3 text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {displayValue}
          </p>
          {trend && (
            <div className={clsx(
              'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
              trend === 'up' ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'
            )}>
              {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('p-3 rounded-xl', c.icon)}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  )
}
