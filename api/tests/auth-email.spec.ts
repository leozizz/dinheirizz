import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import app from '../index'
import { getSentEmails, clearSentEmails } from '../src/services/email'

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
})
