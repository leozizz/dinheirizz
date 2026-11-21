import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  accounts,
  budgets,
  categories,
  creditCards,
  invoices,
  transactions
} from '../db/schema'
import { mockAccountsStore } from '../routes/accounts'
import { mockBudgetsStore } from '../routes/budgets'
import { DEFAULT_CATEGORIES, mockCategoriesStore } from '../routes/categories'
import { mockCreditCardsStore, mockInvoicesStore } from '../routes/creditCards'
import { mockTransactionsStore } from '../routes/transactions'
import { calculateCashFlowForecast, type TransactionForecastInput } from './forecast'

export interface CopilotAccountSummary {
  id: string
  name: string
  type: string
  balance: number
}

export interface CopilotCategorySummary {
  id: string
  name: string
  type: string
}

export interface CopilotInvoiceSummary {
  cardName: string
  period: string
  amount: number
  status: string
  dueDate: string
}

export interface CopilotBudgetSummary {
  categoryId: string
  categoryName: string
  amountLimit: number
  spentAmount: number
  remainingAmount: number
  percentageUsed: number
}

export interface CopilotCategorySpending {
  categoryName: string
  totalAmount: number
  count: number
}

export interface CopilotContextSummary {
  period: string
  totalBalance: number
  accounts: CopilotAccountSummary[]
  categories: CopilotCategorySummary[]
  openInvoices: CopilotInvoiceSummary[]
  budgets: CopilotBudgetSummary[]
  forecast30d: {
    projectedEndBalance: number
    lowestPointBalance: number
    lowestPointDate: string
    healthStatus: 'safe' | 'warning' | 'danger'
  }
  forecast60d: {
    projectedEndBalance: number
    lowestPointBalance: number
    lowestPointDate: string
    healthStatus: 'safe' | 'warning' | 'danger'
  }
  last60dSpendingByCategory: CopilotCategorySpending[]
  topDescriptionsLast60d: Array<{ description: string; totalAmount: number; count: number }>
}

export interface QueryTransactionsArgs {
  days?: number
  startDate?: string
  endDate?: string
  categoryName?: string
  searchText?: string
}

export interface QueryTransactionsResult {
  count: number
  totalAmount: number
  periodLabel: string
  sample: Array<{
    description: string
    amount: number
    type: string
    categoryName: string
    occurredAt: string
  }>
}

export interface SimulateCashflowArgs {
  totalAmount: number
  installments: number
  type: 'expense' | 'income'
}

export interface SimulateCashflowResult {
  totalAmount: number
  installments: number
  installmentValue: number
  projectedMinBalance30d: number
  projectedMinBalance60d: number
  willGoNegative: boolean
}

interface InternalTxRecord {
  id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  description: string
  categoryId: string | null
  paid: boolean
  status: string
  occurredAt: string
  dueDate: string | null
  isRecurring: boolean
  recurrenceDay: number | null
  adjustBusinessDay: boolean
}

