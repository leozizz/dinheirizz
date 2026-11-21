import { and, desc, eq, gte, lte } from 'drizzle-orm'
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
import { mockCategoriesStore } from '../routes/categories'
import { mockCreditCardsStore, mockInvoicesStore } from '../routes/creditCards'
import { mockTransactionsStore } from '../routes/transactions'
import {
  getBalanceSummaryInputSchema,
  getBudgetStatusInputSchema,
  getCashflowForecastInputSchema,
  getCreditCardInvoicesInputSchema,
  listTransactionsInputSchema,
  type McpScope
} from '../schemas/mcp'
import { calculateCashFlowForecast, type TransactionForecastInput } from './forecast'

export interface McpToolDefinition {
  name: string
  description: string
  requiredScope: McpScope
  inputSchema: Record<string, unknown>
}

export const MCP_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: 'get_balance_summary',
    description: 'Retorna o saldo consolidado e a lista de contas bancárias do usuário.',
    requiredScope: 'read:accounts',
    inputSchema: {
      type: 'object',
      properties: {
        profileId: { type: 'string', description: 'UUID opcional do perfil financeiro' }
      }
    }
  },
  {
    name: 'list_transactions',
    description: 'Lista transações financeiras do usuário com filtros de data, categoria, conta e tipo.',
    requiredScope: 'read:transactions',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Data inicial ISO (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'Data final ISO (YYYY-MM-DD)' },
        categoryId: { type: 'string', description: 'UUID da categoria' },
        accountId: { type: 'string', description: 'UUID da conta' },
        type: { type: 'string', enum: ['income', 'expense'] },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 25 }
      }
    }
  },
  {
    name: 'get_cashflow_forecast',
    description: 'Calcula a projeção de fluxo de caixa para os próximos 30 ou 60 dias.',
    requiredScope: 'read:forecast',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', enum: [30, 60], default: 30 },
        accountId: { type: 'string', description: 'UUID opcional da conta' },
        profileId: { type: 'string', description: 'UUID opcional do perfil financeiro' }
      }
    }
  },
  {
    name: 'get_budget_status',
    description: 'Retorna o status e percentual consumido dos orçamentos do usuário no período.',
    requiredScope: 'read:budgets',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Período no formato YYYY-MM' },
        profileId: { type: 'string', description: 'UUID opcional do perfil financeiro' }
      }
    }
  },
  {
    name: 'get_credit_card_invoices',
    description: 'Lista cartões de crédito e faturas do usuário com filtro por cartão, período e status.',
    requiredScope: 'read:invoices',
    inputSchema: {
      type: 'object',
      properties: {
        creditCardId: { type: 'string', description: 'UUID do cartão de crédito' },
        period: { type: 'string', description: 'Período no formato YYYY-MM' },
        status: { type: 'string', enum: ['open', 'closed', 'paid', 'overdue'] }
      }
    }
  }
]

export class McpInvalidParamsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'McpInvalidParamsError'
  }
}

const getCurrentPeriod = (): string => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const executeGetBalanceSummary = async (userId: string, rawArgs: Record<string, unknown>) => {
  const parsed = getBalanceSummaryInputSchema.safeParse(rawArgs)
  if (!parsed.success) {
    throw new McpInvalidParamsError(parsed.error.issues[0]?.message ?? 'Parâmetros inválidos')
  }

  const { profileId } = parsed.data
  const db = getDb()

  if (!db) {
    const userAccounts = Array.from(mockAccountsStore.values()).filter(
      (a) => a.userId === userId && (!profileId || a.profileId === profileId)
    )
    const totalBalance =
      Math.round(userAccounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0) * 100) / 100

    return {
      totalBalance,
      accountCount: userAccounts.length,
      accounts: userAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: parseFloat(a.balance) || 0,
        profileId: a.profileId ?? null
      }))
    }
  }

  const conditions = [eq(accounts.userId, userId)]
  if (profileId) {
    conditions.push(eq(accounts.profileId, profileId))
  }

  const rows = await db
    .select()
    .from(accounts)
    .where(and(...conditions))

  const totalBalance =
    Math.round(rows.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0) * 100) / 100

  return {
    totalBalance,
    accountCount: rows.length,
    accounts: rows.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: parseFloat(a.balance) || 0,
      profileId: a.profileId ?? null
    }))
  }
}

