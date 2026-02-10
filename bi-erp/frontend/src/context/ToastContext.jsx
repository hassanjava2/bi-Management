import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const types = {
  success: { icon: CheckCircle, bg: 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800 text-success-800 dark:text-success-200', iconClass: 'text-success-600' },
  error: { icon: XCircle, bg: 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800 text-error-800 dark:text-error-200', iconClass: 'text-error-600' },
  warning: { icon: AlertCircle, bg: 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800 text-warning-800 dark:text-warning-200', iconClass: 'text-warning-600' },
  info: { icon: Info, bg: 'bg-info-50 dark:bg-info-900/20 border-info-200 dark:border-info-800 text-info-800 dark:text-info-200', iconClass: 'text-info-600' },
}

function ToastItem({ id, type = 'info', message, duration = 5000, onDismiss }) {
  const [visible, setVisible] = useState(true)
  const config = types[type] || types.info
  const Icon = config.icon

  const handleDismiss = useCallback(() => {
    setVisible(false)
    setTimeout(() => onDismiss(id), 200)
  }, [id, onDismiss])

  useEffect(() => {
    if (duration <= 0) return
    const t = setTimeout(handleDismiss, duration)
    return () => clearTimeout(t)
  }, [duration, handleDismiss])

  if (!visible) return null

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-card border shadow-modal min-w-[280px] max-w-md animate-slide-up',
        config.bg
      )}
      role="alert"
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, duration }])
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message, options = {}) => {
    const { type = 'info', duration = 5000 } = typeof options === 'string' ? { type: options } : options
    return add(message, type, duration)
  }, [add])

  const value = { toast, success: (msg, d) => add(msg, 'success', d ?? 5000), error: (msg, d) => add(msg, 'error', d ?? 7000), warning: (msg, d) => add(msg, 'warning', d ?? 5000), info: (msg, d) => add(msg, 'info', d ?? 5000) }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 end-4 z-[9999] flex flex-col gap-2" dir="rtl">
          {toasts.map((t) => (
            <ToastItem key={t.id} {...t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) return { toast: () => {}, success: () => {}, error: () => {}, warning: () => {}, info: () => {} }
  return ctx
}
