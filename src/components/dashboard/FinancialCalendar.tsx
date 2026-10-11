import React, { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react'
import {
  buildMonthCalendarMatrix,
  formatCalendarMonthYear,
  type CalendarDaySummary
} from '../../lib/calendar'
import { formatBRL } from '../../lib/formatters'
import { DayTransactionsDrawer } from './DayTransactionsDrawer'
import type { TransactionItem } from './Dashboard'

export interface FinancialCalendarProps {
  transactions: TransactionItem[]
  currentBalance: number
  onPayTransaction?: (transactionId: string) => void | Promise<void>
  initialDate?: Date
}

const WEEKDAYS = [
  { short: 'Dom', tiny: 'D' },
  { short: 'Seg', tiny: 'S' },
  { short: 'Ter', tiny: 'T' },
  { short: 'Qua', tiny: 'Q' },
  { short: 'Qui', tiny: 'Q' },
  { short: 'Sex', tiny: 'S' },
  { short: 'Sáb', tiny: 'S' }
]

export function FinancialCalendar({
  transactions,
  currentBalance,
  onPayTransaction,
  initialDate
}: FinancialCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => initialDate || new Date())
  const [selectedDay, setSelectedDay] = useState<CalendarDaySummary | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const calendarDays = useMemo(() => {
    return buildMonthCalendarMatrix({
      year,
      month,
      transactions,
      initialBalance: currentBalance
    })
  }, [year, month, transactions, currentBalance])

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleSelectDay = (day: CalendarDaySummary) => {
    setSelectedDay(day)
    setIsDrawerOpen(true)
  }

  const formattedMonthYear = formatCalendarMonthYear(currentDate)

  return (
    <div className="glass-card p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 select-none">
      {/* Calendar Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white font-display">
              {formattedMonthYear}
            </h3>
            <p className="text-xs text-neutral-400">Visão de vencimentos e saldo diário</p>
          </div>
        </div>

        {/* Controls: Prev, Today, Next */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            data-testid="calendar-today-btn"
            onClick={handleToday}
            className="px-3 py-1.5 min-h-[36px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer active:scale-95"
          >
            Hoje
          </button>
          <button
            type="button"
            data-testid="calendar-prev-month-btn"
            onClick={handlePrevMonth}
            aria-label="Mês anterior"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="calendar-next-month-btn"
            onClick={handleNextMonth}
            aria-label="Próximo mês"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
        {WEEKDAYS.map((w, idx) => (
          <div
            key={w.short}
            className={`py-1 text-xs font-semibold ${
              idx === 0 || idx === 6 ? 'text-neutral-400' : 'text-neutral-300'
            }`}
          >
            <span className="hidden sm:inline">{w.short}</span>
            <span className="sm:hidden">{w.tiny}</span>
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((day) => {
          const hasIncome = day.totalIncome > 0
          const hasExpense = day.totalExpense > 0
          const hasTransactions = day.transactions.length > 0

          return (
            <button
              key={day.dateString}
              type="button"
              data-testid={`calendar-day-${day.dateString}`}
              data-has-income={hasIncome ? 'true' : undefined}
              data-has-expense={hasExpense ? 'true' : undefined}
              onClick={() => handleSelectDay(day)}
              className={`min-h-[58px] sm:min-h-[78px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                day.isCurrentMonth
                  ? 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10'
                  : 'bg-white/[0.01] opacity-35 hover:opacity-60 border-transparent'
              } ${
                day.isToday
                  ? 'ring-2 ring-primary/60 border-primary/40 bg-primary/[0.06]'
                  : ''
              } active:scale-95`}
            >
              {/* Day Header (Number + Badges) */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    day.isToday
                      ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-black flex items-center justify-center font-extrabold text-[11px] sm:text-xs'
                      : day.isCurrentMonth
                      ? 'text-white'
                      : 'text-neutral-400'
                  }`}
                >
                  {day.dayNumber}
                </span>

                <div className="flex items-center gap-1">
                  {/* Holiday Indicator */}
                  {day.isHoliday && (
                    <span
                      data-testid={`holiday-badge-${day.dateString}`}
                      title={`Feriado: ${day.holidayName || 'Feriado Nacional'}`}
                      className="text-[9px] px-1 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold hidden sm:inline-block max-w-[65px] truncate"
                    >
                      {day.holidayName || 'Feriado'}
                    </span>
                  )}
                  {day.isHoliday && (
                    <span
                      title={`Feriado: ${day.holidayName || 'Feriado Nacional'}`}
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 sm:hidden shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                    />
                  )}

                  {/* Dots / Indicators */}
                  {hasTransactions && (
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {hasIncome && (
                        <span
                          title={`Receitas: +${formatBRL(day.totalIncome)}`}
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                        />
                      )}
                      {hasExpense && (
                        <span
                          title={`Despesas: -${formatBRL(day.totalExpense)}`}
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Day Footer: Projected Balance or Movement */}
              <div className="mt-1 w-full min-w-0">
                {hasTransactions ? (
                  <div className="flex flex-col">
                    <span
                      className={`text-[9px] sm:text-[11px] font-semibold tabular-nums truncate ${
                        day.netDayChange > 0
                          ? 'text-emerald-400'
                          : day.netDayChange < 0
                          ? 'text-rose-400'
                          : 'text-neutral-400'
                      }`}
                    >
                      {day.netDayChange > 0 ? '+' : ''}
                      {formatBRL(day.netDayChange)}
                    </span>
                    <span className="hidden sm:block text-[9px] text-neutral-400 tabular-nums truncate">
                      Sal: {formatBRL(day.projectedBalance)}
                    </span>
                  </div>
                ) : (
                  <span className="hidden sm:block text-[9px] text-neutral-500 tabular-nums truncate">
                    {formatBRL(day.projectedBalance)}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Drawer / Sheet do Dia Selecionado */}
      <DayTransactionsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        daySummary={selectedDay}
        onPayTransaction={onPayTransaction}
      />
    </div>
  )
}
