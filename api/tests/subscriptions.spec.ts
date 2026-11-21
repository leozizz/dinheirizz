import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../../api/index'
import {
  normalizeSubscriptionDescription,
  detectRecurringSubscriptions,
  type SubscriptionTransactionInput
} from '../src/services/financial-analytics'
import { mockTransactionsStore } from '../src/routes/transactions'
import { mockSubscriptionIgnoresStore } from '../src/routes/insights'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'
const testUserId = '00000000-0000-0000-0000-000000000001'
const otherUserId = '00000000-0000-0000-0000-000000000002'

describe('Motor Analítico de Assinaturas e Recorrências (TDD)', () => {
  const referenceDate = new Date('2026-11-21T08:00:00.000Z')

  describe('normalizeSubscriptionDescription', () => {
    it('deve normalizar variações de descrição removendo prefixos bancários, acentos e referências', () => {
      expect(normalizeSubscriptionDescription('NETFLIX *1234')).toBe('netflix')
      expect(normalizeSubscriptionDescription('Netflix.com')).toBe('netflix')
      expect(normalizeSubscriptionDescription('PAG*Spotify 10/26')).toBe('spotify')
      expect(normalizeSubscriptionDescription('MP *iCloud+')).toBe('icloud')
      expect(normalizeSubscriptionDescription('COMPRA CARTÃO Amazon Prime *9912')).toBe('amazon prime')
    })
  })

  describe('detectRecurringSubscriptions', () => {
    it('deve detectar assinatura mensal (~28-32 dias) com variações na descrição e calcular custos', () => {
      const transactions: SubscriptionTransactionInput[] = [
        {
          id: 'tx-1',
          accountId: 'acc-1',
          categoryId: 'cat-stream',
          amount: -44.9,
          description: 'NETFLIX *1234',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-09-05T10:00:00.000Z'
        },
        {
          id: 'tx-2',
          accountId: 'acc-1',
          categoryId: 'cat-stream',
          amount: -44.9,
          description: 'Netflix.com',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-10-05T10:00:00.000Z'
        },
        {
          id: 'tx-3',
          accountId: 'acc-1',
          categoryId: 'cat-stream',
          amount: -44.9,
          description: 'PAG*Netflix',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-11-05T10:00:00.000Z'
        }
      ]

      const result = detectRecurringSubscriptions(transactions, { referenceDate, windowDays: 180 })

      expect(result).toHaveLength(1)
      expect(result[0].normalizedKey).toBe('netflix')
      expect(result[0].frequency).toBe('monthly')
      expect(result[0].averageAmount).toBe(44.9)
      expect(result[0].lastAmount).toBe(44.9)
      expect(result[0].monthlyCost).toBe(44.9)
      expect(result[0].annualCost).toBe(538.8)
      expect(result[0].occurrencesCount).toBe(3)
      expect(result[0].nextEstimatedChargeAt).toBe('2026-12-05T10:00:00.000Z')
      expect(result[0].priceAlert).toBeNull()
      expect(result[0].duplicateAlert).toBeNull()
    })

    it('deve detectar assinatura anual (~365 dias) e calcular monthlyCost = lastAmount / 12', () => {
      const transactions: SubscriptionTransactionInput[] = [
        {
          id: 'tx-anual-1',
          accountId: 'acc-1',
          amount: -240.0,
          description: 'Amazon Prime Anual',
          type: 'expense',
          status: 'completed',
          occurredAt: '2025-11-10T10:00:00.000Z'
        },
        {
          id: 'tx-anual-2',
          accountId: 'acc-1',
          amount: -240.0,
          description: 'AMAZON PRIME ANUAL *4321',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-11-10T10:00:00.000Z'
        }
      ]

      const result = detectRecurringSubscriptions(transactions, { referenceDate, windowDays: 400 })

      expect(result).toHaveLength(1)
      expect(result[0].frequency).toBe('yearly')
      expect(result[0].monthlyCost).toBe(20)
      expect(result[0].annualCost).toBe(240)
      expect(result[0].nextEstimatedChargeAt).toBe('2027-11-10T10:00:00.000Z')
    })

    it('deve disparar priceAlert quando a última cobrança for >10% superior à média histórica anterior', () => {
      const transactions: SubscriptionTransactionInput[] = [
        {
          id: 'tx-p1',
          accountId: 'acc-1',
          amount: -44.9,
          description: 'Netflix',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-09-05T10:00:00.000Z'
        },
        {
          id: 'tx-p2',
          accountId: 'acc-1',
          amount: -44.9,
          description: 'Netflix',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-10-05T10:00:00.000Z'
        },
        {
          id: 'tx-p3',
          accountId: 'acc-1',
          amount: -55.9,
          description: 'Netflix',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-11-05T10:00:00.000Z'
        }
      ]

      const result = detectRecurringSubscriptions(transactions, { referenceDate, windowDays: 180 })

      expect(result).toHaveLength(1)
      expect(result[0].priceAlert).toEqual({
        previousAverageAmount: 44.9,
        currentAmount: 55.9,
        increasePercentage: 24.5
      })
    })

    it('não deve disparar priceAlert para variações menores ou iguais a 10%', () => {
      const transactions: SubscriptionTransactionInput[] = [
        {
          id: 'tx-np1',
          accountId: 'acc-1',
          amount: -100.0,
          description: 'Academia Smart',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-09-10T10:00:00.000Z'
        },
        {
          id: 'tx-np2',
          accountId: 'acc-1',
          amount: -110.0,
          description: 'Academia Smart',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-10-10T10:00:00.000Z'
        }
      ]

      const result = detectRecurringSubscriptions(transactions, { referenceDate, windowDays: 180 })

      expect(result).toHaveLength(1)
      expect(result[0].priceAlert).toBeNull()
    })

    it('deve disparar duplicateAlert quando houver 2+ cobranças similares em <= 5 dias no mesmo ciclo', () => {
      const transactions: SubscriptionTransactionInput[] = [
        {
          id: 'tx-d1',
          accountId: 'acc-1',
          amount: -21.9,
          description: 'Spotify',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-10-05T10:00:00.000Z'
        },
        {
          id: 'tx-d2',
          accountId: 'acc-1',
          amount: -21.9,
          description: 'Spotify',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-11-05T10:00:00.000Z'
        },
        {
          id: 'tx-d3',
          accountId: 'acc-1',
          amount: -21.9,
          description: 'SPOTIFY *8821',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-11-06T10:00:00.000Z'
        }
      ]

      const result = detectRecurringSubscriptions(transactions, { referenceDate, windowDays: 180 })

      expect(result).toHaveLength(1)
      expect(result[0].duplicateAlert).toEqual({
        duplicateCount: 2,
        dates: ['2026-11-05T10:00:00.000Z', '2026-11-06T10:00:00.000Z']
      })
    })

    it('não deve gerar falsos positivos para compras avulsas irregulares, canceladas, receitas ou parcelamentos', () => {
      const transactions: SubscriptionTransactionInput[] = [
        // Compras avulsas no supermercado (intervalo irregular de 4 e 12 dias)
        {
          id: 'tx-mkt-1',
          accountId: 'acc-1',
          amount: -180.0,
          description: 'Supermercado Dia',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-10-01T10:00:00.000Z'
        },
        {
          id: 'tx-mkt-2',
          accountId: 'acc-1',
          amount: -95.0,
          description: 'Supermercado Dia',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-10-05T10:00:00.000Z'
        },
        {
          id: 'tx-mkt-3',
          accountId: 'acc-1',
          amount: -220.0,
          description: 'Supermercado Dia',
          type: 'expense',
          status: 'completed',
          occurredAt: '2026-10-17T10:00:00.000Z'
        },
        // Parcelamento (installmentTotal > 1) a cada 30 dias — deve ser excluído
        {
          id: 'tx-inst-1',
          accountId: 'acc-1',
          amount: -300.0,
          description: 'Loja Notebook',
          type: 'expense',
          status: 'completed',
          installmentTotal: 6,
          occurredAt: '2026-09-15T10:00:00.000Z'
        },
        {
          id: 'tx-inst-2',
          accountId: 'acc-1',
          amount: -300.0,
          description: 'Loja Notebook',
          type: 'expense',
          status: 'completed',
          installmentTotal: 6,
          occurredAt: '2026-10-15T10:00:00.000Z'
        },
        // Transações canceladas
        {
          id: 'tx-canc-1',
          accountId: 'acc-1',
          amount: -50.0,
          description: 'Clube Cancelado',
          type: 'expense',
          status: 'cancelled',
          occurredAt: '2026-09-20T10:00:00.000Z'
        },
        {
          id: 'tx-canc-2',
          accountId: 'acc-1',
          amount: -50.0,
          description: 'Clube Cancelado',
          type: 'expense',
          status: 'cancelled',
          occurredAt: '2026-10-20T10:00:00.000Z'
        },
        // Receita mensal (salário)
        {
          id: 'tx-inc-1',
          accountId: 'acc-1',
          amount: 5000.0,
          description: 'Salário Empresa',
          type: 'income',
          status: 'completed',
          occurredAt: '2026-09-05T10:00:00.000Z'
        },
        {
          id: 'tx-inc-2',
          accountId: 'acc-1',
          amount: 5000.0,
          description: 'Salário Empresa',
          type: 'income',
          status: 'completed',
          occurredAt: '2026-10-05T10:00:00.000Z'
        }
      ]

      const result = detectRecurringSubscriptions(transactions, { referenceDate, windowDays: 180 })
      expect(result).toEqual([])
    })
  })
})

