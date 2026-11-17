import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { getDb } from '../db/client'
import { creditCards, invoices, transactions } from '../db/schema'
import type { AuthEnv } from '../middlewares/auth'
import {
  createCreditCardSchema,
  updateCreditCardSchema,
  anticipateInstallmentsSchema
} from '../schemas/creditCards'
import {
  calculateBillingCycleDates,
  calculateCreditLimits,
  type CalculatedLimits
} from '../services/creditCards'
import { mockTransactionsStore } from './transactions'

export interface MockCreditCard {
  id: string
  userId: string
  accountId: string
  name: string
  brand: string
  limitAmount: string
  closingDay: number
  dueDay: number
  color: string | null
  lastFourDigits: string | null
  archived: boolean
  createdAt: string
  updatedAt: string | null
}

export interface MockInvoice {
  id: string
  creditCardId: string
  userId: string
  period: string
  closingDate: string
  dueDate: string
  amount: string
  status: string
  paidAmount: string
  paidAt: string | null
  paymentAccountId: string | null
  paymentTransactionId: string | null
  createdAt: string
  updatedAt: string | null
}

export const mockCreditCardsStore = new Map<string, MockCreditCard>()
export const mockInvoicesStore = new Map<string, MockInvoice>()

export interface CreditCardWithDetails extends CalculatedLimits {
  id: string
  name: string
  brand: string
  closingDay: number
  dueDay: number
  color: string | null
  lastFourDigits: string | null
  accountId: string
  currentInvoice?: {
    id: string
    period: string
    amount: number
    status: string
    closingDate: string
    dueDate: string
  } | null
}

export const creditCardsRouter = new Hono<AuthEnv>()

// GET /api/v1/credit-cards
creditCardsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    const userCards = Array.from(mockCreditCardsStore.values()).filter(
      (card) => card.userId === userId && !card.archived
    )

    const data: CreditCardWithDetails[] = userCards.map((card) => {
      const cardInvoices = Array.from(mockInvoicesStore.values()).filter(
        (inv) => inv.creditCardId === card.id
      )

      const limits = calculateCreditLimits(card.limitAmount, cardInvoices)

      // Fatura corrente: status 'open' mais recente ou do período atual
      const currentInv =
        cardInvoices.find((inv) => inv.status === 'open') ||
        cardInvoices.sort((a, b) => b.period.localeCompare(a.period))[0] ||
        null

      return {
        id: card.id,
        name: card.name,
        brand: card.brand,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        color: card.color,
        lastFourDigits: card.lastFourDigits,
        accountId: card.accountId,
        ...limits,
        currentInvoice: currentInv
          ? {
              id: currentInv.id,
              period: currentInv.period,
              amount: parseFloat(currentInv.amount) || 0,
              status: currentInv.status,
              closingDate: currentInv.closingDate,
              dueDate: currentInv.dueDate
            }
          : null
      }
    })

    return c.json({ data, total: data.length })
  }

  try {
    const cardsList = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.userId, userId), eq(creditCards.archived, false)))

    const data: CreditCardWithDetails[] = []
    for (const card of cardsList) {
      const cardInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.creditCardId, card.id))

      const limits = calculateCreditLimits(card.limitAmount, cardInvoices)

      const currentInv =
        cardInvoices.find((inv) => inv.status === 'open') ||
        cardInvoices.sort((a, b) => b.period.localeCompare(a.period))[0] ||
        null

      data.push({
        id: card.id,
        name: card.name,
        brand: card.brand,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        color: card.color,
        lastFourDigits: card.lastFourDigits,
        accountId: card.accountId,
        ...limits,
        currentInvoice: currentInv
          ? {
              id: currentInv.id,
              period: currentInv.period,
              amount: parseFloat(currentInv.amount) || 0,
              status: currentInv.status,
              closingDate: currentInv.closingDate.toISOString(),
              dueDate: currentInv.dueDate.toISOString()
            }
          : null
      })
    }

    return c.json({ data, total: data.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao buscar cartões de crédito', details: message }, 500)
  }
})

