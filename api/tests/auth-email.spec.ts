import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import app from '../index'
import { getSentEmails, clearSentEmails, sendVerificationEmail } from '../src/services/email'

describe('Email Verification & Transactional Notifications (/api/v1/auth/*)', () => {
  const uniqueId = Date.now()
  const testEmail = `user_otp_${uniqueId}@dinheirizz.com`
  const testPassword = 'Password123!'
  const testUsername = `otp_${uniqueId.toString().slice(-6)}`
  let verifiedCode = ''

  beforeEach(() => {
    clearSentEmails()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve realizar signup gerando token de verificação e disparando e-mail transacional (201)', async () => {
    const res = await app.request('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        fullName: 'OTP Test User',
        username: testUsername
      })
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toEqual({
      success: true,
      message: 'Cadastro realizado com sucesso.'
    })

    const sentEmails = getSentEmails()
    expect(sentEmails.length).toBe(1)
    expect(sentEmails[0].to).toBe(testEmail.toLowerCase())
    expect(sentEmails[0].type).toBe('verification')
    expect(sentEmails[0].code).toMatch(/^\d{6}$/)
    expect(sentEmails[0].html).toContain(sentEmails[0].code!)
  })

  it('deve rejeitar verificação de e-mail com formato de código inválido (400)', async () => {
    const res = await app.request('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        token: '123' // Menos de 6 dígitos
      })
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Dados inválidos')
  })

  it('deve rejeitar verificação de e-mail com código incorreto (400)', async () => {
    const res = await app.request('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        token: '999999' // Código que não confere
      })
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Código de verificação inválido ou expirado.')
  })

  it('deve rejeitar reenvio de código antes de decorridos 60 segundos (429 Too Many Requests)', async () => {
    const res = await app.request('/api/v1/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail
      })
    })

    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toBe('Aguarde 60 segundos antes de solicitar um novo código.')
  })

  it('deve reenviar novo código de verificação após decorrido o cooldown de 60 segundos (200)', async () => {
    // Avança o tempo em 61 segundos usando vi.useFakeTimers
    vi.useFakeTimers()
    const now = new Date()
    vi.setSystemTime(new Date(now.getTime() + 65 * 1000))

    const res = await app.request('/api/v1/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail
      })
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({
      success: true,
      message: 'Novo código de verificação enviado para o seu e-mail.'
    })

    const sentEmails = getSentEmails()
    expect(sentEmails.length).toBe(1)
    expect(sentEmails[0].to).toBe(testEmail.toLowerCase())
    expect(sentEmails[0].code).toMatch(/^\d{6}$/)
  })

  it('deve rejeitar código expirado após 15 minutos (400)', async () => {
    // Avança mais 16 minutos a partir do envio
    vi.useFakeTimers()
    const now = new Date()
    // Obter o código recém enviado no teste anterior
    // Primeiro vamos reenviar com timestamp atual
    clearSentEmails()
    vi.setSystemTime(new Date(now.getTime() + 150 * 1000))
    await app.request('/api/v1/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    })

    const sentEmails = getSentEmails()
    const validCode = sentEmails[0].code!

    // Avança 16 minutos (960 segundos)
    vi.setSystemTime(new Date(now.getTime() + (150 + 960) * 1000))

    const res = await app.request('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        token: validCode
      })
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Código de verificação inválido ou expirado.')
  })

  it('deve verificar o e-mail com sucesso com código válido (200)', async () => {
    vi.useFakeTimers()
    const now = new Date()
    vi.setSystemTime(new Date(now.getTime() + 2000 * 1000))

    clearSentEmails()
    await app.request('/api/v1/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    })

    const sent = getSentEmails()
    const latestCode = sent[0].code!
    verifiedCode = latestCode

    const res = await app.request('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        token: latestCode
      })
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({
      success: true,
      message: 'E-mail verificado com sucesso.'
    })
  })

  it('deve rejeitar tentativa de usar código já utilizado (400)', async () => {
    const alreadyUsedCode = verifiedCode

    const res = await app.request('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        token: alreadyUsedCode
      })
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Código de verificação inválido ou expirado.')
  })

  it('deve rejeitar reenvio para e-mail que já foi verificado (400)', async () => {
    const res = await app.request('/api/v1/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail
      })
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Este e-mail já foi verificado.')
  })

  it('deve retornar erro (sem mock falso positivo) quando ENVIRONMENT=production e RESEND_API_KEY ausente', async () => {
    const result = await sendVerificationEmail(
      { to: 'prod@dinheirizz.com', code: '654321', name: 'Prod User' },
      { ENVIRONMENT: 'production' }
    )

    expect(result.success).toBe(false)
    expect(result.id).toBeUndefined()
    expect(result.error).toContain('RESEND_API_KEY')
  })

  it('deve ler RESEND_API_KEY e EMAIL_FROM a partir de env (c.env) mesmo sem process.env', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'resend_email_999' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    const result = await sendVerificationEmail(
      { to: 'cenv@dinheirizz.com', code: '112233', name: 'CEnv User' },
      {
        ENVIRONMENT: 'production',
        RESEND_API_KEY: 're_from_c_env_123',
        EMAIL_FROM: 'Dinheirizz <contato@dinheirizz.com>'
      }
    )

    expect(result).toEqual({ success: true, id: 'resend_email_999' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('resend.com/emails')
    const headers = init?.headers as Record<string, string> | Headers
    const authHeader = headers instanceof Headers ? headers.get('Authorization') : headers?.Authorization || headers?.authorization
    expect(authHeader).toBe('Bearer re_from_c_env_123')
    expect(String(init?.body)).toContain('contato@dinheirizz.com')

    fetchSpy.mockRestore()
  })

  it('deve retornar 502 no /signup quando envio de e-mail falhar em produção', async () => {
    const prodEmail = `prod_fail_${Date.now()}@dinheirizz.com`
    const res = await app.request(
      '/api/v1/auth/signup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: prodEmail,
          password: testPassword,
          fullName: 'Prod Fail'
        })
      },
      { ENVIRONMENT: 'production' }
    )

    expect(res.status).toBe(502)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('deve retornar 502 no /resend-verification quando envio de e-mail falhar em produção', async () => {
    const resendEmail = `prod_resend_${Date.now()}@dinheirizz.com`
    await app.request('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resendEmail,
        password: testPassword,
        fullName: 'Resend Prod'
      })
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.now() + 65 * 1000))

    const res = await app.request(
      '/api/v1/auth/resend-verification',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail })
      },
      { ENVIRONMENT: 'production' }
    )

    expect(res.status).toBe(502)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('deve reenviar OTP em /resend-verification exclusivamente via Resend sem nenhuma chamada ao Supabase Auth', async () => {
    const resendOnlyEmail = `resend_only_${Date.now()}@dinheirizz.com`
    await app.request('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resendOnlyEmail,
        password: testPassword,
        fullName: 'Resend Only'
      })
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.now() + 65 * 1000))

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'resend_only_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    const res = await app.request(
      '/api/v1/auth/resend-verification',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendOnlyEmail })
      },
      {
        ENVIRONMENT: 'production',
        RESEND_API_KEY: 're_test_only_123'
      }
    )

    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const calledUrls = fetchSpy.mock.calls.map(([u]) => String(u))
    expect(calledUrls.some((u) => u.includes('/auth/v1/'))).toBe(false)
    expect(calledUrls[0]).toContain('resend.com/emails')

    fetchSpy.mockRestore()
  })
})
