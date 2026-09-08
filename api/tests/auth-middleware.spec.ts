import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { authMiddleware, type AuthEnv } from '../src/middlewares/auth'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

describe('Auth Middleware (Hono & JWT)', () => {
  let testApp: Hono<AuthEnv>

  beforeAll(() => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET

    testApp = new Hono<AuthEnv>()
    testApp.use('/protected/*', authMiddleware)
    testApp.get('/protected/me', (c) => {
      const userId = c.get('userId')
      const user = c.get('user')
      return c.json({ userId, user })
    })
  })

  it('deve rejeitar requisição sem header Authorization com 401', async () => {
    const res = await testApp.request('/protected/me')
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body).toHaveProperty('error', 'Não autorizado')
    expect(body).toHaveProperty('message')
  })

  it('deve rejeitar requisição com header Authorization que não começa com Bearer', async () => {
    const res = await testApp.request('/protected/me', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' }
    })
    expect(res.status).toBe(401)
  })

  it('deve rejeitar requisição com token JWT malformado ou inválido com 401', async () => {
    const res = await testApp.request('/protected/me', {
      headers: { Authorization: 'Bearer token-invalido-qualquer' }
    })
    expect(res.status).toBe(401)
  })

  it('deve rejeitar requisição com token expirado com 401', async () => {
    const expiredToken = await sign(
      {
        sub: 'user-expired-123',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hora atrás
      },
      TEST_JWT_SECRET,
      'HS256'
    )

    const res = await testApp.request('/protected/me', {
      headers: { Authorization: `Bearer ${expiredToken}` }
    })
    expect(res.status).toBe(401)
  })

  it('deve aceitar token JWT válido e injetar userId e dados do usuário no contexto', async () => {
    const validToken = await sign(
      {
        sub: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        email: 'leozizz@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )

    const res = await testApp.request('/protected/me', {
      headers: { Authorization: `Bearer ${validToken}` }
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.userId).toBe('a1b2c3d4-e5f6-7890-1234-567890abcdef')
    expect(body.user.email).toBe('leozizz@dinheirizz.com')
  })
})
