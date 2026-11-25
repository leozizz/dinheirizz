import React, { useState, useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { queryClient } from './lib/queryClient'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { useTheme } from './hooks/useTheme'
import { Dashboard, TransactionItem } from './components/dashboard/Dashboard'
import { ActionType } from './components/dashboard/QuickActions'
import type { TransactionInitialValues, TransactionMode } from './components/modals/TransactionModal'
import type { ParsedNlpTransaction } from './lib/nlpTransactionParser'
import type { PixKeyItem } from './components/modals/PixWalletModal'
import type { ParsedTransactionCandidate } from './types/import'
import { ModalSuspenseFallback } from './components/ui/ModalSuspenseFallback'
import { SupportButton } from './components/support/SupportButton'

const PwaUpdatePrompt = React.lazy(() =>
  import('./components/pwa/PwaUpdatePrompt').then((m) => ({ default: m.PwaUpdatePrompt }))
)

// Dynamic Imports para Code-Splitting e otimização de bundle
const TransactionModal = React.lazy(() =>
  import('./components/modals/TransactionModal').then((m) => ({ default: m.TransactionModal }))
)
const BudgetModal = React.lazy(() =>
  import('./components/modals/BudgetModal').then((m) => ({ default: m.BudgetModal }))
)
const ImportStatementModal = React.lazy(() =>
  import('./components/modals/ImportStatementModal').then((m) => ({ default: m.ImportStatementModal }))
)
const PixWalletModal = React.lazy(() =>
  import('./components/modals/PixWalletModal').then((m) => ({ default: m.PixWalletModal }))
)
const AccountModal = React.lazy(() =>
  import('./components/modals/AccountModal').then((m) => ({ default: m.AccountModal }))
)
const ProfileModal = React.lazy(() =>
  import('./components/modals/ProfileModal').then((m) => ({ default: m.ProfileModal }))
)
const DangerZoneModal = React.lazy(() =>
  import('./components/modals/DangerZoneModal').then((m) => ({ default: m.DangerZoneModal }))
)
const LogoutConfirmModal = React.lazy(() =>
  import('./components/modals/LogoutConfirmModal').then((m) => ({ default: m.LogoutConfirmModal }))
)
const LoginScreen = React.lazy(() =>
  import('./components/auth/LoginScreen').then((m) => ({ default: m.LoginScreen }))
)
const WelcomeScreen = React.lazy(() =>
  import('./components/auth/WelcomeScreen').then((m) => ({ default: m.WelcomeScreen }))
)
const CreditCardModal = React.lazy(() =>
  import('./components/modals/CreditCardModal').then((m) => ({ default: m.CreditCardModal }))
)
const InvoicePaymentModal = React.lazy(() =>
  import('./components/modals/InvoicePaymentModal').then((m) => ({ default: m.InvoicePaymentModal }))
)
const AnticipateInstallmentsModal = React.lazy(() =>
  import('./components/modals/AnticipateInstallmentsModal').then((m) => ({ default: m.AnticipateInstallmentsModal }))
)
const InvoiceDetailsModal = React.lazy(() =>
  import('./components/modals/InvoiceDetailsModal').then((m) => ({ default: m.InvoiceDetailsModal }))
)
const ExportReportModal = React.lazy(() =>
  import('./components/modals/ExportReportModal').then((m) => ({ default: m.ExportReportModal }))
)
const CommandPalette = React.lazy(() =>
  import('./components/modals/CommandPalette').then((m) => ({ default: m.CommandPalette }))
)
const CopilotDrawer = React.lazy(() =>
  import('./components/ai/CopilotDrawer').then((m) => ({ default: m.CopilotDrawer }))
)
const GoalModal = React.lazy(() =>
  import('./components/modals/GoalModal').then((m) => ({ default: m.GoalModal }))
)
const ProfileSelector = React.lazy(() =>
  import('./components/layout/ProfileSelector').then((m) => ({ default: m.ProfileSelector }))
)
const ReportPrintView = React.lazy(() =>
  import('./lib/export/reportPrintView').then((m) => ({ default: m.ReportPrintView }))
)
import { useReportExport, type ReportPdfData } from './hooks/useReportExport'
import { useWorkspaces } from './hooks/useWorkspaces'
import { useGoals, type SavingsGoalItem } from './hooks/useGoals'
import type { GoalFormData } from './schemas/goals'
import { useTransactions, useCreateTransaction, usePayTransaction } from './hooks/useTransactions'
import { useAccounts, useCreateAccount, type AccountItem } from './hooks/useAccounts'
import { useTransferTransaction } from './hooks/useTransfer'
import { usePixKeys, useCreatePixKey, useDeletePixKey } from './hooks/usePixKeys'
import { useCategories, type CategoryItem } from './hooks/useCategories'
import { useAiInsights } from './hooks/useAiInsights'
import { useSubscriptions, type DetectedSubscription } from './hooks/useSubscriptions'
import {
  useBudgets,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  type BudgetProgressItem
} from './hooks/useBudgets'
import {
  useCreditCards,
  useCreateCreditCard,
  usePayInvoice,
  useAnticipateInstallments
} from './hooks/useCreditCards'
import type { CreditCard } from './types/database.types'
import type { CreateCreditCardInput } from './schemas/creditCards'
import { calculateRecurringDueDate } from './lib/businessDays'
import { formatYMD } from './lib/calendar'
import { Wallet, Bell, ShieldCheck, LogIn, LogOut, Sun, Moon, Search } from 'lucide-react'

const getCurrentMonthDateIso = (dayOffsetFromToday: number): string => {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const clampedDay = Math.min(daysInMonth, Math.max(1, now.getDate() + dayOffsetFromToday))
  return new Date(now.getFullYear(), now.getMonth(), clampedDay, 12, 0, 0).toISOString()
}

const initialTransactions: TransactionItem[] = [
  {
    id: 'tx-1',
    description: 'Salário Desenvolvimento',
    amount: 12000.0,
    paid: true,
    status: 'completed',
    occurred_at: getCurrentMonthDateIso(0),
    category: { name: 'Renda', color: '#10b981', icon: 'wallet' },
    categoryId: 'cat-2',
    type: 'income',
    accountId: 'acc-1'
  },
  {
    id: 'tx-2',
    description: 'Consultoria Frontend & BFF',
    amount: 6200.0,
    paid: true,
    status: 'completed',
    occurred_at: getCurrentMonthDateIso(-1),
    category: { name: 'Serviços', color: '#3b82f6', icon: 'laptop' },
    categoryId: 'cat-5',
    type: 'income',
    accountId: 'acc-1'
  },
  {
    id: 'tx-3',
    description: 'Supermercado & Alimentação',
    amount: -1450.5,
    paid: true,
    status: 'completed',
    occurred_at: getCurrentMonthDateIso(-2),
    category: { name: 'Alimentação', color: '#f59e0b', icon: 'utensils' },
    categoryId: 'cat-1',
    type: 'expense',
    accountId: 'acc-1'
  },
  {
    id: 'tx-4',
    description: 'Serviços de Nuvem & Infra',
    amount: -899.3,
    paid: true,
    status: 'completed',
    occurred_at: getCurrentMonthDateIso(-3),
    category: { name: 'Infraestrutura', color: '#8b5cf6', icon: 'server' },
    categoryId: 'cat-3',
    type: 'expense',
    accountId: 'acc-2'
  },
  {
    id: 'tx-5',
    description: 'Assinaturas de Software',
    amount: -1000.0,
    paid: true,
    status: 'completed',
    occurred_at: getCurrentMonthDateIso(-4),
    category: { name: 'Software', color: '#ec4899', icon: 'layers' },
    type: 'expense',
    accountId: 'acc-2'
  },
  {
    id: 'tx-6',
    description: 'Combustível & Mobilidade Urbana',
    amount: -320.0,
    paid: true,
    status: 'completed',
    occurred_at: getCurrentMonthDateIso(-2),
    category: { name: 'Transporte', color: '#3b82f6', icon: 'car' },
    categoryId: 'cat-4',
    type: 'expense',
    accountId: 'acc-1'
  },
  {
    id: 'tx-7',
    description: 'Aluguel Escritório Coworking',
    amount: -1850.0,
    paid: false,
    status: 'pending',
    occurred_at: getCurrentMonthDateIso(0),
    dueDate: getCurrentMonthDateIso(0),
    category: { name: 'Infraestrutura', color: '#8b5cf6', icon: 'server' },
    categoryId: 'cat-3',
    type: 'expense',
    accountId: 'acc-1'
  },
  {
    id: 'tx-8',
    description: 'Energia Elétrica & Internet Fibra',
    amount: -380.0,
    paid: false,
    status: 'pending',
    occurred_at: getCurrentMonthDateIso(0),
    dueDate: getCurrentMonthDateIso(3),
    category: { name: 'Infraestrutura', color: '#8b5cf6', icon: 'server' },
    categoryId: 'cat-3',
    type: 'expense',
    accountId: 'acc-1'
  },
  {
    id: 'tx-9',
    description: 'Reembolso Projeto Design System',
    amount: 2400.0,
    paid: false,
    status: 'pending',
    occurred_at: getCurrentMonthDateIso(0),
    dueDate: getCurrentMonthDateIso(4),
    category: { name: 'Serviços', color: '#10b981', icon: 'laptop' },
    categoryId: 'cat-5',
    type: 'income',
    accountId: 'acc-1'
  },
  {
    id: 'tx-10',
    description: 'Aporte Reserva de Emergência (Nubank → Itaú)',
    amount: -1500.0,
    paid: true,
    status: 'completed',
    occurred_at: getCurrentMonthDateIso(-1),
    category: { name: 'Transferências', color: '#3b82f6', icon: 'arrow-left-right' },
    type: 'transfer',
    accountId: 'acc-1'
  }
]

const initialPixKeys: PixKeyItem[] = [
  {
    id: 'pix-1',
    key_type: 'email',
    key_value: 'contato@dinheirizz.com',
    bank_name: 'Nubank Institucional',
    description: 'Chave Principal'
  },
  {
    id: 'pix-2',
    key_type: 'cpf',
    key_value: '123.456.789-00',
    bank_name: 'Itaú Personalité',
    description: 'Chave Pessoal'
  },
  {
    id: 'pix-3',
    key_type: 'random',
    key_value: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    bank_name: 'Inter PJ',
    description: 'Chave Aleatória Recebimentos'
  }
]

const initialCategories: CategoryItem[] = [
  { id: 'cat-1', name: 'Alimentação', type: 'expense' },
  { id: 'cat-2', name: 'Renda / Salário', type: 'income' },
  { id: 'cat-3', name: 'Infraestrutura', type: 'expense' },
  { id: 'cat-4', name: 'Transporte', type: 'expense' },
  { id: 'cat-5', name: 'Serviços & Freelas', type: 'income' }
]

const initialAccounts: AccountItem[] = [
  { id: 'acc-1', name: 'Nubank Principal', type: 'checking', balance: 10500, bank: 'Nubank', color: '#820ad1' },
  { id: 'acc-2', name: 'Itaú Reserva de Emergência', type: 'savings', balance: 4350.2, bank: 'Itaú', color: '#ec7000' }
]

const initialCreditCards: CreditCard[] = [
  {
    id: 'demo-card-1',
    name: 'Nubank Ultravioleta',
    brand: 'mastercard',
    limitAmount: 15000,
    usedLimit: 3450.8,
    availableLimit: 11549.2,
    closingDay: 25,
    dueDay: 5,
    color: '#7bc816',
    lastFourDigits: '8821',
    accountId: 'acc-1',
    currentInvoice: {
      id: 'demo-inv-1',
      period: '2026-11',
      amount: 1250.4,
      status: 'open',
      closingDate: '2026-11-25T00:00:00.000Z',
      dueDate: '2026-12-05T00:00:00.000Z'
    }
  }
]

const MainApp = () => {
  const { user, signOut } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [unauthView, setUnauthView] = useState<'welcome' | 'login' | 'demo'>('welcome')
  const [demoTransactions, setDemoTransactions] = useState<TransactionItem[]>(initialTransactions)
  const [demoAccounts, setDemoAccounts] = useState<AccountItem[]>(initialAccounts)
  const [demoPixKeys, setDemoPixKeys] = useState<PixKeyItem[]>(initialPixKeys)
  const [demoCreditCards, setDemoCreditCards] = useState<CreditCard[]>(initialCreditCards)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [isTxModalOcrInitial, setIsTxModalOcrInitial] = useState(false)
  const [txMode, setTxMode] = useState<TransactionMode>('income')
  const [txInitialValues, setTxInitialValues] = useState<TransactionInitialValues | null>(null)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'feed' | 'calendar'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dinheirizz_view_mode')
      if (saved === 'calendar' || saved === 'feed') return saved
    }
    return 'feed'
  })
  const [isPixModalOpen, setIsPixModalOpen] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isCreditCardModalOpen, setIsCreditCardModalOpen] = useState(false)
  const [selectedCardForEdit, setSelectedCardForEdit] = useState<CreditCard | null>(null)
  const [isInvoicePaymentModalOpen, setIsInvoicePaymentModalOpen] = useState(false)
  const [cardForPayment, setCardForPayment] = useState<CreditCard | null>(null)
  const [isAnticipateModalOpen, setIsAnticipateModalOpen] = useState(false)
  const [cardForAnticipate, setCardForAnticipate] = useState<CreditCard | null>(null)
  const [isInvoiceDetailsModalOpen, setIsInvoiceDetailsModalOpen] = useState(false)
  const [cardForDetails, setCardForDetails] = useState<CreditCard | null>(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [selectedGoalForEdit, setSelectedGoalForEdit] = useState<SavingsGoalItem | null>(null)
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null)
  const [printData, setPrintData] = useState<ReportPdfData | null>(null)
  const { fetchPdfData } = useReportExport()
  const [demoBudgets, setDemoBudgets] = useState<Array<{ id: string; categoryId: string; amountLimit: number }>>([
    { id: 'demo-b-1', categoryId: 'cat-1', amountLimit: 1500 },
    { id: 'demo-b-2', categoryId: 'cat-3', amountLimit: 1200 },
    { id: 'demo-b-3', categoryId: 'cat-4', amountLimit: 800 }
  ])

  const {
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    createWorkspace,
    isCreatingWorkspace
  } = useWorkspaces()

  const {
    goals,
    summary: goalsSummary,
    isLoading: isGoalsLoading,
    createGoal,
    updateGoal,
    contributeGoal,
    deleteGoal,
    isCreatingGoal,
    isUpdatingGoal,
    isDeletingGoal
  } = useGoals(selectedProfileId)

  // TanStack Query Hooks (Carregamento reativo da API do BFF)
  const {
    transactions: apiTransactions,
    totalBalance: apiBalance,
    totalIncome: apiIncome,
    totalExpense: apiExpense,
    isLoading: isTxLoading,
    total: apiTotal,
    hasMore: apiHasMore,
    isLoadingMore: apiIsLoadingMore,
    loadMore: apiLoadMore
  } = useTransactions({
    accountId: selectedAccountId || undefined,
    profileId: selectedProfileId,
    limit: 100
  })

  const { accounts: apiAccounts, isLoading: isAccountsLoading } = useAccounts(selectedProfileId)
  const createAccountMutation = useCreateAccount()
  const transferMutation = useTransferTransaction()
  const { pixKeys: apiPixKeys } = usePixKeys()
  const createPixMutation = useCreatePixKey()
  const deletePixMutation = useDeletePixKey()

  const { categories: apiCategories } = useCategories()
  const createTxMutation = useCreateTransaction()
  const payTxMutation = usePayTransaction()

  const {
    budgets: apiBudgets,
    summary: apiBudgetSummary,
    isLoading: isBudgetsLoading
  } = useBudgets(undefined, selectedProfileId)
  const createBudgetMutation = useCreateBudget()
  const updateBudgetMutation = useUpdateBudget()
  const deleteBudgetMutation = useDeleteBudget()

  const {
    insight: apiInsight,
    isLoading: isAiLoading,
    isGenerating: isAiGenerating,
    generateInsights
  } = useAiInsights()

  const {
    subscriptions: activeSubscriptions,
    summary: activeSubscriptionsSummary,
    isLoading: isSubscriptionsLoading,
    confirmSubscription,
    ignoreSubscription,
    confirmingId: confirmingSubscriptionId,
    ignoringKey: ignoringSubscriptionKey
  } = useSubscriptions({ accountId: selectedAccountId })

  const handleConfirmSubscription = async (sub: DetectedSubscription) => {
    const parsedDate = new Date(sub.lastChargedAt)
    const recurrenceDay = !isNaN(parsedDate.getTime()) ? parsedDate.getUTCDate() : undefined
    await confirmSubscription({
      transactionId: sub.latestTransactionId,
      frequency: sub.frequency,
      recurrenceDay
    })
  }

  const handleIgnoreSubscription = async (normalizedKey: string) => {
    await ignoreSubscription(normalizedKey)
  }

  const { creditCards: apiCreditCards, isLoading: isCreditCardsLoading } = useCreditCards(selectedProfileId)
  const createCardMutation = useCreateCreditCard()
  const payInvoiceMutation = usePayInvoice()
  const anticipateMutation = useAnticipateInstallments()

  // Totais do modo de demonstração
  let demoIncome = 0
  let demoExpense = 0
  for (const t of demoTransactions) {
    if (t.amount > 0) demoIncome += t.amount
    else demoExpense += Math.abs(t.amount)
  }
  const demoBalance = demoIncome - demoExpense

  const activeAccounts = user ? apiAccounts : demoAccounts
  const activePixKeys = user ? apiPixKeys : demoPixKeys
  const activeTransactions = user ? apiTransactions : demoTransactions
  const activeCreditCards = user ? apiCreditCards : demoCreditCards
  const activeBalance = activeAccounts.length > 0
    ? activeAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
    : (user ? apiBalance : demoBalance)
  const activeIncome = user ? apiIncome : demoIncome
  const activeExpense = user ? apiExpense : demoExpense
  const activeCategories = apiCategories.length > 0 ? apiCategories : initialCategories

  // Orçamentos no modo demonstração
  const computedDemoBudgets: BudgetProgressItem[] = demoBudgets.map((b) => {
    const cat = initialCategories.find((c) => c.id === b.categoryId)
    let spent = 0
    for (const t of demoTransactions) {
      if (t.amount < 0) {
        const matchesCategory =
          (t.category?.name && cat?.name && t.category.name.toLowerCase() === cat.name.toLowerCase()) ||
          (t.categoryId && t.categoryId === cat?.id)
        if (matchesCategory) {
          spent += Math.abs(t.amount)
        }
      }
    }
    spent = Math.round(spent * 100) / 100
    const remaining = Math.max(0, Math.round((b.amountLimit - spent) * 100) / 100)
    const pct = b.amountLimit > 0 ? Math.round((spent / b.amountLimit) * 1000) / 10 : 0
    let status: 'normal' | 'warning' | 'exceeded' = 'normal'
    if (pct >= 100) status = 'exceeded'
    else if (pct >= 75) status = 'warning'

    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: cat?.name || 'Categoria',
      categoryColor: cat?.name === 'Alimentação' ? '#10b981' : (cat?.name === 'Infraestrutura' ? '#8b5cf6' : '#3b82f6'),
      categoryIcon: null,
      amountLimit: b.amountLimit,
      spentAmount: spent,
      remainingAmount: remaining,
      percentageUsed: pct,
      isOverBudget: spent >= b.amountLimit,
      status
    }
  })

  const demoBudgetTotalLimit = demoBudgets.reduce((sum, b) => sum + b.amountLimit, 0)
  const demoBudgetTotalSpent = computedDemoBudgets.reduce((sum, b) => sum + b.spentAmount, 0)
  const demoBudgetSummary = {
    period: new Date().toISOString().slice(0, 7),
    totalBudgetLimit: demoBudgetTotalLimit,
    totalSpent: demoBudgetTotalSpent,
    totalRemaining: Math.max(0, demoBudgetTotalLimit - demoBudgetTotalSpent),
    overallPercentageUsed:
      demoBudgetTotalLimit > 0 ? Math.round((demoBudgetTotalSpent / demoBudgetTotalLimit) * 1000) / 10 : 0,
    budgets: computedDemoBudgets
  }

  const activeBudgets = user ? apiBudgets : computedDemoBudgets
  const activeBudgetSummary = user ? apiBudgetSummary : demoBudgetSummary

  const handleSaveBudget = async (data: { categoryId: string; amountLimit: number }) => {
    if (user) {
      const existing = apiBudgets.find((b) => b.categoryId === data.categoryId)
      if (existing) {
        await updateBudgetMutation.mutateAsync({ id: existing.id, amountLimit: data.amountLimit })
      } else {
        await createBudgetMutation.mutateAsync({ categoryId: data.categoryId, amountLimit: data.amountLimit })
      }
      toast.success('Orçamento salvo com sucesso!')
    } else {
      setDemoBudgets((prev) => {
        const idx = prev.findIndex((b) => b.categoryId === data.categoryId)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], amountLimit: data.amountLimit }
          return updated
        }
        return [...prev, { id: `demo-b-${Date.now()}`, categoryId: data.categoryId, amountLimit: data.amountLimit }]
      })
      toast.success('Orçamento salvo (modo demo)!')
    }
  }

  const handleDeleteBudget = async (budgetId: string) => {
    if (user) {
      await deleteBudgetMutation.mutateAsync(budgetId)
      toast.success('Orçamento removido com sucesso!')
    } else {
      setDemoBudgets((prev) => prev.filter((b) => b.id !== budgetId))
      toast.success('Orçamento removido (modo demo)!')
    }
  }

  // Issue #53: Handlers de Cartões de Crédito e Faturas
  const handleOpenCreateCard = () => {
    setSelectedCardForEdit(null)
    setIsCreditCardModalOpen(true)
  }

  const handleOpenInvoiceDetails = (card: CreditCard) => {
    setCardForDetails(card)
    setIsInvoiceDetailsModalOpen(true)
  }

  const handleOpenPayInvoice = (card: CreditCard) => {
    setCardForPayment(card)
    setIsInvoicePaymentModalOpen(true)
  }

  const handleOpenAnticipate = (card: CreditCard) => {
    setCardForAnticipate(card)
    setIsAnticipateModalOpen(true)
  }

  const handleSaveCreditCard = async (input: CreateCreditCardInput) => {
    if (user) {
      await createCardMutation.mutateAsync(input)
      toast.success('Cartão de crédito salvo com sucesso!')
    } else {
      const newCard: CreditCard = {
        id: `demo-card-${Date.now()}`,
        name: input.name,
        brand: input.brand,
        limitAmount: input.limitAmount,
        usedLimit: 0,
        availableLimit: input.limitAmount,
        closingDay: input.closingDay,
        dueDay: input.dueDay,
        color: input.color || '#7bc816',
        lastFourDigits: input.lastFourDigits || null,
        accountId: input.accountId,
        currentInvoice: {
          id: `demo-inv-${Date.now()}`,
          period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
          amount: 0,
          status: 'open',
          closingDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      }
      setDemoCreditCards((prev) => [...prev, newCard])
      toast.success('Cartão cadastrado com sucesso (modo demonstração)!')
    }
  }

  const handleConfirmInvoicePayment = async (data: {
    invoiceId: string
    paymentAccountId: string
    amount: number
  }) => {
    if (user) {
      await payInvoiceMutation.mutateAsync({
        invoiceId: data.invoiceId,
        data: {
          paymentAccountId: data.paymentAccountId,
          amount: data.amount
        }
      })
      toast.success('Fatura liquidada com sucesso e débito lançado em conta!')
    } else {
      setDemoAccounts((prev) =>
        prev.map((acc) =>
          acc.id === data.paymentAccountId
            ? { ...acc, balance: acc.balance - data.amount }
            : acc
        )
      )
      setDemoCreditCards((prev) =>
        prev.map((card) => {
          if (card.currentInvoice?.id === data.invoiceId) {
            return {
              ...card,
              usedLimit: Math.max(0, card.usedLimit - data.amount),
              availableLimit: Math.min(card.limitAmount, card.availableLimit + data.amount),
              currentInvoice: {
                ...card.currentInvoice,
                status: 'paid',
                amount: 0
              }
            }
          }
          return card
        })
      )
      toast.success('Fatura liquidada com sucesso no modo demonstração!')
    }
  }

  const handleConfirmAnticipation = async (data: {
    cardId: string
    transactionIds: string[]
  }) => {
    if (user) {
      await anticipateMutation.mutateAsync({
        cardId: data.cardId,
        data: { transactionIds: data.transactionIds }
      })
      toast.success('Parcelas antecipadas com sucesso para a fatura aberta!')
    } else {
      toast.success('Parcelas antecipadas no modo demonstração!')
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleViewModeChange = (mode: 'feed' | 'calendar') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dinheirizz_view_mode', mode)
    }
  }

  const handleActionClick = (action: ActionType) => {
    if (action === 'pix') {
      setIsPixModalOpen(true)
    } else if (action === 'import') {
      setIsImportModalOpen(true)
    } else if (action === 'scan') {
      setTxMode('expense')
      setTxInitialValues(null)
      setIsTxModalOcrInitial(true)
      setIsTxModalOpen(true)
    } else {
      setTxMode(action as TransactionMode)
      setTxInitialValues(null)
      setIsTxModalOcrInitial(false)
      setIsTxModalOpen(true)
    }
  }

  const handleActionHover = (action: ActionType) => {
    if (['income', 'expense', 'transfer', 'scan'].includes(action)) {
      import('./components/modals/TransactionModal')
    } else if (action === 'pix') {
      import('./components/modals/PixWalletModal')
    } else if (action === 'import') {
      import('./components/modals/ImportStatementModal')
    }
  }

  const handleDemoImport = (imported: ParsedTransactionCandidate[], accountId: string) => {
    let netDelta = 0
    const newItems: TransactionItem[] = []

    for (const item of imported) {
      const isExpense = item.type === 'expense'
      const finalAmount = isExpense ? -Math.abs(item.amount) : Math.abs(item.amount)
      netDelta += finalAmount

      const cat = activeCategories.find((c) => c.id === item.categoryId)

      newItems.push({
        id: `demo-import-${crypto.randomUUID()}`,
        description: item.description,
        amount: finalAmount,
        paid: true,
        status: 'completed',
        occurred_at: item.date,
        category: cat
          ? { name: cat.name, color: isExpense ? '#f43f5e' : '#10b981' }
          : item.categoryName
          ? { name: item.categoryName }
          : null,
        type: item.type,
        accountId
      })
    }

    const targetAccId = accountId || demoAccounts[0]?.id
    if (targetAccId) {
      setDemoAccounts((prev) =>
        prev.map((acc) => (acc.id === targetAccId ? { ...acc, balance: acc.balance + netDelta } : acc))
      )
    }

    setDemoTransactions((prev) => {
      const updated = [...newItems, ...prev]
      return updated.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    })
  }

  const handleCreateTransaction = async (data: {
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
  }) => {
    if (user) {
      try {
        if (data.type === 'transfer') {
          if (!data.fromAccountId || !data.toAccountId) {
            throw new Error('Contas de origem e destino são obrigatórias.')
          }
          await transferMutation.mutateAsync({
            amount: data.amount,
            fromAccountId: data.fromAccountId,
            toAccountId: data.toAccountId,
            description: data.description || undefined
          })
          toast.success('Transferência realizada com sucesso!')
        } else {
          await createTxMutation.mutateAsync({
            amount: data.amount,
            description: data.description,
            categoryId: data.categoryId,
            accountId: data.accountId,
            occurredAt: data.occurredAt,
            dueDate: data.dueDate,
            status: data.status,
            paid: data.status === 'completed',
            isRecurring: data.isRecurring,
            recurrencePeriod: data.recurrencePeriod as any,
            recurrenceDay: data.recurrenceDay,
            adjustBusinessDay: data.adjustBusinessDay,
            installmentTotal: data.installmentTotal,
            creditCardId: data.creditCardId,
            type: data.type
          })
          const successMsg =
            data.status === 'pending'
              ? (data.type === 'income' ? 'Receita a receber registrada!' : 'Conta a pagar registrada!')
              : (data.type === 'income' ? 'Receita registrada com sucesso!' : 'Despesa registrada com sucesso!')
          toast.success(successMsg)
        }
        setIsTxModalOpen(false)
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao registrar movimentação'
        toast.error(errorMsg)
      }
    } else {
      // Modo Demonstração (em memória)
      if (data.type === 'transfer') {
        const fromAcc = demoAccounts.find((a) => a.id === data.fromAccountId)
        const toAcc = demoAccounts.find((a) => a.id === data.toAccountId)

        setDemoAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === data.fromAccountId) {
              return { ...acc, balance: acc.balance - data.amount }
            }
            if (acc.id === data.toAccountId) {
              return { ...acc, balance: acc.balance + data.amount }
            }
            return acc
          })
        )

        const debitTx: TransactionItem = {
          id: `tx-transfer-out-${Date.now()}`,
          description: `Transferência enviada para ${toAcc?.name || 'conta'}`,
          amount: -data.amount,
          paid: true,
          status: 'completed',
          occurred_at: data.occurredAt || new Date().toISOString(),
          category: { name: 'Transferência', color: '#3b82f6', icon: 'arrow-left-right' },
          type: 'transfer',
          accountId: data.fromAccountId
        }

        const creditTx: TransactionItem = {
          id: `tx-transfer-in-${Date.now()}`,
          description: `Transferência recebida de ${fromAcc?.name || 'conta'}`,
          amount: data.amount,
          paid: true,
          status: 'completed',
          occurred_at: data.occurredAt || new Date().toISOString(),
          category: { name: 'Transferência', color: '#3b82f6', icon: 'arrow-left-right' },
          type: 'transfer',
          accountId: data.toAccountId
        }

        setDemoTransactions((prev) => [debitTx, creditTx, ...prev])
        toast.success('Transferência registrada (modo demonstração)!')
        setIsTxModalOpen(false)
        return
      }

      const isExpense = data.type === 'expense'
      const isPending = data.status === 'pending'
      const finalAmount = isExpense ? -Math.abs(data.amount) : Math.abs(data.amount)
      const cat = activeCategories.find((c) => c.id === data.categoryId)

      const newTx: TransactionItem = {
        id: `tx-${Date.now()}`,
        description: data.description || (data.type === 'income' ? 'Nova Receita' : 'Nova Despesa'),
        amount: finalAmount,
        paid: !isPending,
        status: isPending ? 'pending' : 'completed',
        dueDate: data.dueDate || null,
        isRecurring: data.isRecurring || false,
        recurrencePeriod: data.recurrencePeriod || null,
        recurrenceDay: data.recurrenceDay || null,
        adjustBusinessDay: Boolean(data.adjustBusinessDay),
        installmentTotal: data.installmentTotal || null,
        installmentCurrent: data.installmentTotal ? 1 : null,
        occurred_at: data.occurredAt || new Date().toISOString(),
        category: cat ? { name: cat.name, color: isExpense ? '#f43f5e' : '#10b981' } : null,
        type: data.type,
        accountId: data.accountId
      }

      // Somente afeta o saldo bancário se a transação estiver liquidada/paga
      const targetAccId = data.accountId || demoAccounts[0]?.id
      if (targetAccId && !isPending) {
        setDemoAccounts((prev) =>
          prev.map((acc) =>
            acc.id === targetAccId
              ? { ...acc, balance: acc.balance + finalAmount }
              : acc
          )
        )
      }

      setDemoTransactions((prev) => {
        const updated = [newTx, ...prev]
        return updated.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      })
      toast.success('Transação registrada (modo demonstração)!')
      setIsTxModalOpen(false)
    }
  }

  const handleCreateAccount = async (data: {
    name: string
    type: 'checking' | 'savings' | 'investment' | 'credit'
    balance: number
    bank?: string
    color?: string
  }) => {
    if (user) {
      await createAccountMutation.mutateAsync(data)
      toast.success('Conta criada com sucesso!')
    } else {
      const newAcc: AccountItem = {
        id: `acc-${Date.now()}`,
        name: data.name,
        type: data.type,
        balance: data.balance,
        bank: data.bank,
        color: data.color
      }
      setDemoAccounts((prev) => [...prev, newAcc])
      toast.success('Conta criada (modo demonstração)!')
    }
  }

  const handleCreatePixKey = async (data: {
    keyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
    keyValue: string
    bankName?: string
    label?: string
  }) => {
    if (user) {
      await createPixMutation.mutateAsync(data)
      toast.success('Chave Pix cadastrada com sucesso!')
    } else {
      const newKey: PixKeyItem = {
        id: `pix-${Date.now()}`,
        key_type: data.keyType,
        key_value: data.keyValue,
        bank_name: data.bankName,
        description: data.label
      }
      setDemoPixKeys((prev) => [...prev, newKey])
      toast.success('Chave Pix cadastrada (modo demonstração)!')
    }
  }

  const handleDeletePixKey = async (id: string) => {
    if (user) {
      await deletePixMutation.mutateAsync(id)
      toast.success('Chave Pix removida!')
    } else {
      setDemoPixKeys((prev) => prev.filter((k) => k.id !== id))
      toast.success('Chave Pix removida (modo demonstração)!')
    }
  }

  const handlePayTransaction = async (txId: string) => {
    if (user) {
      try {
        if (txId.startsWith('rec-proj-')) {
          const parts = txId.split('-')
          const seriesId = parts[2]
          const year = parseInt(parts[3], 10)
          const month = parseInt(parts[4], 10)
          const parent = apiTransactions.find(
            (t) => t.id === seriesId || t.parentTransactionId === seriesId
          )
          if (parent) {
            const recDay = parent.recurrenceDay ?? (parent as any).recurrence_day ?? 1
            const adjBD = Boolean(parent.adjustBusinessDay ?? (parent as any).adjust_business_day)
            const computedDate = calculateRecurringDueDate(year, month, recDay, adjBD)
            const dateStr = formatYMD(computedDate)
            const occDate = `${dateStr}T12:00:00Z`
            await createTxMutation.mutateAsync({
              amount: Math.abs(parent.amount),
              type: (parent.amount > 0 ? 'income' : 'expense') as 'income' | 'expense',
              description: parent.description || undefined,
              accountId: parent.accountId || undefined,
              occurredAt: occDate,
              dueDate: occDate,
              paid: true,
              status: 'completed',
              isRecurring: true,
              recurrenceDay: recDay,
              adjustBusinessDay: adjBD
            })
            toast.success('Transação baixada com sucesso!')
            return
          }
        }
        await payTxMutation.mutateAsync({ transactionId: txId })
        toast.success('Transação baixada com sucesso!')
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao dar baixa na transação'
        toast.error(errorMsg)
      }
    } else {
      if (txId.startsWith('rec-proj-')) {
        const parts = txId.split('-')
        const seriesId = parts[2]
        const year = parseInt(parts[3], 10)
        const month = parseInt(parts[4], 10)
        const parent = demoTransactions.find(
          (t) => t.id === seriesId || t.parentTransactionId === seriesId
        )
        if (parent) {
          const targetAccId = parent.accountId || demoAccounts[0]?.id
          if (targetAccId) {
            setDemoAccounts((accs) =>
              accs.map((a) =>
                a.id === targetAccId
                  ? { ...a, balance: a.balance + parent.amount }
                  : a
              )
            )
          }
          const recDay = parent.recurrenceDay ?? (parent as any).recurrence_day ?? 1
          const adjBD = Boolean(parent.adjustBusinessDay ?? (parent as any).adjust_business_day)
          const computedDate = calculateRecurringDueDate(year, month, recDay, adjBD)
          const dateStr = formatYMD(computedDate)
          const newCompletedTx: TransactionItem = {
            id: `paid-${txId}`,
            parentTransactionId: seriesId,
            description: parent.description,
            amount: parent.amount,
            paid: true,
            status: 'completed',
            paidAt: new Date().toISOString(),
            occurred_at: `${dateStr}T12:00:00Z`,
            dueDate: `${dateStr}T12:00:00Z`,
            category: parent.category,
            type: parent.type,
            accountId: targetAccId,
            isRecurring: true,
            recurrenceDay: recDay,
            adjustBusinessDay: adjBD
          }
          setDemoTransactions((prev) => [newCompletedTx, ...prev])
          toast.success('Transação liquidada (modo demonstração)!')
          return
        }
      }

      setDemoTransactions((prev) =>
        prev.map((t) => {
          if (t.id === txId) {
            if (!t.paid) {
              const targetAccId = t.accountId || demoAccounts[0]?.id
              if (targetAccId) {
                setDemoAccounts((accs) =>
                  accs.map((a) =>
                    a.id === targetAccId
                      ? { ...a, balance: a.balance + t.amount }
                      : a
                  )
                )
              }
            }
            return {
              ...t,
              paid: true,
              status: 'completed',
              paidAt: new Date().toISOString()
            }
          }
          return t
        })
      )
      toast.success('Transação liquidada (modo demonstração)!')
    }
  }

  const handleDeleteTransactionsDemo = () => {
    setDemoTransactions([])
    setDemoAccounts((prev) => prev.map((a) => ({ ...a, balance: 0 })))
  }

  const handleDeletePixKeysDemo = () => {
    setDemoPixKeys([])
  }

  const handleDeleteAccountsDemo = () => {
    setDemoAccounts([initialAccounts[0]])
    setDemoTransactions([])
    setSelectedAccountId('')
  }

  const handleResetAllDemo = () => {
    setDemoTransactions([])
    setDemoPixKeys([])
    setDemoAccounts([initialAccounts[0]])
    setSelectedAccountId('')
  }

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'US'

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      setIsLogoutModalOpen(false)
      setIsProfileModalOpen(false)
      setUnauthView('welcome')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const renderMainView = (): React.ReactNode => {
    // Usuário não autenticado: tela inicial é Boas-Vindas ou Login (não o dashboard privado)
    if (!user && unauthView !== 'demo') {
      if (unauthView === 'login') {
        return (
          <React.Suspense fallback={<ModalSuspenseFallback message="Carregando tela de login..." />}>
            <div className="relative">
              <button
                onClick={() => setUnauthView('welcome')}
                className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 min-h-[40px] px-3.5 py-2.5 rounded-xl bg-card/80 hover:bg-card text-foreground text-xs font-semibold backdrop-blur-md border border-border cursor-pointer transition-all shadow-lg flex items-center gap-1.5 active:scale-95"
              >
                ← Voltar
              </button>
              <LoginScreen />
            </div>
          </React.Suspense>
        )
      }

      return (
        <React.Suspense fallback={<ModalSuspenseFallback message="Iniciando Dinheirizz..." />}>
          <WelcomeScreen
            onGoToLogin={() => setUnauthView('login')}
            onExploreDemo={() => setUnauthView('demo')}
          />
        </React.Suspense>
      )
    }

    return (
      <>
        <div className="relative min-h-dvh bg-[var(--background)] text-foreground overflow-x-hidden pb-20 pt-safe-top pb-safe-bottom no-print">
      {/* Background Orbs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 rounded-full gradient-orb-primary pointer-events-none opacity-40" />
      <div className="fixed top-1/3 -right-24 w-96 h-96 rounded-full gradient-orb-accent pointer-events-none opacity-25" />

      {/* Top Bar with Floating Capsule and Safe Area Support */}
      <header className="sticky top-0 z-30 pt-3 sm:pt-5 pb-2 px-2.5 sm:px-6 transition-all">
        <div className="max-w-7xl mx-auto backdrop-blur-2xl bg-[var(--card)] border border-border rounded-2xl sm:rounded-3xl px-2.5 py-2 sm:px-6 sm:py-3 shadow-2xl shadow-black/10 dark:shadow-black/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center justify-between gap-2 min-w-0 sm:flex-1">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl avatar-gradient flex items-center justify-center shadow-lg shadow-primary/20 border border-border flex-shrink-0">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1
                  data-testid="header-app-title"
                  className="font-bold text-sm sm:text-lg tracking-tight flex items-center gap-1.5 sm:gap-2 text-foreground font-display truncate"
                >
                  Dinheirizz
                </h1>
                <p
                  data-testid="header-app-subtitle"
                  className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Finanças Pessoais
                </p>
              </div>
            </div>

            {/* Ações rápidas visíveis na linha superior em mobile; no desktop ficam inline com o seletor */}
            <div className="flex items-center gap-1 sm:hidden flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                data-testid="header-command-palette-btn-mobile"
                aria-label="Abrir barra de comandos e lançamento rápido"
                title="Command Bar (⌘K / Ctrl+K)"
                className="min-w-[44px] min-h-[44px] rounded-full glass-card-interactive flex items-center justify-center text-muted-foreground hover:text-foreground border border-border cursor-pointer active:scale-95 transition-all"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                data-testid="header-theme-toggle-btn-mobile"
                aria-label="Alternar tema visual"
                title={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                className="min-w-[44px] min-h-[44px] rounded-full glass-card-interactive flex items-center justify-center text-muted-foreground hover:text-foreground border border-border cursor-pointer active:scale-95 transition-all"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                data-testid="header-notifications-btn-mobile"
                aria-label="Notificações"
                className="min-w-[44px] min-h-[44px] rounded-full glass-card-interactive flex items-center justify-center text-muted-foreground hover:text-foreground border border-border cursor-pointer"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t border-border/60 sm:border-t-0 flex-shrink-0">
            <React.Suspense fallback={null}>
              <ProfileSelector
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                onSelectProfile={(nextId) => {
                  setSelectedProfileId(nextId)
                  setSelectedAccountId(null)
                }}
                onCreateProfile={createWorkspace}
                isCreating={isCreatingWorkspace}
              />
            </React.Suspense>

            {/* Command Bar Global (Cmd+K / Ctrl+K) */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              data-testid="header-command-palette-btn"
              aria-label="Abrir barra de comandos e lançamento rápido"
              title="Command Bar (⌘K / Ctrl+K)"
              className="hidden sm:flex min-h-[40px] sm:px-3 rounded-xl glass-card-interactive items-center justify-center gap-2 text-muted-foreground hover:text-foreground border border-border cursor-pointer active:scale-95 transition-all"
            >
              <Search className="w-4 h-4" />
              <span className="text-xs font-medium">Buscar...</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-muted text-muted-foreground border border-border">
                ⌘K
              </kbd>
            </button>

            {/* Alternância Rápida de Tema Dual-Theme */}
            <button
              type="button"
              onClick={toggleTheme}
              data-testid="header-theme-toggle-btn"
              aria-label="Alternar tema visual"
              title={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              className="hidden sm:flex w-10 h-10 min-w-[40px] min-h-[40px] rounded-full glass-card-interactive items-center justify-center text-muted-foreground hover:text-foreground border border-border cursor-pointer active:scale-95 transition-all"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              data-testid="header-notifications-btn"
              aria-label="Notificações"
              className="hidden sm:flex w-10 h-10 min-w-[40px] min-h-[40px] rounded-full glass-card-interactive items-center justify-center text-muted-foreground hover:text-foreground border border-border cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>

            {user ? (
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  data-testid="user-profile-avatar-btn"
                  title={user.fullName ? `${user.fullName} (@${user.username || 'perfil'})` : (user.email || 'Meu Perfil')}
                  aria-label="Abrir configurações de perfil"
                  className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] sm:w-10 sm:h-10 rounded-full avatar-gradient flex items-center justify-center font-bold text-xs sm:text-sm text-primary-foreground border border-border shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {userInitials}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  data-testid="header-logout-btn"
                  title="Sair da conta"
                  aria-label="Sair da conta"
                  className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] sm:w-10 sm:h-10 rounded-full glass-card-interactive flex items-center justify-center text-muted-foreground hover:text-rose-400 border border-border transition-colors cursor-pointer active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="header-login-btn"
                onClick={() => setUnauthView('login')}
                className="py-2 px-3 sm:px-3.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all min-h-[44px] sm:min-h-[40px] min-w-[44px] whitespace-nowrap flex-shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Demo Banner for Unauthenticated Users */}
      {!user && (
        <div
          data-testid="demo-mode-banner"
          className="bg-primary/10 border-b border-primary/20 px-3 py-2 text-center text-xs text-foreground flex items-center justify-center gap-1.5 flex-wrap"
        >
          <span>Modo de demonstração.</span>
          <button
            type="button"
            data-testid="demo-banner-login-btn"
            onClick={() => setUnauthView('login')}
            className="text-primary font-semibold underline hover:text-primary/80 transition-colors cursor-pointer min-h-[44px] inline-flex items-center px-1"
          >
            Fazer login ou cadastrar
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="px-3.5 sm:px-6 py-4 sm:py-6">
        <Dashboard
          totalBalance={activeBalance}
          totalIncome={activeIncome}
          totalExpense={activeExpense}
          transactions={activeTransactions}
          onActionClick={handleActionClick}
          onActionHover={handleActionHover}
          isLoading={Boolean(
            user &&
            apiAccounts.length === 0 &&
            apiTransactions.length === 0 &&
            (isAccountsLoading || isTxLoading)
          )}
          accounts={activeAccounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onNewAccount={() => setIsAccountModalOpen(true)}
          hasMore={user ? apiHasMore : false}
          isLoadingMore={user ? apiIsLoadingMore : false}
          onLoadMore={user ? apiLoadMore : undefined}
          totalCount={user ? apiTotal : activeTransactions.length}
          insight={user ? apiInsight : null}
          isAiLoading={Boolean(user && isAiLoading)}
          isAiGenerating={isAiGenerating}
          onGenerateAiInsight={user ? () => generateInsights() : undefined}
          onOpenCopilot={() => setIsCopilotOpen(true)}
          onPayTransaction={handlePayTransaction}
          budgets={activeBudgets}
          budgetSummary={activeBudgetSummary}
          onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
          isBudgetsLoading={Boolean(user && isBudgetsLoading)}
          onImportStatement={() => setIsImportModalOpen(true)}
          onExportReport={() => setIsExportModalOpen(true)}
          creditCards={activeCreditCards}
          isCreditCardsLoading={Boolean(user && isCreditCardsLoading)}
          onOpenCreateCreditCard={handleOpenCreateCard}
          onOpenInvoiceDetails={handleOpenInvoiceDetails}
          onOpenPayInvoice={handleOpenPayInvoice}
          onOpenAnticipate={handleOpenAnticipate}
          isAuthenticated={Boolean(user)}
          userId={user?.id ?? null}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          subscriptions={activeSubscriptions}
          subscriptionsSummary={activeSubscriptionsSummary}
          isSubscriptionsLoading={isSubscriptionsLoading}
          onConfirmSubscription={handleConfirmSubscription}
          onIgnoreSubscription={handleIgnoreSubscription}
          confirmingSubscriptionId={confirmingSubscriptionId}
          ignoringSubscriptionKey={ignoringSubscriptionKey}
          goals={goals}
          goalsSummary={goalsSummary}
          isGoalsLoading={isGoalsLoading}
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onOpenCreateGoal={() => {
            setSelectedGoalForEdit(null)
            setIsGoalModalOpen(true)
          }}
          onOpenEditGoal={(goal) => {
            setSelectedGoalForEdit(goal)
            setIsGoalModalOpen(true)
          }}
          onContributeGoal={async (goalId, amount) => {
            setContributingGoalId(goalId)
            try {
              await contributeGoal({ id: goalId, amount })
            } finally {
              setContributingGoalId(null)
            }
          }}
          contributingGoalId={contributingGoalId}
        />
      </main>

      {/* Modal de Transações (Receita / Despesa / Transferência) */}
      {isTxModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando transações..." />}>
          <TransactionModal
            isOpen={isTxModalOpen}
            mode={txMode}
            categories={activeCategories}
            accounts={activeAccounts}
            creditCards={activeCreditCards}
            defaultAccountId={selectedAccountId || undefined}
            initialOpenOcr={isTxModalOcrInitial}
            initialValues={txInitialValues}
            onClose={() => {
              setIsTxModalOpen(false)
              setTxInitialValues(null)
            }}
            onOpenAiSettings={() => setIsProfileModalOpen(true)}
            onSubmit={handleCreateTransaction}
          />
        </React.Suspense>
      )}

      {/* Modal de Metas de Economia (Caixinhas) */}
      {isGoalModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando metas..." />}>
          <GoalModal
            isOpen={isGoalModalOpen}
            onClose={() => {
              setIsGoalModalOpen(false)
              setSelectedGoalForEdit(null)
            }}
            goal={selectedGoalForEdit}
            profiles={profiles}
            defaultProfileId={selectedProfileId}
            onSubmit={async (data: GoalFormData, goalId?: string) => {
              if (goalId) {
                await updateGoal({ id: goalId, data })
              } else {
                await createGoal(data)
              }
            }}
            onDelete={async (goalId: string) => {
              await deleteGoal(goalId)
            }}
            isLoading={isCreatingGoal || isUpdatingGoal || isDeletingGoal}
          />
        </React.Suspense>
      )}

      {/* Modal de Orçamentos Mensais por Categoria */}
      {isBudgetModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando orçamentos..." />}>
          <BudgetModal
            isOpen={isBudgetModalOpen}
            onClose={() => setIsBudgetModalOpen(false)}
            categories={activeCategories}
            budgets={activeBudgets}
            onSaveBudget={handleSaveBudget}
            onDeleteBudget={handleDeleteBudget}
            isLoading={Boolean(
              user && (createBudgetMutation.isPending || updateBudgetMutation.isPending || deleteBudgetMutation.isPending)
            )}
          />
        </React.Suspense>
      )}

      {/* Modal de Importação Inteligente de Extratos Bancários */}
      {isImportModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando importação..." />}>
          <ImportStatementModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            accounts={activeAccounts}
            categories={activeCategories}
            existingTransactions={activeTransactions}
            onDemoImport={handleDemoImport}
          />
        </React.Suspense>
      )}

      {/* Modal de Carteira Pix */}
      {isPixModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando chaves Pix..." />}>
          <PixWalletModal
            isOpen={isPixModalOpen}
            pixKeys={activePixKeys}
            onClose={() => setIsPixModalOpen(false)}
            onCreatePixKey={handleCreatePixKey}
            onDeletePixKey={handleDeletePixKey}
          />
        </React.Suspense>
      )}

      {/* Modal de Criação de Conta */}
      {isAccountModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando formulário de conta..." />}>
          <AccountModal
            isOpen={isAccountModalOpen}
            onClose={() => setIsAccountModalOpen(false)}
            onSubmit={handleCreateAccount}
          />
        </React.Suspense>
      )}

      {/* Modal de Perfil e Configurações */}
      {isProfileModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando perfil..." />}>
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            onOpenLogoutConfirm={() => setIsLogoutModalOpen(true)}
            onOpenDangerZone={() => setIsDangerZoneOpen(true)}
          />
        </React.Suspense>
      )}

      {/* Modal de Gestão de Dados e Zona de Perigo */}
      {isDangerZoneOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando zona de perigo..." />}>
          <DangerZoneModal
            isOpen={isDangerZoneOpen}
            onClose={() => setIsDangerZoneOpen(false)}
            onSuccessNotification={(msg) => toast.success(msg)}
            onDeleteTransactions={user ? undefined : handleDeleteTransactionsDemo}
            onDeletePixKeys={user ? undefined : handleDeletePixKeysDemo}
            onDeleteAccounts={user ? undefined : handleDeleteAccountsDemo}
            onResetAllData={user ? undefined : handleResetAllDemo}
          />
        </React.Suspense>
      )}

      {/* Modal de Confirmação de Logout */}
      {isLogoutModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando confirmação..." />}>
          <LogoutConfirmModal
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            onConfirm={handleConfirmLogout}
            isLoading={isLoggingOut}
          />
        </React.Suspense>
      )}

      {/* Modal de Gestão de Cartão de Crédito */}
      {isCreditCardModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando cartão..." />}>
          <CreditCardModal
            isOpen={isCreditCardModalOpen}
            card={selectedCardForEdit}
            accounts={activeAccounts}
            onClose={() => setIsCreditCardModalOpen(false)}
            onSave={handleSaveCreditCard}
            isLoading={Boolean(user && createCardMutation.isPending)}
          />
        </React.Suspense>
      )}

      {/* Modal de Detalhes da Fatura */}
      {isInvoiceDetailsModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando fatura..." />}>
          <InvoiceDetailsModal
            isOpen={isInvoiceDetailsModalOpen}
            card={cardForDetails}
            invoice={cardForDetails?.currentInvoice ? {
              id: cardForDetails.currentInvoice.id,
              creditCardId: cardForDetails.id,
              period: cardForDetails.currentInvoice.period,
              closingDate: cardForDetails.currentInvoice.closingDate,
              dueDate: cardForDetails.currentInvoice.dueDate,
              amount: cardForDetails.currentInvoice.amount,
              status: cardForDetails.currentInvoice.status,
              paidAmount: 0,
              paidAt: null,
              items: activeTransactions
                .filter((tx) => tx.creditCardId === cardForDetails.id)
                .map((tx) => ({
                  id: tx.id,
                  description: tx.description,
                  amount: Math.abs(tx.amount),
                  occurredAt: tx.occurred_at,
                  installmentCurrent: tx.installmentCurrent ?? null,
                  installmentTotal: tx.installmentTotal ?? null,
                  category: tx.category || null
                }))
            } : null}
            onClose={() => setIsInvoiceDetailsModalOpen(false)}
            onPayInvoice={() => {
              setIsInvoiceDetailsModalOpen(false)
              if (cardForDetails) handleOpenPayInvoice(cardForDetails)
            }}
            onAnticipate={() => {
              setIsInvoiceDetailsModalOpen(false)
              if (cardForDetails) handleOpenAnticipate(cardForDetails)
            }}
          />
        </React.Suspense>
      )}

      {/* Modal de Liquidação / Pagamento de Fatura */}
      {isInvoicePaymentModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando pagamento..." />}>
          <InvoicePaymentModal
            isOpen={isInvoicePaymentModalOpen}
            card={cardForPayment}
            accounts={activeAccounts}
            onClose={() => setIsInvoicePaymentModalOpen(false)}
            onConfirmPayment={handleConfirmInvoicePayment}
            isLoading={Boolean(user && payInvoiceMutation.isPending)}
          />
        </React.Suspense>
      )}

      {/* Modal de Antecipação de Parcelas */}
      {isAnticipateModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando antecipação..." />}>
          <AnticipateInstallmentsModal
            isOpen={isAnticipateModalOpen}
            card={cardForAnticipate}
            futureInstallments={activeTransactions
              .filter(
                (tx) =>
                  tx.creditCardId === cardForAnticipate?.id &&
                  (tx.installmentCurrent || 1) > 1
              )
              .map((tx) => ({
                id: tx.id,
                description: tx.description || 'Parcela de compra',
                amount: Math.abs(tx.amount),
                installmentCurrent: tx.installmentCurrent,
                installmentTotal: tx.installmentTotal
              }))}
            onClose={() => setIsAnticipateModalOpen(false)}
            onConfirmAnticipation={handleConfirmAnticipation}
            isLoading={Boolean(user && anticipateMutation.isPending)}
          />
        </React.Suspense>
      )}

      {/* Modal de Exportação de Relatórios Financeiros (PDF / CSV) */}
      {isExportModalOpen && (
        <React.Suspense fallback={<ModalSuspenseFallback message="Carregando exportador..." />}>
          <ExportReportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            accounts={activeAccounts}
            existingTransactions={activeTransactions.map((tx) => ({
              id: tx.id,
              occurredAt: tx.occurred_at,
              description: tx.description,
              type: tx.type === 'income' ? 'income' : tx.type === 'transfer' ? 'transfer' : 'expense',
              categoryName: tx.category?.name,
              accountName: activeAccounts.find((a) => a.id === (tx.accountId || tx.account_id))?.name,
              creditCardName: activeCreditCards.find((c) => c.id === tx.creditCardId)?.name,
              installment:
                tx.installmentCurrent && tx.installmentTotal
                  ? `${tx.installmentCurrent}/${tx.installmentTotal}`
                  : undefined,
              status: tx.paid ? 'completed' : 'pending',
              paidAt: tx.paid ? tx.occurred_at : null,
              amount: Math.abs(tx.amount)
            }))}
            onExportPDF={async (filters) => {
              const data = await fetchPdfData(filters)
              setPrintData(data)
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  window.print()
                }
              }, 150)
            }}
          />
        </React.Suspense>
      )}
    </div>

      {/* Command Bar Global (Cmd+K / Ctrl+K) */}
      {isCommandPaletteOpen && (
        <React.Suspense fallback={null}>
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            accounts={activeAccounts}
            creditCards={activeCreditCards}
            categories={activeCategories}
            transactions={activeTransactions}
            resolvedTheme={resolvedTheme}
            viewMode={viewMode}
            onQuickCreateTransaction={async (parsed: ParsedNlpTransaction) => {
              if (!parsed.isValidTransaction || !parsed.amount) return
              await handleCreateTransaction({
                amount: parsed.amount,
                description: parsed.description,
                categoryId: parsed.categoryId,
                accountId: parsed.accountId || activeAccounts[0]?.id,
                creditCardId: parsed.creditCardId,
                occurredAt: parsed.occurredAt,
                status: 'completed',
                type: parsed.type
              })
              setIsCommandPaletteOpen(false)
            }}
            onOpenTransactionModal={(mode: TransactionMode, initialValues?: TransactionInitialValues) => {
              setTxMode(mode)
              setTxInitialValues(initialValues ?? null)
              setIsTxModalOcrInitial(false)
              setIsTxModalOpen(true)
            }}
            onSelectAccount={(accId) => setSelectedAccountId(accId)}
            onToggleTheme={toggleTheme}
            onOpenImportStatement={() => setIsImportModalOpen(true)}
            onOpenExportReport={() => setIsExportModalOpen(true)}
            onToggleViewMode={() => handleViewModeChange(viewMode === 'feed' ? 'calendar' : 'feed')}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          />
        </React.Suspense>
      )}

      {/* Copiloto Financeiro Conversacional */}
      {isCopilotOpen && (
        <React.Suspense fallback={null}>
          <CopilotDrawer
            isOpen={isCopilotOpen}
            onClose={() => setIsCopilotOpen(false)}
            onOpenAiSettings={() => setIsProfileModalOpen(true)}
            profileId={selectedProfileId}
          />
        </React.Suspense>
      )}

      {/* Container de Impressão Oficial (@media print) */}
      {printData && (
        <div className="print-only">
          <React.Suspense fallback={null}>
            <ReportPrintView data={printData} />
          </React.Suspense>
        </div>
      )}
    </>
    )
  }

  return (
    <>
      {renderMainView()}

      {/* Toaster Glassmorphism e Notificação de Atualização PWA com suporte ao Dual-Theme */}
      <div className="no-print">
        <SupportButton />
        <Toaster position="bottom-right" richColors theme={resolvedTheme} />
        <React.Suspense fallback={null}>
          <PwaUpdatePrompt />
        </React.Suspense>
      </div>
    </>
  )
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <MainApp />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
