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
  onClose: () => void
  onSubmit: (data: {
    amount: number
    description: string
    categoryId?: string
    accountId?: string
    occurredAt: string
    type: TransactionMode
  }) => Promise<void> | void
}

export function TransactionModal({
  isOpen,
  mode,
  categories = [],
  accounts = [],
  onClose,
  onSubmit
}: TransactionModalProps) {
  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset/ajusta defaults ao abrir ou trocar de modo
  useEffect(() => {
    if (isOpen) {
      setAmountStr('')
      setDescription('')
      setError(null)
      setOccurredAt(new Date().toISOString().split('T')[0])

      const filteredCats = categories.filter((c) => c.type === (mode === 'income' ? 'income' : 'expense'))
      setCategoryId(filteredCats[0]?.id || '')
      setAccountId(accounts[0]?.id || '')
    }
  }, [isOpen, mode, categories, accounts])

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

    setLoading(true)
    try {
      await onSubmit({
        amount: num,
        description,
        categoryId: categoryId || undefined,
        accountId: accountId || undefined,
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg glass-card p-6 sm:p-8 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl bg-[#14121f]/95 max-h-[90vh] overflow-y-auto"
          >
            {/* Top Bar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner ${colors[mode]}`}>
                  <CurrentIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">
                    {titles[mode]}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Preencha os detalhes da movimentação
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="close-transaction-modal-btn"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Valor em destaque */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Valor da Movimentação
                </label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold text-neutral-400">R$</span>
                  <input
                    type="text"
                    autoFocus
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0,00"
                    className="w-48 text-3xl font-bold text-white bg-transparent text-center focus:outline-none placeholder-neutral-600 font-display"
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

              {/* Categoria e Conta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mode !== 'transfer' && (
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
                )}

                <div className={mode === 'transfer' ? 'sm:col-span-2' : ''}>
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

              {/* Botão de Enviar */}
              <button
                type="submit"
                data-testid="transaction-submit-btn"
                disabled={loading}
                className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#60a5fa] hover:to-[#3b82f6] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Confirmar Movimentação</span>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
