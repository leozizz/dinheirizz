import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/client'
import { invoices, creditCards, accounts, transactions, categories } from '../db/schema'
import type { AuthEnv } from '../middlewares/auth'
import { payInvoiceSchema } from '../schemas/creditCards'
import { mockInvoicesStore, mockCreditCardsStore } from './creditCards'
import { mockAccountsStore } from './accounts'
import { mockTransactionsStore, type MockTransaction } from './transactions'

export const invoicesRouter = new Hono<AuthEnv>()

// GET /api/v1/invoices/:id
invoicesRouter.get('/:id', async (c) => {
  const userId = c.get('userId')
  const invoiceId = c.req.param('id')
  const db = getDb()

  if (!db) {
    const inv = mockInvoicesStore.get(invoiceId)
    if (!inv || inv.userId !== userId) {
      return c.json({ error: 'Fatura não encontrada' }, 404)
    }

    const items = Array.from(mockTransactionsStore.values())
      .filter((tx) => tx.invoiceId === invoiceId && tx.userId === userId)
      .map((tx) => ({
        id: tx.id,
        description: tx.description,
        amount: parseFloat(tx.amount) || 0,
        occurredAt: tx.occurredAt,
        installmentCurrent: tx.installmentCurrent ?? null,
        installmentTotal: tx.installmentTotal ?? null,
        category: null
      }))

    return c.json({
      invoice: {
        id: inv.id,
        creditCardId: inv.creditCardId,
        period: inv.period,
        amount: parseFloat(inv.amount) || 0,
        status: inv.status,
        closingDate: inv.closingDate,
        dueDate: inv.dueDate,
        paidAmount: parseFloat(inv.paidAmount) || 0,
        paidAt: inv.paidAt,
        items
      }
    })
  }

  try {
    const [inv] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))

    if (!inv) {
      return c.json({ error: 'Fatura não encontrada' }, 404)
    }

    const txItems = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        occurredAt: transactions.occurredAt,
        installmentCurrent: transactions.installmentCurrent,
        installmentTotal: transactions.installmentTotal,
        categoryName: categories.name,
        categoryColor: categories.color
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.invoiceId, invoiceId), eq(transactions.userId, userId)))

    const items = txItems.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: parseFloat(tx.amount) || 0,
      occurredAt: tx.occurredAt.toISOString(),
      installmentCurrent: tx.installmentCurrent,
      installmentTotal: tx.installmentTotal,
      category: tx.categoryName
        ? {
            name: tx.categoryName,
            color: tx.categoryColor || '#7bc816'
          }
        : null
    }))

    return c.json({
      invoice: {
        id: inv.id,
        creditCardId: inv.creditCardId,
        period: inv.period,
        amount: parseFloat(inv.amount) || 0,
        status: inv.status,
        closingDate: inv.closingDate.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        paidAmount: parseFloat(inv.paidAmount) || 0,
        paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
        items
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao buscar detalhes da fatura', details: message }, 500)
  }
})

