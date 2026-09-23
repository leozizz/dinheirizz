import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Calendar, Tag, CreditCard, AlertCircle } from 'lucide-react'
import { parseCurrencyToNumber } from '../../lib/formatters'

export type TransactionMode = 'income' | 'expense' | 'transfer'

interface CategoryOption {
  id: string
  name: string
  type: string
}

interface AccountOption {
  id: string
  name: string
  balance?: number
}

interface TransactionModalProps {
  isOpen: boolean
  mode: TransactionMode
  categories?: CategoryOption[]
  accounts?: AccountOption[]
  defaultAccountId?: string | null
  onClose: () => void
  onSubmit: (data: {
    amount: number
    description: string
    categoryId?: string
    accountId?: string
    fromAccountId?: string
    toAccountId?: string
    occurredAt: string
    type: TransactionMode
  }) => Promise<void> | void
}

function getTodayLocalDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function TransactionModal({
  isOpen,
  mode,
  categories = [],
  accounts = [],
  defaultAccountId,
  onClose,
  onSubmit
}: TransactionModalProps) {
  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => getTodayLocalDate())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset/ajusta defaults ao abrir ou trocar de modo
  useEffect(() => {
    if (isOpen) {
      setAmountStr('')
      setDescription('')
      setError(null)
      setOccurredAt(getTodayLocalDate())

      const filteredCats = categories.filter((c) => c.type === (mode === 'income' ? 'income' : 'expense'))
      setCategoryId(filteredCats[0]?.id || '')

      const selectedOrFirst =
        defaultAccountId && accounts.some((a) => a.id === defaultAccountId)
          ? defaultAccountId
          : accounts[0]?.id || ''

      setAccountId(selectedOrFirst)
      setFromAccountId(selectedOrFirst)
      const otherAccount = accounts.find((a) => a.id !== selectedOrFirst)
      setToAccountId(otherAccount?.id || accounts[1]?.id || selectedOrFirst)
    }
  }, [isOpen, mode, categories, accounts, defaultAccountId])

  const handleSwapAccounts = () => {
    setFromAccountId(toAccountId)
    setToAccountId(fromAccountId)
  }

  const titles = {
    income: 'Nova Receita',
    expense: 'Nova Despesa',
    transfer: 'Transferência entre Contas'
  }

  const icons = {
    income: ArrowDownLeft,
    expense: ArrowUpRight,
    transfer: ArrowLeftRight
  }

  const colors = {
    income: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    expense: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    transfer: 'text-blue-400 border-blue-500/30 bg-blue-500/10'
  }

  const CurrentIcon = icons[mode]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const num = parseCurrencyToNumber(amountStr)
    if (!num || num <= 0) {
      setError('Informe um valor maior que zero para prosseguir.')
      return
    }

    if (mode === 'transfer') {
      if (!fromAccountId || !toAccountId) {
        setError('Selecione as contas de origem e destino.')
        return
      }
      if (fromAccountId === toAccountId) {
        setError('A conta de origem e de destino não podem ser iguais.')
        return
      }
    }

    setLoading(true)
    try {
      await onSubmit({
        amount: num,
        description,
        categoryId: categoryId || undefined,
        accountId: mode === 'transfer' ? fromAccountId : (accountId || undefined),
        fromAccountId: mode === 'transfer' ? fromAccountId : undefined,
        toAccountId: mode === 'transfer' ? toAccountId : undefined,
        occurredAt,
        type: mode
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar transação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Container com espaçamento confortável */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg glass-card p-5 sm:p-8 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl bg-[#14121f]/95 max-h-[88dvh] overflow-y-auto pb-8 sm:pb-9 my-auto"
          >
            {/* Top Bar Header */}
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-inner ${colors[mode]}`}>
                  <CurrentIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-display">
                    {titles[mode]}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-400">
                    Preencha os detalhes da movimentação
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="close-transaction-modal-btn"
                onClick={onClose}
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-red-300 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              {/* Valor em destaque */}
              <div className="bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/5 text-center">
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Valor da Movimentação
                </label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-neutral-400">R$</span>
                  <input
                    type="text"
                    autoFocus
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0,00"
                    className="w-40 sm:w-48 text-2xl sm:text-3xl font-bold text-white bg-transparent text-center focus:outline-none placeholder-neutral-600 font-display"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5 ml-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição da movimentação"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 transition-all"
                />
              </div>

              {/* Categoria e Conta (ou Origem/Destino em transferências) */}
              {mode === 'transfer' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5 ml-1 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                        Conta de Origem
                      </label>
                      <select
                        data-testid="from-account-select"
                        value={fromAccountId}
                        onChange={(e) => {
                          const newFrom = e.target.value
                          setFromAccountId(newFrom)
                          if (toAccountId === newFrom) {
                            const nextOther = accounts.find((a) => a.id !== newFrom)
                            if (nextOther) setToAccountId(nextOther.id)
                          }
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 transition-all [&>option]:bg-[#1a1625]"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-center sm:pt-6">
                      <button
                        type="button"
                        onClick={handleSwapAccounts}
                        data-testid="swap-accounts-btn"
                        title="Inverter contas de origem e destino"
                        aria-label="Inverter contas de origem e destino"
                        className="w-9 h-9 rounded-full glass-card-interactive border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white hover:border-blue-500/30 transition-all cursor-pointer active:scale-95 shadow-md"
                      >
                        <ArrowLeftRight className="w-4 h-4 hidden sm:block text-blue-400" />
                        <ArrowLeftRight className="w-4 h-4 sm:hidden text-blue-400 rotate-90" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5 ml-1 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                        Conta de Destino
                      </label>
                      <select
                        data-testid="to-account-select"
                        value={toAccountId}
                        onChange={(e) => setToAccountId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 transition-all [&>option]:bg-[#1a1625]"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                            {acc.name} {acc.id === fromAccountId ? '(mesma conta)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5 ml-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-neutral-400" />
                      Categoria
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 transition-all [&>option]:bg-[#1a1625]"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5 ml-1 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                      Conta
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 transition-all [&>option]:bg-[#1a1625]"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Data */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5 ml-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  Data da Operação
                </label>
                <input
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 transition-all"
                />
              </div>

              {/* Botão de Enviar com espaçamento respirável */}
              <div className="pt-3 pb-1">
                <button
                  type="submit"
                  data-testid="transaction-submit-btn"
                  disabled={loading}
                  className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#60a5fa] hover:to-[#3b82f6] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Confirmar Movimentação</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
