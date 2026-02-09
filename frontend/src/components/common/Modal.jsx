import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
}) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
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
      {/* Backdrop - stronger blur */}
      <div
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          className={clsx(
            'relative w-full bg-white dark:bg-neutral-900',
            'rounded-2xl shadow-modal',
            'border border-neutral-200/50 dark:border-neutral-800',
            'animate-scale-in',
            sizes[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            {title && (
              <h3 id="modal-title" className="text-base font-semibold text-neutral-900 dark:text-white">
                {title}
              </h3>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -m-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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
    <div
      className={clsx(
        'flex items-center justify-end gap-3 pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800',
        className
      )}
    >
      {children}
    </div>
  )
}
