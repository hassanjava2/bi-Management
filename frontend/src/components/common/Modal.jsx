import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  className 
}) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-surface-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={clsx(
            'relative w-full bg-white dark:bg-surface-900',
            'rounded-2xl shadow-modal',
            'border border-surface-200/50 dark:border-surface-800',
            'animate-scale-in',
            sizes[size],
            className
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800">
            <h3 className="text-base font-semibold text-surface-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 -m-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <X className="w-4 h-4 text-surface-400" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

Modal.Footer = function ModalFooter({ children, className }) {
  return (
    <div className={clsx(
      'flex items-center justify-end gap-3 pt-4 mt-4 border-t border-surface-100 dark:border-surface-800',
      className
    )}>
      {children}
    </div>
  )
}
