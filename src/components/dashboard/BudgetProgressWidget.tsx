import React from 'react'
import { Sliders, PieChart, AlertTriangle, CheckCircle2, AlertOctagon, Plus } from 'lucide-react'
import { formatBRL } from '../../lib/formatters'
import type { BudgetProgressItem } from '../../hooks/useBudgets'

export interface BudgetProgressWidgetProps {
  budgets: BudgetProgressItem[]
  totalBudgetLimit: number
  totalSpent: number
  totalRemaining: number
  overallPercentageUsed: number
  onOpenBudgetModal: () => void
  isLoading?: boolean
}

export const BudgetProgressWidget: React.FC<BudgetProgressWidgetProps> = ({
  budgets,
  totalBudgetLimit,
  totalSpent,
  totalRemaining,
  overallPercentageUsed,
  onOpenBudgetModal,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-white/10 rounded-xl" />
        <div className="h-4 w-full bg-white/5 rounded-full" />
        <div className="space-y-3 pt-2">
          <div className="h-12 bg-white/5 rounded-xl" />
          <div className="h-12 bg-white/5 rounded-xl" />
        </div>
      </div>
    )
  }

  // Estado vazio: nenhum orçamento configurado
  if (budgets.length === 0) {
    return (
      <div className="glass-card p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
          <PieChart className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-white font-display">
            Nenhum orçamento definido
          </h3>
          <p className="text-xs text-neutral-400">
            Estipule limites de gastos mensais por categoria para manter o controle ativo do seu patrimônio com alertas automáticos.
          </p>
        </div>
        <button
          type="button"
          data-testid="btn-define-budgets-empty"
          onClick={onOpenBudgetModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-primary text-neutral-950 font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Definir Orçamentos
        </button>
      </div>
    )
  }

  // Cor da barra de progresso geral
  let overallBarColor = 'bg-emerald-500'
  if (overallPercentageUsed >= 100) {
    overallBarColor = 'bg-rose-500'
  } else if (overallPercentageUsed >= 75) {
    overallBarColor = 'bg-amber-500'
  }

  return (
    <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 space-y-4.5">
      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Orçamento Mensal</h3>
            <p className="text-[11px] text-neutral-400">
              {formatBRL(totalSpent)} gastos de {formatBRL(totalBudgetLimit)} ({overallPercentageUsed}% consumido)
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="btn-adjust-budget-limits"
          onClick={onOpenBudgetModal}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-primary" />
          <span>Ajustar Limites</span>
        </button>
      </div>

      {/* Barra de Progresso Consolidada Geral */}
      <div className="space-y-1.5">
        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${overallBarColor}`}
            style={{ width: `${Math.min(100, overallPercentageUsed)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span>
            {totalRemaining > 0
              ? `${formatBRL(totalRemaining)} restantes`
              : 'Limite geral atingido'}
          </span>
          <span className="font-semibold tabular-nums text-neutral-300">
            {overallPercentageUsed}%
          </span>
        </div>
      </div>

      {/* Envelopes por Categoria */}
      <div className="space-y-2.5 pt-1">
        {budgets.map((b) => {
          const catColor = b.categoryColor || '#10b981'
          let barBg = 'bg-emerald-500'
          let badgeText = `${b.percentageUsed}%`
          let badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'

          if (b.status === 'exceeded') {
            barBg = 'bg-rose-500'
            const excess = b.spentAmount - b.amountLimit
            badgeText = `${b.percentageUsed}% • Estourado (+${formatBRL(excess)})`
            badgeClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse font-bold'
          } else if (b.status === 'warning') {
            barBg = 'bg-amber-500'
            badgeText = `${b.percentageUsed}% (Atenção)`
            badgeClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-medium'
          }

          return (
            <div
              key={b.id}
              className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2 hover:border-white/10 transition-colors"
            >
              {/* Topo do Envelope */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: catColor }}
                  />
                  <span className="text-xs font-semibold text-white truncate">
                    {b.categoryName}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] border ${badgeClass}`}>
                    {badgeText}
                  </span>
                  <span className="text-xs font-bold text-neutral-200 tabular-nums">
                    {formatBRL(b.spentAmount)} / <span className="text-neutral-400 font-normal">{formatBRL(b.amountLimit)}</span>
                  </span>
                </div>
              </div>

              {/* Barra de Progresso da Categoria */}
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barBg}`}
                  style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
