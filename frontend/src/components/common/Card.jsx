import { clsx } from 'clsx'

export default function Card({ children, className, padding = true, hover = false, ...props }) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-neutral-900 rounded-xl',
        'border border-neutral-100 dark:border-neutral-800',
        hover && 'hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50 transition-all duration-300',
        padding && 'p-6',
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
    <div className={clsx('flex items-center justify-between pb-4 mb-5 border-b border-neutral-100 dark:border-neutral-800', className)}>
      <div className="flex-1 min-w-0">{children}</div>
      {action && <div className="flex-shrink-0 ms-4">{action}</div>}
    </div>
  )
}

Card.Title = function CardTitle({ children, className, subtitle }) {
  return (
    <div>
      <h3 className={clsx('text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide', className)}>
        {children}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
      )}
    </div>
  )
}

Card.Body = function CardBody({ children, className }) {
  return <div className={clsx(className)}>{children}</div>
}

Card.Footer = function CardFooter({ children, className }) {
  return (
    <div className={clsx('pt-4 mt-5 border-t border-neutral-100 dark:border-neutral-800', className)}>
      {children}
    </div>
  )
}
