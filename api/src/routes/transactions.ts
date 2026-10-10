import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { transactions, accounts, users } from '../db/schema'
import { eq, desc, asc, sql, and, gte, lte } from 'drizzle-orm'
import { mockAccountsStore } from './accounts'
import type { AuthEnv } from '../middlewares/auth'
import { calculateRecurringDueDate } from '../services/business-days'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const createTransactionSchema = z.object({
  amount: z.number({ required_error: 'amount é obrigatório' }).positive('O valor deve ser positivo'),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  description: z.string().max(255).optional().nullable(),
  accountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  occurredAt: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  paidAt: z.string().optional().nullable(),
  paid: z.boolean().optional(),
  status: z.enum(['completed', 'pending', 'cancelled']).optional(),
  isRecurring: z.boolean().optional(),
  recurrencePeriod: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().nullable(),
  recurrenceDay: z.number().int().min(1).max(31).optional().nullable(),
  adjustBusinessDay: z.boolean().optional(),
  installmentCurrent: z.number().int().positive().optional().nullable(),
  installmentTotal: z.number().int().positive().optional().nullable(),
  parentTransactionId: z.string().optional().nullable()
})

export interface MockTransaction {
  id: string
  userId: string
  accountId: string
  categoryId: string | null
  amount: string
  description: string | null
  paid: boolean
  status?: string
  dueDate?: string | null
  paidAt?: string | null
  isRecurring?: boolean
  recurrencePeriod?: string | null
  recurrenceDay?: number | null
  adjustBusinessDay?: boolean
  installmentCurrent?: number | null
  installmentTotal?: number | null
  parentTransactionId?: string | null
  type?: 'income' | 'expense' | 'transfer'
  occurredAt: string
  createdAt: string
}

