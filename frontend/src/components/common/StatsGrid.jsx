import { clsx } from 'clsx'
import StatCard from '../dashboard/StatCard'

/**
 * Unified stats grid. items: [{ title, value, icon, color?, trend?, trendValue?, animate? }]
 * Renders a responsive grid of StatCards.
 */
export default function StatsGrid({ items = [], columns = 4, className }) {
  const safeItems = Array.isArray(items) ? items : []
  if (!safeItems.length) return null
  return (
    <div
      className={clsx(
        'grid gap-4 stagger-children',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {safeItems.map((item, i) => (
        <StatCard
          key={i}
          title={item.title}
          value={item.value}
          icon={item.icon}
          color={item.color || 'primary'}
          trend={item.trend}
          trendValue={item.trendValue}
          animate={item.animate}
        />
      ))}
    </div>
  )
}