const executeListTransactions = async (userId: string, rawArgs: Record<string, unknown>) => {
  const parsed = listTransactionsInputSchema.safeParse(rawArgs)
  if (!parsed.success) {
    throw new McpInvalidParamsError(parsed.error.issues[0]?.message ?? 'Parâmetros inválidos')
  }

  const { startDate, endDate, categoryId, accountId, type, limit } = parsed.data
  const db = getDb()

  if (!db) {
    const filtered = Array.from(mockTransactionsStore.values())
      .filter((tx) => {
        if (tx.userId !== userId) return false
        if (categoryId && tx.categoryId !== categoryId) return false
        if (accountId && tx.accountId !== accountId) return false
        const numericAmount = parseFloat(tx.amount) || 0
        if (type === 'income' && numericAmount < 0) return false
        if (type === 'expense' && numericAmount >= 0) return false
        const txDate = tx.occurredAt.slice(0, 10)
        if (startDate && txDate < startDate.slice(0, 10)) return false
        if (endDate && txDate > endDate.slice(0, 10)) return false
        return true
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit)

    return {
      total: filtered.length,
      transactions: filtered.map((tx) => ({
        id: tx.id,
        description: tx.description,
        amount: parseFloat(tx.amount) || 0,
        type: (parseFloat(tx.amount) || 0) >= 0 ? 'income' : 'expense',
        accountId: tx.accountId,
        categoryId: tx.categoryId,
        status: tx.status,
        paid: tx.paid,
        occurredAt: tx.occurredAt
      }))
    }
  }

  const conditions = [eq(transactions.userId, userId)]
  if (categoryId) conditions.push(eq(transactions.categoryId, categoryId))
  if (accountId) conditions.push(eq(transactions.accountId, accountId))
  if (startDate) conditions.push(gte(transactions.occurredAt, new Date(startDate)))
  if (endDate) conditions.push(lte(transactions.occurredAt, new Date(endDate)))

  const rows = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredAt))
    .limit(limit)

  const filteredByType = rows.filter((tx) => {
    const numericAmount = parseFloat(tx.amount) || 0
    if (type === 'income') return numericAmount >= 0
    if (type === 'expense') return numericAmount < 0
    return true
  })

  return {
    total: filteredByType.length,
    transactions: filteredByType.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: parseFloat(tx.amount) || 0,
      type: (parseFloat(tx.amount) || 0) >= 0 ? 'income' : 'expense',
      accountId: tx.accountId,
      categoryId: tx.categoryId,
      status: tx.status,
      paid: tx.paid,
      occurredAt: tx.occurredAt.toISOString()
    }))
  }
}