// Armazenamento em memória para ambiente de testes unitários ou offline
export const mockTransactionsStore = new Map<string, MockTransaction>([
  [
    'test-tx-1',
    {
      id: 'test-tx-1',
      userId: '00000000-0000-0000-0000-000000000000',
      accountId: '00000000-0000-0000-0000-000000000000',
      categoryId: null,
      amount: '150.00',
      description: 'Almoço Executivo',
      paid: true,
      type: 'expense',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ]
])

export const transactionsRouter = new Hono<AuthEnv>()

transactionsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  const rawPage = parseInt(c.req.query('page') || '1', 10)
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage

  const rawLimit = parseInt(c.req.query('limit') || '20', 10)
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100)

  const accountId = c.req.query('accountId')
  const status = c.req.query('status')
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')
  const dueDateStart = c.req.query('dueDateStart')
  const dueDateEnd = c.req.query('dueDateEnd')
  const scope = c.req.query('scope') // 'current_month' | 'future' | 'all'
  const month = c.req.query('month') // 'YYYY-MM'

  const now = new Date()
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  let targetMonthStart: Date | null = null
  let targetMonthEnd: Date | null = null
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [yStr, mStr] = month.split('-')
    const y = parseInt(yStr, 10)
    const m = parseInt(mStr, 10) - 1
    targetMonthStart = new Date(y, m, 1, 0, 0, 0, 0)
    targetMonthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999)
  }

  if (!db) {
    let filtered = Array.from(mockTransactionsStore.values()).filter((t) => {
      if (userId && t.userId !== userId && t.userId !== '00000000-0000-0000-0000-000000000000') {
        return false
      }
      if (accountId && t.accountId !== accountId) {
        return false
      }
      if (status && t.status !== status) {
        return false
      }
      if (startDate) {
        const pStart = new Date(startDate).getTime()
        if (!isNaN(pStart) && new Date(t.occurredAt).getTime() < pStart) {
          return false
        }
      }
      if (endDate) {
        const pEnd = new Date(endDate).getTime()
        if (!isNaN(pEnd) && new Date(t.occurredAt).getTime() > pEnd) {
          return false
        }
      }
      if (dueDateStart) {
        const pStart = new Date(dueDateStart).getTime()
        if (!isNaN(pStart) && (!t.dueDate || new Date(t.dueDate).getTime() < pStart)) {
          return false
        }
      }
      if (dueDateEnd) {
        const pEnd = new Date(dueDateEnd).getTime()
        if (!isNaN(pEnd) && (!t.dueDate || new Date(t.dueDate).getTime() > pEnd)) {
          return false
        }
      }
      if (scope === 'future') {
        const d = new Date(t.dueDate || t.occurredAt).getTime()
        if (d <= endOfCurrentMonth.getTime()) {
          return false
        }
      } else if (scope === 'current_month') {
        const d = new Date(t.dueDate || t.occurredAt).getTime()
        if (d > endOfCurrentMonth.getTime()) {
          return false
        }
      }
      if (targetMonthStart && targetMonthEnd) {
        const d = new Date(t.dueDate || t.occurredAt).getTime()
        if (d < targetMonthStart.getTime() || d > targetMonthEnd.getTime()) {
          return false
        }
      }
      return true
    })

    if (scope === 'future') {
      filtered.sort((a, b) => {
        const timeA = new Date(a.dueDate || a.occurredAt).getTime()
        const timeB = new Date(b.dueDate || b.occurredAt).getTime()
        return timeA - timeB
      })
    } else {
      filtered.sort((a, b) => {
        const timeA = new Date(a.occurredAt).getTime()
        const timeB = new Date(b.occurredAt).getTime()
        if (timeB !== timeA) return timeB - timeA
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    }

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const offset = (page - 1) * limit
    const paginatedList = filtered.slice(offset, offset + limit)
    const hasMore = page < totalPages

    return c.json({
      data: paginatedList,
      total,
      page,
      limit,
      totalPages,
      hasMore
    })
  }

  try {
    const conditions = []
    if (userId) {
      conditions.push(eq(transactions.userId, userId))
    }
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId))
    }
    if (status) {
      conditions.push(eq(transactions.status, status))
    }
    if (startDate) {
      const pStart = new Date(startDate)
      if (!isNaN(pStart.getTime())) {
        conditions.push(gte(transactions.occurredAt, pStart))
      }
    }
    if (endDate) {
      const pEnd = new Date(endDate)
      if (!isNaN(pEnd.getTime())) {
        conditions.push(lte(transactions.occurredAt, pEnd))
      }
    }
    if (dueDateStart) {
      const pStart = new Date(dueDateStart)
      if (!isNaN(pStart.getTime())) {
        conditions.push(gte(transactions.dueDate, pStart))
      }
    }
    if (dueDateEnd) {
      const pEnd = new Date(dueDateEnd)
      if (!isNaN(pEnd.getTime())) {
        conditions.push(lte(transactions.dueDate, pEnd))
      }
    }
    if (scope === 'future') {
      conditions.push(sql`coalesce(${transactions.dueDate}, ${transactions.occurredAt}) > ${endOfCurrentMonth}`)
    } else if (scope === 'current_month') {
      conditions.push(sql`coalesce(${transactions.dueDate}, ${transactions.occurredAt}) <= ${endOfCurrentMonth}`)
    }
    if (targetMonthStart && targetMonthEnd) {
      conditions.push(sql`coalesce(${transactions.dueDate}, ${transactions.occurredAt}) >= ${targetMonthStart} and coalesce(${transactions.dueDate}, ${transactions.occurredAt}) <= ${targetMonthEnd}`)
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(whereClause)

    const total = countResult?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const offset = (page - 1) * limit
    const hasMore = page < totalPages

    const orderByClause = scope === 'future'
      ? [asc(sql`coalesce(${transactions.dueDate}, ${transactions.occurredAt})`), asc(transactions.createdAt)]
      : [desc(transactions.occurredAt), desc(transactions.createdAt)]

    const list = await db
      .select()
      .from(transactions)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(limit)
      .offset(offset)

    return c.json({
      data: list,
      total,
      page,
      limit,
      totalPages,
      hasMore
    })
  } catch (error: any) {
    console.error('Erro ao buscar transações no banco:', error)
    return c.json({ error: 'Falha ao buscar transações', details: error?.message }, 500)
  }
})

