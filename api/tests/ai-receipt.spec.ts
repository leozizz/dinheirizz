import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../../api/index'
import { mockUserAiSettingsStore } from '../../api/src/routes/userAi'
import { encryptApiKey } from '../../api/src/services/crypto'
import * as geminiReceiptModule from '../../api/src/services/geminiReceipt'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'
const freeUserId = '11111111-1111-1111-1111-111111111111'
const proUserId = '22222222-2222-2222-2222-222222222222'

describe('Endpoint BFF /api/v1/ai/parse-receipt (TDD)', () => {
  let freeUserToken: string
  let proUserToken: string

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET

    freeUserToken = await sign(
      {
        sub: freeUserId,
        email: 'free.user@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )

    proUserToken = await sign(
      {
        sub: proUserId,
        email: 'pro.user@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  beforeEach(() => {
    mockUserAiSettingsStore.clear()
    vi.restoreAllMocks()
    delete process.env.GEMINI_API_KEY
  })

  it('deve retornar 401 Unauthorized quando requisição não contiver Bearer token', async () => {
    const res = await app.request('/api/v1/ai/parse-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: 'dGVzdGUtaW1hZ2VtLWJhc2U2NA==',
        mimeType: 'image/jpeg'
      })
    })

    expect(res.status).toBe(401)
  })

  it('deve retornar 400 Bad Request quando payload for inválido (faltando campos ou mimeType inválido)', async () => {
    const res = await app.request('/api/v1/ai/parse-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeUserToken}`
      },
      body: JSON.stringify({
        fileBase64: 'abc', // curto demais
        mimeType: 'image/gif' // não permitido
      })
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data).toHaveProperty('error')
  })

  it('deve retornar 413 Payload Too Large quando o arquivo exceder 10MB', async () => {
    // 10MB em base64 é aproximadamente 14 milhões de caracteres
    const largeBase64 = 'A'.repeat(14.5 * 1024 * 1024)

    const res = await app.request('/api/v1/ai/parse-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeUserToken}`
      },
      body: JSON.stringify({
        fileBase64: largeBase64,
        mimeType: 'image/png'
      })
    })

    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.code).toBe('FILE_TOO_LARGE')
  })

  it('deve retornar 403 Forbidden com AI_KEY_REQUIRED para usuário Free sem chave BYOK', async () => {
    const res = await app.request('/api/v1/ai/parse-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeUserToken}`
      },
      body: JSON.stringify({
        fileBase64: 'dGVzdGUtaW1hZ2VtLWJhc2U2NC12YWxpZGE=',
        mimeType: 'image/jpeg'
      })
    })

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.code).toBe('AI_KEY_REQUIRED')
    expect(data.message).toContain('chave')
  })

  it('deve processar com sucesso para usuário Free que cadastrou chave BYOK', async () => {
    const encryptedKey = await encryptApiKey('AIzaSy-user-byok-test-key')
    mockUserAiSettingsStore.set(freeUserId, {
      id: 'setting-1',
      userId: freeUserId,
      provider: 'gemini',
      apiKeyEncrypted: encryptedKey,
      customModel: 'gemini-1.5-flash',
      isValidated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    vi.spyOn(geminiReceiptModule, 'parseReceiptWithGemini').mockResolvedValueOnce({
      amount: 95.4,
      occurredAt: '2026-11-08',
      description: 'Restaurante Porcão',
      paymentType: 'debit',
      type: 'expense',
      categorySuggestion: { id: 'cat-1', name: 'Alimentação', confidence: 0.95 },
      confidence: 0.95
    })

    const res = await app.request('/api/v1/ai/parse-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeUserToken}`
      },
      body: JSON.stringify({
        fileBase64: 'dGVzdGUtaW1hZ2VtLWJhc2U2NC12YWxpZGE=',
        mimeType: 'image/jpeg',
        availableCategories: [{ id: 'cat-1', name: 'Alimentação', type: 'expense' }]
      })
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.amount).toBe(95.4)
    expect(body.data.description).toBe('Restaurante Porcão')
    expect(body.source).toBe('byok')
  })

  it('deve retornar 422 Unprocessable Entity quando o comprovante for ilegível', async () => {
    const encryptedKey = await encryptApiKey('AIzaSy-user-byok-test-key')
    mockUserAiSettingsStore.set(freeUserId, {
      id: 'setting-1',
      userId: freeUserId,
      provider: 'gemini',
      apiKeyEncrypted: encryptedKey,
      isValidated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    vi.spyOn(geminiReceiptModule, 'parseReceiptWithGemini').mockRejectedValueOnce(
      new geminiReceiptModule.ReceiptOcrError(
        'Não foi possível identificar dados financeiros no comprovante. Verifique a nitidez ou iluminação da imagem.',
        'RECEIPT_UNREADABLE'
      )
    )

    const res = await app.request('/api/v1/ai/parse-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeUserToken}`
      },
      body: JSON.stringify({
        fileBase64: 'dGVzdGUtaW1hZ2VtLWJhc2U2NC12YWxpZGE=',
        mimeType: 'image/jpeg'
      })
    })

    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.code).toBe('RECEIPT_UNREADABLE')
  })
})
