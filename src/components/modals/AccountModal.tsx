import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Landmark, AlertCircle, Check } from 'lucide-react'
import { parseCurrencyToNumber } from '../../lib/formatters'
import { detectBank } from '../../lib/banks'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/Select'

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

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar conta'
      setError(msg)
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
            className="relative z-10 w-full max-w-lg glass-card p-5 sm:p-8 rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl bg-card text-foreground max-h-[88dvh] overflow-y-auto pb-8 sm:pb-9 my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-inner bg-blue-500/15 border-blue-500/30 text-blue-400">
                  <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground font-display">
                    Nova Conta
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Cadastre uma conta corrente, carteira ou investimento
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Fechar modal"
                onClick={onClose}
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer active:scale-95"
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
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Nome da Conta / Instituição
                </label>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Nubank Principal, Itaú Reserva"
                  className="w-full px-3.5 py-2.5 sm:py-3 bg-input/40 border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tipo de Conta */}
                <div>
                  <label htmlFor="account-type-select" className="block text-xs font-medium text-foreground mb-1.5">
                    Tipo de Conta
                  </label>
                  <Select
                    value={type}
                    onValueChange={(val) => setType(val as 'checking' | 'savings' | 'investment' | 'credit')}
                  >
                    <SelectTrigger
                      id="account-type-select"
                      data-testid="account-type-select"
                      aria-label="Tipo de Conta"
                    >
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Conta Corrente</SelectItem>
                      <SelectItem value="savings">Poupança / Reserva</SelectItem>
                      <SelectItem value="investment">Investimentos</SelectItem>
                      <SelectItem value="credit">Cartão / Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Nome do Banco */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Instituição (opcional)
                  </label>
                  <input
                    type="text"
                    value={bank}
                    onChange={(e) => handleBankChange(e.target.value)}
                    placeholder="Ex: Nubank, Inter, Itaú"
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-input/40 border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all"
                  />
                  {detectedBank.slug !== 'generic' && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: detectedBank.primaryColor }}
                      />
                      <span>Instituição identificada: <strong className="text-foreground">{detectedBank.name}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Saldo Inicial */}
              <div className="bg-muted/30 p-4 sm:p-5 rounded-2xl border border-border text-center">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Saldo Inicial (R$)
                </label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-muted-foreground">R$</span>
                  <input
                    type="text"
                    value={balanceStr}
                    onChange={(e) => setBalanceStr(e.target.value)}
                    placeholder="0,00"
                    className="w-40 sm:w-48 text-2xl sm:text-3xl font-bold text-foreground bg-transparent text-center focus:outline-none placeholder-muted-foreground font-display font-tabular"
                  />
                </div>
              </div>

              {/* Cor de Identificação */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">
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
                        color === c.value ? 'ring-2 ring-primary scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {color === c.value && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões de Ação com espaçamento respirável */}
              <div className="pt-4 pb-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl border border-border text-foreground text-xs sm:text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || isLoading}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-primary/20 active:scale-98 disabled:opacity-50 cursor-pointer"
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
