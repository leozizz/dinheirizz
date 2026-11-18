import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Database } from '../src/db/client'

const mockGetDb = vi.fn()

vi.mock('../src/db/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/db/client')>()
  return {
    ...actual,
    getDb: (...args: Parameters<typeof actual.getDb>) =>
      mockGetDb.getMockImplementation() ? mockGetDb(...args) : actual.getDb(...args)
  }
})

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
      mockGetDb.mockReset()
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    })

    it('deve retornar 500 no /signup em produção quando SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou RESEND_API_KEY estiverem ausentes com banco ativo', async () => {
      vi.stubEnv('SUPABASE_URL', '')
      vi.stubEnv('VITE_SUPABASE_URL', '')
      vi.stubEnv('SUPABASE_ANON_KEY', '')
      vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
      vi.stubEnv('RESEND_API_KEY', '')

      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      const resMissingAll = await app.request(
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

      expect(resMissingAll.status).toBe(500)
      const dataMissingAll = await resMissingAll.json()
      expect(dataMissingAll.error).toContain('não configurado')

      // Mesmo com SUPABASE_ANON_KEY presente, ausência de SUPABASE_SERVICE_ROLE_KEY deve retornar 500
      const resMissingServiceRole = await app.request(
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
          JWT_SECRET: 'prod-jwt-secret-test',
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_ANON_KEY: 'anon-key-test',
          RESEND_API_KEY: 're_test_123'
        }
      )

      expect(resMissingServiceRole.status).toBe(500)
      const dataMissingServiceRole = await resMissingServiceRole.json()
      expect(dataMissingServiceRole.error).toContain('não configurado')

      // Ausência de RESEND_API_KEY deve retornar 500 antes de chamar Supabase
      const resMissingResend = await app.request(
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
          JWT_SECRET: 'prod-jwt-secret-test',
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-test'
        }
      )

      expect(resMissingResend.status).toBe(500)
      const dataMissingResend = await resMissingResend.json()
      expect(dataMissingResend.error).toContain('RESEND_API_KEY')
      expect(fetchSpy).not.toHaveBeenCalled()
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

  describe('Supabase Admin API & Resend-Only OTP Flow', () => {
    afterEach(() => {
      mockGetDb.mockReset()
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    })

    const createSignupMockDb = () => {
      const insertUsersValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
      })
      const insertTokensValues = vi.fn().mockResolvedValue(undefined)
      let insertCallCount = 0

      return {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        }),
        execute: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockImplementation(() => {
          insertCallCount += 1
          if (insertCallCount === 1) {
            return { values: insertUsersValues }
          }
          return { values: insertTokensValues }
        })
      } as unknown as Database
    }

    it('deve criar usuário no /signup exclusivamente via Supabase Admin API (/auth/v1/admin/users) com email_confirm: false e enviar OTP via Resend', async () => {
      mockGetDb.mockReturnValue(createSignupMockDb())
      const supaUserId = '11111111-1111-4111-8111-111111111111'

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = String(input)
        if (url.includes('/auth/v1/admin/users')) {
          return new Response(JSON.stringify({ id: supaUserId, email: 'admin-otp@dinheirizz.com' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (url.includes('resend.com/emails')) {
          return new Response(JSON.stringify({ id: 'resend_ok_1' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({ error: 'unexpected url' }), { status: 500 })
      })

      const res = await app.request(
        '/api/v1/auth/signup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin-otp@dinheirizz.com',
            password: 'Password123!',
            fullName: 'Admin OTP User',
            username: 'adminotp'
          })
        },
        {
          ENVIRONMENT: 'production',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dinheirizz',
          JWT_SECRET: 'prod-jwt-secret-test',
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-key',
          RESEND_API_KEY: 're_prod_key_123'
        }
      )

      expect(res.status).toBe(201)
      const calledUrls = fetchSpy.mock.calls.map(([u]) => String(u))
      expect(calledUrls.some((u) => u.includes('/auth/v1/signup'))).toBe(false)

      const adminCall = fetchSpy.mock.calls.find(([u]) => String(u).includes('/auth/v1/admin/users'))
      expect(adminCall).toBeDefined()
      const [, adminInit] = adminCall!
      expect(adminInit?.method).toBe('POST')
      const headers = adminInit?.headers as Record<string, string>
      expect(headers.apikey).toBe('service-role-secret-key')
      expect(headers.Authorization).toBe('Bearer service-role-secret-key')

      const body = JSON.parse(String(adminInit?.body)) as {
        email: string
        password: string
        email_confirm: boolean
        user_metadata: { full_name?: string; username?: string }
      }
      expect(body.email_confirm).toBe(false)
      expect(body.user_metadata).toEqual({ full_name: 'Admin OTP User', username: 'adminotp' })
      expect(calledUrls.some((u) => u.includes('resend.com/emails'))).toBe(true)
    })

    it('deve mapear erros da Supabase Admin API no /signup (422 -> 409, 5xx -> 502, 4xx -> 400)', async () => {
      const envConfig = {
        ENVIRONMENT: 'production',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dinheirizz',
        JWT_SECRET: 'prod-jwt-secret-test',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-key',
        RESEND_API_KEY: 're_prod_key_123'
      }

      // 422 / already registered -> 409
      mockGetDb.mockReturnValue(createSignupMockDb())
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ msg: 'User already registered' }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      const res409 = await app.request(
        '/api/v1/auth/signup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'dup@dinheirizz.com', password: 'Password123!' })
        },
        envConfig
      )
      expect(res409.status).toBe(409)

      // 5xx -> 502
      mockGetDb.mockReturnValue(createSignupMockDb())
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Auth service down' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      const res502 = await app.request(
        '/api/v1/auth/signup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'down@dinheirizz.com', password: 'Password123!' })
        },
        envConfig
      )
      expect(res502.status).toBe(502)

      // 400 -> 400
      mockGetDb.mockReturnValue(createSignupMockDb())
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Invalid password format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      const res400 = await app.request(
        '/api/v1/auth/signup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'bad@dinheirizz.com', password: 'Password123!' })
        },
        envConfig
      )
      expect(res400.status).toBe(400)
    })

    it('deve confirmar e-mail em auth.users via PUT /auth/v1/admin/users/:id antes de consumir o OTP em /verify-email', async () => {
      const userId = '22222222-2222-4222-8222-222222222222'
      const validToken = {
        id: '33333333-3333-4333-8333-333333333333',
        email: 'verify-sync@dinheirizz.com',
        token: '654321',
        type: 'email_verification',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: null,
        createdAt: new Date()
      }

      const updateWhereMock = vi.fn().mockResolvedValue(undefined)
      const updateSetMock = vi.fn().mockReturnValue({ where: updateWhereMock })
      let selectCallCount = 0

      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount += 1
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([validToken])
                  })
                })
              })
            }
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: userId }])
              })
            })
          }
        }),
        update: vi.fn().mockReturnValue({ set: updateSetMock })
      } as unknown as Database

      mockGetDb.mockReturnValue(mockDb)

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ id: userId, email_confirmed_at: new Date().toISOString() }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const res = await app.request(
        '/api/v1/auth/verify-email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'verify-sync@dinheirizz.com',
            token: '654321'
          })
        },
        {
          ENVIRONMENT: 'production',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dinheirizz',
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-key'
        }
      )

      expect(res.status).toBe(200)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, init] = fetchSpy.mock.calls[0]
      expect(String(url)).toBe(`https://example.supabase.co/auth/v1/admin/users/${userId}`)
      expect(init?.method).toBe('PUT')
      const headers = init?.headers as Record<string, string>
      expect(headers.apikey).toBe('service-role-secret-key')
      expect(headers.Authorization).toBe('Bearer service-role-secret-key')
      expect(JSON.parse(String(init?.body))).toEqual({ email_confirm: true })
      expect(updateSetMock).toHaveBeenCalledTimes(2)
    })

    it('deve retornar 502 em /verify-email sem consumir o OTP se a Supabase Admin API falhar', async () => {
      const userId = '44444444-4444-4444-8444-444444444444'
      const validToken = {
        id: '55555555-5555-4555-8555-555555555555',
        email: 'verify-fail@dinheirizz.com',
        token: '123456',
        type: 'email_verification',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: null,
        createdAt: new Date()
      }

      const updateMock = vi.fn()
      let selectCallCount = 0

      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount += 1
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([validToken])
                  })
                })
              })
            }
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: userId }])
              })
            })
          }
        }),
        update: updateMock
      } as unknown as Database

      mockGetDb.mockReturnValue(mockDb)

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Upstream failure' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const res = await app.request(
        '/api/v1/auth/verify-email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'verify-fail@dinheirizz.com',
            token: '123456'
          })
        },
        {
          ENVIRONMENT: 'production',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dinheirizz',
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-key'
        }
      )

      expect(res.status).toBe(502)
      const data = await res.json()
      expect(data.error).toBe('Falha ao confirmar e-mail no provedor de autenticação.')
      expect(updateMock).not.toHaveBeenCalled()
    })

    it('deve retornar 500 em /verify-email em produção se SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY estiverem ausentes', async () => {
      vi.stubEnv('SUPABASE_URL', '')
      vi.stubEnv('VITE_SUPABASE_URL', '')
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

      const validToken = {
        id: '66666666-6666-4666-8666-666666666666',
        email: 'verify-prod-env@dinheirizz.com',
        token: '123456',
        type: 'email_verification',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: null,
        createdAt: new Date()
      }

      const updateMock = vi.fn()
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([validToken])
              })
            })
          })
        }),
        update: updateMock
      } as unknown as Database

      mockGetDb.mockReturnValue(mockDb)

      const res = await app.request(
        '/api/v1/auth/verify-email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'verify-prod-env@dinheirizz.com',
            token: '123456'
          })
        },
        {
          ENVIRONMENT: 'production',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dinheirizz'
        }
      )

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toContain('não configurado')
      expect(updateMock).not.toHaveBeenCalled()
    })
  })
})
