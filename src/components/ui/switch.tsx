import * as React from 'react'

// Minimal toggle switch component using Tailwind
export interface SwitchProps extends React.HTMLAttributes<HTMLButtonElement> {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, className = '', label, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange?.(!checked)}
        className={[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-purple-600' : 'bg-gray-300',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          className,
        ].join(' ')}
        {...props}
      >
        <span
          className={[
            'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    )
  }
)
Switch.displayName = 'Switch'

