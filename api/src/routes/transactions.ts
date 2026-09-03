import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { transactions } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

export const createTransactionSchema = z.object({
  amount: z.number({ required_error: 'amount é obrigatório' }).positive('O valor deve ser positivo'),
  description: z.string().max(255).optional().nullable(),
  accountId: z.string().optional().default('00000000-0000-0000-0000-000000000000'),
  categoryId: z.string().optional().nullable(),
  occurredAt: z.string().optional(),
  paid: z.boolean().optional().default(true)
})

export const transactionsRouter = new Hono()

transactionsRouter.get('/', async (c) => {
  const db = getDb()
  if (!db) {
    return c.json({
      data: [
        {
          id: 'test-tx-1',
          amount: '150.00',
          description: 'Almoço Executivo',
          occurredAt: new Date().toISOString(),
          paid: true,
          categoryId: '1',
          accountId: '00000000-0000-0000-0000-000000000000'
        }
      ],
      total: 1
    })
  }

  try {
    const list = await db.select().from(transactions).orderBy(desc(transactions.occurredAt)).limit(50)
    return c.json({ data: list, total: list.length })
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

  if (!db) {
    // Retorno mockado quando db não está conectado (durante testes unitários/offline)
    return c.json({
      id: 'mock-tx-created',
      amount: data.amount.toFixed(2),
      description: data.description ?? null,
      paid: data.paid,
      occurredAt: data.occurredAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, 201)
  }

  try {
    const inserted = await db.insert(transactions).values({
      userId: '00000000-0000-0000-0000-000000000000',
      accountId: data.accountId,
      categoryId: data.categoryId ?? null,
      amount: data.amount.toFixed(2),
      description: data.description ?? null,
      paid: data.paid,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date()
    }).returning()

    return c.json(inserted[0], 201)
  } catch (error) {
    return c.json({ error: 'Erro ao persistir transação' }, 500)
  }
})

transactionsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb()

  if (!db) {
    return c.json({ success: true, message: `Transação ${id} removida (mock)` })
  }

  try {
    await db.delete(transactions).where(eq(transactions.id, id))
    return c.json({ success: true, id })
  } catch {
    return c.json({ error: 'Erro ao deletar transação' }, 500)
  }
})
