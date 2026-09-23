import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { accounts, transactions } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { AuthEnv } from '../middlewares/auth'
import { mockAccountsStore } from './accounts'
import { mockTransactionsStore } from './transactions'

export const createTransferSchema = z.object({
  fromAccountId: z.string({ required_error: 'Conta de origem é obrigatória' }).min(1),
  toAccountId: z.string({ required_error: 'Conta de destino é obrigatória' }).min(1),
  amount: z.number({ required_error: 'Valor é obrigatório' }).positive('O valor deve ser positivo'),
  description: z.string().max(255).optional().nullable(),
  occurredAt: z.string().optional()
})

export const transfersRouter = new Hono<AuthEnv>()

transfersRouter.post('/', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const result = createTransferSchema.safeParse(body)
  if (!result.success) {
    return c.json({
      error: 'Dados inválidos',
      details: result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
    }, 400)
  }

  const data = result.data
  const userId = c.get('userId')

  if (data.fromAccountId === data.toAccountId) {
    return c.json({ error: 'Contas de origem e destino devem ser diferentes' }, 400)
  }

  const db = getDb()
  const occurredAtDate = data.occurredAt ? new Date(data.occurredAt) : new Date()

  if (!db) {
    // Modo Offline / Mock Store
    const originAcc = mockAccountsStore.get(data.fromAccountId)
    const destAcc = mockAccountsStore.get(data.toAccountId)

    if (!originAcc || !destAcc) {
      return c.json({ error: 'Conta de origem ou destino não encontrada' }, 404)
    }

    const currentOriginBalance = Number(originAcc.balance) || 0
    if (currentOriginBalance < data.amount) {
      return c.json({ error: 'Saldo insuficiente na conta de origem' }, 400)
    }

    // Debita da conta de origem e credita na de destino
    const newOriginBalance = (currentOriginBalance - data.amount).toFixed(2)
    const currentDestBalance = Number(destAcc.balance) || 0
    const newDestBalance = (currentDestBalance + data.amount).toFixed(2)

    originAcc.balance = newOriginBalance
    destAcc.balance = newDestBalance

    const fromTxId = crypto.randomUUID()
    const toTxId = crypto.randomUUID()
    const descText = data.description?.trim() ? `: ${data.description.trim()}` : ''

    const fromTx = {
      id: fromTxId,
      userId,
      accountId: data.fromAccountId,
      categoryId: null,
      amount: (-data.amount).toFixed(2),
      description: `Transferência enviada${descText}`,
      paid: true,
      type: 'transfer' as const,
      occurredAt: occurredAtDate.toISOString(),
      createdAt: new Date().toISOString()
    }

    const toTx = {
      id: toTxId,
      userId,
      accountId: data.toAccountId,
      categoryId: null,
      amount: data.amount.toFixed(2),
      description: `Transferência recebida${descText}`,
      paid: true,
      type: 'transfer' as const,
      occurredAt: occurredAtDate.toISOString(),
      createdAt: new Date().toISOString()
    }

    mockTransactionsStore.set(fromTxId, fromTx)
    mockTransactionsStore.set(toTxId, toTx)

    return c.json({
      success: true,
      fromTransaction: fromTx,
      toTransaction: toTx
    }, 201)
  }

  try {
    // Busca e valida contas no PostgreSQL
    const originAccs = await db.select().from(accounts).where(and(eq(accounts.id, data.fromAccountId), eq(accounts.userId, userId))).limit(1)
    const destAccs = await db.select().from(accounts).where(and(eq(accounts.id, data.toAccountId), eq(accounts.userId, userId))).limit(1)

    if (originAccs.length === 0 || destAccs.length === 0) {
      return c.json({ error: 'Conta de origem ou destino não encontrada' }, 404)
    }

    const originAcc = originAccs[0]
    const destAcc = destAccs[0]

    const originBalanceNum = Number(originAcc.balance) || 0
    if (originBalanceNum < data.amount) {
      return c.json({ error: 'Saldo insuficiente na conta de origem' }, 400)
    }

    const descText = data.description?.trim() ? `: ${data.description.trim()}` : ''

    // Atualização atômica de saldos e inserção das transações
    const [updatedOrigin] = await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${data.amount.toFixed(2)}` })
      .where(eq(accounts.id, data.fromAccountId))
      .returning()

    const [updatedDest] = await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${data.amount.toFixed(2)}` })
      .where(eq(accounts.id, data.toAccountId))
      .returning()

    const [fromTx] = await db
      .insert(transactions)
      .values({
        userId,
        accountId: data.fromAccountId,
        amount: (-data.amount).toFixed(2),
        description: `Transferência enviada${descText}`,
        paid: true,
        occurredAt: occurredAtDate
      })
      .returning()

    const [toTx] = await db
      .insert(transactions)
      .values({
        userId,
        accountId: data.toAccountId,
        amount: data.amount.toFixed(2),
        description: `Transferência recebida${descText}`,
        paid: true,
        occurredAt: occurredAtDate
      })
      .returning()

    return c.json({
      success: true,
      fromTransaction: fromTx,
      toTransaction: toTx,
      originBalance: updatedOrigin.balance,
      destBalance: updatedDest.balance
    }, 201)
  } catch (error: any) {
    return c.json({ error: 'Erro ao processar transferência', details: error?.message }, 500)
  }
})