describe('Rotas REST de Assinaturas em /api/v1/insights/subscriptions (TDD)', () => {
  let authToken: string
  const txIdToConfirm = '11111111-1111-4111-8111-111111111111'
  const otherUserTxId = '22222222-2222-4222-8222-222222222222'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'assinaturas@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  beforeEach(() => {
    mockTransactionsStore.clear()
    mockSubscriptionIgnoresStore.clear()

    const now = new Date()
    const daysAgo = (days: number): string => {
      const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      return d.toISOString()
    }

    mockTransactionsStore.set('tx-sub-1', {
      id: 'tx-sub-1',
      userId: testUserId,
      accountId: 'acc-1',
      categoryId: 'cat-1',
      amount: '-44.90',
      description: 'NETFLIX *1234',
      paid: true,
      status: 'completed',
      type: 'expense',
      isRecurring: false,
      occurredAt: daysAgo(62),
      createdAt: daysAgo(62)
    })

    mockTransactionsStore.set(txIdToConfirm, {
      id: txIdToConfirm,
      userId: testUserId,
      accountId: 'acc-1',
      categoryId: 'cat-1',
      amount: '-55.90',
      description: 'Netflix.com',
      paid: true,
      status: 'completed',
      type: 'expense',
      isRecurring: false,
      occurredAt: daysAgo(31),
      createdAt: daysAgo(31)
    })

    mockTransactionsStore.set(otherUserTxId, {
      id: otherUserTxId,
      userId: otherUserId,
      accountId: 'acc-other',
      categoryId: null,
      amount: '-29.90',
      description: 'Spotify',
      paid: true,
      status: 'completed',
      type: 'expense',
      isRecurring: false,
      occurredAt: daysAgo(15),
      createdAt: daysAgo(15)
    })
  })

  it('GET /api/v1/insights/subscriptions deve retornar 401 sem token', async () => {
    const res = await app.request('/api/v1/insights/subscriptions', { method: 'GET' })
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/insights/subscriptions deve retornar 200 com assinaturas e resumo consolidado', async () => {
    const res = await app.request('/api/v1/insights/subscriptions', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` }
    })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.subscriptions).toHaveLength(1)
    expect(data.subscriptions[0].normalizedKey).toBe('netflix')
    expect(data.subscriptions[0].priceAlert).not.toBeNull()
    expect(data.summary).toEqual({
      totalMonthlyCost: 55.9,
      totalAnnualCost: 670.8,
      activeCount: 1,
      alertsCount: 1
    })
    expect(typeof data.generatedAt).toBe('string')
  })

  it('POST /api/v1/insights/subscriptions/confirm deve marcar transação como recorrente e retornar 404 para outro usuário', async () => {
    const notFoundRes = await app.request('/api/v1/insights/subscriptions/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: otherUserTxId,
        frequency: 'monthly'
      })
    })
    expect(notFoundRes.status).toBe(404)

    const okRes = await app.request('/api/v1/insights/subscriptions/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: txIdToConfirm,
        frequency: 'monthly',
        recurrenceDay: 5
      })
    })
    expect(okRes.status).toBe(200)
    const okData = await okRes.json()
    expect(okData).toEqual({
      success: true,
      transaction: {
        id: txIdToConfirm,
        isRecurring: true,
        recurrencePeriod: 'monthly',
        recurrenceDay: 5
      }
    })

    const stored = mockTransactionsStore.get(txIdToConfirm)
    expect(stored?.isRecurring).toBe(true)
    expect(stored?.recurrencePeriod).toBe('monthly')
    expect(stored?.recurrenceDay).toBe(5)
  })

  it('POST /api/v1/insights/subscriptions/ignore deve persistir chave ignorada e ocultá-la nas listagens seguintes', async () => {
    const ignoreRes = await app.request('/api/v1/insights/subscriptions/ignore', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ normalizedKey: 'netflix' })
    })

    expect(ignoreRes.status).toBe(200)
    const ignoreData = await ignoreRes.json()
    expect(ignoreData).toEqual({ success: true, normalizedKey: 'netflix' })

    const listRes = await app.request('/api/v1/insights/subscriptions', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` }
    })
    expect(listRes.status).toBe(200)
    const listData = await listRes.json()
    expect(listData.subscriptions).toHaveLength(0)
    expect(listData.summary.activeCount).toBe(0)
  })
})