// POST /api/v1/credit-cards
creditCardsRouter.post('/', async (c) => {
  const userId = c.get('userId')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const result = createCreditCardSchema.safeParse(body)
  if (!result.success) {
    return c.json({ error: 'Dados inválidos', details: result.error.format() }, 400)
  }

  const { name, accountId, brand, limitAmount, closingDay, dueDay, color, lastFourDigits } =
    result.data
  const cycleDates = calculateBillingCycleDates(closingDay, dueDay)
  const db = getDb()

  if (!db) {
    const cardId = crypto.randomUUID()
    const invoiceId = crypto.randomUUID()
    const nowStr = new Date().toISOString()

    const newCard: MockCreditCard = {
      id: cardId,
      userId,
      accountId,
      name,
      brand,
      limitAmount: limitAmount.toFixed(2),
      closingDay,
      dueDay,
      color: color || '#7bc816',
      lastFourDigits: lastFourDigits || null,
      archived: false,
      createdAt: nowStr,
      updatedAt: nowStr
    }

    const initialInvoice: MockInvoice = {
      id: invoiceId,
      creditCardId: cardId,
      userId,
      period: cycleDates.period,
      closingDate: cycleDates.closingDate,
      dueDate: cycleDates.dueDate,
      amount: '0.00',
      status: 'open',
      paidAmount: '0.00',
      paidAt: null,
      paymentAccountId: null,
      paymentTransactionId: null,
      createdAt: nowStr,
      updatedAt: nowStr
    }

    mockCreditCardsStore.set(cardId, newCard)
    mockInvoicesStore.set(invoiceId, initialInvoice)

    const limits = calculateCreditLimits(limitAmount, [initialInvoice])
    const responseData: CreditCardWithDetails = {
      id: cardId,
      name,
      brand,
      closingDay,
      dueDay,
      color: newCard.color,
      lastFourDigits: newCard.lastFourDigits,
      accountId,
      ...limits,
      currentInvoice: {
        id: invoiceId,
        period: initialInvoice.period,
        amount: 0,
        status: 'open',
        closingDate: initialInvoice.closingDate,
        dueDate: initialInvoice.dueDate
      }
    }

    return c.json({ data: responseData }, 201)
  }

  try {
    const [createdCard] = await db
      .insert(creditCards)
      .values({
        userId,
        accountId,
        name,
        brand,
        limitAmount: limitAmount.toFixed(2),
        closingDay,
        dueDay,
        color: color || '#7bc816',
        lastFourDigits: lastFourDigits || null
      })
      .returning()

    const [createdInvoice] = await db
      .insert(invoices)
      .values({
        creditCardId: createdCard.id,
        userId,
        period: cycleDates.period,
        closingDate: new Date(cycleDates.closingDate),
        dueDate: new Date(cycleDates.dueDate),
        amount: '0.00',
        status: 'open'
      })
      .returning()

    const limits = calculateCreditLimits(limitAmount, [createdInvoice])
    const responseData: CreditCardWithDetails = {
      id: createdCard.id,
      name: createdCard.name,
      brand: createdCard.brand,
      closingDay: createdCard.closingDay,
      dueDay: createdCard.dueDay,
      color: createdCard.color,
      lastFourDigits: createdCard.lastFourDigits,
      accountId: createdCard.accountId,
      ...limits,
      currentInvoice: {
        id: createdInvoice.id,
        period: createdInvoice.period,
        amount: 0,
        status: 'open',
        closingDate: createdInvoice.closingDate.toISOString(),
        dueDate: createdInvoice.dueDate.toISOString()
      }
    }

    return c.json({ data: responseData }, 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao criar cartão de crédito', details: message }, 500)
  }
})

// GET /api/v1/credit-cards/:id
creditCardsRouter.get('/:id', async (c) => {
  const userId = c.get('userId')
  const cardId = c.req.param('id')
  const db = getDb()

  if (!db) {
    const card = mockCreditCardsStore.get(cardId)
    if (!card || card.userId !== userId || card.archived) {
      return c.json({ error: 'Cartão de crédito não encontrado' }, 404)
    }

    const cardInvoices = Array.from(mockInvoicesStore.values()).filter(
      (inv) => inv.creditCardId === cardId
    )
    const limits = calculateCreditLimits(card.limitAmount, cardInvoices)
    const currentInv =
      cardInvoices.find((inv) => inv.status === 'open') ||
      cardInvoices.sort((a, b) => b.period.localeCompare(a.period))[0] ||
      null

    return c.json({
      data: {
        id: card.id,
        name: card.name,
        brand: card.brand,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        color: card.color,
        lastFourDigits: card.lastFourDigits,
        accountId: card.accountId,
        ...limits,
        currentInvoice: currentInv
          ? {
              id: currentInv.id,
              period: currentInv.period,
              amount: parseFloat(currentInv.amount) || 0,
              status: currentInv.status,
              closingDate: currentInv.closingDate,
              dueDate: currentInv.dueDate
            }
          : null,
        invoices: cardInvoices
      }
    })
  }

  try {
    const [card] = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId), eq(creditCards.archived, false)))

    if (!card) {
      return c.json({ error: 'Cartão de crédito não encontrado' }, 404)
    }

    const cardInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.creditCardId, cardId))
      .orderBy(desc(invoices.period))

    const limits = calculateCreditLimits(card.limitAmount, cardInvoices)
    const currentInv =
      cardInvoices.find((inv) => inv.status === 'open') || cardInvoices[0] || null

    return c.json({
      data: {
        id: card.id,
        name: card.name,
        brand: card.brand,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        color: card.color,
        lastFourDigits: card.lastFourDigits,
        accountId: card.accountId,
        ...limits,
        currentInvoice: currentInv
          ? {
              id: currentInv.id,
              period: currentInv.period,
              amount: parseFloat(currentInv.amount) || 0,
              status: currentInv.status,
              closingDate: currentInv.closingDate.toISOString(),
              dueDate: currentInv.dueDate.toISOString()
            }
          : null,
        invoices: cardInvoices
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao buscar detalhes do cartão', details: message }, 500)
  }
})

