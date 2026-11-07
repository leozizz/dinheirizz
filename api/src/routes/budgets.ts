import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { budgets, categories, transactions } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { mockCategoriesStore } from './categories'
import { mockTransactionsStore } from './transactions'
import type { AuthEnv } from '../middlewares/auth'

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid('ID de categoria deve ser um UUID válido'),
  amountLimit: z.number().positive('O valor limite deve ser maior que zero'),
  period: z.string().optional().default('monthly')
})

export const updateBudgetSchema = z.object({
  amountLimit: z.number().positive('O valor limite deve ser maior que zero')
})

export interface MockBudgetRecord {
  id: string
  userId: string
  categoryId: string
  amountLimit: string
  period: string
  createdAt: string
  updatedAt: string
}

export const mockBudgetsStore = new Map<string, MockBudgetRecord>()

export const budgetsRouter = new Hono<AuthEnv>()

const getCurrentPeriod = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export interface BudgetProgressItem {
  id: string
  categoryId: string
  categoryName: string
  categoryColor: string | null
  categoryIcon: string | null
  amountLimit: number
  spentAmount: number
  remainingAmount: number
  percentageUsed: number
  isOverBudget: boolean
  status: 'normal' | 'warning' | 'exceeded'
}

export interface BudgetSummaryResponse {
  period: string
  totalBudgetLimit: number
  totalSpent: number
  totalRemaining: number
  overallPercentageUsed: number
  budgets: BudgetProgressItem[]
}

// GET /api/v1/budgets
budgetsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const requestedPeriod = c.req.query('period') || getCurrentPeriod()
  const db = getDb()

  // 1. Obter orçamentos
  let userBudgets: Array<{
    id: string
    userId: string
    categoryId: string
    amountLimit: string
    period: string
  }> = []

  if (!db) {
    userBudgets = Array.from(mockBudgetsStore.values()).filter(
      (b) => b.userId === userId && (b.period === requestedPeriod || b.period === 'monthly')
    )
  } else {
    try {
      const rows = await db
        .select()
        .from(budgets)
        .where(eq(budgets.userId, userId))

      userBudgets = rows.filter(
        (b) => b.period === requestedPeriod || b.period === 'monthly'
      )
    } catch {
      userBudgets = Array.from(mockBudgetsStore.values()).filter(
        (b) => b.userId === userId && (b.period === requestedPeriod || b.period === 'monthly')
      )
    }
  }

  // 2. Mapeamento de categorias
  const categoriesMap = new Map<string, { name: string; color: string | null; icon: string | null }>()
  if (!db) {
    for (const [id, cat] of mockCategoriesStore.entries()) {
      if (cat.userId === userId) {
        categoriesMap.set(id, { name: cat.name, color: cat.color || null, icon: cat.icon || null })
      }
    }
  } else {
    try {
      const catRows = await db
        .select()
        .from(categories)
        .where(eq(categories.userId, userId))
      for (const cat of catRows) {
        categoriesMap.set(cat.id, { name: cat.name, color: cat.color || null, icon: cat.icon || null })
      }
    } catch {
      for (const [id, cat] of mockCategoriesStore.entries()) {
        if (cat.userId === userId) {
          categoriesMap.set(id, { name: cat.name, color: cat.color || null, icon: cat.icon || null })
        }
      }
    }
  }

  // 3. Agregar despesas do período por categoria
  const expensesByCategory = new Map<string, number>()

  if (!db) {
    for (const tx of mockTransactionsStore.values()) {
      if (tx.userId === userId && tx.categoryId) {
        const txDate = tx.occurredAt || tx.createdAt
        if (txDate.startsWith(requestedPeriod)) {
          const isExpense = tx.type === 'expense' || (!tx.type && parseFloat(tx.amount) < 0)
          if (isExpense) {
            const val = Math.abs(parseFloat(tx.amount) || 0)
            expensesByCategory.set(
              tx.categoryId,
              (expensesByCategory.get(tx.categoryId) || 0) + val
            )
          }
        }
      }
    }
  } else {
    try {
      const txRows = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.occurredAt))

      for (const r of txRows) {
        if (r.categoryId) {
          const d = r.occurredAt instanceof Date ? r.occurredAt.toISOString() : String(r.occurredAt)
          if (d.startsWith(requestedPeriod)) {
            const rawAmount = parseFloat(r.amount) || 0
            // No Dinheirizz, despesas na tabela podem ter amount positivo e estarem marcadas ou serem tratadas como débito
            const val = Math.abs(rawAmount)
            expensesByCategory.set(
              r.categoryId,
              (expensesByCategory.get(r.categoryId) || 0) + val
            )
          }
        }
      }
    } catch {
      for (const tx of mockTransactionsStore.values()) {
        if (tx.userId === userId && tx.categoryId) {
          const txDate = tx.occurredAt || tx.createdAt
          if (txDate.startsWith(requestedPeriod)) {
            const isExpense = tx.type === 'expense' || (!tx.type && parseFloat(tx.amount) < 0)
            if (isExpense) {
              const val = Math.abs(parseFloat(tx.amount) || 0)
              expensesByCategory.set(
                tx.categoryId,
                (expensesByCategory.get(tx.categoryId) || 0) + val
              )
            }
          }
        }
      }
    }
  }

  // 4. Montar lista de envelopes e totais
  let totalBudgetLimit = 0
  let totalSpent = 0

  const items: BudgetProgressItem[] = userBudgets.map((b) => {
    const limit = parseFloat(b.amountLimit) || 0
    const spent = Math.round((expensesByCategory.get(b.categoryId) || 0) * 100) / 100
    const remaining = Math.max(0, Math.round((limit - spent) * 100) / 100)
    const percentage = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0
    const isOver = spent >= limit

    let status: 'normal' | 'warning' | 'exceeded' = 'normal'
    if (percentage >= 100) {
      status = 'exceeded'
    } else if (percentage >= 75) {
      status = 'warning'
    }

    totalBudgetLimit += limit
    totalSpent += spent

    const catInfo = categoriesMap.get(b.categoryId)

    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: catInfo?.name || 'Categoria',
      categoryColor: catInfo?.color || null,
      categoryIcon: catInfo?.icon || null,
      amountLimit: limit,
      spentAmount: spent,
      remainingAmount: remaining,
      percentageUsed: percentage,
      isOverBudget: isOver,
      status
    }
  })

  totalBudgetLimit = Math.round(totalBudgetLimit * 100) / 100
  totalSpent = Math.round(totalSpent * 100) / 100
  const totalRemaining = Math.max(0, Math.round((totalBudgetLimit - totalSpent) * 100) / 100)
  const overallPercentageUsed = totalBudgetLimit > 0
    ? Math.round((totalSpent / totalBudgetLimit) * 1000) / 10
    : 0

  const response: BudgetSummaryResponse = {
    period: requestedPeriod,
    totalBudgetLimit,
    totalSpent,
    totalRemaining,
    overallPercentageUsed,
    budgets: items
  }

  return c.json(response)
})

