import { describe, it, expect, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'

describe('BFF Accounts API (TDD)', () => {
  let authToken: string
  const testUserId = 'user-acc-test-123'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'test-acc@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  describe('GET /api/v1/accounts', () => {
    it('deve retornar 401 quando requisição não contiver token de autenticação', async () => {
      const res = await app.request('/api/v1/accounts')
      expect(res.status).toBe(401)
    })

    it('deve retornar 200 e lista de contas quando autenticado', async () => {
      const res = await app.request('/api/v1/accounts', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(Array.isArray(json.data)).toBe(true)
    })
  })

  describe('POST /api/v1/accounts', () => {
    it('deve retornar 401 sem token de autenticação', async () => {
      const res = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nova Conta' })
      })
      expect(res.status).toBe(401)
    })

    it('deve rejeitar requisição sem campo name retornando status 400', async () => {
      const res = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ type: 'checking' })
      })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json).toHaveProperty('error')
    })

    it('deve criar uma nova conta com sucesso e retornar status 201', async () => {
      const payload = {
        name: 'Nubank Reserva',
        type: 'savings',
        balance: 1250.50
      }

      const res = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('name', 'Nubank Reserva')
      expect(data).toHaveProperty('type', 'savings')
      expect(data).toHaveProperty('balance', '1250.50')
    })
  })

  describe('DELETE /api/v1/accounts/:id', () => {
    it('deve retornar 401 sem autenticação', async () => {
      const res = await app.request('/api/v1/accounts/acc-test-1', {
        method: 'DELETE'
      })
      expect(res.status).toBe(401)
    })

    it('deve remover conta existente e retornar status 200', async () => {
      // Cria uma conta para deletar
      const createRes = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: 'Conta Para Deletar' })
      })
      const created = await createRes.json()

      const deleteRes = await app.request(`/api/v1/accounts/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(deleteRes.status).toBe(200)
      const delJson = await deleteRes.json()
      expect(delJson).toHaveProperty('success', true)
      expect(delJson).toHaveProperty('id', created.id)
    })
  })
})