// PUT /api/v1/credit-cards/:id
creditCardsRouter.put('/:id', async (c) => {
  const userId = c.get('userId')
  const cardId = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const result = updateCreditCardSchema.safeParse(body)
  if (!result.success) {
    return c.json({ error: 'Dados inválidos', details: result.error.format() }, 400)
  }

  const db = getDb()
  const updates = result.data

  if (!db) {
    const card = mockCreditCardsStore.get(cardId)
    if (!card || card.userId !== userId || card.archived) {
      return c.json({ error: 'Cartão de crédito não encontrado' }, 404)
    }

    if (updates.name !== undefined) card.name = updates.name
    if (updates.limitAmount !== undefined) card.limitAmount = updates.limitAmount.toFixed(2)
    if (updates.closingDay !== undefined) card.closingDay = updates.closingDay
    if (updates.dueDay !== undefined) card.dueDay = updates.dueDay
    if (updates.color !== undefined) card.color = updates.color
    if (updates.lastFourDigits !== undefined) card.lastFourDigits = updates.lastFourDigits
    if (updates.brand !== undefined) card.brand = updates.brand
    if (updates.accountId !== undefined) card.accountId = updates.accountId
    card.updatedAt = new Date().toISOString()

    const cardInvoices = Array.from(mockInvoicesStore.values()).filter(
      (inv) => inv.creditCardId === cardId
    )
    const limits = calculateCreditLimits(card.limitAmount, cardInvoices)

    return c.json({
      data: {
        id: card.id,
        name: card.name,
        brand: card.brand,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        color: card.color,
        lastFourDigits: card.lastFourDigits,
        accountId: card.accountId,
        ...limits
      }
    })
  }

  try {
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date()
    }
    if (updates.name !== undefined) updateValues.name = updates.name
    if (updates.limitAmount !== undefined) updateValues.limitAmount = updates.limitAmount.toFixed(2)
    if (updates.closingDay !== undefined) updateValues.closingDay = updates.closingDay
    if (updates.dueDay !== undefined) updateValues.dueDay = updates.dueDay
    if (updates.color !== undefined) updateValues.color = updates.color
    if (updates.lastFourDigits !== undefined) updateValues.lastFourDigits = updates.lastFourDigits
    if (updates.brand !== undefined) updateValues.brand = updates.brand
    if (updates.accountId !== undefined) updateValues.accountId = updates.accountId

    const [updatedCard] = await db
      .update(creditCards)
      .set(updateValues)
      .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId)))
      .returning()

    if (!updatedCard) {
      return c.json({ error: 'Cartão de crédito não encontrado' }, 404)
    }

    const cardInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.creditCardId, cardId))
    const limits = calculateCreditLimits(updatedCard.limitAmount, cardInvoices)

    return c.json({
      data: {
        id: updatedCard.id,
        name: updatedCard.name,
        brand: updatedCard.brand,
        closingDay: updatedCard.closingDay,
        dueDay: updatedCard.dueDay,
        color: updatedCard.color,
        lastFourDigits: updatedCard.lastFourDigits,
        accountId: updatedCard.accountId,
        ...limits
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao atualizar cartão', details: message }, 500)
  }
})

