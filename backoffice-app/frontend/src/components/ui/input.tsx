import { cn } from '../../lib/utils'
import { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn('flex h-9 w-full rounded-md px-3 py-2 text-sm focus-visible:outline-none border', className)}
    style={{ background: 'var(--panel)', color: 'var(--text)', borderColor: 'var(--border)' }}
    {...props}
  />
))
Input.displayName = 'Input'
