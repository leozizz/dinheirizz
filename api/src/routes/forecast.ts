import { Hono } from 'hono'
import { getDb } from '../db/client'
import { accounts, transactions } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { mockAccountsStore } from './accounts'
import { mockTransactionsStore } from './transactions'
import type { AuthEnv } from '../middlewares/auth'
import { calculateCashFlowForecast, type TransactionForecastInput } from '../services/forecast'
import { parseProfileIdQuery } from '../lib/profileFilter'

export const forecastRouter = new Hono<AuthEnv>()

forecastRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const daysParam = c.req.query('days')
  const accountId = c.req.query('accountId')
  const parsedProfile = parseProfileIdQuery(c.req.query('profileId'))
  if (!parsedProfile.valid) {
    return c.json({ error: 'Parâmetro profileId inválido' }, 400)
  }
  const days = daysParam === '60' ? 60 : 30

  const db = getDb()

  let initialBalance = 0
  const historyTxList: TransactionForecastInput[] = []
  const pendingTxList: TransactionForecastInput[] = []

  if (!db) {
    const userAccounts = Array.from(mockAccountsStore.values()).filter(
      (a) =>
        (a.userId === userId || a.userId === '00000000-0000-0000-0000-000000000000') &&
        (!accountId || a.id === accountId) &&
        (!parsedProfile.profileId || a.profileId === parsedProfile.profileId)
    )
    initialBalance = userAccounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0)

    const allTx = Array.from(mockTransactionsStore.values()).filter(
      (t) =>
        (t.userId === userId || t.userId === '00000000-0000-0000-0000-000000000000') &&
        (!accountId || t.accountId === accountId) &&
        (!parsedProfile.profileId || t.profileId === parsedProfile.profileId)
    )

    for (const t of allTx) {
      const isPaid = t.paid === true && t.status !== 'pending'
      const isPending = t.status === 'pending' || t.paid === false
      const numAmount = parseFloat(t.amount) || 0
      const txInput: TransactionForecastInput = {
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
        historyTxList.push(txInput)
      } else if (isPending && t.status !== 'cancelled') {
        pendingTxList.push(txInput)
      }
    }
  } else {
    try {
      const accountConditions = [eq(accounts.userId, userId)]
      if (accountId) {
        accountConditions.push(eq(accounts.id, accountId))
      }
      if (parsedProfile.profileId) {
        accountConditions.push(eq(accounts.profileId, parsedProfile.profileId))
      }

      const userAccounts = await db
        .select()
        .from(accounts)
        .where(and(...accountConditions))

      initialBalance = userAccounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0)

      const txConditions = [eq(transactions.userId, userId)]
      if (accountId) {
        txConditions.push(eq(transactions.accountId, accountId))
      }
      if (parsedProfile.profileId) {
        txConditions.push(eq(transactions.profileId, parsedProfile.profileId))
      }

      const dbTx = await db
        .select()
        .from(transactions)
        .where(and(...txConditions))
        .orderBy(desc(transactions.occurredAt))

      for (const t of dbTx) {
        const isPaid = t.paid === true && t.status !== 'pending'
        const isPending = t.status === 'pending' || t.paid === false
        const numAmount = parseFloat(t.amount) || 0
        const txInput: TransactionForecastInput = {
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
          historyTxList.push(txInput)
        } else if (isPending && t.status !== 'cancelled') {
          pendingTxList.push(txInput)
        }
      }
    } catch (error: any) {
      return c.json({ error: 'Falha ao buscar dados para projeção', details: error?.message }, 500)
    }
  }

  const forecast = calculateCashFlowForecast({
    currentBalance: initialBalance,
    historyTransactions: historyTxList,
    pendingTransactions: pendingTxList,
    days
  })

  return c.json(forecast)
})
