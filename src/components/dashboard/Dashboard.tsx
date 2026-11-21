import React, { useState } from 'react'
import { formatBRL, formatTransactionDate } from '../../lib/formatters'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { QuickActions, ActionType } from './QuickActions'
import { AccountsBar } from './AccountsBar'
import { AiInsightsCard } from './AiInsightsCard'
import { CategoryDonutChart } from './CategoryDonutChart'
import { ForecastCard } from './ForecastCard'
import { FinancialCalendar } from './FinancialCalendar'
import { BudgetProgressWidget } from './BudgetProgressWidget'
import { CreditCardWidget } from '../cards/CreditCardWidget'
import { PushNotificationBanner } from './PushNotificationBanner'
import type { BudgetProgressItem } from '../../hooks/useBudgets'
import type { AccountItem } from '../../hooks/useAccounts'
import type { AiInsightData } from '../../hooks/useAiInsights'
import type { CreditCard as CreditCardItemType } from '../../types/database.types'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Check,
  Layers,
  Repeat,
  CreditCard,
  ArrowLeftRight,
  AlertCircle,
  Sparkles,
  List,
  Calendar,
  UploadCloud,
  Download
} from 'lucide-react'

export interface TransactionItem {
  id: string
  description: string | null
  amount: number
  paid: boolean
  occurred_at: string
  category?: {
    name: string
    color?: string | null
    icon?: string | null
  } | null
  categoryId?: string | null
  type?: string
  accountId?: string | null
  account_id?: string | null
  dueDate?: string | null
  paidAt?: string | null
  status?: 'completed' | 'pending' | 'cancelled'
  isRecurring?: boolean
  is_recurring?: boolean
  recurrencePeriod?: string | null
  recurrence_period?: string | null
  recurrenceDay?: number | null
  recurrence_day?: number | null
  adjustBusinessDay?: boolean
  adjust_business_day?: boolean
  installmentCurrent?: number | null
  installmentTotal?: number | null
  parentTransactionId?: string | null
  creditCardId?: string | null
  invoiceId?: string | null
}

export interface DashboardProps {
  totalBalance: number
  totalIncome: number
  totalExpense: number
  transactions: TransactionItem[]
  onActionClick: (action: ActionType) => void
  onActionHover?: (action: ActionType) => void
  isLoading?: boolean
  accounts?: AccountItem[]
  selectedAccountId?: string | null
  onSelectAccount?: (accountId: string | null) => void
  onNewAccount?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  totalCount?: number
  // Fase 4: Inteligência Financeira
  insight?: AiInsightData | null
  isAiLoading?: boolean
  isAiGenerating?: boolean
  onGenerateAiInsight?: () => void
  // Issue #29 & #39: Gestão de Vencimentos, Status e Baixa Rápida
  statusFilter?: 'all' | 'completed' | 'pending' | 'future'
  onStatusFilterChange?: (status: 'all' | 'completed' | 'pending' | 'future') => void
  onPayTransaction?: (transactionId: string) => void | Promise<void>
  // Issue #31: Orçamentos Mensais por Categoria
  budgets?: BudgetProgressItem[]
  budgetSummary?: {
    totalBudgetLimit: number
    totalSpent: number
    totalRemaining: number
    overallPercentageUsed: number
  } | null
  onOpenBudgetModal?: () => void
  isBudgetsLoading?: boolean
  onImportStatement?: () => void
  onExportReport?: () => void
  // Issue #53: Gestão Avançada de Cartões de Crédito e Faturas
  creditCards?: CreditCardItemType[]
  isCreditCardsLoading?: boolean
  onOpenCreateCreditCard?: () => void
  onOpenInvoiceDetails?: (card: CreditCardItemType) => void
  onOpenPayInvoice?: (card: CreditCardItemType) => void
  onOpenAnticipate?: (card: CreditCardItemType) => void
}

