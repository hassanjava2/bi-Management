import { clsx } from 'clsx'
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react'

const variants = {
  info: {
    bg: 'bg-info-50 dark:bg-info-600/10 border-info-200 dark:border-info-800',
    text: 'text-info-800 dark:text-info-300',
    icon: Info,
  },
  success: {
    bg: 'bg-success-50 dark:bg-success-600/10 border-success-200 dark:border-success-800',
    text: 'text-success-800 dark:text-success-300',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-warning-50 dark:bg-warning-600/10 border-warning-200 dark:border-warning-800',
    text: 'text-warning-800 dark:text-warning-300',
    icon: AlertTriangle,
  },
  error: {
    bg: 'bg-error-50 dark:bg-error-600/10 border-error-200 dark:border-error-800',
    text: 'text-error-800 dark:text-error-300',
    icon: XCircle,
  },
}

export default function Alert({ variant = 'info', children, className, onClose }) {
  const v = variants[variant]
  const Icon = v.icon

  return (
    <div className={clsx('flex items-start gap-3 p-3.5 rounded-xl border', v.bg, v.text, className)}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-80" />
      <div className="flex-1 text-sm font-medium">{children}</div>
      {onClose && (
        <button onClick={onClose} className="p-0.5 rounded hover:opacity-70 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
