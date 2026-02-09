import { clsx } from 'clsx'

export default function Card({ children, className, padding = true, hover = false, ...props }) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-surface-900 rounded-card',
        'border border-surface-200/80 dark:border-surface-800',
        'shadow-card',
        hover && 'hover:shadow-card-hover hover:border-surface-300 dark:hover:border-surface-700 transition-all duration-200',
        padding && 'p-5 lg:p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className, action }) {
  return (
    <div className={clsx('flex items-center justify-between pb-4 mb-4 border-b border-surface-100 dark:border-surface-800', className)}>
      <div className="flex-1">{children}</div>
      {action && <div className="flex-shrink-0 mr-4">{action}</div>}
    </div>
  )
}

Card.Title = function CardTitle({ children, className, subtitle }) {
  return (
    <div>
      <h3 className={clsx('text-base font-semibold text-surface-900 dark:text-white', className)}>
        {children}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{subtitle}</p>
      )}
    </div>
  )
}

Card.Body = function CardBody({ children, className }) {
  return (
    <div className={clsx(className)}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({ children, className }) {
  return (
    <div className={clsx('pt-4 mt-4 border-t border-surface-100 dark:border-surface-800', className)}>
      {children}
    </div>
  )
}
