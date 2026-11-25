import {
  CreditCard as CreditCardIcon,
  Plus,
  Receipt,
  CheckCircle,
  Zap
} from 'lucide-react'
import { formatBRL } from '../../lib/formatters'
import { VirtualCardSurface } from './VirtualCardSurface'
import type { CreditCard, InvoiceStatus } from '../../types/database.types'

export interface CreditCardWidgetProps {
  cards: CreditCard[]
  isLoading?: boolean
  onOpenCreateCard: () => void
  onOpenInvoiceDetails?: (card: CreditCard) => void
  onOpenPayInvoice?: (card: CreditCard) => void
  onOpenAnticipate?: (card: CreditCard) => void
}

const getStatusBadge = (status?: InvoiceStatus | null) => {
  switch (status) {
    case 'open':
      return {
        label: 'Aberta',
        className: 'bg-sky-500/10 text-sky-400 border border-sky-500/20 dark:text-sky-300'
      }
    case 'closed':
      return {
        label: 'Fechada',
        className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 dark:text-amber-300'
      }
    case 'paid':
      return {
        label: 'Paga',
        className: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 dark:text-emerald-300'
      }
    case 'overdue':
      return {
        label: 'Atrasada',
        className: 'bg-rose-500/10 text-rose-500 border border-rose-500/20 dark:text-rose-300'
      }
    default:
      return {
        label: 'Aberta',
        className: 'bg-sky-500/10 text-sky-400 border border-sky-500/20 dark:text-sky-300'
      }
  }
}

const getLimitColor = (percentage: number) => {
  if (percentage < 60) {
    return {
      barClass: 'bg-emerald-500',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      trackClass: 'bg-emerald-500/20 border-emerald-500/30'
    }
  }
  if (percentage <= 85) {
    return {
      barClass: 'bg-amber-500',
      textClass: 'text-amber-600 dark:text-amber-400',
      trackClass: 'bg-amber-500/20 border-amber-500/30'
    }
  }
  return {
    barClass: 'bg-rose-500',
    textClass: 'text-rose-600 dark:text-rose-400',
    trackClass: 'bg-rose-500/20 border-rose-500/30'
  }
}

export const CreditCardWidget = ({
  cards,
  isLoading = false,
  onOpenCreateCard,
  onOpenInvoiceDetails,
  onOpenPayInvoice,
  onOpenAnticipate
}: CreditCardWidgetProps) => {
  if (isLoading) {
    return (
      <div
        data-testid="credit-cards-container"
        className="p-6 rounded-2xl bg-card border border-border/60 animate-pulse space-y-4"
      >
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-44 w-full bg-muted/50 rounded-2xl" />
      </div>
    )
  }

  return (
    <div
      data-testid="credit-cards-container"
      className="p-5 sm:p-6 rounded-2xl bg-card/90 backdrop-blur-md border border-border/60 shadow-sm space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <CreditCardIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Cartões de Crédito
            </h3>
            <p className="text-xs text-muted-foreground">
              Limites, faturas e controle de fechamento
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="open-create-credit-card-btn"
          onClick={onOpenCreateCard}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cartão</span>
        </button>
      </div>

      {/* Empty State */}
      {cards.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
            <CreditCardIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Nenhum cartão cadastrado</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Cadastre seu cartão para acompanhar datas de fechamento, melhor dia de compra e parcelas futuras.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateCard}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Primeiro Cartão
          </button>
        </div>
      ) : (
        /* Lista / Grid de Cartões */
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,290px),1fr))] gap-5">
          {cards.map((card) => {
            const percentageUsed = card.limitAmount > 0
              ? Math.min(100, Math.round((card.usedLimit / card.limitAmount) * 100))
              : 0

            const limitColors = getLimitColor(percentageUsed)
            const invoiceBadge = getStatusBadge(card.currentInvoice?.status)

            return (
              <div
                key={card.id}
                data-testid={`credit-card-item-${card.id}`}
                className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background/60 p-4 sm:p-5 shadow-sm hover:border-primary/40 transition-all duration-200 space-y-4"
              >
                {/* Cartão Virtual Moderno com Skin e Logo do Banco */}
                <VirtualCardSurface
                  name={card.name}
                  brand={card.brand}
                  lastFourDigits={card.lastFourDigits}
                  closingDay={card.closingDay}
                  dueDay={card.dueDay}
                  color={card.color}
                />

                {/* Status da Fatura e Limite */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Fatura Atual:</span>
                      <span
                        data-testid="credit-card-invoice-badge"
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${invoiceBadge.className}`}
                      >
                        {invoiceBadge.label}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Disponível: </span>
                      <span
                        data-testid="credit-card-available-limit"
                        className="text-xs sm:text-sm font-bold font-mono text-foreground"
                      >
                        {formatBRL(card.availableLimit)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso do Limite */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Utilizado: <strong className="text-foreground font-mono">{formatBRL(card.usedLimit)}</strong>
                      </span>
                      <span
                        data-testid="credit-card-limit-percentage"
                        className={`font-mono font-semibold ${limitColors.textClass}`}
                      >
                        {percentageUsed}%
                      </span>
                    </div>

                    <div
                      data-testid="credit-card-limit-progress"
                      role="progressbar"
                      aria-valuenow={percentageUsed}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className={`h-2.5 w-full rounded-full overflow-hidden border ${limitColors.trackClass}`}
                    >
                      <div
                        className={`h-full transition-all duration-300 ${limitColors.barClass}`}
                        style={{ width: `${percentageUsed}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>R$ 0,00</span>
                      <span>Limite: {formatBRL(card.limitAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação Rápida */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    data-testid={`open-invoice-details-btn-${card.id}`}
                    onClick={() => onOpenInvoiceDetails?.(card)}
                    className="flex-1 min-w-fit inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium whitespace-nowrap rounded-xl bg-secondary/80 hover:bg-secondary text-secondary-foreground transition-colors min-h-[44px] cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Ver Fatura</span>
                  </button>

                  <button
                    type="button"
                    data-testid={`open-pay-invoice-btn-${card.id}`}
                    onClick={() => onOpenPayInvoice?.(card)}
                    className="flex-1 min-w-fit inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold whitespace-nowrap rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors min-h-[44px] cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Pagar</span>
                  </button>

                  <button
                    type="button"
                    data-testid={`open-anticipate-btn-${card.id}`}
                    onClick={() => onOpenAnticipate?.(card)}
                    className="flex-1 min-w-fit inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium whitespace-nowrap rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors min-h-[44px] cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Antecipar</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
