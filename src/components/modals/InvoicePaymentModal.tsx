import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Wallet, CreditCard as CardIcon } from 'lucide-react'
import { formatBRL } from '../../lib/formatters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/Select'
import type { CreditCard } from '../../types/database.types'
import type { AccountItem } from '../../hooks/useAccounts'

export interface InvoicePaymentModalProps {
  isOpen: boolean
  card: CreditCard | null
  accounts: AccountItem[]
  onClose: () => void
  onConfirmPayment: (input: {
    invoiceId: string
    paymentAccountId: string
    amount: number
  }) => Promise<void> | void
  isLoading?: boolean
}

export const InvoicePaymentModal = ({
  isOpen,
  card,
  accounts,
  onClose,
  onConfirmPayment,
  isLoading = false
}: InvoicePaymentModalProps) => {
  const currentInvoice = card?.currentInvoice
  const invoiceAmount = currentInvoice?.amount || card?.usedLimit || 0

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    if (card?.accountId && accounts.some((a) => a.id === card.accountId)) {
      return card.accountId
    }
    return accounts[0]?.id || ''
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || !card) return null

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)
  const hasInsufficientFunds = selectedAccount ? selectedAccount.balance < invoiceAmount : false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccountId) {
      setError('Selecione uma conta bancária de débito')
      return
    }
    if (!currentInvoice?.id) {
      setError('Fatura corrente não encontrada')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await onConfirmPayment({
        invoiceId: currentInvoice.id,
        paymentAccountId: selectedAccountId,
        amount: invoiceAmount
      })
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao processar pagamento da fatura'
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
        aria-labelledby="invoice-payment-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          data-testid="invoice-payment-modal"
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 id="invoice-payment-title" className="text-base font-semibold text-foreground">
                  Pagar Fatura
                </h2>
                <p className="text-xs text-muted-foreground">{card.name}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              data-testid="close-invoice-payment-modal"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Valor da Fatura */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-center space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Valor Total da Fatura</span>
              <div
                data-testid="invoice-payment-amount"
                className="text-2xl font-bold font-mono text-foreground"
              >
                {formatBRL(invoiceAmount)}
              </div>
              {currentInvoice?.period && (
                <span className="text-[11px] text-muted-foreground">
                  Período: {currentInvoice.period}
                </span>
              )}
            </div>

            {/* Conta de Débito */}
            <div className="space-y-1.5">
              <label
                htmlFor="invoice-payment-account-select"
                className="block text-xs font-semibold text-foreground"
              >
                Conta de Débito
              </label>
              <div className="relative">
                <Select value={selectedAccountId || undefined} onValueChange={setSelectedAccountId}>
                  <SelectTrigger
                    id="invoice-payment-account-select"
                    data-testid="invoice-payment-account-select"
                    aria-label="Conta de Débito"
                  >
                    <SelectValue placeholder="Selecione a conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} — Saldo: {formatBRL(acc.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAccount && (
                <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
                  <span>Saldo disponível:</span>
                  <span className={`font-mono font-medium ${hasInsufficientFunds ? 'text-rose-500' : 'text-foreground'}`}>
                    {formatBRL(selectedAccount.balance)}
                  </span>
                </div>
              )}
            </div>

            {/* Alerta de saldo insuficiente se aplicável */}
            {hasInsufficientFunds && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Atenção: O saldo da conta selecionada é inferior ao valor da fatura. A liquidação registrará o débito na conta.
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
                data-testid="btn-confirm-invoice-payment"
                disabled={submitting || isLoading || !selectedAccountId}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{submitting ? 'Processando...' : 'Confirmar Pagamento'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
