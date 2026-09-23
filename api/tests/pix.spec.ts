import { describe, it, expect, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'

describe('BFF Pix Keys API (TDD)', () => {
  let authToken: string
  const testUserId = 'user-pix-test-123'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'test-pix@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  describe('GET /api/v1/pix-keys', () => {
    it('deve retornar 401 sem autenticação', async () => {
      const res = await app.request('/api/v1/pix-keys')
      expect(res.status).toBe(401)
    })

    it('deve retornar 200 e lista de chaves quando autenticado', async () => {
      const res = await app.request('/api/v1/pix-keys', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(Array.isArray(json.data)).toBe(true)
    })
  })

  describe('POST /api/v1/pix-keys', () => {
    it('deve retornar 401 sem autenticação', async () => {
      const res = await app.request('/api/v1/pix-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyType: 'email', keyValue: 'test@pix.com', bankName: 'Nubank' })
      })
      expect(res.status).toBe(401)
    })

    it('deve rejeitar tipo de chave inválido com status 400', async () => {
      const res = await app.request('/api/v1/pix-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          keyType: 'tipo_invalido',
          keyValue: '123456',
          bankName: 'Nubank'
        })
      })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json).toHaveProperty('error')
    })

    it('deve cadastrar nova chave Pix válida com status 201', async () => {
      const payload = {
        keyType: 'cpf',
        keyValue: '123.456.789-00',
        bankName: 'Nubank',
        description: 'Chave CPF Principal'
      }

      const res = await app.request('/api/v1/pix-keys', {
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
      expect(data).toHaveProperty('keyType', 'cpf')
      expect(data).toHaveProperty('keyValue', '123.456.789-00')
      expect(data).toHaveProperty('bankName', 'Nubank')
    })
  })

  describe('DELETE /api/v1/pix-keys/:id', () => {
    it('deve retornar 401 sem autenticação', async () => {
      const res = await app.request('/api/v1/pix-keys/pix-test-1', {
        method: 'DELETE'
      })
      expect(res.status).toBe(401)
    })

    it('deve remover chave existente com status 200', async () => {
      // Cria uma chave
      const createRes = await app.request('/api/v1/pix-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          keyType: 'email',
          keyValue: 'delete-me@pix.com',
          bankName: 'Itaú'
        })
      })
      const created = await createRes.json()

      const deleteRes = await app.request(`/api/v1/pix-keys/${created.id}`, {
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
