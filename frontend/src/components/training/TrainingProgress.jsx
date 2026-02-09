import { clsx } from 'clsx'

export default function TrainingProgress({ progress, currentDay, totalDays }) {
  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-600 dark:text-surface-400">نسبة الإنجاز</span>
        <span className="font-bold text-primary-600">{progress}%</span>
      </div>
      
      <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
        <div 
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            progress === 100 
              ? 'bg-green-500' 
              : 'bg-gradient-to-r from-primary-500 to-primary-600'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Day Progress */}
      <div className="flex justify-between items-center pt-2">
        <span className="text-sm text-surface-500">
          اليوم {currentDay} من {totalDays}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: totalDays }, (_, i) => (
            <div 
              key={i}
              className={clsx(
                'w-3 h-3 rounded-full transition-colors',
                i + 1 < currentDay 
                  ? 'bg-green-500' 
                  : i + 1 === currentDay 
                    ? 'bg-primary-500 animate-pulse' 
                    : 'bg-surface-300 dark:bg-surface-600'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
