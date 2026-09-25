import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { insights, transactions } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { AuthEnv } from '../middlewares/auth'
import {
  calculateMonthlyMetrics,
  type FinancialTransactionInput
} from '../services/financial-analytics'
import {
  generateGeminiFinancialInsight,
  type GeneratedInsight
} from '../services/gemini'
import { mockTransactionsStore } from './transactions'

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
  createdAt: string
  updatedAt: string
}

// Armazenamento em memória para ambiente de testes unitários ou offline
export const mockInsightsStore = new Map<string, MockInsightRecord>()

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
        // Se a data da transação bater com o período (YYYY-MM)
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

  // 3. Se não existe insight para o período, gera sob demanda
  const txList = await getUserTransactions(userId, period)
  const metrics = calculateMonthlyMetrics(txList)
  const generated = await generateGeminiFinancialInsight({
    metrics,
    period
  })

  const newRecord: MockInsightRecord = {
    id: `insight-${Date.now()}`,
    userId,
    period,
    ...generated,
    metrics: {
      totalIncome: metrics.totalIncome,
      totalExpense: metrics.totalExpense,
      netBalance: metrics.netBalance,
      savingsRate: metrics.savingsRate,
      topCategory: metrics.topCategory
    },
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
        isFallback: newRecord.isFallback
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
  const txList = await getUserTransactions(userId, period)
  const metrics = calculateMonthlyMetrics(txList)
  const generated = await generateGeminiFinancialInsight({
    metrics,
    period
  })

  const record: MockInsightRecord = {
    id: `insight-${Date.now()}`,
    userId,
    period,
    ...generated,
    metrics: {
      totalIncome: metrics.totalIncome,
      totalExpense: metrics.totalExpense,
      netBalance: metrics.netBalance,
      savingsRate: metrics.savingsRate,
      topCategory: metrics.topCategory
    },
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
        isFallback: record.isFallback
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