const executeGetCashflowForecast = async (userId: string, rawArgs: Record<string, unknown>) => {
  const parsed = getCashflowForecastInputSchema.safeParse(rawArgs)
  if (!parsed.success) {
    throw new McpInvalidParamsError(parsed.error.issues[0]?.message ?? 'Parâmetros inválidos')
  }

  const { days, accountId, profileId } = parsed.data
  const db = getDb()

  let startingBalance = 0
  const historyTransactions: TransactionForecastInput[] = []
  const scheduledTransactions: TransactionForecastInput[] = []

  if (!db) {
    const userAccounts = Array.from(mockAccountsStore.values()).filter(
      (a) =>
        a.userId === userId &&
        (!accountId || a.id === accountId) &&
        (!profileId || a.profileId === profileId)
    )
    startingBalance = userAccounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0)

    const userTxs = Array.from(mockTransactionsStore.values()).filter(
      (t) =>
        t.userId === userId &&
        (!accountId || t.accountId === accountId) &&
        (!profileId || t.profileId === profileId)
    )

    for (const t of userTxs) {
      const isPaid = t.paid === true && t.status !== 'pending'
      const isPending = t.status === 'pending' || t.paid === false
      const numAmount = parseFloat(t.amount) || 0
      const item: TransactionForecastInput = {
        id: t.id,
        amount: numAmount,
        type: t.type || (numAmount >= 0 ? 'income' : 'expense'),
        paid: t.paid,
        status: t.status,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        occurredAt: t.occurredAt ? new Date(t.occurredAt) : new Date(t.createdAt),
        isRecurring: t.isRecurring,
        recurrenceDay: t.recurrenceDay,
        adjustBusinessDay: t.adjustBusinessDay
      }

      if (isPaid) {
        historyTransactions.push(item)
      } else if (isPending && t.status !== 'cancelled') {
        scheduledTransactions.push(item)
      }
    }
  } else {
    const accConditions = [eq(accounts.userId, userId)]
    if (accountId) accConditions.push(eq(accounts.id, accountId))
    if (profileId) accConditions.push(eq(accounts.profileId, profileId))

    const userAccounts = await db
      .select()
      .from(accounts)
      .where(and(...accConditions))
    startingBalance = userAccounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0)

    const txConditions = [eq(transactions.userId, userId)]
    if (accountId) txConditions.push(eq(transactions.accountId, accountId))
    if (profileId) txConditions.push(eq(transactions.profileId, profileId))

    const dbTx = await db
      .select()
      .from(transactions)
      .where(and(...txConditions))
      .orderBy(desc(transactions.occurredAt))

    for (const t of dbTx) {
      const isPaid = t.paid === true && t.status !== 'pending'
      const isPending = t.status === 'pending' || t.paid === false
      const numAmount = parseFloat(t.amount) || 0
      const item: TransactionForecastInput = {
        id: t.id,
        amount: numAmount,
        type: numAmount >= 0 ? 'income' : 'expense',
        paid: t.paid,
        status: t.status,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        occurredAt: t.occurredAt ? new Date(t.occurredAt) : new Date(t.createdAt),
        isRecurring: t.isRecurring,
        recurrenceDay: t.recurrenceDay,
        adjustBusinessDay: t.adjustBusinessDay
      }

      if (isPaid) {
        historyTransactions.push(item)
      } else if (isPending && t.status !== 'cancelled') {
        scheduledTransactions.push(item)
      }
    }
  }

  return calculateCashFlowForecast({
    startingBalance,
    days,
    historyTransactions,
    scheduledTransactions
  })
}

const executeGetBudgetStatus = async (userId: string, rawArgs: Record<string, unknown>) => {
  const parsed = getBudgetStatusInputSchema.safeParse(rawArgs)
  if (!parsed.success) {
    throw new McpInvalidParamsError(parsed.error.issues[0]?.message ?? 'Parâmetros inválidos')
  }

  const requestedPeriod = parsed.data.period || getCurrentPeriod()
  const { profileId } = parsed.data
  const db = getDb()

  if (!db) {
    const userBudgets = Array.from(mockBudgetsStore.values()).filter(
      (b) =>
        b.userId === userId &&
        (b.period === requestedPeriod || b.period === 'monthly') &&
        (!profileId || b.profileId === profileId)
    )

    const userTxs = Array.from(mockTransactionsStore.values()).filter((t) => {
      if (t.userId !== userId) return false
      if (profileId && t.profileId !== profileId) return false
      const num = parseFloat(t.amount) || 0
      if (num >= 0) return false
      return t.occurredAt.slice(0, 7) === requestedPeriod
    })

    const items = userBudgets.map((b) => {
      const cat = mockCategoriesStore.get(b.categoryId)
      const amountLimit = parseFloat(b.amountLimit) || 0
      const spentAmount = userTxs
        .filter((t) => t.categoryId === b.categoryId)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0)
      const percentageUsed =
        amountLimit > 0 ? Math.round((spentAmount / amountLimit) * 10000) / 100 : 0

      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: cat?.name ?? 'Categoria',
        amountLimit,
        spentAmount,
        remainingAmount: Math.round((amountLimit - spentAmount) * 100) / 100,
        percentageUsed,
        status: percentageUsed >= 100 ? 'exceeded' : percentageUsed >= 85 ? 'warning' : 'normal'
      }
    })

    return {
      period: requestedPeriod,
      budgets: items
    }
  }

  const budgetConditions = [eq(budgets.userId, userId)]
  if (profileId) budgetConditions.push(eq(budgets.profileId, profileId))

  const budgetRows = await db
    .select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      categoryName: categories.name,
      amountLimit: budgets.amountLimit,
      period: budgets.period
    })
    .from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id))
    .where(and(...budgetConditions))

  const matchingBudgets = budgetRows.filter(
    (b) => b.period === requestedPeriod || b.period === 'monthly'
  )

  const [yearStr, monthStr] = requestedPeriod.split('-')
  const startOfMonth = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1))
  const endOfMonth = new Date(Date.UTC(Number(yearStr), Number(monthStr), 0, 23, 59, 59, 999))

  const txRows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredAt, startOfMonth),
        lte(transactions.occurredAt, endOfMonth)
      )
    )

  const items = matchingBudgets.map((b) => {
    const amountLimit = parseFloat(b.amountLimit) || 0
    const spentAmount = txRows
      .filter((t) => t.categoryId === b.categoryId && (parseFloat(t.amount) || 0) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0)
    const percentageUsed =
      amountLimit > 0 ? Math.round((spentAmount / amountLimit) * 10000) / 100 : 0

    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.categoryName ?? 'Categoria',
      amountLimit,
      spentAmount,
      remainingAmount: Math.round((amountLimit - spentAmount) * 100) / 100,
      percentageUsed,
      status: percentageUsed >= 100 ? 'exceeded' : percentageUsed >= 85 ? 'warning' : 'normal'
    }
  })

  return {
    period: requestedPeriod,
    budgets: items
  }
}

