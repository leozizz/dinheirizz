import { Hono } from 'hono'
import { getDb } from '../db/client'
import { transactions, accounts, categories, creditCards, users } from '../db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
import {
  reportFilterSchema,
  type ReportSummaryResponse,
  type CashFlowPoint,
  type CategoryBreakdownItem,
  type CostCenterSummaryItem
} from '../schemas/reports'
import { mockTransactionsStore, type MockTransaction } from './transactions'
import { mockAccountsStore } from './accounts'
import { mockCategoriesStore, DEFAULT_CATEGORIES } from './categories'
import { mockCreditCardsStore } from './creditCards'
import type { AuthEnv } from '../middlewares/auth'
import { parseProfileIdQuery } from '../lib/profileFilter'

export const reportsRouter = new Hono<AuthEnv>()

const padZero = (n: number): string => n.toString().padStart(2, '0')

const formatDateBR = (isoDateString: string | null | undefined): string => {
  if (!isoDateString) return ''
  const d = new Date(isoDateString)
  if (isNaN(d.getTime())) return ''
  return `${padZero(d.getUTCDate())}/${padZero(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

const formatNumberBR = (value: number): string => {
  return value.toFixed(2).replace('.', ',')
}

const escapeCsvField = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

interface RawReportTransaction {
  id: string
  userId: string
  accountId: string
  categoryId: string | null
  creditCardId?: string | null
  amount: number
  description: string | null
  occurredAt: string
  dueDate?: string | null
  paidAt?: string | null
  paid: boolean
  status: string
  type: 'income' | 'expense' | 'transfer'
  installmentCurrent?: number | null
  installmentTotal?: number | null
}

const getPeriodBounds = (
  periodType: 'monthly' | 'yearly',
  period: string
): { startDate: Date; endDate: Date } => {
  if (periodType === 'yearly') {
    const year = parseInt(period, 10)
    const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
    return { startDate, endDate }
  }

  const [yStr, mStr] = period.split('-')
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10) - 1
  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))
  return { startDate, endDate }
}

const fetchTransactionsData = async (
  userId: string,
  filter: {
    periodType: 'monthly' | 'yearly'
    period: string
    accountId?: string
    profileId?: string
    status: 'all' | 'completed' | 'pending'
  }
): Promise<{
  rawTransactions: RawReportTransaction[]
  accountsMap: Map<string, string>
  categoriesMap: Map<string, { name: string; color: string | null; type: string }>
  creditCardsMap: Map<string, string>
  selectedAccountName?: string
  userFullName?: string
  userEmail?: string
}> => {
  const { startDate, endDate } = getPeriodBounds(filter.periodType, filter.period)
  const parsedProfile = parseProfileIdQuery(filter.profileId)
  const activeProfileId = parsedProfile.profileId
  const db = getDb()

  const accountsMap = new Map<string, string>()
  const categoriesMap = new Map<string, { name: string; color: string | null; type: string }>()
  const creditCardsMap = new Map<string, string>()
  let selectedAccountName: string | undefined
  let userFullName: string | undefined
  let userEmail: string | undefined

  if (!db) {
    // Modo Mock em memória
    for (const [id, acc] of mockAccountsStore.entries()) {
      if (acc.userId === userId || acc.userId === '00000000-0000-0000-0000-000000000000') {
        accountsMap.set(id, acc.name)
        if (filter.accountId && id === filter.accountId) {
          selectedAccountName = acc.name
        }
      }
    }

    for (const cat of DEFAULT_CATEGORIES) {
      categoriesMap.set(cat.id, { name: cat.name, color: cat.color, type: cat.type })
    }
    for (const [id, cat] of mockCategoriesStore.entries()) {
      categoriesMap.set(id, { name: cat.name, color: cat.color ?? null, type: cat.type })
    }

    for (const [id, card] of mockCreditCardsStore.entries()) {
      creditCardsMap.set(id, card.name)
    }

    const filtered: RawReportTransaction[] = []
    const startMs = startDate.getTime()
    const endMs = endDate.getTime()

    for (const tx of mockTransactionsStore.values()) {
      if (tx.userId !== userId && tx.userId !== '00000000-0000-0000-0000-000000000000') {
        continue
      }
      if (activeProfileId && tx.profileId !== activeProfileId) {
        continue
      }
      if (filter.accountId && tx.accountId !== filter.accountId) {
        continue
      }
      const txStatus = tx.status ?? (tx.paid ? 'completed' : 'pending')
      if (filter.status === 'completed' && txStatus !== 'completed') {
        continue
      }
      if (filter.status === 'pending' && txStatus !== 'pending') {
        continue
      }
      if (txStatus === 'cancelled') {
        continue
      }

      const txDateMs = new Date(tx.occurredAt).getTime()
      if (isNaN(txDateMs) || txDateMs < startMs || txDateMs > endMs) {
        continue
      }

      filtered.push({
        id: tx.id,
        userId: tx.userId,
        accountId: tx.accountId,
        categoryId: tx.categoryId ?? null,
        creditCardId: tx.creditCardId ?? null,
        amount: parseFloat(tx.amount || '0'),
        description: tx.description ?? null,
        occurredAt: tx.occurredAt,
        dueDate: tx.dueDate ?? null,
        paidAt: tx.paidAt ?? null,
        paid: tx.paid,
        status: txStatus,
        type: (tx.type as 'income' | 'expense' | 'transfer') || 'expense',
        installmentCurrent: tx.installmentCurrent ?? null,
        installmentTotal: tx.installmentTotal ?? null
      })
    }

    filtered.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
    return {
      rawTransactions: filtered,
      accountsMap,
      categoriesMap,
      creditCardsMap,
      selectedAccountName,
      userFullName: 'Usuário Dinheirizz',
      userEmail: 'usuario@dinheirizz.com'
    }
  }

  // Consulta ao banco real Supabase / Drizzle
  try {
    const dbAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId))
    for (const acc of dbAccounts) {
      accountsMap.set(acc.id, acc.name)
      if (filter.accountId && acc.id === filter.accountId) {
        selectedAccountName = acc.name
      }
    }

    const dbCategories = await db.select().from(categories).where(eq(categories.userId, userId))
    for (const cat of dbCategories) {
      categoriesMap.set(cat.id, { name: cat.name, color: cat.color, type: cat.type })
    }

    const dbCards = await db.select().from(creditCards).where(eq(creditCards.userId, userId))
    for (const card of dbCards) {
      creditCardsMap.set(card.id, card.name)
    }

    const dbUserList = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (dbUserList.length > 0) {
      userFullName = dbUserList[0].fullName ?? undefined
      userEmail = dbUserList[0].email
    }

    const conditions = [
      eq(transactions.userId, userId),
      gte(transactions.occurredAt, startDate),
      lte(transactions.occurredAt, endDate)
    ]

    if (filter.accountId) {
      conditions.push(eq(transactions.accountId, filter.accountId))
    }
    if (activeProfileId) {
      conditions.push(eq(transactions.profileId, activeProfileId))
    }

    if (filter.status === 'completed') {
      conditions.push(eq(transactions.status, 'completed'))
    } else if (filter.status === 'pending') {
      conditions.push(eq(transactions.status, 'pending'))
    }

    const dbRows = await db
      .select()
      .from(transactions)
      .where(and(...conditions))

    const mappedTransactions: RawReportTransaction[] = dbRows
      .filter((row) => row.status !== 'cancelled')
      .map((row) => {
        let type: 'income' | 'expense' | 'transfer' = 'expense'
        if (row.categoryId && categoriesMap.has(row.categoryId)) {
          const cat = categoriesMap.get(row.categoryId)
          if (cat?.type === 'income') type = 'income'
        }
        return {
          id: row.id,
          userId: row.userId,
          accountId: row.accountId,
          categoryId: row.categoryId,
          creditCardId: row.creditCardId,
          amount: parseFloat(row.amount || '0'),
          description: row.description,
          occurredAt: row.occurredAt.toISOString(),
          dueDate: row.dueDate ? row.dueDate.toISOString() : null,
          paidAt: row.paidAt ? row.paidAt.toISOString() : null,
          paid: row.paid,
          status: row.status,
          type,
          installmentCurrent: row.installmentCurrent,
          installmentTotal: row.installmentTotal
        }
      })

    mappedTransactions.sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    )

    return {
      rawTransactions: mappedTransactions,
      accountsMap,
      categoriesMap,
      creditCardsMap,
      selectedAccountName,
      userFullName,
      userEmail
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao consultar banco de dados'
    throw new Error(`Falha ao obter dados de relatórios: ${message}`)
  }
}

const buildReportSummary = (
  periodType: 'monthly' | 'yearly',
  period: string,
  rawTransactions: RawReportTransaction[],
  accountsMap: Map<string, string>,
  categoriesMap: Map<string, { name: string; color: string | null; type: string }>,
  selectedAccountName?: string
): ReportSummaryResponse => {
  let totalIncome = 0
  let totalExpense = 0
  const categoriesMapAggregation = new Map<
    string,
    {
      categoryId: string | null
      categoryName: string
      categoryColor: string | null
      type: 'income' | 'expense'
      amount: number
      count: number
    }
  >()

  const costCentersMap = new Map<
    string,
    {
      accountId: string
      accountName: string
      income: number
      expense: number
    }
  >()

  for (const tx of rawTransactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount
    }

    // Agrupamento por Categoria
    const catId = tx.categoryId
    const catInfo = catId ? categoriesMap.get(catId) : null
    const catName = catInfo?.name || 'Sem Categoria'
    const catColor = catInfo?.color || null
    const catKey = `${catId ?? 'none'}-${tx.type}`

    const currentCat = categoriesMapAggregation.get(catKey) || {
      categoryId: catId,
      categoryName: catName,
      categoryColor: catColor,
      type: tx.type === 'income' ? 'income' : 'expense',
      amount: 0,
      count: 0
    }
    currentCat.amount += tx.amount
    currentCat.count += 1
    categoriesMapAggregation.set(catKey, currentCat)

    // Agrupamento por Centro de Custo / Conta
    const accId = tx.accountId
    const accName = accountsMap.get(accId) || 'Conta Não Identificada'
    const currentAcc = costCentersMap.get(accId) || {
      accountId: accId,
      accountName: accName,
      income: 0,
      expense: 0
    }
    if (tx.type === 'income') {
      currentAcc.income += tx.amount
    } else if (tx.type === 'expense') {
      currentAcc.expense += tx.amount
    }
    costCentersMap.set(accId, currentAcc)
  }

  const netBalance = totalIncome - totalExpense
  const savingsRate =
    totalIncome > 0 ? Number((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(2)) : 0

  const categoriesBreakdown: CategoryBreakdownItem[] = Array.from(
    categoriesMapAggregation.values()
  ).map((item) => {
    const totalRef = item.type === 'income' ? totalIncome : totalExpense
    const percentage = totalRef > 0 ? Number(((item.amount / totalRef) * 100).toFixed(2)) : 0
    return {
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      categoryColor: item.categoryColor,
      type: item.type,
      amount: Number(item.amount.toFixed(2)),
      percentage,
      count: item.count
    }
  })

  // Ordenar categorias por maior valor
  categoriesBreakdown.sort((a, b) => b.amount - a.amount)

  const costCentersSummary: CostCenterSummaryItem[] = Array.from(costCentersMap.values()).map(
    (item) => ({
      accountId: item.accountId,
      accountName: item.accountName,
      income: Number(item.income.toFixed(2)),
      expense: Number(item.expense.toFixed(2)),
      net: Number((item.income - item.expense).toFixed(2))
    })
  )

  costCentersSummary.sort((a, b) => b.income + b.expense - (a.income + a.expense))

  // Timeline de Fluxo de Caixa
  const cashFlowTimeline: CashFlowPoint[] = []

  if (periodType === 'yearly') {
    const monthLabels = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez'
    ]
    const monthlyBuckets = Array.from({ length: 12 }, (_, i) => ({
      label: monthLabels[i],
      income: 0,
      expense: 0
    }))

    for (const tx of rawTransactions) {
      const d = new Date(tx.occurredAt)
      const m = d.getUTCMonth()
      if (m >= 0 && m < 12) {
        if (tx.type === 'income') {
          monthlyBuckets[m].income += tx.amount
        } else if (tx.type === 'expense') {
          monthlyBuckets[m].expense += tx.amount
        }
      }
    }

    let runningAccumulated = 0
    for (const bucket of monthlyBuckets) {
      const balance = bucket.income - bucket.expense
      runningAccumulated += balance
      cashFlowTimeline.push({
        label: bucket.label,
        income: Number(bucket.income.toFixed(2)),
        expense: Number(bucket.expense.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        accumulatedBalance: Number(runningAccumulated.toFixed(2))
      })
    }
  } else {
    // Visão mensal: agrupar por dias do mês
    const [yStr, mStr] = period.split('-')
    const year = parseInt(yStr, 10)
    const month = parseInt(mStr, 10) - 1
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

    const dailyBuckets = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const dateStr = `${year}-${padZero(month + 1)}-${padZero(day)}`
      return {
        label: `${padZero(day)}/${padZero(month + 1)}`,
        date: dateStr,
        income: 0,
        expense: 0
      }
    })

    for (const tx of rawTransactions) {
      const d = new Date(tx.occurredAt)
      const day = d.getUTCDate()
      if (day >= 1 && day <= daysInMonth) {
        if (tx.type === 'income') {
          dailyBuckets[day - 1].income += tx.amount
        } else if (tx.type === 'expense') {
          dailyBuckets[day - 1].expense += tx.amount
        }
      }
    }

    let runningAccumulated = 0
    for (const bucket of dailyBuckets) {
      const balance = bucket.income - bucket.expense
      runningAccumulated += balance
      cashFlowTimeline.push({
        label: bucket.label,
        date: bucket.date,
        income: Number(bucket.income.toFixed(2)),
        expense: Number(bucket.expense.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        accumulatedBalance: Number(runningAccumulated.toFixed(2))
      })
    }
  }

  return {
    periodType,
    period,
    accountName: selectedAccountName,
    generatedAt: new Date().toISOString(),
    kpis: {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      netBalance: Number(netBalance.toFixed(2)),
      savingsRate,
      transactionCount: rawTransactions.length
    },
    categoriesBreakdown,
    costCentersSummary,
    cashFlowTimeline
  }
}

// 1. GET /api/v1/reports/summary
reportsRouter.get('/summary', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const queryParams = {
    periodType: c.req.query('periodType') || 'monthly',
    period: c.req.query('period') || '',
    accountId: c.req.query('accountId') || undefined,
    profileId: c.req.query('profileId') || undefined,
    status: c.req.query('status') || 'completed'
  }

  const parseResult = reportFilterSchema.safeParse(queryParams)
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Parâmetros de filtro inválidos',
        issues: parseResult.error.format()
      },
      400
    )
  }

  const filter = parseResult.data

  try {
    const {
      rawTransactions,
      accountsMap,
      categoriesMap,
      selectedAccountName
    } = await fetchTransactionsData(userId, filter)

    const summary = buildReportSummary(
      filter.periodType,
      filter.period,
      rawTransactions,
      accountsMap,
      categoriesMap,
      selectedAccountName
    )

    return c.json(summary, 200)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao processar relatório'
    return c.json({ error: 'Falha ao gerar resumo do relatório', message: msg }, 500)
  }
})

// 2. GET /api/v1/reports/export/csv
reportsRouter.get('/export/csv', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const queryParams = {
    periodType: c.req.query('periodType') || 'monthly',
    period: c.req.query('period') || '',
    accountId: c.req.query('accountId') || undefined,
    profileId: c.req.query('profileId') || undefined,
    status: c.req.query('status') || 'completed'
  }

  const parseResult = reportFilterSchema.safeParse(queryParams)
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Parâmetros de filtro inválidos',
        issues: parseResult.error.format()
      },
      400
    )
  }

  const filter = parseResult.data

  try {
    const {
      rawTransactions,
      accountsMap,
      categoriesMap,
      creditCardsMap
    } = await fetchTransactionsData(userId, filter)

    const headers = [
      'Data',
      'Descrição',
      'Tipo',
      'Categoria',
      'Centro de Custo / Conta',
      'Forma / Cartão',
      'Status',
      'Data de Pagamento',
      'Valor (R$)',
      'Observações'
    ]

    const rows: string[] = []
    rows.push(headers.map(escapeCsvField).join(';'))

    for (const tx of rawTransactions) {
      const typeDisplay =
        tx.type === 'income' ? 'Receita' : tx.type === 'expense' ? 'Despesa' : 'Transferência'
      const statusDisplay =
        tx.status === 'completed'
          ? 'Concluído'
          : tx.status === 'pending'
          ? 'Pendente'
          : 'Cancelado'

      const catInfo = tx.categoryId ? categoriesMap.get(tx.categoryId) : null
      const categoryName = catInfo?.name || 'Sem Categoria'
      const accountName = accountsMap.get(tx.accountId) || 'Conta Não Identificada'

      let paymentMethod = accountName
      if (tx.creditCardId) {
        const cardName = creditCardsMap.get(tx.creditCardId) || 'Cartão de Crédito'
        if (tx.installmentCurrent && tx.installmentTotal) {
          paymentMethod = `${cardName} (${tx.installmentCurrent}/${tx.installmentTotal})`
        } else {
          paymentMethod = cardName
        }
      }

      const row = [
        formatDateBR(tx.occurredAt),
        escapeCsvField(tx.description || 'Sem Descrição'),
        escapeCsvField(typeDisplay),
        escapeCsvField(categoryName),
        escapeCsvField(accountName),
        escapeCsvField(paymentMethod),
        escapeCsvField(statusDisplay),
        formatDateBR(tx.paidAt),
        formatNumberBR(tx.amount),
        escapeCsvField('')
      ]
      rows.push(row.join(';'))
    }

    // Adicionar BOM UTF-8 (\uFEFF) para compatibilidade nativa com Microsoft Excel
    const csvContent = '\uFEFF' + rows.join('\r\n')

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="dinheirizz-relatorio-${filter.period}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao exportar CSV'
    return c.json({ error: 'Falha ao exportar CSV', message: msg }, 500)
  }
})

// 3. GET /api/v1/reports/export/pdf-data
reportsRouter.get('/export/pdf-data', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const queryParams = {
    periodType: c.req.query('periodType') || 'monthly',
    period: c.req.query('period') || '',
    accountId: c.req.query('accountId') || undefined,
    profileId: c.req.query('profileId') || undefined,
    status: c.req.query('status') || 'completed'
  }

  const parseResult = reportFilterSchema.safeParse(queryParams)
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Parâmetros de filtro inválidos',
        issues: parseResult.error.format()
      },
      400
    )
  }

  const filter = parseResult.data

  try {
    const {
      rawTransactions,
      accountsMap,
      categoriesMap,
      creditCardsMap,
      selectedAccountName,
      userFullName,
      userEmail
    } = await fetchTransactionsData(userId, filter)

    const summary = buildReportSummary(
      filter.periodType,
      filter.period,
      rawTransactions,
      accountsMap,
      categoriesMap,
      selectedAccountName
    )

    const detailedTransactions = rawTransactions.map((tx) => {
      const catInfo = tx.categoryId ? categoriesMap.get(tx.categoryId) : null
      const cardName = tx.creditCardId ? creditCardsMap.get(tx.creditCardId) : undefined
      return {
        id: tx.id,
        occurredAt: tx.occurredAt,
        description: tx.description || 'Sem Descrição',
        type: tx.type,
        categoryId: tx.categoryId,
        categoryName: catInfo?.name || 'Sem Categoria',
        categoryColor: catInfo?.color || null,
        accountId: tx.accountId,
        accountName: accountsMap.get(tx.accountId) || 'Conta Não Identificada',
        creditCardName: cardName,
        installment:
          tx.installmentCurrent && tx.installmentTotal
            ? `${tx.installmentCurrent}/${tx.installmentTotal}`
            : undefined,
        amount: tx.amount,
        status: tx.status,
        paidAt: tx.paidAt
      }
    })

    return c.json(
      {
        user: {
          id: userId,
          name: userFullName || 'Usuário Dinheirizz',
          email: userEmail || 'usuario@dinheirizz.com'
        },
        summary,
        transactions: detailedTransactions
      },
      200
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao processar dados de impressão'
    return c.json({ error: 'Falha ao obter dados para PDF', message: msg }, 500)
  }
})
