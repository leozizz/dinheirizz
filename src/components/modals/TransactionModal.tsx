import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Tag,
  CreditCard,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Repeat,
  Camera,
  Sparkles,
  Loader2
} from 'lucide-react'
import { parseCurrencyToNumber, formatBRL } from '../../lib/formatters'
import { calculateRecurringDueDate } from '../../lib/businessDays'
import { parseDateParts } from '../../lib/calendar'
import { useReceiptOcr } from '../../hooks/useReceiptOcr'
import { ReceiptScannerDropzone } from '../transactions/ReceiptScannerDropzone'
import { AiKeyPromptModal } from './AiKeyPromptModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/Select'
import { DatePicker } from '../ui/DatePicker'
import type { CategorySummary } from '../../types/aiReceipt'

export type TransactionMode = 'income' | 'expense' | 'transfer'

export interface CategoryOption {
  id: string
  name: string
  type: string
}

export interface AccountOption {
  id: string
  name: string
  balance?: number
}

export interface CreditCardOption {
  id: string
  name: string
  brand?: string
  closingDay: number
  dueDay: number
  limitAmount?: number
  availableLimit?: number
  accountId?: string
}

interface TransactionModalProps {
  isOpen: boolean
  mode: TransactionMode
  categories?: CategoryOption[]
  accounts?: AccountOption[]
  creditCards?: CreditCardOption[]
  defaultAccountId?: string | null
  initialOpenOcr?: boolean
  onClose: () => void
  onOpenAiSettings?: () => void
  onSubmit: (data: {
    amount: number
    description: string
    categoryId?: string
    accountId?: string
    fromAccountId?: string
    toAccountId?: string
    occurredAt: string
    dueDate?: string
    status?: 'completed' | 'pending'
    isRecurring?: boolean
    recurrencePeriod?: string
    recurrenceDay?: number
    adjustBusinessDay?: boolean
    installmentTotal?: number
    creditCardId?: string
    type: TransactionMode
  }) => Promise<void> | void
}

const getTodayLocalDate = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const EMPTY_CATEGORIES: CategoryOption[] = []
const EMPTY_ACCOUNTS: AccountOption[] = []
const EMPTY_CREDIT_CARDS: CreditCardOption[] = []

