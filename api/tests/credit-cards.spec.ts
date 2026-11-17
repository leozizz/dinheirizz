import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import { mockCreditCardsStore, mockInvoicesStore } from '../src/routes/creditCards'
import { mockTransactionsStore } from '../src/routes/transactions'

describe('BFF Credit Cards API (TDD)', () => {
  let authToken: string
  const testUserId = 'user-card-test-123'
  const otherUserId = 'user-card-other-456'
  const validAccountId = '11111111-1111-1111-1111-111111111111'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'test-cards@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  beforeEach(() => {
    mockCreditCardsStore.clear()
    mockInvoicesStore.clear()
    mockTransactionsStore.clear()
  })

  describe('GET /api/v1/credit-cards', () => {
    it('deve retornar 401 quando não autenticado', async () => {
      const res = await app.request('/api/v1/credit-cards')
      expect(res.status).toBe(401)
    })

    it('deve retornar 200 com lista vazia inicialmente', async () => {
      const res = await app.request('/api/v1/credit-cards', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.total).toBe(0)
    })

    it('deve retornar cartões com limites calculados e fatura corrente', async () => {
      const cardId = 'card-test-01'
      const invoiceId = 'inv-test-01'
      mockCreditCardsStore.set(cardId, {
        id: cardId,
        userId: testUserId,
        accountId: validAccountId,
        name: 'Nubank Ultravioleta',
        brand: 'mastercard',
        limitAmount: '10000.00',
        closingDay: 25,
        dueDay: 5,
        color: '#7bc816',
        lastFourDigits: '8821',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      mockInvoicesStore.set(invoiceId, {
        id: invoiceId,
        creditCardId: cardId,
        userId: testUserId,
        period: '2026-11',
        closingDate: '2026-11-25T00:00:00.000Z',
        dueDate: '2026-12-05T00:00:00.000Z',
        amount: '2500.00',
        status: 'open',
        paidAmount: '0.00',
        paidAt: null,
        paymentAccountId: null,
        paymentTransactionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const res = await app.request('/api/v1/credit-cards', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.total).toBe(1)
      const card = json.data[0]
      expect(card.id).toBe(cardId)
      expect(card.limitAmount).toBe(10000)
      expect(card.usedLimit).toBe(2500)
      expect(card.availableLimit).toBe(7500)
      expect(card.currentInvoice).toBeDefined()
      expect(card.currentInvoice.id).toBe(invoiceId)
      expect(card.currentInvoice.status).toBe('open')
    })
  })

  describe('POST /api/v1/credit-cards', () => {
    it('deve retornar 400 com payload inválido', async () => {
      const res = await app.request('/api/v1/credit-cards', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: '',
          closingDay: 40
        })
      })
      expect(res.status).toBe(400)
    })

    it('deve retornar 201 e criar cartão com fatura inicial aberta', async () => {
      const payload = {
        name: 'Itaú Personnalité Black',
        accountId: validAccountId,
        brand: 'mastercard',
        limitAmount: 20000,
        closingDay: 18,
        dueDay: 28,
        color: '#eab308',
        lastFourDigits: '1049'
      }

      const res = await app.request('/api/v1/credit-cards', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(json.data.name).toBe('Itaú Personnalité Black')
      expect(json.data.limitAmount).toBe(20000)
      expect(json.data.usedLimit).toBe(0)
      expect(json.data.availableLimit).toBe(20000)
      expect(json.data.currentInvoice).toBeDefined()
      expect(json.data.currentInvoice.status).toBe('open')
    })
  })

  describe('GET /api/v1/credit-cards/:id', () => {
    it('deve retornar 404 para cartão inexistente ou de outro usuário', async () => {
      const otherCardId = 'card-other-user'
      mockCreditCardsStore.set(otherCardId, {
        id: otherCardId,
        userId: otherUserId,
        accountId: validAccountId,
        name: 'Cartão Alheio',
        brand: 'visa',
        limitAmount: '5000.00',
        closingDay: 10,
        dueDay: 20,
        color: '#7bc816',
        lastFourDigits: '1234',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const res = await app.request(`/api/v1/credit-cards/${otherCardId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(404)
    })

    it('deve retornar 200 com dados completos do cartão do usuário', async () => {
      const cardId = 'card-my-01'
      mockCreditCardsStore.set(cardId, {
        id: cardId,
        userId: testUserId,
        accountId: validAccountId,
        name: 'Nubank Ultravioleta',
        brand: 'mastercard',
        limitAmount: '12000.00',
        closingDay: 15,
        dueDay: 25,
        color: '#7bc816',
        lastFourDigits: '9988',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const res = await app.request(`/api/v1/credit-cards/${cardId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.id).toBe(cardId)
      expect(json.data.name).toBe('Nubank Ultravioleta')
      expect(json.data.limitAmount).toBe(12000)
    })
  })

  describe('PUT /api/v1/credit-cards/:id', () => {
    it('deve atualizar dados do cartão e recalcular limites', async () => {
      const cardId = 'card-to-update'
      mockCreditCardsStore.set(cardId, {
        id: cardId,
        userId: testUserId,
        accountId: validAccountId,
        name: 'Cartão Antigo',
        brand: 'mastercard',
        limitAmount: '5000.00',
        closingDay: 10,
        dueDay: 20,
        color: '#7bc816',
        lastFourDigits: '1234',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const res = await app.request(`/api/v1/credit-cards/${cardId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Cartão Atualizado',
          limitAmount: 8500
        })
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.name).toBe('Cartão Atualizado')
      expect(json.data.limitAmount).toBe(8500)
    })
  })

  describe('POST /api/v1/credit-cards/:id/anticipate-installments', () => {
    it('deve retornar 400 se as transações não pertencerem ao cartão', async () => {
      const cardId = 'card-anticipate'
      mockCreditCardsStore.set(cardId, {
        id: cardId,
        userId: testUserId,
        accountId: validAccountId,
        name: 'Nubank',
        brand: 'mastercard',
        limitAmount: '10000.00',
        closingDay: 25,
        dueDay: 5,
        color: '#7bc816',
        lastFourDigits: '1234',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const foreignTxId = '44444444-4444-4444-4444-444444444444'
      mockTransactionsStore.set(foreignTxId, {
        id: foreignTxId,
        userId: testUserId,
        accountId: validAccountId,
        categoryId: null,
        amount: '200.00',
        description: 'Compra de outro cartão',
        paid: false,
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      })

      const res = await app.request(`/api/v1/credit-cards/${cardId}/anticipate-installments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionIds: [foreignTxId]
        })
      })

      expect(res.status).toBe(400)
    })

    it('deve antecipar parcelas com sucesso para a fatura aberta atual', async () => {
      const cardId = 'card-anticipate-ok'
      const openInvId = 'inv-open-current'
      const futureInvId = 'inv-future-next'

      mockCreditCardsStore.set(cardId, {
        id: cardId,
        userId: testUserId,
        accountId: validAccountId,
        name: 'Nubank',
        brand: 'mastercard',
        limitAmount: '10000.00',
        closingDay: 25,
        dueDay: 5,
        color: '#7bc816',
        lastFourDigits: '1234',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      mockInvoicesStore.set(openInvId, {
        id: openInvId,
        creditCardId: cardId,
        userId: testUserId,
        period: '2026-11',
        closingDate: '2026-11-25T00:00:00.000Z',
        dueDate: '2026-12-05T00:00:00.000Z',
        amount: '1000.00',
        status: 'open',
        paidAmount: '0.00',
        paidAt: null,
        paymentAccountId: null,
        paymentTransactionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      mockInvoicesStore.set(futureInvId, {
        id: futureInvId,
        creditCardId: cardId,
        userId: testUserId,
        period: '2026-12',
        closingDate: '2026-12-25T00:00:00.000Z',
        dueDate: '2027-01-05T00:00:00.000Z',
        amount: '500.00',
        status: 'open',
        paidAmount: '0.00',
        paidAt: null,
        paymentAccountId: null,
        paymentTransactionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const txId1 = '55555555-5555-5555-5555-555555555551'
      mockTransactionsStore.set(txId1, {
        id: txId1,
        userId: testUserId,
        accountId: validAccountId,
        categoryId: null,
        amount: '500.00',
        description: 'Notebook Dell (2/2)',
        paid: false,
        occurredAt: '2026-11-01T10:00:00.000Z',
        createdAt: new Date().toISOString(),
        creditCardId: cardId,
        invoiceId: futureInvId
      })

      const res = await app.request(`/api/v1/credit-cards/${cardId}/anticipate-installments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionIds: [txId1]
        })
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.anticipatedCount).toBe(1)
      expect(json.targetInvoiceId).toBe(openInvId)
      expect(json.newInvoiceAmount).toBe(1500)

      // Verifica se a transação agora aponta para a fatura aberta
      const updatedTx = mockTransactionsStore.get(txId1)
      expect(updatedTx?.invoiceId).toBe(openInvId)
    })
  })
})
