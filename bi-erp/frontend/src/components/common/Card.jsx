import { clsx } from 'clsx'

export default function Card({ children, className, padding = true, hover = false, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-[16px] border transition-all duration-300',
        hover && 'hover:shadow-[var(--neon-glow)]',
        padding && 'p-6',
        className
      )}
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        boxShadow: hover ? undefined : '0 1px 3px rgba(0,0,0,0.06)',
      }}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className, action }) {
  return (
    <div className={clsx('flex items-center justify-between pb-4 mb-5 border-b', className)} style={{ borderColor: 'var(--border)' }}>
      <div className="flex-1 min-w-0">{children}</div>
      {action && <div className="flex-shrink-0 ms-4">{action}</div>}
    </div>
  )
}

Card.Title = function CardTitle({ children, className, subtitle }) {
  return (
    <div>
      <h3 className={clsx('text-sm font-semibold uppercase tracking-wide', className)} style={{ color: 'var(--light)' }}>
        {children}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs" style={{ color: 'var(--gray)' }}>{subtitle}</p>
      )}
    </div>
  )
}

Card.Body = function CardBody({ children, className }) {
  return <div className={clsx(className)}>{children}</div>
}

Card.Footer = function CardFooter({ children, className }) {
  return (
    <div className={clsx('pt-4 mt-5 border-t', className)} style={{ borderColor: 'var(--border)' }}>
      {children}
    </div>
  )
}
