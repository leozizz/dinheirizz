import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { transactions, accounts, users } from '../db/schema'
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm'
import { mockAccountsStore } from './accounts'
import type { AuthEnv } from '../middlewares/auth'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const createTransactionSchema = z.object({
  amount: z.number({ required_error: 'amount é obrigatório' }).positive('O valor deve ser positivo'),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  description: z.string().max(255).optional().nullable(),
  accountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  occurredAt: z.string().optional(),
  paid: z.boolean().optional().default(true)
})

export interface MockTransaction {
  id: string
  userId: string
  accountId: string
  categoryId: string | null
  amount: string
  description: string | null
  paid: boolean
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
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')

  if (!db) {
    let filtered = Array.from(mockTransactionsStore.values()).filter((t) => {
      if (userId && t.userId !== userId && t.userId !== '00000000-0000-0000-0000-000000000000') {
        return false
      }
      if (accountId && t.accountId !== accountId) {
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
      return true
    })

    filtered.sort((a, b) => {
      const timeA = new Date(a.occurredAt).getTime()
      const timeB = new Date(b.occurredAt).getTime()
      if (timeB !== timeA) return timeB - timeA
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(whereClause)

    const total = countResult?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const offset = (page - 1) * limit
    const hasMore = page < totalPages

    const list = await db
      .select()
      .from(transactions)
      .where(whereClause)
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
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
  } catch (error) {
    return c.json({ error: 'Falha ao buscar transações' }, 500)
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

  // Se type não foi enviado (ex: testes legados), preserva positivo para compatibilidade com assertions
  const formattedAmount = data.type ? signedAmountNumber.toFixed(2) : data.amount.toFixed(2)

  if (!db) {
    // Retorno e persistência em memória quando db não está conectado (testes e modo offline)
    const mockId = crypto.randomUUID()
    const newTx: MockTransaction = {
      id: mockId,
      userId,
      amount: formattedAmount,
      description: data.description ?? null,
      paid: data.paid,
      type: data.type,
      accountId: data.accountId || '00000000-0000-0000-0000-000000000000',
      categoryId: data.categoryId ?? null,
      occurredAt: data.occurredAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
    if (data.accountId && mockAccountsStore.has(data.accountId)) {
      const acc = mockAccountsStore.get(data.accountId)!
      const cur = Number(acc.balance) || 0
      acc.balance = (cur + signedAmountNumber).toFixed(2)
    }
    mockTransactionsStore.set(mockId, newTx)
    return c.json(newTx, 201)
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

    // 4. Inserção persistente da transação
    const inserted = await db.insert(transactions).values({
      userId,
      accountId: targetAccountId,
      categoryId: validCategoryId,
      amount: formattedAmount,
      description: data.description ?? null,
      paid: data.paid,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date()
    }).returning()

    // 5. Atualização atômica do saldo da conta
    await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${formattedAmount}` })
      .where(eq(accounts.id, targetAccountId))

    return c.json(inserted[0], 201)
  } catch (error: any) {
    return c.json({ error: 'Erro ao persistir transação', details: error?.message }, 500)
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
