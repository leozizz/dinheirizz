import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { insights, transactions, userAiSettings, users, budgets, categories, subscriptionIgnores } from '../db/schema'
import { eq, and, desc, gte } from 'drizzle-orm'
import type { AuthEnv } from '../middlewares/auth'
import {
  calculateMonthlyMetrics,
  detectRecurringSubscriptions,
  type FinancialTransactionInput,
  type SubscriptionTransactionInput
} from '../services/financial-analytics'
import {
  generateGeminiFinancialInsight,
  type GeneratedInsight
} from '../services/gemini'
import { decryptApiKey } from '../services/crypto'
import { mockTransactionsStore } from './transactions'
import { mockUserAiSettingsStore } from './userAi'
import { mockBudgetsStore } from './budgets'
import { mockCategoriesStore } from './categories'

export interface MockInsightRecord extends GeneratedInsight {
  id: string
  userId: string
  period: string
  metrics: {
    totalIncome: number
    totalExpense: number
    netBalance: number
    savingsRate: number
    topCategory: string | null
  }
  source: 'byok' | 'system' | 'fallback'
  provider: string
  modelName?: string | null
  createdAt: string
  updatedAt: string
}

// Armazenamento em memória para ambiente de testes unitários ou offline
export const mockInsightsStore = new Map<string, MockInsightRecord>()
export const mockSubscriptionIgnoresStore = new Set<string>()

const ADMIN_EMAIL = 'leonardocps2015@gmail.com'

function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export const generateInsightBodySchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'O período deve estar no formato YYYY-MM')
    .optional()
})

export const insightsRouter = new Hono<AuthEnv>()

/**
 * Coleta transações do usuário (do banco ou da store mock)
 */
async function getUserTransactions(
  userId: string,
  period: string
): Promise<FinancialTransactionInput[]> {
  const db = getDb()

  if (!db) {
    const list: FinancialTransactionInput[] = []
    for (const tx of mockTransactionsStore.values()) {
      if (tx.userId === userId) {
        const txDate = tx.occurredAt || tx.createdAt
        if (!period || txDate.startsWith(period)) {
          list.push({
            id: tx.id,
            amount: parseFloat(tx.amount) || 0,
            paid: tx.paid,
            type: tx.type,
            occurredAt: txDate
          })
        }
      }
    }
    return list
  }

  try {
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.occurredAt))

    return rows
      .filter((r) => {
        const d = r.occurredAt instanceof Date ? r.occurredAt.toISOString() : String(r.occurredAt)
        return !period || d.startsWith(period)
      })
      .map((r) => ({
        id: r.id,
        amount: parseFloat(r.amount) || 0,
        paid: r.paid,
        occurredAt: r.occurredAt
      }))
  } catch {
    return []
  }
}

/**
 * Coleta alertas e recomendações de limites de orçamento
 */
