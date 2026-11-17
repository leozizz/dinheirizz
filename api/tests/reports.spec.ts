import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import { mockTransactionsStore } from '../src/routes/transactions'
import { mockAccountsStore } from '../src/routes/accounts'
import { mockCategoriesStore, DEFAULT_CATEGORIES } from '../src/routes/categories'
import { mockCreditCardsStore } from '../src/routes/creditCards'

describe('BFF Reports API (TDD)', () => {
  let authToken: string
  const testUserId = 'user-report-test-123'
  const otherUserId = 'user-report-other-456'
  const accountId1 = '11111111-1111-1111-1111-111111111111'
  const accountId2 = '22222222-2222-2222-2222-222222222222'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'test-reports@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  beforeEach(() => {
    mockTransactionsStore.clear()
    mockAccountsStore.clear()
    mockCategoriesStore.clear()
    mockCreditCardsStore.clear()

    // Configurar contas mock
    mockAccountsStore.set(accountId1, {
      id: accountId1,
      userId: testUserId,
      name: 'Banco Inter Principal',
      type: 'checking',
      balance: '5000.00',
      createdAt: '2026-01-01T00:00:00.000Z'
    })

    mockAccountsStore.set(accountId2, {
      id: accountId2,
      userId: testUserId,
      name: 'Nubank PJ',
      type: 'checking',
      balance: '12000.00',
      createdAt: '2026-01-01T00:00:00.000Z'
    })

    // Configurar categorias mock
    for (const cat of DEFAULT_CATEGORIES) {
      mockCategoriesStore.set(cat.id, {
        ...cat,
        userId: testUserId
      })
    }

    // Configurar transações mock para Novembro de 2026
    mockTransactionsStore.set('tx-1', {
      id: 'tx-1',
      userId: testUserId,
      accountId: accountId1,
      categoryId: '5', // Salário / Proventos
      amount: '8000.00',
      type: 'income',
      description: 'Salário Mensal',
      paid: true,
      status: 'completed',
      occurredAt: '2026-11-05T10:00:00.000Z',
      createdAt: '2026-11-05T10:00:00.000Z'
    })

    mockTransactionsStore.set('tx-2', {
      id: 'tx-2',
      userId: testUserId,
      accountId: accountId1,
      categoryId: '1', // Alimentação
      amount: '1200.50',
      type: 'expense',
      description: 'Supermercado Mensal',
      paid: true,
      status: 'completed',
      occurredAt: '2026-11-10T15:30:00.000Z',
      createdAt: '2026-11-10T15:30:00.000Z'
    })

    mockTransactionsStore.set('tx-3', {
      id: 'tx-3',
      userId: testUserId,
      accountId: accountId2,
      categoryId: '2', // Transporte
      amount: '350.00',
      type: 'expense',
      description: 'Combustível',
      paid: true,
      status: 'completed',
      occurredAt: '2026-11-15T09:00:00.000Z',
      createdAt: '2026-11-15T09:00:00.000Z'
    })

    mockTransactionsStore.set('tx-4', {
      id: 'tx-4',
      userId: testUserId,
      accountId: accountId1,
      categoryId: '4', // Contas Fixas
      amount: '500.00',
      type: 'expense',
      description: 'Energia Elétrica',
      paid: false,
      status: 'pending',
      dueDate: '2026-11-28T00:00:00.000Z',
      occurredAt: '2026-11-28T00:00:00.000Z',
      createdAt: '2026-11-01T00:00:00.000Z'
    })

    // Transação de outro mês (Outubro 2026)
    mockTransactionsStore.set('tx-5', {
      id: 'tx-5',
      userId: testUserId,
      accountId: accountId1,
      categoryId: '5',
      amount: '7500.00',
      type: 'income',
      description: 'Salário Outubro',
      paid: true,
      status: 'completed',
      occurredAt: '2026-10-05T10:00:00.000Z',
      createdAt: '2026-10-05T10:00:00.000Z'
    })

    // Transação de outro usuário
    mockTransactionsStore.set('tx-other', {
      id: 'tx-other',
      userId: otherUserId,
      accountId: accountId1,
      categoryId: '1',
      amount: '9999.00',
      type: 'expense',
      description: 'Despesa Outro Usuário',
      paid: true,
      status: 'completed',
      occurredAt: '2026-11-12T10:00:00.000Z',
      createdAt: '2026-11-12T10:00:00.000Z'
    })
  })

  describe('GET /api/v1/reports/summary', () => {
    it('deve retornar 401 quando não autenticado', async () => {
      const res = await app.request('/api/v1/reports/summary?period=2026-11')
      expect(res.status).toBe(401)
    })

    it('deve retornar 400 quando query params forem inválidos', async () => {
      const res = await app.request('/api/v1/reports/summary?period=invalid-period', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(400)
    })

    it('deve retornar resumo mensal com status completed por padrão', async () => {
      const res = await app.request('/api/v1/reports/summary?periodType=monthly&period=2026-11', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.periodType).toBe('monthly')
      expect(data.period).toBe('2026-11')
      expect(data.kpis).toBeDefined()
      // tx-1 (8000), tx-2 (1200.50), tx-3 (350.00) são completed no mês 11
      // tx-4 é pending, então não entra em completed
      expect(data.kpis.totalIncome).toBe(8000)
      expect(data.kpis.totalExpense).toBe(1550.5)
      expect(data.kpis.netBalance).toBe(6449.5)
      expect(data.kpis.transactionCount).toBe(3)
      expect(data.kpis.savingsRate).toBeGreaterThan(0)

      // Categories breakdown
      expect(Array.isArray(data.categoriesBreakdown)).toBe(true)
      const incomeCat = data.categoriesBreakdown.find((c: any) => c.type === 'income')
      expect(incomeCat).toBeDefined()
      expect(incomeCat.amount).toBe(8000)

      // Cost centers
      expect(Array.isArray(data.costCentersSummary)).toBe(true)
      const interAccount = data.costCentersSummary.find((a: any) => a.accountId === accountId1)
      expect(interAccount).toBeDefined()
      expect(interAccount.income).toBe(8000)
      expect(interAccount.expense).toBe(1200.5)

      // Cash flow timeline
      expect(Array.isArray(data.cashFlowTimeline)).toBe(true)
      expect(data.cashFlowTimeline.length).toBeGreaterThan(0)
    })

    it('deve incluir pendentes quando status=all', async () => {
      const res = await app.request('/api/v1/reports/summary?periodType=monthly&period=2026-11&status=all', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const data = await res.json()

      // tx-1 (8000), tx-2 (1200.50), tx-3 (350), tx-4 (500)
      expect(data.kpis.totalExpense).toBe(2050.5)
      expect(data.kpis.transactionCount).toBe(4)
    })

    it('deve filtrar por accountId específico', async () => {
      const res = await app.request(
        `/api/v1/reports/summary?periodType=monthly&period=2026-11&accountId=${accountId2}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      )
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.accountName).toBe('Nubank PJ')
      expect(data.kpis.totalIncome).toBe(0)
      expect(data.kpis.totalExpense).toBe(350)
      expect(data.kpis.transactionCount).toBe(1)
    })

    it('deve consolidar visão anual corretamente (12 meses na timeline)', async () => {
      const res = await app.request('/api/v1/reports/summary?periodType=yearly&period=2026', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.periodType).toBe('yearly')
      expect(data.period).toBe('2026')
      // Mês 10: 7500. Mês 11: 8000 income, 1550.50 expense
      expect(data.kpis.totalIncome).toBe(15500)
      expect(data.kpis.totalExpense).toBe(1550.5)
      expect(data.cashFlowTimeline.length).toBe(12)
      expect(data.cashFlowTimeline[0].label).toBe('Jan')
      expect(data.cashFlowTimeline[9].label).toBe('Out')
      expect(data.cashFlowTimeline[9].income).toBe(7500)
      expect(data.cashFlowTimeline[10].label).toBe('Nov')
      expect(data.cashFlowTimeline[10].income).toBe(8000)
    })
  })

  describe('GET /api/v1/reports/export/csv', () => {
    it('deve retornar 401 quando não autenticado', async () => {
      const res = await app.request('/api/v1/reports/export/csv?period=2026-11')
      expect(res.status).toBe(401)
    })

    it('deve gerar e fazer download de planilha CSV RFC 4180 pt-BR com BOM UTF-8', async () => {
      const res = await app.request('/api/v1/reports/export/csv?periodType=monthly&period=2026-11', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/csv')
      expect(res.headers.get('content-disposition')).toContain('attachment; filename="dinheirizz-relatorio-2026-11.csv"')

      const buffer = new Uint8Array(await res.arrayBuffer())
      // Deve conter os bytes do BOM UTF-8 (0xEF, 0xBB, 0xBF) no início do payload
      expect(buffer[0]).toBe(0xef)
      expect(buffer[1]).toBe(0xbb)
      expect(buffer[2]).toBe(0xbf)

      const text = new TextDecoder('utf-8').decode(buffer)
      // Deve usar delimitador ';'
      expect(text).toContain('Data;Descrição;Tipo;Categoria;Centro de Custo / Conta;')

      // Deve conter as movimentações formatadas
      expect(text).toContain('Salário Mensal')
      expect(text).toContain('Supermercado Mensal')
      expect(text).toContain('Banco Inter Principal')
      expect(text).toContain('1200,50')
    })
  })

  describe('GET /api/v1/reports/export/pdf-data', () => {
    it('deve retornar 401 quando não autenticado', async () => {
      const res = await app.request('/api/v1/reports/export/pdf-data?period=2026-11')
      expect(res.status).toBe(401)
    })

    it('deve retornar payload estruturado para impressão e PDF', async () => {
      const res = await app.request('/api/v1/reports/export/pdf-data?periodType=monthly&period=2026-11', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const json = await res.json()

      expect(json.summary).toBeDefined()
      expect(json.transactions).toBeDefined()
      expect(Array.isArray(json.transactions)).toBe(true)
      expect(json.transactions.length).toBe(3)
      expect(json.user).toBeDefined()
    })
  })
})
