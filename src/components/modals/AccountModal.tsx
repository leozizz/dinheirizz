import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Landmark, AlertCircle, Check } from 'lucide-react'
import { parseCurrencyToNumber } from '../../lib/formatters'
import { detectBank } from '../../lib/banks'

interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    type: 'checking' | 'savings' | 'investment' | 'credit'
    balance: number
    bank?: string
    color?: string
  }) => Promise<void> | void
  isLoading?: boolean
}

const PRESET_COLORS = [
  { label: 'Roxo (Nubank)', value: '#820ad1' },
  { label: 'Laranja (Inter/Itaú)', value: '#ec7000' },
  { label: 'Azul (Caixa/BTG)', value: '#0284c7' },
  { label: 'Verde (Sicredi/C6)', value: '#10b981' },
  { label: 'Vermelho (Santander)', value: '#ef4444' },
  { label: 'Dourado / Neutro', value: '#d97706' }
]

export function AccountModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}: AccountModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'checking' | 'savings' | 'investment' | 'credit'>('checking')
  const [bank, setBank] = useState('')
  const [balanceStr, setBalanceStr] = useState('')
  const [color, setColor] = useState('#0284c7')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const detectedBank = detectBank(bank || name)

  const handleBankChange = (val: string) => {
    setBank(val)
    const d = detectBank(val || name)
    if (d.slug !== 'generic') {
      setColor(d.primaryColor)
    }
  }

  const handleNameChange = (val: string) => {
    setName(val)
    if (!bank) {
      const d = detectBank(val)
      if (d.slug !== 'generic') {
        setColor(d.primaryColor)
      }
    }
  }

  useEffect(() => {
    if (isOpen) {
      setName('')
      setType('checking')
      setBank('')
      setBalanceStr('')
      setColor('#0284c7')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Informe o nome da conta')
      return
    }

    const parsedBalance = balanceStr.trim() ? parseCurrencyToNumber(balanceStr) : 0

    try {
      setSubmitting(true)
      setError(null)
      await onSubmit({
        name: name.trim(),
        type,
        bank: bank.trim() || undefined,
        balance: parsedBalance,
        color
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar conta')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg glass-card p-5 sm:p-8 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl bg-[#14121f]/95 max-h-[85dvh] overflow-y-auto pb-safe-bottom"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-inner bg-blue-500/15 border-blue-500/30 text-blue-400">
                  <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-display">
                    Nova Conta
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-400">
                    Cadastre uma conta corrente, carteira ou investimento
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Fechar modal"
                onClick={onClose}
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-red-300 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome da Conta */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Nome da Conta / Instituição
                </label>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Nubank Principal, Itaú Reserva"
                  className="w-full px-3.5 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tipo de Conta */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Tipo de Conta
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                  >
                    <option value="checking" className="bg-neutral-900">Conta Corrente</option>
                    <option value="savings" className="bg-neutral-900">Poupança / Reserva</option>
                    <option value="investment" className="bg-neutral-900">Investimentos</option>
                    <option value="credit" className="bg-neutral-900">Cartão / Crédito</option>
                  </select>
                </div>

                {/* Nome do Banco */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Instituição (opcional)
                  </label>
                  <input
                    type="text"
                    value={bank}
                    onChange={(e) => handleBankChange(e.target.value)}
                    placeholder="Ex: Nubank, Inter, Itaú"
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                  {detectedBank.slug !== 'generic' && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-300">
                      <span
                        className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: detectedBank.primaryColor }}
                      />
                      <span>Instituição identificada: <strong>{detectedBank.name}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Saldo Inicial */}
              <div className="bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/5 text-center">
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Saldo Inicial (R$)
                </label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-neutral-400">R$</span>
                  <input
                    type="text"
                    value={balanceStr}
                    onChange={(e) => setBalanceStr(e.target.value)}
                    placeholder="0,00"
                    className="w-40 sm:w-48 text-2xl sm:text-3xl font-bold text-white bg-transparent text-center focus:outline-none placeholder-neutral-600 font-display"
                  />
                </div>
              </div>

              {/* Cor de Identificação */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-2">
                  Cor de Identificação
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        color === c.value ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {color === c.value && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-neutral-300 text-xs sm:text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || isLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium transition-all shadow-lg shadow-blue-500/20 active:scale-98 disabled:opacity-50"
                >
                  {submitting || isLoading ? 'Salvando...' : 'Salvar Conta'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