const calculateInvoiceCyclePreview = (occurredAtStr: string, closingDay: number, dueDay: number) => {
  const parts = occurredAtStr.split('-').map(Number)
  const year = parts[0] || new Date().getFullYear()
  const month = (parts[1] || 1) - 1
  const day = parts[2] || 1

  let invoiceMonth = month
  let invoiceYear = year

  if (day >= closingDay) {
    invoiceMonth += 1
    if (invoiceMonth > 11) {
      invoiceMonth = 0
      invoiceYear += 1
    }
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  return {
    period: `${invoiceYear}-${String(invoiceMonth + 1).padStart(2, '0')}`,
    monthName: monthNames[invoiceMonth],
    year: invoiceYear,
    closingDay,
    dueDay
  }
}

export const TransactionModal = ({
  isOpen,
  mode,
  categories = EMPTY_CATEGORIES,
  accounts = EMPTY_ACCOUNTS,
  creditCards = EMPTY_CREDIT_CARDS,
  defaultAccountId,
  initialOpenOcr = false,
  onClose,
  onOpenAiSettings,
  onSubmit
}: TransactionModalProps) => {
  const initialAccount =
    defaultAccountId && accounts.some((a) => a.id === defaultAccountId)
      ? defaultAccountId
      : accounts[0]?.id || ''
  const initialOtherAccount = accounts.find((a) => a.id !== initialAccount)?.id || ''
  const initialCategory =
    categories.find((c) => c.type === (mode === 'income' ? 'income' : 'expense'))?.id || ''

  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(initialCategory)
  const [accountId, setAccountId] = useState(initialAccount)
  const [fromAccountId, setFromAccountId] = useState(initialAccount)
  const [toAccountId, setToAccountId] = useState(initialOtherAccount)
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account')
  const [creditCardId, setCreditCardId] = useState<string>(creditCards[0]?.id || '')
  const [cardInstallments, setCardInstallments] = useState<number>(1)
  const [occurredAt, setOccurredAt] = useState(() => getTodayLocalDate())
  const [status, setStatus] = useState<'completed' | 'pending'>('completed')
  const [dueDate, setDueDate] = useState(() => getTodayLocalDate())
  const [isInstallment, setIsInstallment] = useState(false)
  const [installmentTotal, setInstallmentTotal] = useState(2)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePeriod, setRecurrencePeriod] = useState('monthly')
  const [recurrenceDay, setRecurrenceDay] = useState(10)
  const [adjustBusinessDay, setAdjustBusinessDay] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Estados de OCR e IA
  const [isOcrOpen, setIsOcrOpen] = useState(false)
  const [isAiKeyModalOpen, setIsAiKeyModalOpen] = useState(false)
  const [aiExtractedInfo, setAiExtractedInfo] = useState<{
    confidence?: number
    paymentType?: string
  } | null>(null)

  const {
    isScanning,
    scanReceipt,
    error: ocrError,
    errorCode: ocrErrorCode,
    resetScanState
  } = useReceiptOcr()

  // Reset/ajusta defaults apenas ao abrir o modal ou trocar de modo
  useEffect(() => {
    if (!isOpen) return

    setAmountStr('')
    setDescription('')
    setError(null)
    setOccurredAt(getTodayLocalDate())
    setStatus('completed')
    setDueDate(getTodayLocalDate())
    setIsInstallment(false)
    setInstallmentTotal(2)
    setIsRecurring(false)
    setRecurrencePeriod('monthly')
    setRecurrenceDay(10)
    setAdjustBusinessDay(false)
    setPaymentMethod('account')
    setCreditCardId(creditCards[0]?.id || '')
    setCardInstallments(1)
    setIsOcrOpen(Boolean(initialOpenOcr))
    setAiExtractedInfo(null)
    resetScanState()

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode])

  const handleOcrFileSelected = async (file: File) => {
    try {
      const categorySummaries: CategorySummary[] = categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type === 'income' ? 'income' : 'expense'
      }))

      const extracted = await scanReceipt(file, categorySummaries)

      // Preenche os campos automaticamente
      const formattedAmount = extracted.amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
      setAmountStr(formattedAmount)
      setDescription(extracted.description)
      setOccurredAt(extracted.occurredAt)

      if (extracted.categorySuggestion?.id) {
        setCategoryId(extracted.categorySuggestion.id)
      }

      setAiExtractedInfo({
        confidence: extracted.confidence,
        paymentType: extracted.paymentType
      })
    } catch {
      // O erro já é tratado e guardado dentro de useReceiptOcr
    }
  }

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

  const numAmount = parseCurrencyToNumber(amountStr)

  const selectedCard = creditCards.find((c) => c.id === creditCardId) || creditCards[0]
  const cyclePreview = selectedCard
    ? calculateInvoiceCyclePreview(occurredAt, selectedCard.closingDay, selectedCard.dueDay)
    : null

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
      let finalDueDate: string | undefined = undefined
      if (mode !== 'transfer' && isRecurring && recurrencePeriod === 'monthly') {
        const parts = parseDateParts(occurredAt)
        const computed = calculateRecurringDueDate(
          parts.year,
          parts.month,
          recurrenceDay,
          adjustBusinessDay
        )
        const y = computed.getUTCFullYear()
        const m = String(computed.getUTCMonth() + 1).padStart(2, '0')
        const d = String(computed.getUTCDate()).padStart(2, '0')
        finalDueDate = `${y}-${m}-${d}`
      } else if (status === 'pending' || isInstallment) {
        finalDueDate = dueDate || occurredAt
      }

      const isCardPayment = mode === 'expense' && paymentMethod === 'credit_card' && Boolean(creditCardId)

      await onSubmit({
        amount: num,
        description,
        categoryId: categoryId || undefined,
        accountId: mode === 'transfer'
          ? fromAccountId
          : isCardPayment
            ? (selectedCard?.accountId || accountId || undefined)
            : (accountId || undefined),
        fromAccountId: mode === 'transfer' ? fromAccountId : undefined,
        toAccountId: mode === 'transfer' ? toAccountId : undefined,
        occurredAt,
        dueDate: isCardPayment ? undefined : finalDueDate,
        status: mode === 'transfer' || isCardPayment ? 'completed' : status,
        isRecurring: mode !== 'transfer' && !isCardPayment ? isRecurring : false,
        recurrencePeriod: mode !== 'transfer' && !isCardPayment && isRecurring ? recurrencePeriod : undefined,
        recurrenceDay: mode !== 'transfer' && !isCardPayment && isRecurring ? recurrenceDay : undefined,
        adjustBusinessDay: mode !== 'transfer' && !isCardPayment && isRecurring ? adjustBusinessDay : undefined,
        installmentTotal: isCardPayment
          ? (cardInstallments > 1 ? cardInstallments : undefined)
          : (mode !== 'transfer' && isInstallment ? installmentTotal : undefined),
        creditCardId: isCardPayment ? creditCardId : undefined,
        type: mode
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar transação.')
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
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-inner ${colors[mode]}`}>
                  <CurrentIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground font-display">
                    {titles[mode]}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Preencha os detalhes da movimentação
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="trigger-receipt-ocr-btn"
                  onClick={() => setIsOcrOpen((prev) => !prev)}
                  className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    isOcrOpen
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'bg-muted/50 hover:bg-muted text-foreground border-border'
                  }`}
                  title="Ler cupom ou comprovante com IA"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ler Comprovante (IA)</span>
                </button>

                <button
                  type="button"
                  data-testid="close-transaction-modal-btn"
                  onClick={onClose}
                  className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dropzone de Leitura de Comprovante (OCR) */}
            {isOcrOpen && (
              <div className="mb-4">
                <ReceiptScannerDropzone
                  onFileSelected={handleOcrFileSelected}
                  isScanning={isScanning}
                  error={ocrError}
                  errorCode={ocrErrorCode}
                  onReset={resetScanState}
                  onConfigureAiKey={() => setIsAiKeyModalOpen(true)}
                />
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-red-300 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              {/* Valor em destaque */}
              <div className="bg-muted/30 p-4 sm:p-5 rounded-2xl border border-border text-center">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Valor da Movimentação
                </label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-muted-foreground">R$</span>
                  <input
                    type="text"
                    autoFocus
                    data-testid="transaction-amount-input"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0,00"
                    className="w-40 sm:w-48 text-2xl sm:text-3xl font-bold text-foreground bg-transparent text-center focus:outline-none placeholder-muted-foreground font-display font-tabular"
                  />
                </div>
              </div>

              {/* Badge de extração via IA */}
              {aiExtractedInfo && (
                <div
                  data-testid="ai-extracted-badge"
                  className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs flex items-center justify-between animate-fadeIn"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-medium">
                      Dados lidos do comprovante ({Math.round((aiExtractedInfo.confidence ?? 0.9) * 100)}% precisão)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiExtractedInfo(null)}
                    className="text-muted-foreground hover:text-foreground text-xs underline cursor-pointer"
                  >
                    Descartar
                  </button>
                </div>
              )}

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5 ml-1">
                  Descrição
                </label>
                <input
                  type="text"
                  data-testid="transaction-description-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição da movimentação"
                  className="w-full px-4 py-2.5 rounded-xl bg-input/40 border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all"
                />
              </div>

              {/* Forma de Pagamento (Conta vs Cartão) */}
              {mode === 'expense' && creditCards.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-foreground ml-1">
                    Forma de Pagamento
                  </label>
                  <div className="flex p-1 bg-muted/50 border border-border rounded-xl gap-1">
                    <button
                      type="button"
                      data-testid="payment-method-account-btn"
                      onClick={() => setPaymentMethod('account')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px] ${
                        paymentMethod === 'account'
                          ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Conta Bancária</span>
                    </button>
                    <button
                      type="button"
                      data-testid="payment-method-card-btn"
                      onClick={() => {
                        setPaymentMethod('credit_card')
                        if (!creditCardId && creditCards[0]) {
                          setCreditCardId(creditCards[0].id)
                        }
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px] ${
                        paymentMethod === 'credit_card'
                          ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Cartão de Crédito</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Categoria e Conta (ou Origem/Destino em transferências) */}
              {mode === 'transfer' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                    <div>
                      <label htmlFor="from-account-select" className="block text-xs font-medium text-foreground mb-1.5 ml-1 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                        Conta de Origem
                      </label>
                      <Select
                        value={fromAccountId}
                        onValueChange={(newFrom) => {
                          setFromAccountId(newFrom)
                          if (toAccountId === newFrom) {
                            const nextOther = accounts.find((a) => a.id !== newFrom)
                            if (nextOther) setToAccountId(nextOther.id)
                          }
                        }}
                      >
                        <SelectTrigger
                          id="from-account-select"
                          data-testid="from-account-select"
                          aria-label="Conta de Origem"
                        >
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-center sm:pt-6">
                      <button
                        type="button"
                        onClick={handleSwapAccounts}
                        data-testid="swap-accounts-btn"
                        title="Inverter contas de origem e destino"
                        aria-label="Inverter contas de origem e destino"
                        className="w-9 h-9 rounded-full glass-card-interactive border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer active:scale-95 shadow-md"
                      >
                        <ArrowLeftRight className="w-4 h-4 hidden sm:block text-primary" />
                        <ArrowLeftRight className="w-4 h-4 sm:hidden text-primary rotate-90" />
                      </button>
                    </div>

                    <div>
                      <label htmlFor="to-account-select" className="block text-xs font-medium text-foreground mb-1.5 ml-1 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                        Conta de Destino
                      </label>
                      <Select
                        value={toAccountId}
                        onValueChange={setToAccountId}
                      >
                        <SelectTrigger
                          id="to-account-select"
                          data-testid="to-account-select"
                          aria-label="Conta de Destino"
                        >
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                              {acc.name} {acc.id === fromAccountId ? '(mesma conta)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="transaction-category-select" className="block text-xs font-medium text-foreground mb-1.5 ml-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                      Categoria
                    </label>
                    <Select
                      value={categoryId}
                      onValueChange={setCategoryId}
                    >
                      <SelectTrigger
                        id="transaction-category-select"
                        data-testid="transaction-category-select"
                        aria-label="Categoria"
                      >
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod === 'credit_card' ? (
                    <div key="credit-card-field">
                      <label htmlFor="transaction-credit-card-select" className="block text-xs font-medium text-foreground mb-1.5 ml-1 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                        Cartão de Crédito
                      </label>
                      <Select
                        value={creditCardId}
                        onValueChange={setCreditCardId}
                      >
                        <SelectTrigger
                          id="transaction-credit-card-select"
                          data-testid="transaction-credit-card-select"
                          aria-label="Cartão de Crédito"
                        >
                          <SelectValue placeholder="Selecione o cartão" />
                        </SelectTrigger>
                        <SelectContent>
                          {creditCards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.name} (Fecha dia {card.closingDay})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div key="account-field">
                      <label htmlFor="transaction-account-select" className="block text-xs font-medium text-foreground mb-1.5 ml-1 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                        Conta
                      </label>
                      <Select
                        value={accountId}
                        onValueChange={setAccountId}
                      >
                        <SelectTrigger
                          id="transaction-account-select"
                          data-testid="transaction-account-select"
                          aria-label="Conta"
                        >
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Parcelamento e Ciclo do Cartão */}
              {mode === 'expense' && paymentMethod === 'credit_card' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-muted/20 border border-border/80">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="credit-card-installments-select" className="text-xs font-medium text-foreground">
                      Parcelas no Cartão
                    </label>
                    <Select
                      value={String(cardInstallments)}
                      onValueChange={(val) => setCardInstallments(Number(val))}
                    >
                      <SelectTrigger
                        id="credit-card-installments-select"
                        data-testid="credit-card-installments-select"
                        aria-label="Parcelas no Cartão"
                        className="w-auto min-w-[160px]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 1 ? '1x à vista' : `${n}x parcelado`}
                            {numAmount > 0 ? ` (${formatBRL(numAmount / n)})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {cyclePreview && selectedCard && (
                    <div
                      data-testid="credit-card-cycle-preview"
                      className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground space-y-1"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <Sparkles className="w-4 h-4" />
                        <span>Regra de Fechamento de Fatura</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {Number(occurredAt.split('-')[2] || 1) >= selectedCard.closingDay
                          ? `Compra realizada a partir do dia de fechamento (${selectedCard.closingDay}). A 1ª parcela cairá na fatura de ${cyclePreview.monthName}/${cyclePreview.year} (vencimento dia ${selectedCard.dueDay}).`
                          : `A 1ª parcela cairá na fatura de ${cyclePreview.monthName}/${cyclePreview.year} (vencimento dia ${selectedCard.dueDay}).`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Status da Transação (Paga vs Pendente) */}
              {mode !== 'transfer' && paymentMethod !== 'credit_card' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-foreground ml-1">
                    Situação da Movimentação
                  </label>
                  <div className="flex p-1 bg-muted/50 border border-border rounded-xl gap-1">
                    <button
                      type="button"
                      data-testid="status-completed-btn"
                      onClick={() => setStatus('completed')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{mode === 'income' ? 'Recebido' : 'Pago / Liquidado'}</span>
                    </button>
                    <button
                      type="button"
                      data-testid="status-pending-btn"
                      onClick={() => setStatus('pending')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{mode === 'income' ? 'A Receber' : 'Pendente (A pagar)'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Data da Operação e Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="occurred-at-input" className="block text-xs font-medium text-foreground mb-1.5 ml-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Data da Operação
                  </label>
                  <DatePicker
                    id="occurred-at-input"
                    dataTestId="occurred-at-input"
                    ariaLabel="Data da Operação"
                    value={occurredAt}
                    onChange={setOccurredAt}
                    presets={['today', 'yesterday', 'tomorrow']}
                  />
                </div>

                {status === 'pending' && mode !== 'transfer' && (
                  <div>
                    <label htmlFor="due-date-input" className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1.5 ml-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Data de Vencimento
                    </label>
                    <DatePicker
                      id="due-date-input"
                      dataTestId="due-date-input"
                      ariaLabel="Data de Vencimento"
                      value={dueDate}
                      onChange={setDueDate}
                      tone="warning"
                      presets={['today', 'tomorrow']}
                    />
                  </div>
                )}
              </div>

              {/* Opções Avançadas: Parcelamento e Recorrência */}
              {mode !== 'transfer' && (
                <div className="pt-2 border-t border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="installment-toggle"
                      onClick={() => {
                        const next = !isInstallment
                        setIsInstallment(next)
                        if (next) setIsRecurring(false)
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        isInstallment
                          ? 'bg-primary/20 text-primary border-primary/40 shadow-sm'
                          : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Parcelar</span>
                    </button>

                    <button
                      type="button"
                      data-testid="recurring-toggle"
                      onClick={() => {
                        const next = !isRecurring
                        setIsRecurring(next)
                        if (next) setIsInstallment(false)
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        isRecurring
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-sm'
                          : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span>Recorrente</span>
                    </button>
                  </div>

                  {isInstallment && (
                    <div className="p-3.5 rounded-2xl bg-card border border-border space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="installment-select" className="text-xs font-medium text-foreground">
                          Número de Parcelas
                        </label>
                        <Select
                          value={String(installmentTotal)}
                          onValueChange={(val) => setInstallmentTotal(Number(val))}
                        >
                          <SelectTrigger
                            id="installment-select"
                            data-testid="installment-select"
                            aria-label="Número de Parcelas"
                            className="w-auto min-w-[96px]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48, 60, 72].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}x
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {numAmount > 0 && (
                        <div className="text-xs text-primary font-medium flex items-center justify-between pt-1.5 border-t border-border">
                          <span className="text-muted-foreground">Prévia da Parcela:</span>
                          <span className="font-semibold tabular-nums">
                            {installmentTotal}x de {formatBRL(numAmount / installmentTotal)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {isRecurring && (
                    <div className="p-3.5 rounded-2xl bg-card border border-border space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="recurrence-period-select" className="text-xs font-medium text-foreground">
                          Frequência de Repetição
                        </label>
                        <Select
                          value={recurrencePeriod}
                          onValueChange={setRecurrencePeriod}
                        >
                          <SelectTrigger
                            id="recurrence-period-select"
                            data-testid="recurrence-period-select"
                            aria-label="Frequência de Repetição"
                            className="w-auto min-w-[120px]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="yearly">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {recurrencePeriod === 'monthly' && (
                        <>
                          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                            <label htmlFor="recurrence-day-select" className="text-xs font-medium text-foreground">
                              Vence todo dia
                            </label>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Dia</span>
                              <Select
                                value={String(recurrenceDay)}
                                onValueChange={(val) => setRecurrenceDay(Number(val))}
                              >
                                <SelectTrigger
                                  id="recurrence-day-select"
                                  data-testid="recurrence-day-select"
                                  aria-label="Dia de vencimento"
                                  className="w-auto min-w-[76px]"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <SelectItem key={day} value={String(day)}>
                                      {day}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="text-xs text-foreground">
                              <span className="font-medium">Vencimento dinâmico em dia útil</span>
                              <p className="text-[10px] text-muted-foreground">
                                Prorroga se o dia cair em fim de semana ou feriado
                              </p>
                            </div>
                            <button
                              type="button"
                              data-testid="adjust-business-day-toggle"
                              onClick={() => setAdjustBusinessDay(!adjustBusinessDay)}
                              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                                adjustBusinessDay ? 'bg-primary justify-end' : 'bg-muted justify-start'
                              }`}
                            >
                              <div className="w-4 h-4 rounded-full bg-foreground shadow-md" />
                            </button>
                          </div>

                          <div className="text-xs p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-between">
                            <span className="text-muted-foreground">Primeiro vencimento:</span>
                            <span className="font-semibold text-foreground">
                              {(() => {
                                const parts = parseDateParts(occurredAt)
                                const computed = calculateRecurringDueDate(
                                  parts.year,
                                  parts.month,
                                  recurrenceDay,
                                  adjustBusinessDay
                                )
                                const d = String(computed.getUTCDate()).padStart(2, '0')
                                const m = String(computed.getUTCMonth() + 1).padStart(2, '0')
                                const y = computed.getUTCFullYear()
                                const dayOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][computed.getUTCDay()]
                                return `${d}/${m}/${y} (${dayOfWeek})`
                              })()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Botão de Enviar com espaçamento respirável */}
              <div className="pt-3 pb-1">
                <button
                  type="submit"
                  data-testid="transaction-submit-btn"
                  disabled={loading}
                  className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-block w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <span>Confirmar Movimentação</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <AiKeyPromptModal
        isOpen={isAiKeyModalOpen}
        onClose={() => setIsAiKeyModalOpen(false)}
        onConfigureKey={() => {
          setIsAiKeyModalOpen(false)
          onOpenAiSettings?.()
        }}
      />
    </AnimatePresence>
  )
}