const getDueStatus = (dueDateStr?: string | null) => {
  if (!dueDateStr) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const due = new Date(dueDateStr)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  const diffDays = Math.round((dueDay - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: 'Atrasado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
  }
  if (diffDays === 0) {
    return { label: 'Vence Hoje', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
  }
  if (diffDays === 1) {
    return { label: 'Vence amanhã', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' }
  }
  return { label: `Vence em ${diffDays}d`, color: 'bg-muted/50 text-muted-foreground border-border' }
}

export const Dashboard: React.FC<DashboardProps> = ({
  totalBalance,
  totalIncome,
  totalExpense,
  transactions,
  onActionClick,
  onActionHover,
  isLoading = false,
  accounts = [],
  selectedAccountId = null,
  onSelectAccount,
  onNewAccount,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  totalCount,
  statusFilter,
  onStatusFilterChange,
  onPayTransaction,
  insight = null,
  isAiLoading = false,
  isAiGenerating = false,
  onGenerateAiInsight,
  budgets,
  budgetSummary,
  onOpenBudgetModal,
  isBudgetsLoading = false,
  onImportStatement,
  onExportReport,
  creditCards,
  isCreditCardsLoading = false,
  onOpenCreateCreditCard,
  onOpenInvoiceDetails,
  onOpenPayInvoice,
  onOpenAnticipate
}) => {
  const [internalStatusFilter, setInternalStatusFilter] = useState<'all' | 'completed' | 'pending' | 'future'>('all')
  const activeStatusFilter = statusFilter !== undefined ? statusFilter : internalStatusFilter

  const [viewMode, setViewMode] = useState<'feed' | 'calendar'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dinheirizz_view_mode')
      if (saved === 'calendar' || saved === 'feed') return saved
    }
    return 'feed'
  })

  const handleViewModeChange = (mode: 'feed' | 'calendar') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dinheirizz_view_mode', mode)
    }
  }

  const handleStatusChange = (newStatus: 'all' | 'completed' | 'pending' | 'future') => {
    setInternalStatusFilter(newStatus)
    onStatusFilterChange?.(newStatus)
  }

  const selectedAccount = selectedAccountId
    ? accounts.find((a) => a.id === selectedAccountId)
    : null

  const totalAccountsBalance = accounts.length > 0
    ? accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
    : totalBalance

  const displayBalance = selectedAccount ? selectedAccount.balance : totalAccountsBalance
  const displayTitle = selectedAccount
    ? `Saldo da conta ${selectedAccount.name}`
    : 'Saldo total disponível'

  const now = new Date()
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const futureCount = transactions.filter((t) => {
    const targetTime = new Date(t.dueDate || t.occurred_at).getTime()
    return targetTime > endOfCurrentMonth.getTime()
  }).length

  const filteredTransactions = transactions
    .filter((t) => {
      if (selectedAccountId && (t.accountId || t.account_id) !== selectedAccountId) {
        return false
      }
      const isCompleted = t.status === 'completed' || (t.status === undefined && t.paid === true)
      const targetTime = new Date(t.dueDate || t.occurred_at).getTime()
      const isFuture = targetTime > endOfCurrentMonth.getTime()

      if (activeStatusFilter === 'future') {
        return isFuture
      }
      if (activeStatusFilter === 'completed') {
        return isCompleted && !isFuture
      }
      if (activeStatusFilter === 'pending') {
        return !isCompleted && !isFuture
      }
      return !isFuture
    })
    .slice()
    .sort((a, b) => {
      if (activeStatusFilter === 'future') {
        const timeA = new Date(a.dueDate || a.occurred_at).getTime()
        const timeB = new Date(b.dueDate || b.occurred_at).getTime()
        return timeA - timeB
      }
      return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    })

  let displayIncome = totalIncome
  let displayExpense = totalExpense

  if (selectedAccountId) {
    displayIncome = 0
    displayExpense = 0
    for (const t of filteredTransactions) {
      if (t.amount > 0) displayIncome += t.amount
      else displayExpense += Math.abs(t.amount)
    }
  }

  // Cálculo de receitas e despesas pendentes para Saldo Previsto e Visão Geral
  let pendingIncome = 0
  let pendingExpense = 0
  let pendingIncomeCount = 0
  let pendingExpenseCount = 0

  for (const t of transactions) {
    if (selectedAccountId && (t.accountId || t.account_id) !== selectedAccountId) {
      continue
    }
    const isPending = !t.paid || t.status === 'pending'
    if (isPending) {
      if (t.amount > 0 || t.type === 'income') {
        pendingIncome += Math.abs(t.amount)
        pendingIncomeCount++
      } else {
        pendingExpense += Math.abs(t.amount)
        pendingExpenseCount++
      }
    }
  }

  const projectedBalance = displayBalance + pendingIncome - pendingExpense

  // Resumo de contas de crédito e transferências
  const creditAccounts = accounts.filter((a) => a.type === 'credit')
  const creditCardTotal = creditAccounts.reduce((sum, a) => sum + Math.abs(Number(a.balance) || 0), 0)

  const transferTransactions = transactions.filter(
    (t) => t.type === 'transfer' || (t.category?.name && t.category.name.toLowerCase().includes('transfer'))
  )
  const transferTotal = transferTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const transferCount = transferTransactions.length

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-5 sm:space-y-6 animate-fade-in pb-12">
        {/* Skeleton Saldo Principal */}
        <div className="glass-card p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-border animate-pulse">
          <div className="w-32 h-4 bg-muted rounded mb-4" />
          <div className="w-64 h-12 bg-muted rounded-xl mb-6" />
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3 pt-4 border-t border-border">
            <div className="h-12 bg-muted/50 rounded-xl" />
            <div className="h-12 bg-muted/50 rounded-xl" />
          </div>
        </div>

        {/* Skeleton Ações Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 glass-card rounded-2xl border border-border animate-pulse" />
          ))}
        </div>

        {/* Skeleton Extrato */}
        <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border space-y-4">
          <div className="w-40 h-5 bg-muted rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 sm:space-y-6 animate-fade-in pb-12">
      {/* Banner de Notificações Pró-Ativas Web Push */}
      <PushNotificationBanner />

      {/* Saldo Principal Card */}
      <div className="relative overflow-hidden glass-card-glow p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-border shadow-2xl">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {displayTitle}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <TrendingUp className="w-3 h-3" />
            Ativo
          </span>
        </div>

        {/* Valor de Destaque */}
        <div className="mb-4 sm:mb-6">
          <h2
            data-testid="main-balance-value"
            className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground font-display break-words"
          >
            <AnimatedNumber value={displayBalance} formatter={formatBRL} />
          </h2>

          {/* Saldo Previsto (com impacto das pendências do mês) */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/50 border border-border text-xs">
              <span className="text-muted-foreground font-medium">Saldo Previsto:</span>
              <span
                data-testid="projected-balance-value"
                className="font-bold text-foreground tabular-nums font-display"
              >
                <AnimatedNumber value={projectedBalance} formatter={formatBRL} />
              </span>
            </div>
            {projectedBalance !== displayBalance && (
              <span className="text-[11px] text-muted-foreground font-medium">
                {projectedBalance >= displayBalance
                  ? `(+${formatBRL(projectedBalance - displayBalance)} com pendências)`
                  : `(-${formatBRL(displayBalance - projectedBalance)} a liquidar)`}
              </span>
            )}
          </div>
        </div>

        {/* Resumo de Entradas e Saídas - Grid Adaptável com Proteção contra Achatamento */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-3.5 sm:pt-4 border-t border-border">
          <div className="flex items-center gap-2.5 sm:gap-3 p-3 rounded-2xl bg-card border border-border backdrop-blur-md min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary flex-shrink-0">
              <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs text-muted-foreground block truncate">Receitas do Mês</span>
              <span className="text-xs sm:text-base font-semibold text-primary block truncate tabular-nums">
                <AnimatedNumber value={displayIncome} formatter={formatBRL} />
              </span>
              {pendingIncome > 0 && (
                <span className="text-[10px] text-primary/80 block truncate font-medium">
                  +{formatBRL(pendingIncome)} a receber
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 p-3 rounded-2xl bg-card border border-border backdrop-blur-md min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs text-muted-foreground block truncate">Despesas do Mês</span>
              <span className="text-xs sm:text-base font-semibold text-rose-400 block truncate tabular-nums">
                <AnimatedNumber value={displayExpense} formatter={formatBRL} />
              </span>
              {pendingExpense > 0 && (
                <span className="text-[10px] text-rose-400/80 block truncate font-medium">
                  {formatBRL(pendingExpense)} a pagar
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bloco de Visão Geral (Compromissos, Cartões e Balanços) */}
      <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-muted border border-border flex items-center justify-center text-primary">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Visão Geral</h3>
              <p className="text-[11px] text-muted-foreground">Compromissos e movimentações do período</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* A Pagar (Despesas Pendentes) */}
          <div className="p-3 rounded-2xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">A Pagar</span>
              <span className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-3 h-3" />
              </span>
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-rose-400 block tabular-nums">
                <AnimatedNumber value={pendingExpense} formatter={formatBRL} />
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {pendingExpenseCount} conta{pendingExpenseCount !== 1 ? 's' : ''} a vencer
              </span>
            </div>
          </div>

          {/* A Receber (Receitas Pendentes) */}
          <div className="p-3 rounded-2xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">A Receber</span>
              <span className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <ArrowDownLeft className="w-3 h-3" />
              </span>
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-primary block tabular-nums">
                <AnimatedNumber value={pendingIncome} formatter={formatBRL} />
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {pendingIncomeCount} entrada{pendingIncomeCount !== 1 ? 's' : ''} prevista{pendingIncomeCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Cartão de Crédito */}
          <div className="p-3 rounded-2xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">Cartão de Crédito</span>
              <span className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <CreditCard className="w-3 h-3" />
              </span>
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-foreground block tabular-nums">
                <AnimatedNumber value={creditCardTotal} formatter={formatBRL} />
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {creditAccounts.length > 0
                  ? creditAccounts.length === 1
                    ? '1 cartão vinculado'
                    : `${creditAccounts.length} cartões vinculados`
                  : 'Sem faturas em aberto'}
              </span>
            </div>
          </div>

          {/* Balanço de Transferências */}
          <div className="p-3 rounded-2xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">Transferências</span>
              <span className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <ArrowLeftRight className="w-3 h-3" />
              </span>
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-blue-400 block tabular-nums">
                <AnimatedNumber value={transferTotal} formatter={formatBRL} />
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {transferCount === 1 ? '1 transferência' : `${transferCount} transferências`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Previsão de Saldo & Fluxo de Caixa (Forecast 30/60 dias - Issue #30) */}
      <ForecastCard accountId={selectedAccountId} />

      {/* Distribuição por Categoria (Gráfico em Aro / Donut - Pierre & Minhas Finanças benchmark) */}
      <CategoryDonutChart transactions={filteredTransactions} />

      {/* Orçamentos Mensais por Categoria (Budget Envelopes - Issue #31) */}
      {(budgets !== undefined || onOpenBudgetModal) && (
        <BudgetProgressWidget
          budgets={budgets || []}
          totalBudgetLimit={budgetSummary?.totalBudgetLimit || 0}
          totalSpent={budgetSummary?.totalSpent || 0}
          totalRemaining={budgetSummary?.totalRemaining || 0}
          overallPercentageUsed={budgetSummary?.overallPercentageUsed || 0}
          onOpenBudgetModal={onOpenBudgetModal || (() => {})}
          isLoading={isBudgetsLoading}
        />
      )}

      {/* Barra de Contas */}
      {accounts.length > 0 && onSelectAccount && onNewAccount && (
        <AccountsBar
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={onSelectAccount}
          onNewAccount={onNewAccount}
        />
      )}

      {/* Cartões de Crédito e Faturas (Issue #53) */}
      {(creditCards !== undefined || onOpenCreateCreditCard !== undefined) && (
        <CreditCardWidget
          cards={creditCards || []}
          isLoading={isCreditCardsLoading}
          onOpenCreateCard={onOpenCreateCreditCard || (() => {})}
          onOpenInvoiceDetails={onOpenInvoiceDetails}
          onOpenPayInvoice={onOpenPayInvoice}
          onOpenAnticipate={onOpenAnticipate}
        />
      )}

      {/* Ações Rápidas */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
          Ações Rápidas
        </h3>
        <QuickActions onAction={onActionClick} onHover={onActionHover} />
      </div>

      {/* Consultor Financeiro com IA (Fase 4) */}
      {(insight || isAiLoading) && (
        <AiInsightsCard
          insight={insight}
          isLoading={isAiLoading}
          isGenerating={isAiGenerating}
          onGenerate={onGenerateAiInsight}
        />
      )}

      {/* Seletor de Modo de Visualização: Feed vs Calendário */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Movimentações
          </h3>
          {onImportStatement && (
            <button
              type="button"
              data-testid="dashboard-import-btn"
              onClick={onImportStatement}
              className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Importar Extrato</span>
            </button>
          )}
          {onExportReport && (
            <button
              type="button"
              data-testid="dashboard-export-report-btn"
              onClick={onExportReport}
              className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Exportar Relatório</span>
            </button>
          )}
        </div>
        <div className="flex p-0.5 bg-muted/50 border border-border rounded-xl">
          <button
            type="button"
            data-testid="view-feed-btn"
            onClick={() => handleViewModeChange('feed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'feed'
                ? 'bg-background text-foreground shadow-sm font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Feed</span>
          </button>
          <button
            type="button"
            data-testid="view-calendar-btn"
            onClick={() => handleViewModeChange('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendário</span>
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <FinancialCalendar
          transactions={transactions}
          currentBalance={displayBalance}
          onPayTransaction={onPayTransaction}
        />
      ) : (
        /* Extrato Recente */
        <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Últimas Movimentações
            </h3>
            <span className="text-xs text-muted-foreground">
              {totalCount && totalCount > filteredTransactions.length
                ? `${filteredTransactions.length} de ${totalCount} registros`
                : `${filteredTransactions.length} registros`}
            </span>
          </div>

          {/* Abas de Filtro por Status */}
          <div className="flex p-0.5 bg-muted/50 border border-border rounded-xl self-start sm:self-auto">
            <button
              type="button"
              data-testid="filter-all-btn"
              onClick={() => handleStatusChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeStatusFilter === 'all'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              data-testid="filter-completed-btn"
              onClick={() => handleStatusChange('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeStatusFilter === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Concluídas
            </button>
            <button
              type="button"
              data-testid="filter-pending-btn"
              onClick={() => handleStatusChange('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeStatusFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pendentes
            </button>
            <button
              type="button"
              data-testid="filter-future-btn"
              onClick={() => handleStatusChange('future')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStatusFilter === 'future'
                  ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Futuras</span>
              {futureCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-primary/20 text-primary rounded-full font-bold">
                  {futureCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Nenhuma transação recente encontrada.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTransactions.map((t) => {
              const isIncome = t.amount > 0
              const isPending = !t.paid || t.status === 'pending'
              const dueStatus = isPending ? getDueStatus(t.dueDate) : null

              return (
                <div
                  key={t.id}
                  data-testid="transaction-item"
                  className="py-3 sm:py-3.5 flex items-center justify-between hover:bg-muted/40 px-2 rounded-xl transition-colors gap-3"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border text-sm font-semibold flex-shrink-0 ${
                        isIncome
                          ? 'bg-primary/10 border-primary/20 text-primary'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {t.description || 'Transação sem descrição'}
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap">
                          {formatTransactionDate(t.occurred_at)}
                        </span>
                        {t.category && (
                          <span
                            className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-medium border truncate max-w-[120px]"
                            style={{
                              backgroundColor: t.category.color ? `${t.category.color}20` : 'rgba(255,255,255,0.05)',
                              borderColor: t.category.color ? `${t.category.color}40` : 'rgba(255,255,255,0.1)',
                              color: t.category.color || '#e5e7eb'
                            }}
                          >
                            {t.category.name}
                          </span>
                        )}
                        {/* Badges semânticas contextuais */}
                        {dueStatus && (
                          <span
                            className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-semibold border ${dueStatus.color}`}
                          >
                            {dueStatus.label}
                          </span>
                        )}
                        {t.installmentTotal && (
                          <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-medium bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" />
                            <span>{t.installmentCurrent || 1}/{t.installmentTotal}</span>
                          </span>
                        )}
                        {t.isRecurring && (
                          <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5" />
                            <span className="hidden xs:inline">Recorrente</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-2 flex flex-col items-end">
                    <span
                      className={`text-xs sm:text-base font-semibold tabular-nums block ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : ''}
                      {formatBRL(t.amount)}
                    </span>
                    <span className="block text-[10px] sm:text-[11px] text-muted-foreground">
                      {isPending ? 'Pendente' : 'Concluído'}
                    </span>
                    {onPayTransaction && isPending && (
                      <button
                        type="button"
                        data-testid={`pay-tx-btn-${t.id}`}
                        onClick={() => onPayTransaction(t.id)}
                        className="mt-1.5 min-h-[28px] px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                        title="Marcar como liquidada / dar baixa"
                      >
                        <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                        <span>Dar Baixa</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Skeleton incremental ao carregar mais páginas */}
            {isLoadingMore && (
              <div className="py-2 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="py-3 px-2 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-muted/60" />
                      <div className="space-y-1.5">
                        <div className="w-32 h-3.5 bg-muted rounded" />
                        <div className="w-20 h-2.5 bg-muted/60 rounded" />
                      </div>
                    </div>
                    <div className="w-16 h-4 bg-muted rounded" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rodapé da Lista: Botão Carregar Mais ou Aviso de Fim */}
        {filteredTransactions.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border flex flex-col items-center justify-center gap-2">
            {hasMore ? (
              <button
                type="button"
                data-testid="load-more-btn"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-muted/50 hover:bg-muted border border-border text-foreground font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span>Carregando movimentações...</span>
                  </>
                ) : (
                  <span>Carregar mais movimentações</span>
                )}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground font-medium">
                Você visualizou todas as {totalCount ?? filteredTransactions.length} movimentações
              </p>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
