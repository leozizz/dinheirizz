import { describe, it, expect, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'

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

