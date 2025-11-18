import { cn } from '../../lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-[#1f2024]',
        accent: 'btn-gradient'
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3',
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'
// Tokens: uses var(--accent-gradient) via 'accent' variant for branding consistency.
// Variants: default (bg-primary), accent (gradient). Size: default, sm.