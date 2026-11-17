import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import { mockCreditCardsStore, mockInvoicesStore } from '../src/routes/creditCards'
import { mockAccountsStore } from '../src/routes/accounts'
import { mockTransactionsStore } from '../src/routes/transactions'
import { determineInvoicePeriodForPurchase } from '../src/services/creditCards'

describe('BFF Invoices API & Cycle Rules (TDD)', () => {
  let authToken: string
  const testUserId = 'user-inv-test-123'
  const validBankAccountId = '22222222-2222-2222-2222-222222222222'
  const cardId = 'card-inv-test-01'
  const invoiceId = 'inv-test-open-01'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'test-invoices@dinheirizz.com',
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
    mockAccountsStore.clear()

    // Configurar conta bancária com saldo para pagamento
    mockAccountsStore.set(validBankAccountId, {
      id: validBankAccountId,
      userId: testUserId,
      name: 'Conta Corrente Principal',
      type: 'checking',
      balance: '5000.00',
      createdAt: new Date().toISOString()
    })

    // Configurar cartão de crédito
    mockCreditCardsStore.set(cardId, {
      id: cardId,
      userId: testUserId,
      accountId: validBankAccountId,
      name: 'Nubank Ultravioleta',
      brand: 'mastercard',
      limitAmount: '15000.00',
      closingDay: 25,
      dueDay: 5,
      color: '#7bc816',
      lastFourDigits: '8821',
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Configurar fatura aberta
    mockInvoicesStore.set(invoiceId, {
      id: invoiceId,
      creditCardId: cardId,
      userId: testUserId,
      period: '2026-11',
      closingDate: '2026-11-25T23:59:59.999Z',
      dueDate: '2026-12-05T23:59:59.999Z',
      amount: '1250.40',
      status: 'open',
      paidAmount: '0.00',
      paidAt: null,
      paymentAccountId: null,
      paymentTransactionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Configurar itens vinculados à fatura
    mockTransactionsStore.set('tx-item-1', {
      id: 'tx-item-1',
      userId: testUserId,
      accountId: validBankAccountId,
      categoryId: null,
      creditCardId: cardId,
      invoiceId: invoiceId,
      amount: '450.00',
      description: 'Notebook Dell (3/10)',
      paid: false,
      installmentCurrent: 3,
      installmentTotal: 10,
      occurredAt: '2026-10-15T14:30:00.000Z',
      createdAt: new Date().toISOString()
    })

    mockTransactionsStore.set('tx-item-2', {
      id: 'tx-item-2',
      userId: testUserId,
      accountId: validBankAccountId,
      categoryId: null,
      creditCardId: cardId,
      invoiceId: invoiceId,
      amount: '800.40',
      description: 'Supermercado Pão de Açúcar',
      paid: false,
      installmentCurrent: 1,
      installmentTotal: 1,
      occurredAt: '2026-11-02T19:00:00.000Z',
      createdAt: new Date().toISOString()
    })
  })

  describe('GET /api/v1/invoices/:id', () => {
    it('deve retornar 401 sem autenticação', async () => {
      const res = await app.request(`/api/v1/invoices/${invoiceId}`)
      expect(res.status).toBe(401)
    })

    it('deve retornar 404 para fatura inexistente', async () => {
      const res = await app.request('/api/v1/invoices/inv-inexistente', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(404)
    })

    it('deve retornar 200 com dados da fatura e itens discriminados', async () => {
      const res = await app.request(`/api/v1/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty('invoice')
      expect(json.invoice.id).toBe(invoiceId)
      expect(json.invoice.amount).toBe(1250.4)
      expect(json.invoice.status).toBe('open')
      expect(Array.isArray(json.invoice.items)).toBe(true)
      expect(json.invoice.items.length).toBe(2)
      expect(json.invoice.items[0].description).toBe('Notebook Dell (3/10)')
      expect(json.invoice.items[0].installmentCurrent).toBe(3)
      expect(json.invoice.items[0].installmentTotal).toBe(10)
    })
  })

  describe('POST /api/v1/invoices/:id/close', () => {
    it('deve alterar o status da fatura para closed', async () => {
      const res = await app.request(`/api/v1/invoices/${invoiceId}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.status).toBe('closed')

      const stored = mockInvoicesStore.get(invoiceId)
      expect(stored?.status).toBe('closed')
    })
  })

  describe('POST /api/v1/invoices/:id/pay (Liquidação Atômica)', () => {
    it('deve retornar 404 se a conta bancária de débito não existir', async () => {
      const nonExistentAcc = '33333333-3333-3333-3333-333333333333'
      const res = await app.request(`/api/v1/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentAccountId: nonExistentAcc,
          amount: 1250.4
        })
      })
      expect(res.status).toBe(404)
    })

    it('deve liquidar a fatura, atualizar status para paid, debitar da conta e criar transação de despesa', async () => {
      const res = await app.request(`/api/v1/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentAccountId: validBankAccountId,
          amount: 1250.4,
          paidAt: '2026-11-20T10:00:00.000Z'
        })
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.invoiceId).toBe(invoiceId)
      expect(json.status).toBe('paid')
      expect(json.paidAmount).toBe(1250.4)
      expect(json.paymentTransactionId).toBeDefined()

      // Verificar atualização da fatura
      const updatedInv = mockInvoicesStore.get(invoiceId)
      expect(updatedInv?.status).toBe('paid')
      expect(updatedInv?.paidAmount).toBe('1250.40')
      expect(updatedInv?.paymentAccountId).toBe(validBankAccountId)
      expect(updatedInv?.paymentTransactionId).toBe(json.paymentTransactionId)

      // Verificar débito na conta bancária: 5000 - 1250.40 = 3749.60
      const updatedAcc = mockAccountsStore.get(validBankAccountId)
      expect(parseFloat(updatedAcc?.balance || '0')).toBe(3749.6)

      // Verificar criação da transação de despesa
      const createdTx = mockTransactionsStore.get(json.paymentTransactionId)
      expect(createdTx).toBeDefined()
      expect(createdTx?.type).toBe('expense')
      expect(parseFloat(createdTx?.amount || '0')).toBe(1250.4)
      expect(createdTx?.accountId).toBe(validBankAccountId)
      expect(createdTx?.paid).toBe(true)
    })

    it('deve rejeitar tentativa de pagamento duplicado em fatura já liquidada (400)', async () => {
      // Primeira liquidação
      await app.request(`/api/v1/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentAccountId: validBankAccountId,
          amount: 1250.4
        })
      })

      // Segunda tentativa de liquidação
      const res = await app.request(`/api/v1/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentAccountId: validBankAccountId,
          amount: 1250.4
        })
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toContain('já foi liquidada')
    })
  })

  describe('Regra do "Melhor Dia de Compra" e Ciclos de Fatura', () => {
    it('deve alocar na fatura do mês atual se a compra for ANTES do dia de fechamento', () => {
      const closingDay = 25
      // Compra em 2026-11-20 (antes do dia 25)
      const purchaseDate = new Date(Date.UTC(2026, 10, 20, 12, 0, 0))
      const period = determineInvoicePeriodForPurchase(purchaseDate, closingDay)
      expect(period).toBe('2026-11')
    })

    it('deve alocar na fatura do mês seguinte se a compra for NO DIA ou DEPOIS do dia de fechamento', () => {
      const closingDay = 25
      // Compra exatamente no dia de fechamento (2026-11-25)
      const purchaseOnClosing = new Date(Date.UTC(2026, 10, 25, 8, 0, 0))
      expect(determineInvoicePeriodForPurchase(purchaseOnClosing, closingDay)).toBe('2026-12')

      // Compra depois do dia de fechamento (2026-11-28)
      const purchaseAfterClosing = new Date(Date.UTC(2026, 10, 28, 15, 0, 0))
      expect(determineInvoicePeriodForPurchase(purchaseAfterClosing, closingDay)).toBe('2026-12')
    })

    it('deve virar o ano corretamente para compras em dezembro após o fechamento', () => {
      const closingDay = 20
      // Compra em 2026-12-21 (após o fechamento de 20 de dezembro)
      const purchaseEndYear = new Date(Date.UTC(2026, 11, 21, 10, 0, 0))
      expect(determineInvoicePeriodForPurchase(purchaseEndYear, closingDay)).toBe('2027-01')
    })
  })
})
