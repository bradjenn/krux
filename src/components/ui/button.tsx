import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium font-mono transition-all duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent)] text-[var(--bg)] border border-[var(--accent)] hover:brightness-110',
        outline:
          'bg-transparent border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[rgba(71,255,156,0.05)]',
        ghost:
          'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.05)]',
        destructive:
          'bg-transparent border border-[var(--danger)] text-[var(--danger)] hover:bg-[rgba(229,46,46,0.1)]',
        dashed:
          'bg-transparent border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
      },
      size: {
        default: 'h-8 px-4 py-1.5',
        sm: 'h-7 px-3 py-1',
        lg: 'h-9 px-5 py-2',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