const executeGetCreditCardInvoices = async (userId: string, rawArgs: Record<string, unknown>) => {
  const parsed = getCreditCardInvoicesInputSchema.safeParse(rawArgs)
  if (!parsed.success) {
    throw new McpInvalidParamsError(parsed.error.issues[0]?.message ?? 'Parâmetros inválidos')
  }

  const { creditCardId, period, status } = parsed.data
  const db = getDb()

  if (!db) {
    const userInvoices = Array.from(mockInvoicesStore.values()).filter((inv) => {
      if (inv.userId !== userId) return false
      if (creditCardId && inv.creditCardId !== creditCardId) return false
      if (period && inv.period !== period) return false
      if (status && inv.status !== status) return false
      return true
    })

    return {
      total: userInvoices.length,
      invoices: userInvoices.map((inv) => {
        const card = mockCreditCardsStore.get(inv.creditCardId)
        return {
          id: inv.id,
          creditCardId: inv.creditCardId,
          creditCardName: card?.name ?? 'Cartão',
          period: inv.period,
          amount: parseFloat(inv.amount) || 0,
          paidAmount: parseFloat(inv.paidAmount) || 0,
          status: inv.status,
          closingDate: inv.closingDate,
          dueDate: inv.dueDate
        }
      })
    }
  }

  const conditions = [eq(invoices.userId, userId)]
  if (creditCardId) conditions.push(eq(invoices.creditCardId, creditCardId))
  if (period) conditions.push(eq(invoices.period, period))
  if (status) conditions.push(eq(invoices.status, status))

  const rows = await db
    .select({
      id: invoices.id,
      creditCardId: invoices.creditCardId,
      creditCardName: creditCards.name,
      period: invoices.period,
      amount: invoices.amount,
      paidAmount: invoices.paidAmount,
      status: invoices.status,
      closingDate: invoices.closingDate,
      dueDate: invoices.dueDate
    })
    .from(invoices)
    .leftJoin(creditCards, eq(invoices.creditCardId, creditCards.id))
    .where(and(...conditions))
    .orderBy(desc(invoices.dueDate))

  return {
    total: rows.length,
    invoices: rows.map((inv) => ({
      id: inv.id,
      creditCardId: inv.creditCardId,
      creditCardName: inv.creditCardName ?? 'Cartão',
      period: inv.period,
      amount: parseFloat(inv.amount) || 0,
      paidAmount: parseFloat(inv.paidAmount) || 0,
      status: inv.status,
      closingDate: inv.closingDate.toISOString(),
      dueDate: inv.dueDate.toISOString()
    }))
  }
}

export const executeMcpTool = async (
  toolName: string,
  rawArgs: Record<string, unknown>,
  userId: string
): Promise<unknown> => {
  switch (toolName) {
    case 'get_balance_summary':
      return executeGetBalanceSummary(userId, rawArgs)
    case 'list_transactions':
      return executeListTransactions(userId, rawArgs)
    case 'get_cashflow_forecast':
      return executeGetCashflowForecast(userId, rawArgs)
    case 'get_budget_status':
      return executeGetBudgetStatus(userId, rawArgs)
    case 'get_credit_card_invoices':
      return executeGetCreditCardInvoices(userId, rawArgs)
    default:
      throw new Error(`Tool desconhecida: ${toolName}`)
  }
}
