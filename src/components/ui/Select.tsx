import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../lib/utils'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger
    className={cn(
      'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-border bg-input/40 px-3 py-2 text-sm text-foreground transition-colors',
      'data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 [&>span]:text-left',
      '[&[data-state=open]>svg]:rotate-180',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
)

export const SelectScrollUpButton = ({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) => (
  <SelectPrimitive.ScrollUpButton
    className={cn(
      'flex cursor-default items-center justify-center py-1 text-muted-foreground',
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
)

export const SelectScrollDownButton = ({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) => (
  <SelectPrimitive.ScrollDownButton
    className={cn(
      'flex cursor-default items-center justify-center py-1 text-muted-foreground',
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
)

export const SelectContent = ({
  className,
  children,
  position = 'popper',
  collisionPadding = 12,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      position={position}
      collisionPadding={collisionPadding}
      sideOffset={6}
      className={cn(
        'relative z-[70] max-h-[min(var(--radix-select-content-available-height),18rem)] min-w-[8rem] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-border bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1.5',
          position === 'popper' &&
            'w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
)

export const SelectLabel = ({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) => (
  <SelectPrimitive.Label
    className={cn(
      'px-2.5 py-1.5 text-xs font-semibold text-muted-foreground',
      className
    )}
    {...props}
  />
)

export const SelectItem = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item
    className={cn(
      'relative flex min-h-[40px] w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none transition-colors',
      'focus:bg-primary/15 focus:text-foreground',
      'data-[state=checked]:bg-primary/10 data-[state=checked]:font-medium',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center text-primary">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
)

export const SelectSeparator = ({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) => (
  <SelectPrimitive.Separator
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
)
