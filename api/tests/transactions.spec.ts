import { describe, it, expect, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import { mockTransactionsStore } from '../src/routes/transactions'

describe('BFF Transactions & Categories API', () => {
  let authToken: string
  const testUserId = 'user-tx-test-123'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'test@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  describe('GET /api/v1/transactions', () => {
    it('deve retornar 401 quando requisição não contiver token de autenticação', async () => {
      const res = await app.request('/api/v1/transactions')
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body).toHaveProperty('error', 'Não autorizado')
    })

    it('deve retornar 200 e lista de transações com token válido', async () => {
      const res = await app.request('/api/v1/transactions', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.data.length).toBeGreaterThan(0)
      expect(json.data[0]).toHaveProperty('amount')
    })

    it('deve retornar metadados de paginação padrão (page=1, limit=20, total, totalPages, hasMore)', async () => {
      const res = await app.request('/api/v1/transactions', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(json).toHaveProperty('total')
      expect(json).toHaveProperty('page', 1)
      expect(json).toHaveProperty('limit', 20)
      expect(json).toHaveProperty('totalPages')
      expect(json).toHaveProperty('hasMore')
    })

    it('deve respeitar os query params page e limit retornando o subconjunto correto', async () => {
      // Popula 25 transações para testUserId
      for (let i = 1; i <= 25; i++) {
        mockTransactionsStore.set(`pag-test-${i}`, {
          id: `pag-test-${i}`,
          userId: testUserId,
          accountId: '00000000-0000-0000-0000-000000000000',
          categoryId: null,
          amount: `${i * 10}.00`,
          description: `Transação Paginada ${i}`,
          paid: true,
          type: 'expense',
          occurredAt: new Date(Date.now() - i * 3600000).toISOString(),
          createdAt: new Date(Date.now() - i * 3600000).toISOString()
        })
      }

      // Página 1 com limit=10
      const resPage1 = await app.request('/api/v1/transactions?page=1&limit=10', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(resPage1.status).toBe(200)
      const json1 = await resPage1.json()
      expect(json1.data.length).toBe(10)
      expect(json1.page).toBe(1)
      expect(json1.limit).toBe(10)
      expect(json1.hasMore).toBe(true)

      // Página 3 com limit=10 (deve ter os itens restantes e hasMore=false)
      const resPage3 = await app.request('/api/v1/transactions?page=3&limit=10', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(resPage3.status).toBe(200)
      const json3 = await resPage3.json()
      expect(json3.data.length).toBeGreaterThanOrEqual(5)
      expect(json3.page).toBe(3)
      expect(json3.hasMore).toBe(false)
    })

    it('deve ordenar as transações por data (occurredAt) decrescente', async () => {
      const res = await app.request('/api/v1/transactions?page=1&limit=5', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const json = await res.json()
      const dates = json.data.map((t: any) => new Date(t.occurredAt).getTime())
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1])
      }
    })

    it('deve filtrar transações por accountId quando fornecido', async () => {
      const customAccId = 'acc-custom-filter-123'
      mockTransactionsStore.set('tx-acc-filtered', {
        id: 'tx-acc-filtered',
        userId: testUserId,
        accountId: customAccId,
        categoryId: null,
        amount: '999.00',
        description: 'Transação Conta Customizada',
        paid: true,
        type: 'income',
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      })

      const res = await app.request(`/api/v1/transactions?accountId=${customAccId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const json = await res.json()
      expect(json.data.length).toBe(1)
      expect(json.data[0].id).toBe('tx-acc-filtered')
    })
  })

  describe('POST /api/v1/transactions', () => {
    it('deve retornar 401 ao tentar cadastrar sem autenticação', async () => {
      const res = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 50.0 })
      })
      expect(res.status).toBe(401)
    })

    it('deve cadastrar uma transação válida vinculada ao userId do JWT e retornar 201', async () => {
      const payload = {
        amount: 89.9,
        description: 'Supermercado Mensal',
        paid: true
      }

      const res = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toHaveProperty('amount', '89.90')
      expect(data).toHaveProperty('description', 'Supermercado Mensal')
      expect(data).toHaveProperty('userId', testUserId)
    })

    it('deve rejeitar transação com amount negativo ou zero retornando status 400', async () => {
      const invalidPayload = {
        amount: -50.0,
        description: 'Valor Inválido'
      }

      const res = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(invalidPayload)
      })

      expect(res.status).toBe(400)
      const errorData = await res.json()
      expect(errorData).toHaveProperty('error')
      expect(errorData.error).toContain('inválido')
    })

    it('deve rejeitar transação sem campo amount retornando status 400', async () => {
      const missingPayload = {
        description: 'Sem Valor'
      }

      const res = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(missingPayload)
      })

      expect(res.status).toBe(400)
    })

    it('deve atualizar o saldo da conta ao registrar receita ou despesa', async () => {
      // 1. Cadastra uma conta de teste
      const accRes = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'Conta Teste Saldo',
          type: 'checking',
          balance: 1000.0
        })
      })
      expect(accRes.status).toBe(201)
      const acc = await accRes.json()

      // 2. Registra uma despesa de 200.00
      const expRes = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          amount: 200.0,
          type: 'expense',
          accountId: acc.id,
          description: 'Despesa Teste'
        })
      })
      expect(expRes.status).toBe(201)

      // 3. Verifica se a conta agora tem 800.00
      const getAccRes = await app.request('/api/v1/accounts', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const accsList = await getAccRes.json()
      const updatedAcc = accsList.data.find((a: any) => a.id === acc.id)
      expect(Number(updatedAcc.balance)).toBe(800.0)

      // 4. Registra uma receita de 500.00
      const incRes = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          amount: 500.0,
          type: 'income',
          accountId: acc.id,
          description: 'Receita Teste'
        })
      })
      expect(incRes.status).toBe(201)

      // 5. Verifica se a conta agora tem 1300.00
      const getAccRes2 = await app.request('/api/v1/accounts', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const accsList2 = await getAccRes2.json()
      const updatedAcc2 = accsList2.data.find((a: any) => a.id === acc.id)
      expect(Number(updatedAcc2.balance)).toBe(1300.0)
    })

    it('deve retornar transações em ordem cronológica (da mais recente para a mais antiga)', async () => {
      // Cria uma transação mais antiga (ontem) e uma mais recente (hoje)
      const yesterday = new Date(Date.now() - 86400000).toISOString()
      const today = new Date().toISOString()

      await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          amount: 10.0,
          type: 'expense',
          description: 'Ontem',
          occurredAt: yesterday
        })
      })

      await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          amount: 20.0,
          type: 'income',
          description: 'Hoje',
          occurredAt: today
        })
      })

      const res = await app.request('/api/v1/transactions', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const json = await res.json()
      expect(json.data.length).toBeGreaterThanOrEqual(2)

      // A lista deve estar em ordem estrita decrescente de data
      for (let i = 0; i < json.data.length - 1; i++) {
        const timeCurrent = new Date(json.data[i].occurredAt || json.data[i].occurred_at).getTime()
        const timeNext = new Date(json.data[i + 1].occurredAt || json.data[i + 1].occurred_at).getTime()
        expect(timeCurrent).toBeGreaterThanOrEqual(timeNext)
      }
    })
  })

  describe('GET /api/v1/categories (Rota Pública)', () => {
    it('deve retornar 200 com lista de categorias ativas mesmo sem autenticação', async () => {
      const res = await app.request('/api/v1/categories')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.data.length).toBeGreaterThan(0)
    })
  })
})

