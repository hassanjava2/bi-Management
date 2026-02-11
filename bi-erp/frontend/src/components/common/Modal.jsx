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
        className="fixed inset-0 backdrop-blur-md transition-opacity duration-300 ease-out animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          className={clsx(
            'relative w-full flex flex-col max-h-[90vh] rounded-[16px] shadow-modal',
            'transition-transform duration-300 ease-out animate-scale-in',
            SIZES[size],
            className
          )}
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            {title && (
              <h3 id="modal-title" className="text-base font-semibold" style={{ color: 'var(--light)' }}>
                {title}
              </h3>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -m-1.5 rounded-lg transition-colors opacity-70 hover:opacity-100"
              style={{ color: 'var(--gray)' }}
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            {children}
          </div>

          {footer != null && (
            <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t rounded-b-[16px]" style={{ borderColor: 'var(--border)', background: 'var(--darker)' }}>
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
    <div className={clsx('flex items-center justify-end gap-3 pt-4 mt-4 border-t', className)} style={{ borderColor: 'var(--border)' }}>
      {children}
    </div>
  )
}
