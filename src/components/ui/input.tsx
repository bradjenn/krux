import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'w-full rounded-md px-2.5 py-2 text-[13px] font-mono',
          'bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]',
          'outline-none transition-colors duration-150',
          'placeholder:text-[var(--text-dim)]',
          'focus:border-[var(--accent2)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