const getCurrentPeriod = (): string => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const loadUserFinancialData = async (
  userId: string,
  profileId?: string | null
): Promise<{
  userAccounts: CopilotAccountSummary[]
  userCategories: CopilotCategorySummary[]
  userTransactions: InternalTxRecord[]
  userInvoices: CopilotInvoiceSummary[]
  userBudgets: Array<{ categoryId: string; amountLimit: number; period: string }>
}> => {
  const db = getDb()

  if (!db) {
    const userAccounts = Array.from(mockAccountsStore.values())
      .filter((a) => a.userId === userId && (!profileId || a.profileId === profileId))
      .map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: Number.parseFloat(a.balance) || 0
      }))

    const customCategories = Array.from(mockCategoriesStore.values()).filter(
      (cat) => !cat.userId || cat.userId === userId
    )
    const userCategories: CopilotCategorySummary[] = (
      customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES
    ).map((cat) => ({
      id: cat.id,
      name: cat.name,
      type: cat.type
    }))

    const userTransactions: InternalTxRecord[] = Array.from(mockTransactionsStore.values())
      .filter((t) => t.userId === userId && (!profileId || t.profileId === profileId))
      .map((t) => {
        const numAmount = Number.parseFloat(t.amount) || 0
        const inferredType: 'income' | 'expense' | 'transfer' =
          t.type ?? (numAmount >= 0 ? 'income' : 'expense')
        return {
          id: t.id,
          amount: numAmount,
          type: inferredType,
          description: t.description ?? 'Sem descrição',
          categoryId: t.categoryId ?? null,
          paid: Boolean(t.paid),
          status: t.status ?? (t.paid ? 'completed' : 'pending'),
          occurredAt: t.occurredAt || t.createdAt,
          dueDate: t.dueDate ?? null,
          isRecurring: Boolean(t.isRecurring),
          recurrenceDay: t.recurrenceDay ?? null,
          adjustBusinessDay: Boolean(t.adjustBusinessDay)
        }
      })

    const cardsById = new Map(
      Array.from(mockCreditCardsStore.values())
        .filter((card) => card.userId === userId && (!profileId || card.profileId === profileId))
        .map((card) => [card.id, card])
    )

    const userInvoices: CopilotInvoiceSummary[] = Array.from(mockInvoicesStore.values())
      .filter((inv) => inv.userId === userId && inv.status !== 'paid')
      .map((inv) => ({
        cardName: cardsById.get(inv.creditCardId)?.name ?? 'Cartão',
        period: inv.period,
        amount: Number.parseFloat(inv.amount) || 0,
        status: inv.status,
        dueDate: inv.dueDate
      }))

    const userBudgets = Array.from(mockBudgetsStore.values())
      .filter((b) => b.userId === userId && (!profileId || b.profileId === profileId))
      .map((b) => ({
        categoryId: b.categoryId,
        amountLimit: Number.parseFloat(b.amountLimit) || 0,
        period: b.period
      }))

    return { userAccounts, userCategories, userTransactions, userInvoices, userBudgets }
  }

  const accountConditions = [eq(accounts.userId, userId)]
  if (profileId) accountConditions.push(eq(accounts.profileId, profileId))
  const dbAccounts = await db
    .select({ id: accounts.id, name: accounts.name, type: accounts.type, balance: accounts.balance })
    .from(accounts)
    .where(and(...accountConditions))

  const userAccounts: CopilotAccountSummary[] = dbAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number.parseFloat(a.balance) || 0
  }))

  const dbCategories = await db
    .select({ id: categories.id, name: categories.name, type: categories.type })
    .from(categories)
    .where(eq(categories.userId, userId))

  const userCategories: CopilotCategorySummary[] =
    dbCategories.length > 0
      ? dbCategories
      : DEFAULT_CATEGORIES.map((cat) => ({ id: cat.id, name: cat.name, type: cat.type }))

  const txConditions = [eq(transactions.userId, userId)]
  if (profileId) txConditions.push(eq(transactions.profileId, profileId))
  const dbTx = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      description: transactions.description,
      categoryId: transactions.categoryId,
      paid: transactions.paid,
      status: transactions.status,
      occurredAt: transactions.occurredAt,
      dueDate: transactions.dueDate,
      isRecurring: transactions.isRecurring,
      recurrenceDay: transactions.recurrenceDay,
      adjustBusinessDay: transactions.adjustBusinessDay,
      createdAt: transactions.createdAt
    })
    .from(transactions)
    .where(and(...txConditions))
    .orderBy(desc(transactions.occurredAt))
    .limit(500)

  const userTransactions: InternalTxRecord[] = dbTx.map((t) => {
    const numAmount = Number.parseFloat(t.amount) || 0
    const inferredType: 'income' | 'expense' | 'transfer' =
      numAmount >= 0 ? 'income' : 'expense'

    return {
      id: t.id,
      amount: numAmount,
      type: inferredType,
      description: t.description ?? 'Sem descrição',
      categoryId: t.categoryId ?? null,
      paid: Boolean(t.paid),
      status: t.status ?? (t.paid ? 'completed' : 'pending'),
      occurredAt: (t.occurredAt ?? t.createdAt).toISOString(),
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      isRecurring: Boolean(t.isRecurring),
      recurrenceDay: t.recurrenceDay ?? null,
      adjustBusinessDay: Boolean(t.adjustBusinessDay)
    }
  })

  const cardConditions = [eq(creditCards.userId, userId)]
  if (profileId) cardConditions.push(eq(creditCards.profileId, profileId))
  const dbCards = await db
    .select({ id: creditCards.id, name: creditCards.name })
    .from(creditCards)
    .where(and(...cardConditions))
  const cardsById = new Map(dbCards.map((c) => [c.id, c.name]))

  const dbInvoices = await db
    .select({
      creditCardId: invoices.creditCardId,
      period: invoices.period,
      amount: invoices.amount,
      status: invoices.status,
      dueDate: invoices.dueDate
    })
    .from(invoices)
    .where(eq(invoices.userId, userId))

  const userInvoices: CopilotInvoiceSummary[] = dbInvoices
    .filter((inv) => inv.status !== 'paid')
    .map((inv) => ({
      cardName: cardsById.get(inv.creditCardId) ?? 'Cartão',
      period: inv.period,
      amount: Number.parseFloat(inv.amount) || 0,
      status: inv.status,
      dueDate: inv.dueDate.toISOString().slice(0, 10)
    }))

  const budgetConditions = [eq(budgets.userId, userId)]
  if (profileId) budgetConditions.push(eq(budgets.profileId, profileId))
  const dbBudgets = await db
    .select({
      categoryId: budgets.categoryId,
      amountLimit: budgets.amountLimit,
      period: budgets.period
    })
    .from(budgets)
    .where(and(...budgetConditions))

  const userBudgets = dbBudgets.map((b) => ({
    categoryId: b.categoryId,
    amountLimit: Number.parseFloat(b.amountLimit) || 0,
    period: b.period
  }))

  return { userAccounts, userCategories, userTransactions, userInvoices, userBudgets }
}

