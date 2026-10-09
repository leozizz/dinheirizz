import { Hono } from 'hono'
import { getDb } from '../db/client'
import { accounts, transactions } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { mockAccountsStore } from './accounts'
import { mockTransactionsStore } from './transactions'
import type { AuthEnv } from '../middlewares/auth'
import { calculateCashFlowForecast, type TransactionForecastInput } from '../services/forecast'

export const forecastRouter = new Hono<AuthEnv>()

forecastRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const daysParam = c.req.query('days')
  const accountId = c.req.query('accountId')
  const days = daysParam === '60' ? 60 : 30

  const db = getDb()

  let initialBalance = 0
  const historyTxList: TransactionForecastInput[] = []
  const pendingTxList: TransactionForecastInput[] = []

  if (!db) {
    const userAccounts = Array.from(mockAccountsStore.values()).filter(
      (a) =>
        (a.userId === userId || a.userId === '00000000-0000-0000-0000-000000000000') &&
        (!accountId || a.id === accountId)
    )
    initialBalance = userAccounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0)

    const allTx = Array.from(mockTransactionsStore.values()).filter(
      (t) =>
        (t.userId === userId || t.userId === '00000000-0000-0000-0000-000000000000') &&
        (!accountId || t.accountId === accountId)
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
      const userAccounts = await db
        .select()
        .from(accounts)
        .where(
          accountId
            ? and(eq(accounts.userId, userId), eq(accounts.id, accountId))
            : eq(accounts.userId, userId)
        )

      initialBalance = userAccounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0)

      const dbTx = await db
        .select()
        .from(transactions)
        .where(
          accountId
            ? and(eq(transactions.userId, userId), eq(transactions.accountId, accountId))
            : eq(transactions.userId, userId)
        )
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
