import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Receipt,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  ShoppingBag
} from 'lucide-react'
import { formatBRL, formatTransactionDate } from '../../lib/formatters'
import type { CreditCard, Invoice, InvoiceStatus } from '../../types/database.types'

export interface InvoiceDetailsModalProps {
  isOpen: boolean
  card: CreditCard | null
  invoice: Invoice | null
  isLoading?: boolean
  onClose: () => void
  onPayInvoice?: () => void
  onAnticipate?: () => void
}

const getStatusBadge = (status?: InvoiceStatus | null) => {
  switch (status) {
    case 'open':
      return {
        label: 'Aberta',
        className: 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
      }
    case 'closed':
      return {
        label: 'Fechada',
        className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      }
    case 'paid':
      return {
        label: 'Paga',
        className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      }
    case 'overdue':
      return {
        label: 'Atrasada',
        className: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }
    default:
      return {
        label: 'Aberta',
        className: 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
      }
  }
}

export const InvoiceDetailsModal = ({
  isOpen,
  card,
  invoice,
  isLoading = false,
  onClose,
  onPayInvoice,
  onAnticipate
}: InvoiceDetailsModalProps) => {
  if (!isOpen || !card) return null

  const items = invoice?.items || []
  const badge = getStatusBadge(invoice?.status)

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-details-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          data-testid="invoice-details-modal"
          className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 id="invoice-details-title" className="text-base font-semibold text-foreground">
                  Fatura do Cartão
                </h2>
                <p className="text-xs text-muted-foreground">
                  {card.name} • {invoice?.period || 'Período Atual'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              data-testid="close-invoice-details-modal"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Resumo da Fatura */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/30 border border-border/80">
            <div>
              <span className="text-[11px] text-muted-foreground block">Total da Fatura</span>
              <span className="text-lg font-bold font-mono text-foreground">
                {formatBRL(invoice?.amount || 0)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Status</span>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] text-muted-foreground block">Vencimento</span>
              <span className="text-xs font-mono font-medium text-foreground">
                {invoice?.dueDate ? formatTransactionDate(invoice.dueDate) : 'Em aberto'}
              </span>
            </div>
          </div>

          {/* Lista de Compras / Itens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Lançamentos da Fatura</span>
              <span className="text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                Carregando compras da fatura...
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 text-muted-foreground text-xs space-y-1">
                <ShoppingBag className="w-6 h-6 mx-auto text-muted-foreground/60 mb-2" />
                <p>Nenhuma compra lançada nesta fatura ainda.</p>
                <p className="text-[11px] text-muted-foreground/80">
                  Novas transações com este cartão aparecerão aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-background/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground">{item.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{formatTransactionDate(item.occurredAt)}</span>
                        {item.installmentCurrent && item.installmentTotal && (
                          <span className="px-1.5 py-0.2 rounded bg-muted font-mono">
                            {item.installmentCurrent}/{item.installmentTotal}
                          </span>
                        )}
                        {item.category?.name && (
                          <span className="text-primary/90">{item.category.name}</span>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-bold font-mono text-foreground">
                      {formatBRL(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {onAnticipate ? (
              <button
                type="button"
                onClick={onAnticipate}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
              >
                <Zap className="w-4 h-4" />
                <span>Antecipar Parcelas</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors min-h-[44px]"
              >
                Fechar
              </button>

              {onPayInvoice && invoice?.status !== 'paid' && (
                <button
                  type="button"
                  data-testid="btn-pay-from-details"
                  onClick={onPayInvoice}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors min-h-[44px]"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Pagar Fatura</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