const splitForecastInputs = (
  txs: InternalTxRecord[]
): { historyTxList: TransactionForecastInput[]; pendingTxList: TransactionForecastInput[] } => {
  const historyTxList: TransactionForecastInput[] = []
  const pendingTxList: TransactionForecastInput[] = []

  for (const t of txs) {
    const isPaid = t.paid && t.status !== 'pending'
    const isPending = t.status === 'pending' || !t.paid
    const item: TransactionForecastInput = {
      id: t.id,
      amount: t.amount,
      type: t.type,
      paid: t.paid,
      status: t.status,
      dueDate: t.dueDate,
      occurredAt: t.occurredAt,
      isRecurring: t.isRecurring,
      recurrenceDay: t.recurrenceDay,
      adjustBusinessDay: t.adjustBusinessDay
    }

    if (isPaid) {
      historyTxList.push(item)
    } else if (isPending && t.status !== 'cancelled') {
      pendingTxList.push(item)
    }
  }

  return { historyTxList, pendingTxList }
}

export const buildCopilotContext = async (options: {
  userId: string
  period?: string
  profileId?: string | null
}): Promise<CopilotContextSummary> => {
  const period = options.period || getCurrentPeriod()
  const data = await loadUserFinancialData(options.userId, options.profileId)

  const totalBalance =
    Math.round(data.userAccounts.reduce((sum, a) => sum + a.balance, 0) * 100) / 100
  const categoryMap = new Map(data.userCategories.map((c) => [c.id, c.name]))

  const now = new Date()
  const cutoff60d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const categoryTotals = new Map<string, { totalAmount: number; count: number }>()
  const descriptionTotals = new Map<string, { totalAmount: number; count: number }>()
  const monthSpentByCategory = new Map<string, number>()

  for (const tx of data.userTransactions) {
    if (tx.status === 'cancelled') continue
    const txDate = new Date(tx.occurredAt)
    const isExpense = tx.type === 'expense' || tx.amount < 0
    const absAmount = Math.abs(tx.amount)

    if (isExpense && txDate >= cutoff60d) {
      const catName = (tx.categoryId && categoryMap.get(tx.categoryId)) || 'Outros'
      const currentCat = categoryTotals.get(catName) ?? { totalAmount: 0, count: 0 }
      categoryTotals.set(catName, {
        totalAmount: Math.round((currentCat.totalAmount + absAmount) * 100) / 100,
        count: currentCat.count + 1
      })

      const descKey = tx.description.trim().slice(0, 60)
      const currentDesc = descriptionTotals.get(descKey) ?? { totalAmount: 0, count: 0 }
      descriptionTotals.set(descKey, {
        totalAmount: Math.round((currentDesc.totalAmount + absAmount) * 100) / 100,
        count: currentDesc.count + 1
      })
    }

    if (isExpense && tx.occurredAt.slice(0, 7) === period && tx.categoryId) {
      const prev = monthSpentByCategory.get(tx.categoryId) ?? 0
      monthSpentByCategory.set(tx.categoryId, Math.round((prev + absAmount) * 100) / 100)
    }
  }

  const budgetsSummary: CopilotBudgetSummary[] = data.userBudgets
    .filter((b) => b.period === period || b.period === 'monthly')
    .map((b) => {
      const spentAmount = monthSpentByCategory.get(b.categoryId) ?? 0
      const remainingAmount = Math.round((b.amountLimit - spentAmount) * 100) / 100
      const percentageUsed =
        b.amountLimit > 0 ? Math.round((spentAmount / b.amountLimit) * 1000) / 10 : 0
      return {
        categoryId: b.categoryId,
        categoryName: categoryMap.get(b.categoryId) ?? 'Categoria',
        amountLimit: b.amountLimit,
        spentAmount,
        remainingAmount,
        percentageUsed
      }
    })

  const { historyTxList, pendingTxList } = splitForecastInputs(data.userTransactions)
  const forecast30 = calculateCashFlowForecast({
    startingBalance: totalBalance,
    days: 30,
    historyTransactions: historyTxList,
    pendingTransactions: pendingTxList
  })
  const forecast60 = calculateCashFlowForecast({
    startingBalance: totalBalance,
    days: 60,
    historyTransactions: historyTxList,
    pendingTransactions: pendingTxList
  })

  const last60dSpendingByCategory = Array.from(categoryTotals.entries())
    .map(([categoryName, info]) => ({
      categoryName,
      totalAmount: info.totalAmount,
      count: info.count
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10)

  const topDescriptionsLast60d = Array.from(descriptionTotals.entries())
    .map(([description, info]) => ({
      description,
      totalAmount: info.totalAmount,
      count: info.count
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10)

  return {
    period,
    totalBalance,
    accounts: data.userAccounts,
    categories: data.userCategories,
    openInvoices: data.userInvoices,
    budgets: budgetsSummary,
    forecast30d: {
      projectedEndBalance: forecast30.projectedEndBalance,
      lowestPointBalance: forecast30.lowestPoint.balance,
      lowestPointDate: forecast30.lowestPoint.date,
      healthStatus: forecast30.healthStatus
    },
    forecast60d: {
      projectedEndBalance: forecast60.projectedEndBalance,
      lowestPointBalance: forecast60.lowestPoint.balance,
      lowestPointDate: forecast60.lowestPoint.date,
      healthStatus: forecast60.healthStatus
    },
    last60dSpendingByCategory,
    topDescriptionsLast60d
  }
}

export const executeQueryTransactions = async (
  userId: string,
  args: QueryTransactionsArgs,
  profileId?: string | null
): Promise<QueryTransactionsResult> => {
  const data = await loadUserFinancialData(userId, profileId)
  const categoryMap = new Map(data.userCategories.map((c) => [c.id, c.name]))

  const days = typeof args.days === 'number' && args.days > 0 ? Math.min(args.days, 365) : 60
  const now = new Date()
  const startBoundary = args.startDate
    ? new Date(`${args.startDate}T00:00:00.000Z`)
    : new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const endBoundary = args.endDate ? new Date(`${args.endDate}T23:59:59.999Z`) : now

  const normalizedCategory = args.categoryName ? normalizeText(args.categoryName) : null
  const normalizedSearch = args.searchText ? normalizeText(args.searchText) : null

  const filtered = data.userTransactions.filter((tx) => {
    if (tx.status === 'cancelled') return false
    const txDate = new Date(tx.occurredAt)
    if (txDate < startBoundary || txDate > endBoundary) return false

    const catName = (tx.categoryId && categoryMap.get(tx.categoryId)) || 'Outros'
    if (normalizedCategory && !normalizeText(catName).includes(normalizedCategory)) {
      return false
    }

    if (
      normalizedSearch &&
      !normalizeText(tx.description).includes(normalizedSearch) &&
      !normalizeText(catName).includes(normalizedSearch)
    ) {
      return false
    }

    return true
  })

  const totalAmount =
    Math.round(filtered.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) * 100) / 100

  return {
    count: filtered.length,
    totalAmount,
    periodLabel: args.startDate && args.endDate ? `${args.startDate} a ${args.endDate}` : `últimos ${days} dias`,
    sample: filtered.slice(0, 15).map((tx) => ({
      description: tx.description,
      amount: Math.round(Math.abs(tx.amount) * 100) / 100,
      type: tx.type,
      categoryName: (tx.categoryId && categoryMap.get(tx.categoryId)) || 'Outros',
      occurredAt: tx.occurredAt.slice(0, 10)
    }))
  }
}

export const executeSimulateCashflowImpact = async (
  userId: string,
  args: SimulateCashflowArgs,
  profileId?: string | null
): Promise<SimulateCashflowResult> => {
  const data = await loadUserFinancialData(userId, profileId)
  const totalBalance =
    Math.round(data.userAccounts.reduce((sum, a) => sum + a.balance, 0) * 100) / 100
  const { historyTxList, pendingTxList } = splitForecastInputs(data.userTransactions)

  const installments = Math.max(1, Math.floor(args.installments || 1))
  const totalAmount = Math.max(0.01, Number(args.totalAmount) || 0)
  const installmentValue = Math.round((totalAmount / installments) * 100) / 100
  const signedInstallment = args.type === 'income' ? installmentValue : -installmentValue

  const now = new Date()
  const simulatedPending: TransactionForecastInput[] = [...pendingTxList]

  for (let i = 0; i < installments; i++) {
    const dueDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, Math.min(28, now.getUTCDate()))
    )
    simulatedPending.push({
      id: `sim-installment-${i + 1}`,
      amount: signedInstallment,
      type: args.type,
      paid: false,
      status: 'pending',
      dueDate: dueDate.toISOString(),
      occurredAt: dueDate.toISOString(),
      isRecurring: false
    })
  }

  const forecast30 = calculateCashFlowForecast({
    startingBalance: totalBalance,
    days: 30,
    historyTransactions: historyTxList,
    pendingTransactions: simulatedPending
  })
  const forecast60 = calculateCashFlowForecast({
    startingBalance: totalBalance,
    days: 60,
    historyTransactions: historyTxList,
    pendingTransactions: simulatedPending
  })

  const projectedMinBalance30d = forecast30.lowestPoint.balance
  const projectedMinBalance60d = forecast60.lowestPoint.balance

  return {
    totalAmount,
    installments,
    installmentValue,
    projectedMinBalance30d,
    projectedMinBalance60d,
    willGoNegative: projectedMinBalance30d < 0 || projectedMinBalance60d < 0
  }
}
