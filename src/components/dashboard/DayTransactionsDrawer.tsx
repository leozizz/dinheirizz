import React, { useEffect } from 'react'
import { formatBRL, formatTransactionDate } from '../../lib/formatters'
import type { CalendarDaySummary } from '../../lib/calendar'
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  TrendingUp,
  TrendingDown,
  Layers,
  Repeat,
  Wallet
} from 'lucide-react'

export interface DayTransactionsDrawerProps {
  isOpen: boolean
  onClose: () => void
  daySummary: CalendarDaySummary | null
  onPayTransaction?: (transactionId: string) => void | Promise<void>
}

export function DayTransactionsDrawer({
  isOpen,
  onClose,
  daySummary,
  onPayTransaction
}: DayTransactionsDrawerProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !daySummary) return null

  const formattedDate = daySummary.date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  return (
    <div
      data-testid="day-transactions-drawer"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full sm:max-w-lg bg-[#0e0f14]/95 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle drag bar */}
        <div className="flex sm:hidden justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                {capitalizedDate}
              </h3>
              {daySummary.isHoliday && (
                <span
                  data-testid="drawer-holiday-badge"
                  className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold"
                >
                  Feriado: {daySummary.holidayName || 'Nacional'}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {daySummary.transactions.length === 1
                ? '1 movimentação nesta data'
                : `${daySummary.transactions.length} movimentações nesta data`}
            </p>
          </div>

          <button
            type="button"
            data-testid="close-day-drawer-btn"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer active:scale-95"
            aria-label="Fechar detalhes do dia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Mini-Summary Cards */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3.5 bg-white/[0.02] border-b border-white/5 text-center">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-400 mb-1">
              <TrendingUp className="w-3 h-3" />
              <span>Receitas</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-emerald-300 tabular-nums">
              +{formatBRL(daySummary.totalIncome)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-rose-400 mb-1">
              <TrendingDown className="w-3 h-3" />
              <span>Despesas</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-rose-300 tabular-nums">
              -{formatBRL(daySummary.totalExpense)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-neutral-300 mb-1">
              <Wallet className="w-3 h-3 text-primary" />
              <span>Saldo Previsto</span>
            </div>
            <span
              className={`text-xs sm:text-sm font-bold tabular-nums ${
                daySummary.projectedBalance < 0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {formatBRL(daySummary.projectedBalance)}
            </span>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {daySummary.transactions.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-sm">
              Nenhuma movimentação registrada nesta data.
            </div>
          ) : (
            daySummary.transactions.map((t) => {
              const isIncome = t.amount > 0
              const isPending = !t.paid || t.status === 'pending'

              return (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 text-sm font-bold ${
                        isIncome
                          ? 'bg-primary/10 border-primary/20 text-primary'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {t.description || 'Transação sem descrição'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {t.category && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-md font-medium border truncate max-w-[120px]"
                            style={{
                              backgroundColor: t.category.color
                                ? `${t.category.color}20`
                                : 'rgba(255,255,255,0.05)',
                              borderColor: t.category.color
                                ? `${t.category.color}40`
                                : 'rgba(255,255,255,0.1)',
                              color: t.category.color || '#e5e7eb'
                            }}
                          >
                            {t.category.name}
                          </span>
                        )}
                        {t.installmentTotal && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" />
                            <span>
                              {t.installmentCurrent || 1}/{t.installmentTotal}
                            </span>
                          </span>
                        )}
                        {t.isRecurring && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5" />
                            <span>Recorrente</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 flex flex-col items-end">
                    <span
                      className={`text-sm sm:text-base font-semibold tabular-nums ${
                        isIncome ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : ''}
                      {formatBRL(t.amount)}
                    </span>
                    <span className="text-[11px] text-neutral-400 mt-0.5">
                      {isPending ? 'Pendente' : 'Concluído'}
                    </span>

                    {onPayTransaction && isPending && (
                      <button
                        type="button"
                        data-testid={`drawer-pay-btn-${t.id}`}
                        onClick={() => {
                          onClose()
                          onPayTransaction(t.id)
                        }}
                        className="mt-1.5 min-h-[32px] px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Dar Baixa</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
