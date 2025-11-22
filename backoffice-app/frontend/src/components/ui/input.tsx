import { cn } from '../../lib/utils'
import { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('flex h-9 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm focus-visible:outline-none', className)} {...props} />
))
Input.displayName = 'Input'