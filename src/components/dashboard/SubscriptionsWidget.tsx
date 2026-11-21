import React, { useState } from 'react'
import {
  Repeat,
  AlertTriangle,
  Copy,
  Check,
  EyeOff,
  ChevronDown,
  ChevronUp,
  CalendarClock
} from 'lucide-react'
import { formatBRL } from '../../lib/formatters'
import type { DetectedSubscription, SubscriptionsSummary } from '../../hooks/useSubscriptions'

export interface SubscriptionsWidgetProps {
  subscriptions: DetectedSubscription[]
  summary: SubscriptionsSummary
  isLoading?: boolean
  onConfirm?: (subscription: DetectedSubscription) => void | Promise<void>
  onIgnore?: (normalizedKey: string) => void | Promise<void>
  confirmingId?: string | null
  ignoringKey?: string | null
}

const formatShortDate = (isoDate: string): string => {
  if (!isoDate) return '--/--'
  const date = new Date(isoDate)
  if (isNaN(date.getTime())) return '--/--'
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

export const SubscriptionsWidget: React.FC<SubscriptionsWidgetProps> = ({
  subscriptions,
  summary,
  isLoading = false,
  onConfirm,
  onIgnore,
  confirmingId = null,
  ignoringKey = null
}) => {
  const [showAll, setShowAll] = useState(false)

  if (isLoading) {
    return (
      <div
        data-testid="widget-subscriptions-loading"
        className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border space-y-4 animate-pulse"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="h-6 w-48 bg-muted rounded-xl" />
          <div className="h-6 w-24 bg-muted rounded-xl" />
        </div>
        <div className="space-y-2.5 pt-1">
          <div className="h-14 bg-muted/50 rounded-xl" />
          <div className="h-14 bg-muted/50 rounded-xl" />
          <div className="h-14 bg-muted/50 rounded-xl" />
        </div>
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <div
        data-testid="widget-subscriptions-empty"
        className="glass-card p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border space-y-3 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
          <Repeat className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
            Nenhuma assinatura detectada
          </h3>
          <p className="text-xs text-muted-foreground">
            Quando identificarmos cobranças recorrentes no seu histórico, elas aparecerão aqui com alertas de variação e projeção anual.
          </p>
        </div>
      </div>
    )
  }

  const visibleSubscriptions = showAll ? subscriptions : subscriptions.slice(0, 3)
  const hasMore = subscriptions.length > 3

  return (
    <div
      data-testid="widget-subscriptions"
      className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border space-y-4"
    >
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary flex-shrink-0">
            <Repeat className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground truncate">
                Assinaturas & Recorrências
              </h3>
              {summary.alertsCount > 0 && (
                <span
                  data-testid="subscriptions-alerts-badge"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    {summary.alertsCount} alerta{summary.alertsCount !== 1 ? 's' : ''}
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {summary.activeCount} ativa{summary.activeCount !== 1 ? 's' : ''} •{' '}
              <span data-testid="subscriptions-total-annual" className="tabular-nums font-medium">
                {formatBRL(summary.totalAnnualCost)}/ano
              </span>
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline justify-end gap-1">
            <span
              data-testid="subscriptions-total-monthly"
              className="text-base sm:text-lg font-bold text-foreground tabular-nums"
            >
              {formatBRL(summary.totalMonthlyCost)}
            </span>
            <span className="text-[11px] text-muted-foreground">/mês</span>
          </div>
        </div>
      </div>

      {/* Lista Compacta */}
      <div className="space-y-2">
        {visibleSubscriptions.map((sub) => {
          const isConfirmingItem = confirmingId === sub.latestTransactionId
          const isIgnoringItem = ignoringKey === sub.normalizedKey
          const freqLabel = sub.frequency === 'yearly' ? 'Anual' : 'Mensal'

          return (
            <div
              key={sub.id}
              data-testid={`subscription-item-${sub.normalizedKey}`}
              className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between gap-2.5 min-w-0"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {sub.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border flex-shrink-0">
                    {freqLabel}
                  </span>
                  {sub.priceAlert && (
                    <span
                      data-testid={`subscription-price-alert-${sub.normalizedKey}`}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex-shrink-0 tabular-nums"
                      title={`Aumento de ${sub.priceAlert.increasePercentage}% em relação à média anterior (${formatBRL(sub.priceAlert.previousAverageAmount)})`}
                    >
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>+{Math.round(sub.priceAlert.increasePercentage)}%</span>
                    </span>
                  )}
                  {sub.duplicateAlert && (
                    <span
                      data-testid={`subscription-duplicate-alert-${sub.normalizedKey}`}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex-shrink-0"
                      title={`${sub.duplicateAlert.duplicateCount} cobranças similares detectadas no mesmo ciclo`}
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>Duplicada</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    <span>Próx. {formatShortDate(sub.nextEstimatedChargeAt)}</span>
                  </span>
                  <span aria-hidden="true">•</span>
                  <span className="tabular-nums font-semibold text-foreground">
                    {formatBRL(sub.lastAmount)}
                  </span>
                </div>
              </div>

              {/* Ações de 1 clique */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {sub.isConfirmedRecurring ? (
                  <span
                    aria-label="Assinatura confirmada"
                    title="Recorrência oficial confirmada"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-xl text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Confirmada</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    data-testid={`subscription-confirm-btn-${sub.normalizedKey}`}
                    aria-label={`Confirmar ${sub.name} como recorrência`}
                    title="Promover para recorrência oficial"
                    disabled={isConfirmingItem || isIgnoringItem}
                    onClick={() => onConfirm?.(sub)}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  data-testid={`subscription-ignore-btn-${sub.normalizedKey}`}
                  aria-label={`Ignorar ${sub.name}`}
                  title="Ignorar falso positivo"
                  disabled={isConfirmingItem || isIgnoringItem}
                  onClick={() => onIgnore?.(sub.normalizedKey)}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground border border-border hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Expandir / Recolher */}
      {hasMore && (
        <button
          type="button"
          data-testid="subscriptions-toggle-all-btn"
          onClick={() => setShowAll((prev) => !prev)}
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Mostrar menos</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Ver todas ({subscriptions.length})</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
