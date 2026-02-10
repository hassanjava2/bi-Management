import { clsx } from 'clsx'
import { Sparkles } from 'lucide-react'

const DEFAULT_SUGGESTIONS = [
  'ما مهامي اليوم؟',
  'كيف أسجل حضوري؟',
  'أريد طلب إجازة',
  'لدي مشكلة تقنية'
]

export default function AISuggestions({ suggestions = DEFAULT_SUGGESTIONS, onSelect, disabled }) {
  if (!suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-700">
      <div className="flex items-center gap-1 text-xs text-neutral-500 mb-2">
        <Sparkles className="w-3 h-3" />
        <span>اقتراحات سريعة</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
            className={clsx(
              'px-3 py-1 text-xs rounded-full',
              'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300',
              'hover:bg-primary-100 hover:text-primary-700',
              'dark:hover:bg-primary-900 dark:hover:text-primary-300',
              'transition-colors',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
