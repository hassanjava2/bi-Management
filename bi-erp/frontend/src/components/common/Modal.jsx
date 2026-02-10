import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { useEffect } from 'react'

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-md transition-opacity duration-300 ease-out animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          className={clsx(
            'relative w-full flex flex-col max-h-[90vh]',
            'bg-white dark:bg-neutral-900 rounded-2xl shadow-modal',
            'border border-neutral-200/50 dark:border-neutral-800',
            'transition-transform duration-300 ease-out animate-scale-in',
            SIZES[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between flex-shrink-0 px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
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

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            {children}
          </div>

          {footer != null && (
            <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-b-2xl">
              {footer}
            </div>
          )}
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
