import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, AlertCircle, CheckCircle } from 'lucide-react'
import { formatBRL } from '../../lib/formatters'
import type { CreditCard } from '../../types/database.types'

export interface FutureInstallmentItem {
  id: string
  description: string
  amount: number
  installmentCurrent?: number | null
  installmentTotal?: number | null
  period?: string
}

export interface AnticipateInstallmentsModalProps {
  isOpen: boolean
  card: CreditCard | null
  futureInstallments: FutureInstallmentItem[]
  onClose: () => void
  onConfirmAnticipation: (input: {
    cardId: string
    transactionIds: string[]
  }) => Promise<void> | void
  isLoading?: boolean
}

export const AnticipateInstallmentsModal = ({
  isOpen,
  card,
  futureInstallments,
  onClose,
  onConfirmAnticipation,
  isLoading = false
}: AnticipateInstallmentsModalProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || !card) return null

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const selectedTotal = futureInstallments
    .filter((inst) => selectedIds.includes(inst.id))
    .reduce((acc, curr) => acc + curr.amount, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.length === 0) {
      setError('Selecione ao menos uma parcela para antecipar')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await onConfirmAnticipation({
        cardId: card.id,
        transactionIds: selectedIds
      })
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao antecipar parcelas'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anticipate-installments-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          data-testid="anticipate-installments-modal"
          className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 id="anticipate-installments-title" className="text-base font-semibold text-foreground">
                  Antecipar Parcelas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Traga parcelas futuras para a fatura aberta do mês ({card.name})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              data-testid="close-anticipate-modal"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Lista de Parcelas Futuras */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground">
                Parcelas Futuras Disponíveis
              </span>

              {futureInstallments.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 text-muted-foreground text-xs">
                  Não há parcelas futuras pendentes para antecipação neste cartão.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {futureInstallments.map((item) => {
                    const isChecked = selectedIds.includes(item.id)
                    return (
                      <label
                        key={item.id}
                        data-testid={`anticipate-item-${item.id}`}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer min-h-[44px] ${
                          isChecked
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border/70 bg-background/50 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            data-testid={`anticipate-checkbox-${item.id}`}
                            checked={isChecked}
                            onChange={() => handleToggle(item.id)}
                            className="w-4 h-4 rounded border-input text-primary focus:ring-primary/30"
                          />
                          <div>
                            <p className="text-xs font-medium text-foreground">{item.description}</p>
                            {item.installmentCurrent && item.installmentTotal && (
                              <span className="text-[10px] text-muted-foreground">
                                Parcela {item.installmentCurrent}/{item.installmentTotal}
                                {item.period ? ` • Vencimento: ${item.period}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-xs font-bold font-mono text-foreground">
                          {formatBRL(item.amount)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Resumo da Antecipação */}
            {selectedIds.length > 0 && (
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground">Total Selecionado:</span>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedIds.length} {selectedIds.length === 1 ? 'parcela' : 'parcelas'} adicionada(s) à fatura aberta
                  </p>
                </div>
                <span className="text-base font-bold font-mono text-primary">
                  +{formatBRL(selectedTotal)}
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="btn-confirm-anticipation"
                disabled={submitting || isLoading || selectedIds.length === 0}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{submitting ? 'Antecipando...' : 'Confirmar Antecipação'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
