import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import { app } from '../index'
import { mockBudgetsStore } from '../src/routes/budgets'
import { mockTransactionsStore } from '../src/routes/transactions'
import { mockCategoriesStore } from '../src/routes/categories'
import { mockInsightsStore } from '../src/routes/insights'

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000'
const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

describe('Integração de Insights com Alertas de Orçamentos (TDD)', () => {
  let validToken: string

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    validToken = await sign(
      {
        sub: TEST_USER_ID,
        email: 'test@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  beforeEach(() => {
    mockBudgetsStore.clear()
    mockTransactionsStore.clear()
    mockCategoriesStore.clear()
    mockInsightsStore.clear()
  })

  it('deve incluir alertas e recomendações de orçamento quando categorias ultrapassam limites', async () => {
    const catAlimId = 'cat-alim-123'
    mockCategoriesStore.set(catAlimId, {
      id: catAlimId,
      userId: TEST_USER_ID,
      name: 'Alimentação',
      type: 'expense',
      color: '#10b981',
      icon: 'utensils',
      createdAt: new Date().toISOString()
    })

    // Orçamento de R$ 1.000 para Alimentação
    mockBudgetsStore.set('b-alim', {
      id: 'b-alim',
      userId: TEST_USER_ID,
      categoryId: catAlimId,
      amountLimit: '1000.00',
      period: '2026-10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Gasto de R$ 1.100 (110% - Estourado)
    mockTransactionsStore.set('tx-alim', {
      id: 'tx-alim',
      userId: TEST_USER_ID,
      accountId: 'acc-1',
      categoryId: catAlimId,
      amount: '1100.00',
      type: 'expense',
      paid: true,
      status: 'completed',
      occurredAt: '2026-10-05T12:00:00Z',
      createdAt: '2026-10-05T12:00:00Z',
      description: 'Supermercado e Restaurantes'
    })

    const res = await app.request('/api/v1/insights?period=2026-10', {
      headers: {
        Authorization: `Bearer ${validToken}`
      }
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.insight).toBeDefined()

    // Deve conter alerta explícito sobre orçamento de Alimentação
    const hasBudgetAlert = json.insight.alerts.some((a: string) =>
      a.toLowerCase().includes('orçamento') && a.toLowerCase().includes('alimentação')
    )
    expect(hasBudgetAlert).toBe(true)

    // Deve conter recomendação sobre conter gastos na categoria estourada
    const hasBudgetRecommendation = json.insight.recommendations.some((r: string) =>
      r.toLowerCase().includes('alimentação')
    )
    expect(hasBudgetRecommendation).toBe(true)
  })
})
