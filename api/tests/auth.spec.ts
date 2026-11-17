import { describe, it, expect, vi, afterEach } from 'vitest'
import app from '../index'

describe('BFF-Driven Auth Endpoints (/api/v1/auth/*)', () => {
  const testEmail = `bff_test_${Date.now()}@dinheirizz.com`
  const testPassword = 'Password123!'
  const testUsername = `user_${Date.now().toString().slice(-6)}`
  let authToken = ''

  it('deve realizar signup com sucesso retornando payload estritamente sanitizado (201)', async () => {
    const res = await app.request('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        fullName: 'BFF Test User',
        username: testUsername
      })
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toEqual({
      success: true,
      message: 'Cadastro realizado com sucesso.'
    })
    // Garante que nenhum dado interno de Supabase (identities, user_metadata, aud, role) é vazado
    expect(data).not.toHaveProperty('identities')
    expect(data).not.toHaveProperty('user_metadata')
    expect(data).not.toHaveProperty('app_metadata')
    expect(data).not.toHaveProperty('token')
  })

  it('deve rejeitar cadastro com e-mail já cadastrado retornando 409 Conflict', async () => {
    const res = await app.request('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'AnotherPassword123!',
        fullName: 'Another Name'
      })
    })

    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBe('Este e-mail já está cadastrado.')
  })

  it('deve rejeitar dados inválidos no signup com 400 Bad Request', async () => {
    const res = await app.request('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: '123'
      })
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Dados inválidos')
    expect(data).toHaveProperty('details')
  })

  it('deve realizar login com sucesso e retornar token próprio + usuário sanitizado (200)', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('token')
    expect(typeof data.token).toBe('string')
    expect(data).toHaveProperty('user')
    expect(data.user.email).toBe(testEmail.toLowerCase())
    expect(data.user.fullName).toBe('BFF Test User')
    expect(data.user.username).toBe(testUsername)

    // Garante que não vaza identidades ou metadados de infraestrutura
    expect(data).not.toHaveProperty('identities')
    expect(data.user).not.toHaveProperty('identities')
    expect(data.user).not.toHaveProperty('app_metadata')

    authToken = data.token
  })

  it('deve rejeitar login com senha incorreta com 401 Unauthorized', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!'
      })
    })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('E-mail ou senha incorretos')
  })

  it('deve permitir acesso a /api/v1/auth/me com token Bearer válido', async () => {
    const res = await app.request('/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('user')
    expect(data.user.email).toBe(testEmail.toLowerCase())
  })

  it('deve rejeitar acesso a /api/v1/auth/me sem token com 401', async () => {
    const res = await app.request('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })

  it('deve responder com sucesso ao logout (200)', async () => {
    const res = await app.request('/api/v1/auth/logout', {
      method: 'POST'
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  describe('Production Environment & c.env Guards', () => {
    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    })

    it('deve retornar 500 no /signup em produção quando SUPABASE_URL/SUPABASE_ANON_KEY estiverem ausentes com banco ativo', async () => {
      vi.stubEnv('SUPABASE_URL', '')
      vi.stubEnv('VITE_SUPABASE_URL', '')
      vi.stubEnv('SUPABASE_ANON_KEY', '')
      vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')

      const res = await app.request(
        '/api/v1/auth/signup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'prod-signup@dinheirizz.com',
            password: 'Password123!'
          })
        },
        {
          ENVIRONMENT: 'production',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dinheirizz',
          JWT_SECRET: 'prod-jwt-secret-test'
        }
      )

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toContain('não configurado')
    })

    it('deve aceitar VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY como fallback no /login em produção', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'invalid_grant' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const res = await app.request(
        '/api/v1/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'prod@dinheirizz.com',
            password: 'WrongPassword!'
          })
        },
        {
          ENVIRONMENT: 'production',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dinheirizz',
          JWT_SECRET: 'prod-jwt-secret-test',
          VITE_SUPABASE_URL: 'https://example.supabase.co',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key-test'
        }
      )

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('E-mail ou senha incorretos')
    })

    it('deve retornar 500 no /login em produção quando SUPABASE_URL/SUPABASE_ANON_KEY estiverem ausentes com banco ativo', async () => {
      vi.stubEnv('SUPABASE_URL', '')
      vi.stubEnv('VITE_SUPABASE_URL', '')
      vi.stubEnv('SUPABASE_ANON_KEY', '')
      vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')

      const res = await app.request(
        '/api/v1/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'prod@dinheirizz.com',
            password: 'Password123!'
          })
        },
        {
          ENVIRONMENT: 'production',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dinheirizz',
          JWT_SECRET: 'prod-jwt-secret-test'
        }
      )

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toContain('não configurado')
    })

    it('deve retornar 401 no /login em produção quando Supabase Auth rejeitar credenciais', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'invalid_grant' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const res = await app.request(
        '/api/v1/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'prod@dinheirizz.com',
            password: 'WrongPassword!'
          })
        },
        {
          ENVIRONMENT: 'production',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dinheirizz',
          JWT_SECRET: 'prod-jwt-secret-test',
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_ANON_KEY: 'anon-key-test'
        }
      )

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('E-mail ou senha incorretos')
    })

    it('deve retornar 502 no /login em produção quando Supabase Auth retornar 5xx', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const res = await app.request(
        '/api/v1/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'prod@dinheirizz.com',
            password: 'Password123!'
          })
        },
        {
          ENVIRONMENT: 'production',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dinheirizz',
          JWT_SECRET: 'prod-jwt-secret-test',
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_ANON_KEY: 'anon-key-test'
        }
      )

      expect(res.status).toBe(502)
      const data = await res.json()
      expect(data.error).toContain('indisponível')
    })
  })
})
