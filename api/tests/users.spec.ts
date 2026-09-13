import { describe, it, expect, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'

describe('BFF Users API - Hardening, Sanitização e Account Linking Multi-provedores', () => {
  let authTokenUser1: string
  let authTokenUser2: string
  const userId1 = '11111111-1111-1111-1111-111111111111'
  const userId2 = '22222222-2222-2222-2222-222222222222'
  const user1Email = 'joao.silva@gmail.com'
  const user2Email = 'maria.apple@icloud.com'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET

    authTokenUser1 = await sign(
      {
        sub: userId1,
        email: user1Email,
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )

    authTokenUser2 = await sign(
      {
        sub: userId2,
        email: user2Email,
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  describe('GET /api/v1/users/me', () => {
    it('deve retornar 401 para requisições sem header de autenticação', async () => {
      const res = await app.request('/api/v1/users/me')
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body).toHaveProperty('error', 'Não autorizado')
    })

    it('deve retornar 200 e perfil sanitizado do usuário com token válido', async () => {
      const res = await app.request('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${authTokenUser1}` }
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('user')
      expect(body.user.email).toBe(user1Email)
      expect(body.user).not.toHaveProperty('password')
      expect(body.user).not.toHaveProperty('token')
      expect(body.user).not.toHaveProperty('secret')
    })
  })

  describe('GET /api/v1/users/check-email', () => {
    it('deve retornar 400 se o email não for informado', async () => {
      const res = await app.request('/api/v1/users/check-email')
      expect(res.status).toBe(400)
    })

    it('deve retornar exists: false para e-mail não cadastrado', async () => {
      const res = await app.request('/api/v1/users/check-email?email=novo.usuario@dinheirizz.com')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ exists: false })
    })

    it('deve retornar exists: true para e-mail que já existe', async () => {
      // Primeiro cria/sincroniza o usuário
      await app.request('/api/v1/users/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authTokenUser1}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fullName: 'João Silva' })
      })

      const res = await app.request(`/api/v1/users/check-email?email=${user1Email}`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ exists: true })
    })
  })

  describe('POST /api/v1/users/sync', () => {
    it('deve retornar 401 sem autenticação', async () => {
      const res = await app.request('/api/v1/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'João Silva' })
      })
      expect(res.status).toBe(401)
    })

    it('deve sincronizar e criar perfil de usuário com email e senha', async () => {
      const res = await app.request('/api/v1/users/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authTokenUser1}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: 'João Silva',
          username: 'joaosilva',
          provider: 'email'
        })
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('user')
      expect(body.user.email).toBe(user1Email)
      expect(body.user.fullName).toBe('João Silva')
      expect(body.user.username).toBe('joaosilva')
      expect(body.user.provider).toBe('email')
      expect(body.user.providers).toContain('email')
    })

    it('deve unificar conta (Account Linking) quando usuário faz login posterior via Google com o mesmo e-mail', async () => {
      // Simula novo token com mesmo email vindo de OAuth Google
      const googleToken = await sign(
        {
          sub: 'google-oauth-sub-12345',
          email: user1Email, // Mesmo e-mail cadastrado anteriormente
          role: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        TEST_JWT_SECRET,
        'HS256'
      )

      const res = await app.request('/api/v1/users/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: 'João Silva Google',
          avatarUrl: 'https://lh3.googleusercontent.com/a/avatar123',
          provider: 'google'
        })
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('user')
      expect(body.user.email).toBe(user1Email)
      // Deve conter ambos os provedores unificados na mesma conta sem duplicidade
      expect(body.user.providers).toContain('email')
      expect(body.user.providers).toContain('google')
      expect(body.user.avatarUrl).toBe('https://lh3.googleusercontent.com/a/avatar123')
    })

    it('deve sincronizar e unificar conta Apple posterior com mesmo e-mail', async () => {
      // Cadastro inicial via email
      await app.request('/api/v1/users/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authTokenUser2}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: 'Maria Apple',
          provider: 'email'
        })
      })

      // Login subsequente via Apple com o mesmo email
      const appleToken = await sign(
        {
          sub: 'apple-sub-98765',
          email: user2Email,
          role: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        TEST_JWT_SECRET,
        'HS256'
      )

      const res = await app.request('/api/v1/users/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'apple'
        })
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.email).toBe(user2Email)
      expect(body.user.providers).toContain('email')
      expect(body.user.providers).toContain('apple')
    })
  })

  describe('Security Headers', () => {
    it('deve conter headers de segurança HTTP (X-Content-Type-Options, X-Frame-Options)', async () => {
      const res = await app.request('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${authTokenUser1}` }
      })
      expect(res.headers.get('x-content-type-options')).toBe('nosniff')
      expect(res.headers.get('x-frame-options')).toBeDefined()
    })
  })
})
