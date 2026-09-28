import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../../api/index'
import { mockTransactionsStore } from '../../api/src/routes/transactions'
import { mockAccountsStore } from '../../api/src/routes/accounts'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'
const testUserId = '00000000-0000-0000-0000-000000000000'

describe('Endpoint de Previsão de Fluxo de Caixa GET /api/v1/forecast (TDD)', () => {
  let authToken: string

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'usuario.teste@dinheirizz.com',
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

    mockAccountsStore.set('acc-1', {
      id: 'acc-1',
      userId: testUserId,
      name: 'Conta Nubank',
      type: 'checking',
      balance: '5000.00',
      createdAt: new Date().toISOString()
    })

    mockAccountsStore.set('acc-2', {
      id: 'acc-2',
      userId: testUserId,
      name: 'Poupança',
      type: 'savings',
      balance: '2000.00',
      createdAt: new Date().toISOString()
    })

    // Histórico passado (últimos 30 dias): 900 de despesa variável
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    mockTransactionsStore.set('tx-past-1', {
      id: 'tx-past-1',
      userId: testUserId,
      accountId: 'acc-1',
      categoryId: null,
      amount: '-900.00',
      description: 'Supermercado',
      paid: true,
      status: 'completed',
      type: 'expense',
      occurredAt: pastDate.toISOString(),
      createdAt: pastDate.toISOString()
    })

    // Despesa futura agendada (daqui a 5 dias): 1500
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    mockTransactionsStore.set('tx-future-1', {
      id: 'tx-future-1',
      userId: testUserId,
      accountId: 'acc-1',
      categoryId: null,
      amount: '-1500.00',
      description: 'Aluguel',
      paid: false,
      status: 'pending',
      dueDate: futureDate.toISOString().split('T')[0],
      type: 'expense',
      occurredAt: futureDate.toISOString(),
      createdAt: futureDate.toISOString()
    })
  })

  it('deve retornar 401 quando não autenticado', async () => {
    const res = await app.request('/api/v1/forecast')
    expect(res.status).toBe(401)
  })

  it('deve retornar projeção de 30 dias por padrão com cálculo determinístico', async () => {
    const res = await app.request('/api/v1/forecast', {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })

    expect(res.status).toBe(200)
    const body = await res.json()

    // Saldo inicial combinado: 5000 + 2000 = 7000
    expect(body.initialBalance).toBe(7000)
    expect(body.timeline).toHaveLength(30)
    expect(body.dailyBurnRate).toBe(30) // 900 / 30 dias
    expect(body.risk).toBeDefined()
    expect(body.lowestPoint).toBeDefined()
    expect(body.projectedBalance).toBeLessThan(7000)
  })

  it('deve aceitar parâmetro days=60 e retornar 60 pontos na linha do tempo', async () => {
    const res = await app.request('/api/v1/forecast?days=60', {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.timeline).toHaveLength(60)
  })

  it('deve filtrar saldo e transações por accountId quando especificado', async () => {
    const res = await app.request('/api/v1/forecast?accountId=acc-2', {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })

    expect(res.status).toBe(200)
    const body = await res.json()

    // Somente acc-2 (saldo 2000, sem transações nesta conta)
    expect(body.initialBalance).toBe(2000)
    expect(body.dailyBurnRate).toBe(0)
    expect(body.projectedBalance).toBe(2000)
  })
})
