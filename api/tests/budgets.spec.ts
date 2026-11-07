import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import { app } from '../index'
import { mockBudgetsStore } from '../src/routes/budgets'
import { mockTransactionsStore } from '../src/routes/transactions'
import { mockCategoriesStore } from '../src/routes/categories'

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000'
const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

describe('BFF Hono /api/v1/budgets', () => {
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

    // Configurar categorias de teste
    mockCategoriesStore.set('cat-alim', {
      id: 'cat-alim',
      userId: TEST_USER_ID,
      name: 'Alimentação',
      type: 'expense',
      color: '#10b981',
      icon: 'utensils',
      createdAt: new Date().toISOString()
    })

    mockCategoriesStore.set('cat-transp', {
      id: 'cat-transp',
      userId: TEST_USER_ID,
      name: 'Transporte',
      type: 'expense',
      color: '#3b82f6',
      icon: 'car',
      createdAt: new Date().toISOString()
    })
  })

  it('GET /api/v1/budgets sem token de autorização deve retornar 401', async () => {
    const res = await app.request('/api/v1/budgets', {
      method: 'GET'
    })
    expect(res.status).toBe(401)
  })

  it('POST /api/v1/budgets com dados inválidos deve retornar 400', async () => {
    const res = await app.request('/api/v1/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        categoryId: 'not-a-uuid',
        amountLimit: -50
      })
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/v1/budgets deve criar ou fazer upsert de limite orçamentário', async () => {
    const catId = 'a1b2c3d4-0000-0000-0000-000000000001'
    mockCategoriesStore.set(catId, {
      id: catId,
      userId: TEST_USER_ID,
      name: 'Alimentação',
      type: 'expense',
      color: '#10b981',
      icon: 'utensils',
      createdAt: new Date().toISOString()
    })

    const res = await app.request('/api/v1/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        categoryId: catId,
        amountLimit: 1000,
        period: '2026-10'
      })
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.budget).toBeDefined()
    expect(json.budget.amountLimit).toBe(1000)
    expect(json.budget.categoryId).toBe(catId)

    // Upsert com novo limite
    const resUpsert = await app.request('/api/v1/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        categoryId: catId,
        amountLimit: 1250,
        period: '2026-10'
      })
    })

    expect(resUpsert.status).toBe(200)
    const jsonUpsert = await resUpsert.json()
    expect(jsonUpsert.budget.amountLimit).toBe(1250)
  })

  it('GET /api/v1/budgets deve agregar despesas e calcular status (normal, warning, exceeded)', async () => {
    const catNormal = '00000000-0000-0000-0000-000000000010'
    const catWarning = '00000000-0000-0000-0000-000000000020'
    const catExceeded = '00000000-0000-0000-0000-000000000030'

    mockCategoriesStore.set(catNormal, {
      id: catNormal,
      userId: TEST_USER_ID,
      name: 'Lazer',
      type: 'expense',
      color: '#10b981',
      icon: 'smile',
      createdAt: new Date().toISOString()
    })
    mockCategoriesStore.set(catWarning, {
      id: catWarning,
      userId: TEST_USER_ID,
      name: 'Mercado',
      type: 'expense',
      color: '#f59e0b',
      icon: 'shopping-cart',
      createdAt: new Date().toISOString()
    })
    mockCategoriesStore.set(catExceeded, {
      id: catExceeded,
      userId: TEST_USER_ID,
      name: 'Transporte',
      type: 'expense',
      color: '#ef4444',
      icon: 'car',
      createdAt: new Date().toISOString()
    })

    // Cadastrar 3 orçamentos
    mockBudgetsStore.set('b-1', {
      id: 'b-1',
      userId: TEST_USER_ID,
      categoryId: catNormal,
      amountLimit: '1000.00',
      period: '2026-10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    mockBudgetsStore.set('b-2', {
      id: 'b-2',
      userId: TEST_USER_ID,
      categoryId: catWarning,
      amountLimit: '1000.00',
      period: '2026-10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    mockBudgetsStore.set('b-3', {
      id: 'b-3',
      userId: TEST_USER_ID,
      categoryId: catExceeded,
      amountLimit: '500.00',
      period: '2026-10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Adicionar transações de despesa em 2026-10
    // Lazer: 500 gastos de 1000 -> 50% ('normal')
    mockTransactionsStore.set('tx-1', {
      id: 'tx-1',
      userId: TEST_USER_ID,
      accountId: 'acc-1',
      categoryId: catNormal,
      amount: '500.00',
      type: 'expense',
      paid: true,
      status: 'completed',
      occurredAt: '2026-10-05T12:00:00Z',
      createdAt: '2026-10-05T12:00:00Z',
      description: 'Cinema e Jantar'
    })

    // Mercado: 800 gastos de 1000 -> 80% ('warning')
    mockTransactionsStore.set('tx-2', {
      id: 'tx-2',
      userId: TEST_USER_ID,
      accountId: 'acc-1',
      categoryId: catWarning,
      amount: '800.00',
      type: 'expense',
      paid: true,
      status: 'completed',
      occurredAt: '2026-10-10T12:00:00Z',
      createdAt: '2026-10-10T12:00:00Z',
      description: 'Supermercado Mensal'
    })

    // Transporte: 600 gastos de 500 -> 120% ('exceeded')
    mockTransactionsStore.set('tx-3', {
      id: 'tx-3',
      userId: TEST_USER_ID,
      accountId: 'acc-1',
      categoryId: catExceeded,
      amount: '600.00',
      type: 'expense',
      paid: true,
      status: 'completed',
      occurredAt: '2026-10-12T12:00:00Z',
      createdAt: '2026-10-12T12:00:00Z',
      description: 'Combustível e Manutenção'
    })

    const res = await app.request('/api/v1/budgets?period=2026-10', {
      headers: {
        Authorization: `Bearer ${validToken}`
      }
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.period).toBe('2026-10')
    expect(json.totalBudgetLimit).toBe(2500)
    expect(json.totalSpent).toBe(1900)
    expect(json.totalRemaining).toBe(600)
    expect(json.overallPercentageUsed).toBe(76)

    expect(json.budgets).toHaveLength(3)
    const normalItem = json.budgets.find((b: any) => b.categoryId === catNormal)
    expect(normalItem.status).toBe('normal')
    expect(normalItem.percentageUsed).toBe(50)
    expect(normalItem.remainingAmount).toBe(500)
    expect(normalItem.isOverBudget).toBe(false)

    const warningItem = json.budgets.find((b: any) => b.categoryId === catWarning)
    expect(warningItem.status).toBe('warning')
    expect(warningItem.percentageUsed).toBe(80)
    expect(warningItem.remainingAmount).toBe(200)
    expect(warningItem.isOverBudget).toBe(false)

    const exceededItem = json.budgets.find((b: any) => b.categoryId === catExceeded)
    expect(exceededItem.status).toBe('exceeded')
    expect(exceededItem.percentageUsed).toBe(120)
    expect(exceededItem.remainingAmount).toBe(0)
    expect(exceededItem.isOverBudget).toBe(true)
  })

  it('PUT /api/v1/budgets/:id deve atualizar o limite de um orçamento existente', async () => {
    mockBudgetsStore.set('budget-to-update', {
      id: 'budget-to-update',
      userId: TEST_USER_ID,
      categoryId: 'cat-alim',
      amountLimit: '500.00',
      period: 'monthly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    const res = await app.request('/api/v1/budgets/budget-to-update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        amountLimit: 750
      })
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.budget.amountLimit).toBe(750)
  })

  it('DELETE /api/v1/budgets/:id deve remover o orçamento', async () => {
    mockBudgetsStore.set('budget-to-del', {
      id: 'budget-to-del',
      userId: TEST_USER_ID,
      categoryId: 'cat-alim',
      amountLimit: '500.00',
      period: 'monthly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    const res = await app.request('/api/v1/budgets/budget-to-del', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${validToken}`
      }
    })

    expect(res.status).toBe(200)
    expect(mockBudgetsStore.has('budget-to-del')).toBe(false)
  })
})