// DELETE /api/v1/credit-cards/:id
creditCardsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const cardId = c.req.param('id')
  const db = getDb()

  if (!db) {
    const card = mockCreditCardsStore.get(cardId)
    if (!card || card.userId !== userId || card.archived) {
      return c.json({ error: 'Cartão de crédito não encontrado' }, 404)
    }
    card.archived = true
    card.updatedAt = new Date().toISOString()
    return c.json({ success: true, message: 'Cartão de crédito arquivado com sucesso' })
  }

  try {
    const [card] = await db
      .update(creditCards)
      .set({ archived: true, updatedAt: new Date() })
      .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId)))
      .returning()

    if (!card) {
      return c.json({ error: 'Cartão de crédito não encontrado' }, 404)
    }

    return c.json({ success: true, message: 'Cartão de crédito arquivado com sucesso' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao arquivar cartão', details: message }, 500)
  }
})

// GET /api/v1/credit-cards/:id/invoices
creditCardsRouter.get('/:id/invoices', async (c) => {
  const userId = c.get('userId')
  const cardId = c.req.param('id')
  const db = getDb()

  if (!db) {
    const card = mockCreditCardsStore.get(cardId)
    if (!card || card.userId !== userId || card.archived) {
      return c.json({ error: 'Cartão de crédito não encontrado' }, 404)
    }
    const cardInvoices = Array.from(mockInvoicesStore.values())
      .filter((inv) => inv.creditCardId === cardId)
      .sort((a, b) => b.period.localeCompare(a.period))
    return c.json({ data: cardInvoices, total: cardInvoices.length })
  }

  try {
    const [card] = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId), eq(creditCards.archived, false)))

    if (!card) {
      return c.json({ error: 'Cartão de crédito não encontrado' }, 404)
    }

    const cardInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.creditCardId, cardId))
      .orderBy(desc(invoices.period))

    return c.json({ data: cardInvoices, total: cardInvoices.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao buscar faturas', details: message }, 500)
  }
})

