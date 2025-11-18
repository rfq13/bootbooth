import { cn } from '../../lib/utils'

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold', className)} style={{ border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }} {...props} />
}
// Tokens: border uses var(--border); background var(--panel); text var(--text).
// Usage: pass className for status variants (success/warning/danger) mapped to tokens.