transactionsRouter.post('/', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const result = createTransactionSchema.safeParse(body)
  if (!result.success) {
    return c.json({
      error: 'Dados inválidos',
      details: result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
    }, 400)
  }

  const db = getDb()
  const data = result.data
  const userId = c.get('userId') || '00000000-0000-0000-0000-000000000000'

  // Determina o sinal matemático para o extrato
  let signedAmountNumber = data.amount
  if (data.type === 'expense') {
    signedAmountNumber = -Math.abs(data.amount)
  } else if (data.type === 'income') {
    signedAmountNumber = Math.abs(data.amount)
  }

  // Determina status e paid
  const status = data.status || (data.paid === false ? 'pending' : 'completed')
  const isPaid = status === 'completed'
  const isRecurring = Boolean(data.isRecurring)
  const recurrencePeriod = data.recurrencePeriod || (isRecurring ? 'monthly' : null)
  const recurrenceDay = data.recurrenceDay ?? null
  const adjustBusinessDay = data.adjustBusinessDay ?? false
  const installmentTotal = data.installmentTotal || null

  const installmentCount = installmentTotal && installmentTotal > 1 ? installmentTotal : 1
  const installmentAmountNumber = signedAmountNumber / installmentCount
  const formattedInstallmentAmount = data.type ? installmentAmountNumber.toFixed(2) : (data.amount / installmentCount).toFixed(2)

  if (!db) {
    // Retorno e persistência em memória quando db não está conectado (testes e modo offline)
    const baseOccurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date()
    let baseDueDate: Date | null = null
    if (isRecurring && recurrenceDay) {
      baseDueDate = calculateRecurringDueDate(
        baseOccurredAt.getFullYear(),
        baseOccurredAt.getMonth(),
        recurrenceDay,
        adjustBusinessDay
      )
    } else if (data.dueDate) {
      baseDueDate = new Date(data.dueDate)
    } else if (status === 'pending') {
      baseDueDate = baseOccurredAt
    }

    const createdList: MockTransaction[] = []

    for (let i = 1; i <= installmentCount; i++) {
      const mockId = crypto.randomUUID()

      // Incrementa meses para parcelas futuras
      const itemOccurred = new Date(baseOccurredAt)
      itemOccurred.setMonth(itemOccurred.getMonth() + (i - 1))

      let itemDue: Date | null = null
      if (recurrenceDay) {
        itemDue = calculateRecurringDueDate(
          baseOccurredAt.getFullYear(),
          baseOccurredAt.getMonth() + (i - 1),
          recurrenceDay,
          adjustBusinessDay
        )
      } else if (baseDueDate) {
        itemDue = new Date(baseDueDate)
        itemDue.setMonth(itemDue.getMonth() + (i - 1))
      }

      const itemDesc = installmentCount > 1
        ? `${data.description || 'Transação'} (${i}/${installmentCount})`
        : (data.description ?? null)

      const newTx: MockTransaction = {
        id: mockId,
        userId,
        amount: formattedInstallmentAmount,
        description: itemDesc,
        paid: isPaid,
        status,
        dueDate: itemDue ? itemDue.toISOString() : null,
        paidAt: isPaid ? new Date().toISOString() : null,
        isRecurring,
        recurrencePeriod,
        recurrenceDay,
        adjustBusinessDay,
        installmentCurrent: installmentCount > 1 ? i : null,
        installmentTotal: installmentCount > 1 ? installmentCount : null,
        parentTransactionId: null,
        type: data.type,
        accountId: data.accountId || '00000000-0000-0000-0000-000000000000',
        categoryId: data.categoryId ?? null,
        occurredAt: itemOccurred.toISOString(),
        createdAt: new Date().toISOString()
      }

      mockTransactionsStore.set(mockId, newTx)
      createdList.push(newTx)
    }

    // Apenas afeta o saldo bancário se a transação foi criada como 'completed'
    if (isPaid && data.accountId && mockAccountsStore.has(data.accountId)) {
      const acc = mockAccountsStore.get(data.accountId)!
      const cur = Number(acc.balance) || 0
      acc.balance = (cur + signedAmountNumber).toFixed(2)
    }

    return c.json(createdList[0], 201)
  }

  try {
    // 1. Garante a integridade do usuário em public.users
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
    if (existingUser.length === 0) {
      const authUser = c.get('user')
      await db.insert(users).values({
        id: userId,
        email: authUser?.email || `${userId}@dinheirizz.com`,
        fullName: (authUser?.user_metadata as any)?.full_name || null,
        username: (authUser?.user_metadata as any)?.username || null,
        provider: 'email',
        providers: ['email'],
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing()
    }

    // 2. Garante conta válida do usuário em public.accounts
    let targetAccountId = data.accountId && UUID_REGEX.test(data.accountId) ? data.accountId : null
    if (targetAccountId) {
      const match = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(sql`${accounts.id} = ${targetAccountId} and ${accounts.userId} = ${userId}`)
        .limit(1)
      if (match.length === 0) {
        targetAccountId = null
      }
    }

    if (!targetAccountId) {
      const defaultAcc = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .limit(1)

      if (defaultAcc.length > 0) {
        targetAccountId = defaultAcc[0].id
      } else {
        // Auto-provisionamento de conta padrão para o usuário
        const [newAcc] = await db.insert(accounts).values({
          userId,
          name: 'Conta Principal',
          type: 'checking',
          balance: '0.00'
        }).returning({ id: accounts.id })
        targetAccountId = newAcc.id
      }
    }

    // 3. Sanitização de categoria (garante UUID válido para Postgres)
    const validCategoryId = data.categoryId && UUID_REGEX.test(data.categoryId) ? data.categoryId : null

    // 4. Inserção das transações (suporte a parcelas)
    const baseOccurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date()
    let baseDueDate: Date | null = null
    if (isRecurring && recurrenceDay) {
      baseDueDate = calculateRecurringDueDate(
        baseOccurredAt.getFullYear(),
        baseOccurredAt.getMonth(),
        recurrenceDay,
        adjustBusinessDay
      )
    } else if (data.dueDate) {
      baseDueDate = new Date(data.dueDate)
    } else if (status === 'pending') {
      baseDueDate = baseOccurredAt
    }

    const insertPayloads = []
    for (let i = 1; i <= installmentCount; i++) {
      const itemOccurred = new Date(baseOccurredAt)
      itemOccurred.setMonth(itemOccurred.getMonth() + (i - 1))

      let itemDue: Date | null = null
      if (recurrenceDay) {
        itemDue = calculateRecurringDueDate(
          baseOccurredAt.getFullYear(),
          baseOccurredAt.getMonth() + (i - 1),
          recurrenceDay,
          adjustBusinessDay
        )
      } else if (baseDueDate) {
        itemDue = new Date(baseDueDate)
        itemDue.setMonth(itemDue.getMonth() + (i - 1))
      }

      const itemDesc = installmentCount > 1
        ? `${data.description || 'Transação'} (${i}/${installmentCount})`
        : (data.description ?? null)

      insertPayloads.push({
        userId,
        accountId: targetAccountId,
        categoryId: validCategoryId,
        amount: formattedInstallmentAmount,
        description: itemDesc,
        paid: isPaid,
        status,
        dueDate: itemDue,
        paidAt: isPaid ? new Date() : null,
        isRecurring,
        recurrencePeriod,
        recurrenceDay,
        adjustBusinessDay,
        installmentCurrent: installmentCount > 1 ? i : null,
        installmentTotal: installmentCount > 1 ? installmentCount : null,
        occurredAt: itemOccurred
      })
    }

    const inserted = await db.insert(transactions).values(insertPayloads).returning()

    // 5. Atualização atômica do saldo da conta APENAS se for concluída
    if (isPaid) {
      await db
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${formattedInstallmentAmount}` })
        .where(eq(accounts.id, targetAccountId))
    }

    return c.json(inserted[0], 201)
  } catch (error: any) {
    return c.json({ error: 'Erro ao persistir transação', details: error?.message }, 500)
  }
})

// PATCH /api/v1/transactions/:id/pay - Conciliação e Baixa Rápida
transactionsRouter.patch('/:id/pay', async (c) => {
  const id = c.req.param('id')
  const db = getDb()

  if (!db) {
    const tx = mockTransactionsStore.get(id)
    if (!tx) {
      return c.json({ error: 'Transação não encontrada' }, 404)
    }

    tx.status = 'completed'
    tx.paid = true
    tx.paidAt = new Date().toISOString()

    // Credita/debita conta vinculada
    let newBalanceStr = '0.00'
    if (tx.accountId && mockAccountsStore.has(tx.accountId)) {
      const acc = mockAccountsStore.get(tx.accountId)!
      const cur = Number(acc.balance) || 0
      acc.balance = (cur + Number(tx.amount)).toFixed(2)
      newBalanceStr = acc.balance
    }

    // Se for recorrente contínua (sem limite de parcelas), gera próxima ocorrência para o mês seguinte
    let nextRecurringTransaction = null
    if (tx.isRecurring && !tx.installmentTotal) {
      const nextOccurred = new Date(tx.occurredAt)
      nextOccurred.setMonth(nextOccurred.getMonth() + 1)

      let nextDue: Date | null = null
      if (tx.recurrenceDay) {
        nextDue = calculateRecurringDueDate(
          nextOccurred.getFullYear(),
          nextOccurred.getMonth(),
          tx.recurrenceDay,
          !!tx.adjustBusinessDay
        )
      } else if (tx.dueDate) {
        nextDue = new Date(tx.dueDate)
        nextDue.setMonth(nextDue.getMonth() + 1)
      } else {
        nextDue = nextOccurred
      }

      const nextId = crypto.randomUUID()
      nextRecurringTransaction = {
        id: nextId,
        userId: tx.userId,
        accountId: tx.accountId,
        categoryId: tx.categoryId,
        amount: tx.amount,
        description: tx.description,
        paid: false,
        status: 'pending',
        dueDate: nextDue ? nextDue.toISOString() : null,
        paidAt: null,
        isRecurring: true,
        recurrencePeriod: tx.recurrencePeriod || 'monthly',
        recurrenceDay: tx.recurrenceDay ?? null,
        adjustBusinessDay: tx.adjustBusinessDay ?? false,
        type: tx.type,
        occurredAt: nextOccurred.toISOString(),
        createdAt: new Date().toISOString()
      }
      mockTransactionsStore.set(nextId, nextRecurringTransaction)
    }

    return c.json({
      success: true,
      transaction: tx,
      account: {
        id: tx.accountId,
        newBalance: newBalanceStr
      },
      nextRecurringTransaction
    }, 200)
  }

  try {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1)
    if (!tx) {
      return c.json({ error: 'Transação não encontrada' }, 404)
    }

    const now = new Date()
    const [updatedTx] = await db
      .update(transactions)
      .set({
        status: 'completed',
        paid: true,
        paidAt: now
      })
      .where(eq(transactions.id, id))
      .returning()

    // Atualiza saldo bancário da conta
    const [updatedAcc] = await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${tx.amount}` })
      .where(eq(accounts.id, tx.accountId))
      .returning({ id: accounts.id, balance: accounts.balance })

    // Se for recorrente fixa, projeta a próxima ocorrência
    let nextRecurring = null
    if (tx.isRecurring && !tx.installmentTotal) {
      const nextOccurred = new Date(tx.occurredAt)
      nextOccurred.setMonth(nextOccurred.getMonth() + 1)

      let nextDue: Date | null = null
      if (tx.recurrenceDay) {
        nextDue = calculateRecurringDueDate(
          nextOccurred.getFullYear(),
          nextOccurred.getMonth(),
          tx.recurrenceDay,
          !!tx.adjustBusinessDay
        )
      } else if (tx.dueDate) {
        nextDue = new Date(tx.dueDate)
        nextDue.setMonth(nextDue.getMonth() + 1)
      } else {
        nextDue = nextOccurred
      }

      const [createdNext] = await db.insert(transactions).values({
        userId: tx.userId,
        accountId: tx.accountId,
        categoryId: tx.categoryId,
        amount: tx.amount,
        description: tx.description,
        paid: false,
        status: 'pending',
        dueDate: nextDue,
        paidAt: null,
        isRecurring: true,
        recurrencePeriod: tx.recurrencePeriod || 'monthly',
        recurrenceDay: tx.recurrenceDay,
        adjustBusinessDay: tx.adjustBusinessDay,
        occurredAt: nextOccurred
      }).returning()

      nextRecurring = createdNext
    }

    return c.json({
      success: true,
      transaction: updatedTx,
      account: {
        id: updatedAcc.id,
        newBalance: updatedAcc.balance
      },
      nextRecurringTransaction: nextRecurring
    }, 200)
  } catch (error: any) {
    return c.json({ error: 'Erro ao conciliar transação', details: error?.message }, 500)
  }
})

transactionsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb()

  if (!db) {
    const tx = mockTransactionsStore.get(id)
    if (tx && tx.accountId && mockAccountsStore.has(tx.accountId)) {
      const acc = mockAccountsStore.get(tx.accountId)!
      const cur = Number(acc.balance) || 0
      acc.balance = (cur - Number(tx.amount)).toFixed(2)
    }
    mockTransactionsStore.delete(id)
    return c.json({ success: true, id })
  }

  try {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1)
    if (tx) {
      await db.delete(transactions).where(eq(transactions.id, id))
      if (tx.accountId) {
        await db
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${tx.amount}` })
          .where(eq(accounts.id, tx.accountId))
      }
    }
    return c.json({ success: true, id })
  } catch {
    return c.json({ error: 'Erro ao deletar transação' }, 500)
  }
})