// POST /api/v1/invoices/:id/close
invoicesRouter.post('/:id/close', async (c) => {
  const userId = c.get('userId')
  const invoiceId = c.req.param('id')
  const db = getDb()

  if (!db) {
    const inv = mockInvoicesStore.get(invoiceId)
    if (!inv || inv.userId !== userId) {
      return c.json({ error: 'Fatura não encontrada' }, 404)
    }
    inv.status = 'closed'
    inv.updatedAt = new Date().toISOString()
    return c.json({
      success: true,
      status: 'closed',
      message: 'Fatura fechada com sucesso'
    })
  }

  try {
    const [inv] = await db
      .update(invoices)
      .set({ status: 'closed', updatedAt: new Date() })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
      .returning()

    if (!inv) {
      return c.json({ error: 'Fatura não encontrada' }, 404)
    }

    return c.json({
      success: true,
      status: 'closed',
      message: 'Fatura fechada com sucesso'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao fechar fatura', details: message }, 500)
  }
})

// POST /api/v1/invoices/:id/pay
invoicesRouter.post('/:id/pay', async (c) => {
  const userId = c.get('userId')
  const invoiceId = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const result = payInvoiceSchema.safeParse(body)
  if (!result.success) {
    return c.json({ error: 'Dados inválidos', details: result.error.format() }, 400)
  }

  const { paymentAccountId, amount, paidAt } = result.data
  const paidAtDate = paidAt ? new Date(paidAt) : new Date()
  const paidAtStr = paidAtDate.toISOString()
  const db = getDb()

  if (!db) {
    const inv = mockInvoicesStore.get(invoiceId)
    if (!inv || inv.userId !== userId) {
      return c.json({ error: 'Fatura não encontrada' }, 404)
    }

    if (inv.status === 'paid') {
      return c.json({ error: 'Esta fatura já foi liquidada anteriormente' }, 400)
    }

    const acc = mockAccountsStore.get(paymentAccountId)
    if (!acc || acc.userId !== userId) {
      return c.json({ error: 'Conta bancária de débito não encontrada' }, 404)
    }

    const card = mockCreditCardsStore.get(inv.creditCardId)
    const cardName = card?.name || 'Cartão de Crédito'
    const newTxId = crypto.randomUUID()

    // 1. Deduzir saldo da conta
    const currentBalance = parseFloat(acc.balance) || 0
    const newBalance = (currentBalance - amount).toFixed(2)
    acc.balance = newBalance

    // 2. Criar transação de despesa na conta bancária
    const paymentTx: MockTransaction = {
      id: newTxId,
      userId,
      accountId: paymentAccountId,
      categoryId: null,
      amount: amount.toFixed(2),
      description: `Pagamento de Fatura - ${cardName} (${inv.period})`,
      paid: true,
      type: 'expense',
      occurredAt: paidAtStr,
      createdAt: paidAtStr
    }
    mockTransactionsStore.set(newTxId, paymentTx)

    // 3. Atualizar fatura para paga
    inv.status = 'paid'
    inv.paidAmount = amount.toFixed(2)
    inv.paidAt = paidAtStr
    inv.paymentAccountId = paymentAccountId
    inv.paymentTransactionId = newTxId
    inv.updatedAt = paidAtStr

    return c.json({
      success: true,
      invoiceId: inv.id,
      status: 'paid',
      paidAmount: amount,
      paymentTransactionId: newTxId,
      message: 'Fatura liquidada com sucesso e débito registrado na conta bancária'
    })
  }

  try {
    const [inv] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))

    if (!inv) {
      return c.json({ error: 'Fatura não encontrada' }, 404)
    }

    if (inv.status === 'paid') {
      return c.json({ error: 'Esta fatura já foi liquidada anteriormente' }, 400)
    }

    const [acc] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, paymentAccountId), eq(accounts.userId, userId)))

    if (!acc) {
      return c.json({ error: 'Conta bancária de débito não encontrada' }, 404)
    }

    const [card] = await db
      .select()
      .from(creditCards)
      .where(eq(creditCards.id, inv.creditCardId))

    const cardName = card?.name || 'Cartão de Crédito'

    // Debitar conta bancária
    const currentBalance = parseFloat(acc.balance) || 0
    const newBalance = (currentBalance - amount).toFixed(2)

    await db
      .update(accounts)
      .set({ balance: newBalance })
      .where(eq(accounts.id, paymentAccountId))

    // Registrar transação de despesa
    const [createdTx] = await db
      .insert(transactions)
      .values({
        userId,
        accountId: paymentAccountId,
        amount: amount.toFixed(2),
        description: `Pagamento de Fatura - ${cardName} (${inv.period})`,
        paid: true,
        occurredAt: paidAtDate
      })
      .returning()

    // Atualizar fatura
    await db
      .update(invoices)
      .set({
        status: 'paid',
        paidAmount: amount.toFixed(2),
        paidAt: paidAtDate,
        paymentAccountId,
        paymentTransactionId: createdTx.id,
        updatedAt: new Date()
      })
      .where(eq(invoices.id, inv.id))

    return c.json({
      success: true,
      invoiceId: inv.id,
      status: 'paid',
      paidAmount: amount,
      paymentTransactionId: createdTx.id,
      message: 'Fatura liquidada com sucesso e débito registrado na conta bancária'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao liquidar fatura', details: message }, 500)
  }
})
