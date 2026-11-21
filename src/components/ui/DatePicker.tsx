import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'
import { addDays, format, isValid, parse, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export type DatePresetKey = 'today' | 'yesterday' | 'tomorrow'

export interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  id?: string
  dataTestId?: string
  ariaLabel?: string
  placeholder?: string
  disabled?: boolean
  tone?: 'default' | 'warning'
  presets?: ReadonlyArray<DatePresetKey>
  className?: string
}

const PRESET_CONFIG: Record<
  DatePresetKey,
  { label: string; getDate: () => Date }
> = {
  today: {
    label: 'Hoje',
    getDate: () => new Date(),
  },
  yesterday: {
    label: 'Ontem',
    getDate: () => subDays(new Date(), 1),
  },
  tomorrow: {
    label: 'Amanhã',
    getDate: () => addDays(new Date(), 1),
  },
}

const parseLocalIsoDate = (value: string): Date | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined
  }
  const parsed = parse(value, 'yyyy-MM-dd', new Date())
  return isValid(parsed) ? parsed : undefined
}

export const DatePicker = ({
  value,
  onChange,
  id,
  dataTestId,
  ariaLabel,
  placeholder = 'Selecionar data',
  disabled = false,
  tone = 'default',
  presets = ['today', 'yesterday', 'tomorrow'],
  className,
}: DatePickerProps) => {
  const [open, setOpen] = React.useState(false)
  const selectedDate = React.useMemo(() => parseLocalIsoDate(value), [value])
  const [month, setMonth] = React.useState<Date>(() => selectedDate ?? new Date())

  React.useEffect(() => {
    if (selectedDate) {
      setMonth(selectedDate)
    }
  }, [selectedDate])

  const formattedDisplay = selectedDate
    ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })
    : null

  const handleSelectPreset = (presetKey: DatePresetKey) => {
    const targetDate = PRESET_CONFIG[presetKey].getDate()
    onChange(format(targetDate, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const handleSelectDay = (day: Date | undefined) => {
    if (!day) {
      return
    }
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          data-testid={dataTestId}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            tone === 'warning'
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300'
              : 'border-border bg-input/40 text-foreground hover:bg-input/60',
            className
          )}
        >
          <span
            className={cn(
              'truncate font-tabular',
              !formattedDisplay && 'text-muted-foreground font-sans'
            )}
          >
            {formattedDisplay ?? placeholder}
          </span>
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-[70] w-auto max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-2xl backdrop-blur-md outline-none"
        >
          {presets.length > 0 && (
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-2.5">
              {presets.map((presetKey) => {
                const preset = PRESET_CONFIG[presetKey]
                const presetIso = format(preset.getDate(), 'yyyy-MM-dd')
                const isActive = value === presetIso
                return (
                  <button
                    key={presetKey}
                    type="button"
                    data-testid={`datepicker-preset-${presetKey}`}
                    onClick={() => handleSelectPreset(presetKey)}
                    className={cn(
                      'min-h-[36px] flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      isActive
                        ? 'border-primary/40 bg-primary/15 text-primary'
                        : 'border-border bg-secondary/50 text-foreground hover:bg-secondary'
                    )}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          )}

          <DayPicker
            mode="single"
            locale={ptBR}
            selected={selectedDate}
            onSelect={handleSelectDay}
            month={month}
            onMonthChange={setMonth}
            showOutsideDays
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-2',
              month_caption: 'relative flex items-center justify-center py-1',
              caption_label: 'text-sm font-semibold capitalize text-foreground',
              nav: 'flex items-center justify-between',
              button_previous:
                'absolute left-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-secondary/40 text-foreground transition-colors hover:bg-secondary',
              button_next:
                'absolute right-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-secondary/40 text-foreground transition-colors hover:bg-secondary',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex',
              weekday:
                'w-9 py-1 text-center text-[11px] font-medium uppercase text-muted-foreground',
              week: 'mt-1 flex w-full',
              day: 'h-9 w-9 p-0 text-center text-sm',
              day_button:
                'inline-flex h-9 w-9 items-center justify-center rounded-lg font-tabular text-sm transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring',
              selected:
                '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-semibold [&>button]:hover:bg-primary/90',
              today:
                '[&>button]:border [&>button]:border-primary/50 [&>button]:text-primary',
              outside: 'text-muted-foreground/40',
              disabled: 'pointer-events-none opacity-40',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left' ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                ),
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
