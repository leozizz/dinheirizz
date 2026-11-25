import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard as CardIcon, CheckCircle } from 'lucide-react'
import {
  createCreditCardSchema,
  type CreateCreditCardInput,
  type CreditCardBrand
} from '../../schemas/creditCards'
import type { CreditCard } from '../../types/database.types'
import type { AccountItem } from '../../hooks/useAccounts'
import { VirtualCardSurface } from '../cards/VirtualCardSurface'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/Select'

export interface CreditCardModalProps {
  isOpen: boolean
  card?: CreditCard | null
  accounts: AccountItem[]
  onClose: () => void
  onSave: (data: CreateCreditCardInput) => Promise<void> | void
  isLoading?: boolean
}

const BRAND_OPTIONS: Array<{ value: CreditCardBrand; label: string }> = [
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'visa', label: 'Visa' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'American Express' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'other', label: 'Outro' }
]

const COLOR_PRESETS = [
  '#7bc816', // Neon Lime (Dinheirizz Brand)
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#f59e0b', // Amber / Gold
  '#ef4444', // Red
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#e11d48'  // Rose
]

export const CreditCardModal = ({
  isOpen,
  card,
  accounts,
  onClose,
  onSave,
  isLoading = false
}: CreditCardModalProps) => {
  const isEditing = Boolean(card)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CreateCreditCardInput>({
    resolver: zodResolver(createCreditCardSchema),
    defaultValues: {
      name: '',
      brand: 'mastercard',
      limitAmount: 5000,
      closingDay: 25,
      dueDay: 5,
      accountId: accounts[0]?.id || '',
      color: '#7bc816',
      lastFourDigits: null
    }
  })

  const currentColor = watch('color') || '#7bc816'
  const currentName = watch('name') || ''
  const currentBrand = watch('brand') || 'mastercard'
  const currentDigits = watch('lastFourDigits')
  const currentClosingDay = watch('closingDay')
  const currentDueDay = watch('dueDay')
  const currentAccountId = watch('accountId')

  const linkedAccount = accounts.find((acc) => acc.id === currentAccountId)
  const fallbackBankHint = linkedAccount ? linkedAccount.bank || linkedAccount.name : undefined

  useEffect(() => {
    if (card) {
      reset({
        name: card.name,
        brand: card.brand,
        limitAmount: card.limitAmount,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        accountId: card.accountId,
        color: card.color || '#7bc816',
        lastFourDigits: card.lastFourDigits
      })
    } else {
      reset({
        name: '',
        brand: 'mastercard',
        limitAmount: 5000,
        closingDay: 25,
        dueDay: 5,
        accountId: accounts[0]?.id || '',
        color: '#7bc816',
        lastFourDigits: null
      })
    }
  }, [card, accounts, reset])

  if (!isOpen) return null

  const onSubmit = async (data: CreateCreditCardInput) => {
    await onSave(data)
    onClose()
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-card-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          data-testid="credit-card-modal"
          className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <CardIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 id="credit-card-modal-title" className="text-base font-semibold text-foreground">
                  {isEditing ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Configure limites, ciclo de fechamento e conta de liquidação
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              data-testid="close-credit-card-modal"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview em tempo real do cartão virtual */}
          <div data-testid="credit-card-preview" className="max-w-sm mx-auto w-full">
            <VirtualCardSurface
              name={currentName}
              brand={currentBrand}
              lastFourDigits={currentDigits}
              closingDay={currentClosingDay}
              dueDay={currentDueDay}
              color={currentColor}
              fallbackBankHint={fallbackBankHint}
              compact
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome do Cartão */}
            <div className="space-y-1">
              <label htmlFor="credit-card-name-input" className="block text-xs font-semibold text-foreground">
                Nome do Cartão
              </label>
              <input
                id="credit-card-name-input"
                data-testid="credit-card-name-input"
                type="text"
                placeholder="Ex: Nubank Ultravioleta, Itaú Personnalité"
                {...register('name')}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Bandeira & Últimos 4 Dígitos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="credit-card-brand-select" className="block text-xs font-semibold text-foreground">
                  Bandeira
                </label>
                <Controller
                  name="brand"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="credit-card-brand-select"
                        data-testid="credit-card-brand-select"
                        aria-label="Bandeira"
                      >
                        <SelectValue placeholder="Selecione a bandeira..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAND_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.brand && (
                  <p className="text-xs text-destructive">{errors.brand.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="credit-card-digits-input" className="block text-xs font-semibold text-foreground">
                  Últimos 4 Dígitos
                </label>
                <input
                  id="credit-card-digits-input"
                  data-testid="credit-card-digits-input"
                  type="text"
                  maxLength={4}
                  placeholder="Ex: 8821"
                  {...register('lastFourDigits', {
                    setValueAs: (v) => (v === '' ? null : v)
                  })}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono min-h-[44px]"
                />
                {errors.lastFourDigits && (
                  <p className="text-xs text-destructive">{errors.lastFourDigits.message}</p>
                )}
              </div>
            </div>

            {/* Limite Total */}
            <div className="space-y-1">
              <label htmlFor="credit-card-limit-input" className="block text-xs font-semibold text-foreground">
                Limite Total (R$)
              </label>
              <input
                id="credit-card-limit-input"
                data-testid="credit-card-limit-input"
                type="number"
                step="0.01"
                min="1"
                placeholder="Ex: 5000"
                {...register('limitAmount', { valueAsNumber: true })}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono min-h-[44px]"
              />
              {errors.limitAmount && (
                <p className="text-xs text-destructive">{errors.limitAmount.message}</p>
              )}
            </div>

            {/* Datas do Ciclo: Fechamento & Vencimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="credit-card-closing-day-input" className="block text-xs font-semibold text-foreground">
                  Dia de Fechamento (1-31)
                </label>
                <input
                  id="credit-card-closing-day-input"
                  data-testid="credit-card-closing-day-input"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 25"
                  {...register('closingDay', { valueAsNumber: true })}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono min-h-[44px]"
                />
                {errors.closingDay && (
                  <p className="text-xs text-destructive">{errors.closingDay.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="credit-card-due-day-input" className="block text-xs font-semibold text-foreground">
                  Dia de Vencimento (1-31)
                </label>
                <input
                  id="credit-card-due-day-input"
                  data-testid="credit-card-due-day-input"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 5"
                  {...register('dueDay', { valueAsNumber: true })}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono min-h-[44px]"
                />
                {errors.dueDay && (
                  <p className="text-xs text-destructive">{errors.dueDay.message}</p>
                )}
              </div>
            </div>

            {/* Conta Bancária Padrão para Liquidação */}
            <div className="space-y-1">
              <label htmlFor="credit-card-account-select" className="block text-xs font-semibold text-foreground">
                Conta Padrão para Pagamento
              </label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="credit-card-account-select"
                      data-testid="credit-card-account-select"
                      aria-label="Conta Padrão para Pagamento"
                    >
                      <SelectValue placeholder="Selecione a conta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.accountId && (
                <p className="text-xs text-destructive">{errors.accountId.message}</p>
              )}
            </div>

            {/* Cor do Cartão */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Cor de Destaque do Cartão
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue('color', color)}
                    style={{ backgroundColor: color }}
                    className={`w-7 h-7 rounded-full transition-transform min-h-[28px] ${
                      currentColor.toLowerCase() === color.toLowerCase()
                        ? 'ring-2 ring-foreground scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    aria-label={`Cor ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="btn-save-credit-card"
                disabled={isSubmitting || isLoading}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSubmitting ? 'Salvando...' : 'Salvar Cartão'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