// POST /api/v1/budgets
budgetsRouter.post('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = createBudgetSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      },
      400
    )
  }

  const { categoryId, amountLimit, period = 'monthly' } = parsed.data
  const db = getDb()

  if (!db) {
    // Verificar se já existe na mock store para upsert
    let existingId: string | null = null
    for (const [id, item] of mockBudgetsStore.entries()) {
      if (item.userId === userId && item.categoryId === categoryId && item.period === period) {
        existingId = id
        break
      }
    }

    if (existingId) {
      const existing = mockBudgetsStore.get(existingId)!
      const updated: MockBudgetRecord = {
        ...existing,
        amountLimit: String(amountLimit),
        updatedAt: new Date().toISOString()
      }
      mockBudgetsStore.set(existingId, updated)
      return c.json(
        {
          budget: {
            ...updated,
            amountLimit: parseFloat(updated.amountLimit)
          }
        },
        200
      )
    }

    const newId = `budget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const newRecord: MockBudgetRecord = {
      id: newId,
      userId,
      categoryId,
      amountLimit: String(amountLimit),
      period,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockBudgetsStore.set(newId, newRecord)

    return c.json(
      {
        budget: {
          ...newRecord,
          amountLimit: parseFloat(newRecord.amountLimit)
        }
      },
      201
    )
  }

  try {
    // Verificar se existe para fazer upsert
    const existing = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.categoryId, categoryId),
          eq(budgets.period, period)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      const updated = await db
        .update(budgets)
        .set({
          amountLimit: String(amountLimit),
          updatedAt: new Date()
        })
        .where(eq(budgets.id, existing[0].id))
        .returning()

      return c.json(
        {
          budget: {
            ...updated[0],
            amountLimit: parseFloat(updated[0].amountLimit)
          }
        },
        200
      )
    }

    const created = await db
      .insert(budgets)
      .values({
        userId,
        categoryId,
        amountLimit: String(amountLimit),
        period
      })
      .returning()

    return c.json(
      {
        budget: {
          ...created[0],
          amountLimit: parseFloat(created[0].amountLimit)
        }
      },
      201
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: 'Erro ao salvar orçamento', message }, 500)
  }
})

// PUT /api/v1/budgets/:id
budgetsRouter.put('/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const budgetId = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = updateBudgetSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      },
      400
    )
  }

  const { amountLimit } = parsed.data
  const db = getDb()

  if (!db) {
    const existing = mockBudgetsStore.get(budgetId)
    if (!existing || existing.userId !== userId) {
      return c.json({ error: 'Orçamento não encontrado' }, 404)
    }

    const updated: MockBudgetRecord = {
      ...existing,
      amountLimit: String(amountLimit),
      updatedAt: new Date().toISOString()
    }
    mockBudgetsStore.set(budgetId, updated)

    return c.json({
      budget: {
        ...updated,
        amountLimit: parseFloat(updated.amountLimit)
      }
    })
  }

  try {
    const updated = await db
      .update(budgets)
      .set({
        amountLimit: String(amountLimit),
        updatedAt: new Date()
      })
      .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)))
      .returning()

    if (updated.length === 0) {
      return c.json({ error: 'Orçamento não encontrado' }, 404)
    }

    return c.json({
      budget: {
        ...updated[0],
        amountLimit: parseFloat(updated[0].amountLimit)
      }
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: 'Erro ao atualizar orçamento', message }, 500)
  }
})

// DELETE /api/v1/budgets/:id
budgetsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const budgetId = c.req.param('id')
  const db = getDb()

  if (!db) {
    const existing = mockBudgetsStore.get(budgetId)
    if (!existing || existing.userId !== userId) {
      return c.json({ error: 'Orçamento não encontrado' }, 404)
    }

    mockBudgetsStore.delete(budgetId)
    return c.json({ success: true, message: 'Orçamento removido com sucesso' })
  }

  try {
    const deleted = await db
      .delete(budgets)
      .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)))
      .returning()

    if (deleted.length === 0) {
      return c.json({ error: 'Orçamento não encontrado' }, 404)
    }

    return c.json({ success: true, message: 'Orçamento removido com sucesso' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: 'Erro ao excluir orçamento', message }, 500)
  }
})