const getBudgetThresholdAlerts = async (
  userId: string,
  period: string
): Promise<{ alerts: string[]; recommendations: string[] }> => {
  const db = getDb()
  const budgetAlerts: string[] = []
  const budgetRecs: string[] = []

  let userBudgets: Array<{ categoryId: string; amountLimit: string; period: string }> = []
  if (!db) {
    userBudgets = Array.from(mockBudgetsStore.values()).filter(
      (b) => b.userId === userId && (b.period === period || b.period === 'monthly')
    )
  } else {
    try {
      const rows = await db.select().from(budgets).where(eq(budgets.userId, userId))
      userBudgets = rows.filter((b) => b.period === period || b.period === 'monthly')
    } catch {
      userBudgets = Array.from(mockBudgetsStore.values()).filter(
        (b) => b.userId === userId && (b.period === period || b.period === 'monthly')
      )
    }
  }

  if (userBudgets.length === 0) {
    return { alerts: budgetAlerts, recommendations: budgetRecs }
  }

  const categoriesMap = new Map<string, string>()
  if (!db) {
    for (const [id, cat] of mockCategoriesStore.entries()) {
      if (!cat.userId || cat.userId === userId) {
        categoriesMap.set(id, cat.name)
      }
    }
  } else {
    try {
      const catRows = await db.select().from(categories).where(eq(categories.userId, userId))
      for (const cat of catRows) {
        categoriesMap.set(cat.id, cat.name)
      }
    } catch {
      for (const [id, cat] of mockCategoriesStore.entries()) {
        categoriesMap.set(id, cat.name)
      }
    }
  }

  const expensesByCategory = new Map<string, number>()
  if (!db) {
    for (const tx of mockTransactionsStore.values()) {
      if (tx.userId === userId && tx.categoryId) {
        const d = tx.occurredAt || tx.createdAt
        if (d.startsWith(period)) {
          const isExpense = tx.type === 'expense' || (!tx.type && parseFloat(tx.amount) < 0)
          if (isExpense) {
            const val = Math.abs(parseFloat(tx.amount) || 0)
            expensesByCategory.set(tx.categoryId, (expensesByCategory.get(tx.categoryId) || 0) + val)
          }
        }
      }
    }
  } else {
    try {
      const txRows = await db.select().from(transactions).where(eq(transactions.userId, userId))
      for (const r of txRows) {
        if (r.categoryId) {
          const d = r.occurredAt instanceof Date ? r.occurredAt.toISOString() : String(r.occurredAt)
          if (d.startsWith(period)) {
            const val = Math.abs(parseFloat(r.amount) || 0)
            expensesByCategory.set(r.categoryId, (expensesByCategory.get(r.categoryId) || 0) + val)
          }
        }
      }
    } catch {
      for (const tx of mockTransactionsStore.values()) {
        if (tx.userId === userId && tx.categoryId) {
          const d = tx.occurredAt || tx.createdAt
          if (d.startsWith(period)) {
            const isExpense = tx.type === 'expense' || (!tx.type && parseFloat(tx.amount) < 0)
            if (isExpense) {
              const val = Math.abs(parseFloat(tx.amount) || 0)
              expensesByCategory.set(tx.categoryId, (expensesByCategory.get(tx.categoryId) || 0) + val)
            }
          }
        }
      }
    }
  }

  for (const b of userBudgets) {
    const limit = parseFloat(b.amountLimit) || 0
    if (limit <= 0) continue
    const spent = expensesByCategory.get(b.categoryId) || 0
    const pct = Math.round((spent / limit) * 100)
    const catName = categoriesMap.get(b.categoryId) || 'Categoria'

    if (pct >= 100) {
      budgetAlerts.push(
        `Orçamento estourado: a categoria "${catName}" atingiu ${pct}% do limite definido (gasto de R$ ${spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ ${limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
      )
      budgetRecs.push(
        `Contenha imediatamente novos gastos na categoria "${catName}" para reequilibrar o orçamento mensal.`
      )
    } else if (pct >= 75) {
      budgetAlerts.push(
        `Atenção ao orçamento: a categoria "${catName}" já consumiu ${pct}% do teto estipulado.`
      )
      budgetRecs.push(
        `Acompanhe com atenção as saídas em "${catName}" até o encerramento do período.`
      )
    }
  }

  return { alerts: budgetAlerts, recommendations: budgetRecs }
}

interface AiExecutionParams {
  apiKey?: string
  source: 'byok' | 'system' | 'fallback'
  provider: string
  modelName: string
}

/**
 * Resolve a cascata de credenciais de IA:
 * 1. Chave BYOK pessoal (se configurada pelo usuário)
 * 2. Chave corporativa interna (se admin ou pro)
 * 3. Fallback Heurístico Gratuito (para free sem chave)
 */
async function resolveAiExecutionParams(
  userId: string,
  userEmail?: string
): Promise<AiExecutionParams> {
  const isAdminByEmail = userEmail?.toLowerCase() === ADMIN_EMAIL

  // 1. Chave BYOK do usuário em memória
  const memorySetting = mockUserAiSettingsStore.get(userId)
  if (memorySetting?.apiKeyEncrypted) {
    try {
      const apiKey = await decryptApiKey(memorySetting.apiKeyEncrypted)
      return {
        apiKey,
        source: 'byok',
        provider: memorySetting.provider || 'gemini',
        modelName: memorySetting.customModel || 'gemini-1.5-flash'
      }
    } catch {
      // continua para próximo nível
    }
  }

  // 1.1 Chave BYOK no banco de dados se conectado
  const db = getDb()
  if (db) {
    try {
      const settings = await db
        .select()
        .from(userAiSettings)
        .where(eq(userAiSettings.userId, userId))
        .limit(1)

      if (settings.length > 0 && settings[0].apiKeyEncrypted) {
        const apiKey = await decryptApiKey(settings[0].apiKeyEncrypted)
        return {
          apiKey,
          source: 'byok',
          provider: settings[0].provider || 'gemini',
          modelName: settings[0].customModel || 'gemini-1.5-flash'
        }
      }
    } catch {
      // continua
    }
  }

  // 2. Chave corporativa interna (se Admin ou Pro)
  let isPrivileged = isAdminByEmail
  if (!isPrivileged && db) {
    try {
      const userRows = await db
        .select({ role: users.role, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (userRows.length > 0) {
        const r = userRows[0]
        if (
          r.email?.toLowerCase() === ADMIN_EMAIL ||
          r.role === 'admin' ||
          r.role === 'pro'
        ) {
          isPrivileged = true
        }
      }
    } catch {
      // continua
    }
  }

  if (isPrivileged && process.env.GEMINI_API_KEY) {
    return {
      apiKey: process.env.GEMINI_API_KEY,
      source: 'system',
      provider: 'gemini',
      modelName: 'gemini-1.5-flash'
    }
  }

  // 3. Fallback Heurístico Gratuito
  return {
    source: 'fallback',
    provider: 'rules-engine',
    modelName: 'heuristics'
  }
}

// GET /api/v1/insights
insightsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const period = c.req.query('period') || getCurrentPeriod()
  const cacheKey = `${userId}:${period}`

  // 1. Verificar em cache de memória
  const cached = mockInsightsStore.get(cacheKey)
  if (cached) {
    return c.json({ insight: cached })
  }

  // 2. Verificar no banco de dados se conectado
  const db = getDb()
  if (db) {
    try {
      const existing = await db
        .select()
        .from(insights)
        .where(and(eq(insights.userId, userId), eq(insights.period, period)))
        .limit(1)

      if (existing.length > 0) {
        const item = existing[0]
        const metricsSnapshot = item.metricsSnapshot ? JSON.parse(item.metricsSnapshot) : {}
        const record: MockInsightRecord = {
          id: item.id,
          userId: item.userId,
          period: item.period,
          summary: item.summary,
          financialHealthScore: parseFloat(item.financialHealthScore) || 50,
          highlights: item.highlights || [],
          alerts: item.alerts || [],
          recommendations: item.recommendations || [],
          metrics: metricsSnapshot,
          isFallback: item.isFallback,
          source: (item.source as 'byok' | 'system' | 'fallback') || 'fallback',
          provider: item.provider || 'gemini',
          modelName: item.modelName || null,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt?.toISOString() || item.createdAt.toISOString()
        }
        mockInsightsStore.set(cacheKey, record)
        return c.json({ insight: record })
      }
    } catch {
      // continua para geração
    }
  }

  // 3. Resolver credenciais e gerar sob demanda
  const userEmail = (c.get('user') as any)?.email
  const aiParams = await resolveAiExecutionParams(userId, userEmail)
  const txList = await getUserTransactions(userId, period)
  const metrics = calculateMonthlyMetrics(txList)

  const generated = await generateGeminiFinancialInsight({
    metrics,
    period,
    apiKey: aiParams.apiKey,
    source: aiParams.source,
    provider: aiParams.provider,
    modelName: aiParams.modelName
  })

  const budgetFeed = await getBudgetThresholdAlerts(userId, period)

  const newRecord: MockInsightRecord = {
    id: `insight-${Date.now()}`,
    userId,
    period,
    ...generated,
    alerts: [...budgetFeed.alerts, ...(generated.alerts || [])],
    recommendations: [...budgetFeed.recommendations, ...(generated.recommendations || [])],
    metrics: {
      totalIncome: metrics.totalIncome,
      totalExpense: metrics.totalExpense,
      netBalance: metrics.netBalance,
      savingsRate: metrics.savingsRate,
      topCategory: metrics.topCategory
    },
    source: generated.source || aiParams.source,
    provider: generated.provider || aiParams.provider,
    modelName: generated.modelName || aiParams.modelName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  mockInsightsStore.set(cacheKey, newRecord)

  // Persistir no PostgreSQL se disponível
  if (db) {
    try {
      await db.insert(insights).values({
        userId,
        period,
        summary: newRecord.summary,
        financialHealthScore: String(newRecord.financialHealthScore),
        highlights: newRecord.highlights,
        alerts: newRecord.alerts,
        recommendations: newRecord.recommendations,
        metricsSnapshot: JSON.stringify(newRecord.metrics),
        isFallback: newRecord.isFallback,
        source: newRecord.source,
        provider: newRecord.provider,
        modelName: newRecord.modelName
      })
    } catch {
      // cache em memória preservado
    }
  }

  return c.json({ insight: newRecord })
})

// POST /api/v1/insights/generate
insightsRouter.post('/generate', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  let period = getCurrentPeriod()
  try {
    const rawBody = await c.req.json()
    const parsed = generateInsightBodySchema.safeParse(rawBody)
    if (parsed.success && parsed.data.period) {
      period = parsed.data.period
    }
  } catch {
    // Body vazio ou opcional
  }

  const cacheKey = `${userId}:${period}`
  const userEmail = (c.get('user') as any)?.email
  const aiParams = await resolveAiExecutionParams(userId, userEmail)
  const txList = await getUserTransactions(userId, period)
  const metrics = calculateMonthlyMetrics(txList)

  const generated = await generateGeminiFinancialInsight({
    metrics,
    period,
    apiKey: aiParams.apiKey,
    source: aiParams.source,
    provider: aiParams.provider,
    modelName: aiParams.modelName
  })

  const budgetFeed = await getBudgetThresholdAlerts(userId, period)

  const record: MockInsightRecord = {
    id: `insight-${Date.now()}`,
    userId,
    period,
    ...generated,
    alerts: [...budgetFeed.alerts, ...(generated.alerts || [])],
    recommendations: [...budgetFeed.recommendations, ...(generated.recommendations || [])],
    metrics: {
      totalIncome: metrics.totalIncome,
      totalExpense: metrics.totalExpense,
      netBalance: metrics.netBalance,
      savingsRate: metrics.savingsRate,
      topCategory: metrics.topCategory
    },
    source: generated.source || aiParams.source,
    provider: generated.provider || aiParams.provider,
    modelName: generated.modelName || aiParams.modelName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  mockInsightsStore.set(cacheKey, record)

  // Persistir no banco se disponível
  const db = getDb()
  if (db) {
    try {
      await db.insert(insights).values({
        userId,
        period,
        summary: record.summary,
        financialHealthScore: String(record.financialHealthScore),
        highlights: record.highlights,
        alerts: record.alerts,
        recommendations: record.recommendations,
        metricsSnapshot: JSON.stringify(record.metrics),
        isFallback: record.isFallback,
        source: record.source,
        provider: record.provider,
        modelName: record.modelName
      })
    } catch {
      // ok
    }
  }

  return c.json({
    insight: record,
    message: 'Análise financeira atualizada com sucesso!'
  })
})

const subscriptionsQuerySchema = z.object({
  accountId: z.string().uuid('accountId inválido').optional(),
  windowDays: z.coerce.number().int().min(30).max(400).optional()
})

const confirmSubscriptionSchema = z.object({
  transactionId: z.string().uuid('transactionId inválido'),
  frequency: z.enum(['monthly', 'yearly']),
  recurrenceDay: z.number().int().min(1).max(31).optional()
})

const ignoreSubscriptionSchema = z.object({
  normalizedKey: z.string().trim().min(1, 'normalizedKey é obrigatório').max(120)
})

const roundTwoDecimals = (value: number): number => Math.round(value * 100) / 100

const getIgnoredSubscriptionKeys = async (userId: string): Promise<Set<string>> => {
  const db = getDb()
  const prefix = `${userId}:`
  const keys = new Set<string>()

  if (!db) {
    for (const entry of mockSubscriptionIgnoresStore) {
      if (entry.startsWith(prefix)) {
        keys.add(entry.slice(prefix.length))
      }
    }
    return keys
  }

  try {
    const rows = await db
      .select({ normalizedKey: subscriptionIgnores.normalizedKey })
      .from(subscriptionIgnores)
      .where(eq(subscriptionIgnores.userId, userId))

    for (const row of rows) {
      keys.add(row.normalizedKey)
    }
    return keys
  } catch (err) {
    console.error('[insights/subscriptions] Falha ao consultar chaves ignoradas:', err)
    return keys
  }
}

const getUserSubscriptionTransactions = async (
  userId: string,
  windowDays: number,
  accountId?: string
): Promise<SubscriptionTransactionInput[]> => {
  const db = getDb()
  const cutoffDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  if (!db) {
    const list: SubscriptionTransactionInput[] = []
    for (const tx of mockTransactionsStore.values()) {
      if (tx.userId !== userId) continue
      if (accountId && tx.accountId !== accountId) continue

      list.push({
        id: tx.id,
        accountId: tx.accountId,
        categoryId: tx.categoryId ?? null,
        amount: tx.amount,
        description: tx.description,
        occurredAt: tx.occurredAt || tx.createdAt,
        type: tx.type,
        status: tx.status,
        paid: tx.paid,
        isRecurring: tx.isRecurring,
        recurrencePeriod: tx.recurrencePeriod,
        installmentTotal: tx.installmentTotal
      })
    }
    return list
  }

  try {
    const conditions = [
      eq(transactions.userId, userId),
      gte(transactions.occurredAt, cutoffDate)
    ]
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId))
    }

    const rows = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredAt))

    return rows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      categoryId: row.categoryId ?? null,
      amount: row.amount,
      description: row.description,
      occurredAt: row.occurredAt,
      status: row.status,
      paid: row.paid,
      isRecurring: row.isRecurring,
      recurrencePeriod: row.recurrencePeriod,
      installmentTotal: row.installmentTotal
    }))
  } catch (err) {
    console.error('[insights/subscriptions] Falha ao consultar transações:', err)
    return []
  }
}

// GET /api/v1/insights/subscriptions
insightsRouter.get('/subscriptions', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const parsedQuery = subscriptionsQuerySchema.safeParse({
    accountId: c.req.query('accountId'),
    windowDays: c.req.query('windowDays')
  })

  if (!parsedQuery.success) {
    return c.json({ error: 'Parâmetros inválidos', details: parsedQuery.error.flatten() }, 400)
  }

  const windowDays = parsedQuery.data.windowDays ?? 180
  const accountId = parsedQuery.data.accountId

  const [txList, ignoredKeys] = await Promise.all([
    getUserSubscriptionTransactions(userId, windowDays, accountId),
    getIgnoredSubscriptionKeys(userId)
  ])

  const detected = detectRecurringSubscriptions(txList, { windowDays })
  const subscriptions = detected.filter((sub) => !ignoredKeys.has(sub.normalizedKey))

  const totalMonthlyCost = roundTwoDecimals(
    subscriptions.reduce((acc, sub) => acc + sub.monthlyCost, 0)
  )
  const totalAnnualCost = roundTwoDecimals(
    subscriptions.reduce((acc, sub) => acc + sub.annualCost, 0)
  )
  const alertsCount = subscriptions.reduce(
    (acc, sub) => acc + (sub.priceAlert ? 1 : 0) + (sub.duplicateAlert ? 1 : 0),
    0
  )

  return c.json({
    subscriptions,
    summary: {
      totalMonthlyCost,
      totalAnnualCost,
      activeCount: subscriptions.length,
      alertsCount
    },
    generatedAt: new Date().toISOString()
  })
})

// POST /api/v1/insights/subscriptions/confirm
insightsRouter.post('/subscriptions/confirm', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  let rawBody: unknown
  try {
    rawBody = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = confirmSubscriptionSchema.safeParse(rawBody)
  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, 400)
  }

  const { transactionId, frequency, recurrenceDay } = parsed.data
  const db = getDb()

  if (!db) {
    const existing = mockTransactionsStore.get(transactionId)
    if (!existing || existing.userId !== userId) {
      return c.json({ error: 'Transação não encontrada' }, 404)
    }

    const derivedDay =
      recurrenceDay ?? new Date(existing.occurredAt || existing.createdAt).getUTCDate()

    existing.isRecurring = true
    existing.recurrencePeriod = frequency
    existing.recurrenceDay = derivedDay
    mockTransactionsStore.set(transactionId, existing)

    return c.json({
      success: true,
      transaction: {
        id: existing.id,
        isRecurring: true,
        recurrencePeriod: frequency,
        recurrenceDay: derivedDay
      }
    })
  }

  try {
    const existingRows = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .limit(1)

    const existing = existingRows[0]
    if (!existing) {
      return c.json({ error: 'Transação não encontrada' }, 404)
    }

    const derivedDay = recurrenceDay ?? new Date(existing.occurredAt).getUTCDate()

    const updatedRows = await db
      .update(transactions)
      .set({
        isRecurring: true,
        recurrencePeriod: frequency,
        recurrenceDay: derivedDay
      })
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .returning()

    const updated = updatedRows[0] ?? {
      id: existing.id,
      isRecurring: true,
      recurrencePeriod: frequency,
      recurrenceDay: derivedDay
    }

    return c.json({
      success: true,
      transaction: {
        id: updated.id,
        isRecurring: updated.isRecurring,
        recurrencePeriod: updated.recurrencePeriod,
        recurrenceDay: updated.recurrenceDay
      }
    })
  } catch (err) {
    console.error('[insights/subscriptions/confirm] Erro ao atualizar transação:', err)
    return c.json({ error: 'Erro interno ao confirmar assinatura' }, 500)
  }
})

// POST /api/v1/insights/subscriptions/ignore
insightsRouter.post('/subscriptions/ignore', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  let rawBody: unknown
  try {
    rawBody = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = ignoreSubscriptionSchema.safeParse(rawBody)
  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, 400)
  }

  const normalizedKey = parsed.data.normalizedKey.toLowerCase()
  const db = getDb()

  if (!db) {
    mockSubscriptionIgnoresStore.add(`${userId}:${normalizedKey}`)
    return c.json({ success: true, normalizedKey })
  }

  try {
    await db
      .insert(subscriptionIgnores)
      .values({ userId, normalizedKey })
      .onConflictDoNothing()

    return c.json({ success: true, normalizedKey })
  } catch (err) {
    console.error('[insights/subscriptions/ignore] Erro ao ignorar assinatura:', err)
    return c.json({ error: 'Erro interno ao ignorar assinatura' }, 500)
  }
})