// POST /api/v1/credit-cards/:id/anticipate-installments
creditCardsRouter.post('/:id/anticipate-installments', async (c) => {
  const userId = c.get('userId')
  const cardId = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const result = anticipateInstallmentsSchema.safeParse(body)
  if (!result.success) {
    return c.json({ error: 'Dados inválidos', details: result.error.format() }, 400)
  }

  const { transactionIds } = result.data
  const db = getDb()

  if (!db) {
    const card = mockCreditCardsStore.get(cardId)
    if (!card || card.userId !== userId || card.archived) {
      return c.json({ error: 'Cartão de crédito não encontrado' }, 404)
    }

    // Achar fatura aberta atual
    const cardInvoices = Array.from(mockInvoicesStore.values()).filter(
      (inv) => inv.creditCardId === cardId
    )
    const openInvoice =
      cardInvoices.find((inv) => inv.status === 'open') ||
      cardInvoices.sort((a, b) => b.period.localeCompare(a.period))[0]

    if (!openInvoice) {
      return c.json({ error: 'Nenhuma fatura aberta encontrada para antecipação' }, 400)
    }

    // Verificar transações
    let totalAnticipatedAmount = 0
    for (const txId of transactionIds) {
      const tx = mockTransactionsStore.get(txId)
      if (!tx || tx.userId !== userId || tx.creditCardId !== cardId) {
        return c.json(
          { error: `Transação ${txId} não pertence a este cartão de crédito ou usuário` },
          400
        )
      }
      totalAnticipatedAmount += parseFloat(tx.amount) || 0
    }

    // Reatribuir transações e abater das faturas de origem
    for (const txId of transactionIds) {
      const tx = mockTransactionsStore.get(txId)
      if (tx) {
        const previousInvoiceId = tx.invoiceId
        if (previousInvoiceId && previousInvoiceId !== openInvoice.id) {
          const prevInv = mockInvoicesStore.get(previousInvoiceId)
          if (prevInv) {
            const currentAmount = parseFloat(prevInv.amount) || 0
            const txAmount = parseFloat(tx.amount) || 0
            prevInv.amount = Math.max(0, currentAmount - txAmount).toFixed(2)
          }
        }
        tx.invoiceId = openInvoice.id
      }
    }

    // Atualizar montante da fatura alvo
    const previousTargetAmount = parseFloat(openInvoice.amount) || 0
    const newTargetAmount = Math.round((previousTargetAmount + totalAnticipatedAmount) * 100) / 100
    openInvoice.amount = newTargetAmount.toFixed(2)

    return c.json({
      success: true,
      anticipatedCount: transactionIds.length,
      targetInvoiceId: openInvoice.id,
      newInvoiceAmount: newTargetAmount,
      message: 'Parcelas antecipadas com sucesso para a fatura aberta atual'
    })
  }

  try {
    const [card] = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId), eq(creditCards.archived, false)))

    if (!card) {
      return c.json({ error: 'Cartão de crédito não encontrado' }, 404)
    }

    const [openInvoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.creditCardId, cardId), eq(invoices.status, 'open')))
      .orderBy(desc(invoices.period))
      .limit(1)

    if (!openInvoice) {
      return c.json({ error: 'Nenhuma fatura aberta encontrada para antecipação' }, 400)
    }

    // Verificar e buscar transações
    let totalAnticipatedAmount = 0
    for (const txId of transactionIds) {
      const [tx] = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, txId), eq(transactions.userId, userId), eq(transactions.creditCardId, cardId)))

      if (!tx) {
        return c.json(
          { error: `Transação ${txId} não pertence a este cartão de crédito ou usuário` },
          400
        )
      }
      totalAnticipatedAmount += parseFloat(tx.amount) || 0

      // Reatribuir fatura
      await db
        .update(transactions)
        .set({ invoiceId: openInvoice.id })
        .where(eq(transactions.id, txId))
    }

    const previousTargetAmount = parseFloat(openInvoice.amount) || 0
    const newTargetAmount = Math.round((previousTargetAmount + totalAnticipatedAmount) * 100) / 100

    await db
      .update(invoices)
      .set({ amount: newTargetAmount.toFixed(2), updatedAt: new Date() })
      .where(eq(invoices.id, openInvoice.id))

    return c.json({
      success: true,
      anticipatedCount: transactionIds.length,
      targetInvoiceId: openInvoice.id,
      newInvoiceAmount: newTargetAmount,
      message: 'Parcelas antecipadas com sucesso para a fatura aberta atual'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao antecipar parcelas', details: message }, 500)
  }
})
