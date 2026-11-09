import { describe, it, expect, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'

describe('POST /api/v1/import/suggest-categories (TDD)', () => {
  let authToken: string
  const testUserId = 'user-import-ai-123'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'test-import@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  it('deve retornar 401 quando não autenticado', async () => {
    const res = await app.request('/api/v1/import/suggest-categories', {
      method: 'POST',
      body: JSON.stringify({ descriptions: ['iFood'], availableCategories: [] }),
      headers: { 'Content-Type': 'application/json' }
    })
    expect(res.status).toBe(401)
  })

  it('deve retornar 400 se a lista de descrições estiver vazia', async () => {
    const res = await app.request('/api/v1/import/suggest-categories', {
      method: 'POST',
      body: JSON.stringify({ descriptions: [], availableCategories: [] }),
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })
    expect(res.status).toBe(400)
  })

  it('deve sugerir categorias coerentes para termos com fallback inteligente', async () => {
    const payload = {
      descriptions: ['IFOOD RESTAURANTE', 'POSTO SHELL GASOLINA'],
      availableCategories: [
        { id: 'cat-food', name: 'Alimentação', type: 'expense' },
        { id: 'cat-transport', name: 'Transporte', type: 'expense' }
      ]
    }

    const res = await app.request('/api/v1/import/suggest-categories', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.suggestions).toHaveLength(2)

    expect(json.suggestions[0].description).toBe('IFOOD RESTAURANTE')
    expect(json.suggestions[0].categoryId).toBe('cat-food')

    expect(json.suggestions[1].description).toBe('POSTO SHELL GASOLINA')
    expect(json.suggestions[1].categoryId).toBe('cat-transport')
  })
})
