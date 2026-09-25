import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../../api/index'
import { mockUserAiSettingsStore } from '../../api/src/routes/userAi'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'
const testUserId = '00000000-0000-0000-0000-000000000000'

describe('Endpoints de BYOK / Configurações de IA do Usuário (TDD)', () => {
  let authToken: string

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'usuario.byok@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  beforeEach(() => {
    mockUserAiSettingsStore.clear()
  })

  it('GET /api/v1/user-ai/settings deve retornar 401 quando não autenticado', async () => {
    const res = await app.request('/api/v1/user-ai/settings', { method: 'GET' })
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/user-ai/settings deve retornar estado inicial sem chave para usuário novo', async () => {
    const res = await app.request('/api/v1/user-ai/settings', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` }
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('settings')
    expect(data.settings.hasKey).toBe(false)
    expect(data.settings.maskedKey).toBeNull()
    expect(data.settings.provider).toBe('gemini')
    expect(data).toHaveProperty('userRole')
    expect(data.userRole.role).toBe('free')
  })

  it('PUT /api/v1/user-ai/settings deve retornar 401 quando não autenticado', async () => {
    const res = await app.request('/api/v1/user-ai/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'gemini', apiKey: 'AIzaSyTest123456789' })
    })
    expect(res.status).toBe(401)
  })

  it('PUT /api/v1/user-ai/settings deve rejeitar corpo com chave vazia', async () => {
    const res = await app.request('/api/v1/user-ai/settings', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider: 'gemini', apiKey: '' })
    })
    expect(res.status).toBe(400)
  })

  it('PUT /api/v1/user-ai/settings deve salvar chave criptografada e retornar chave mascarada', async () => {
    const res = await app.request('/api/v1/user-ai/settings', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'gemini',
        apiKey: 'AIzaSyB3_custom_user_gemini_key_9999',
        customModel: 'gemini-1.5-flash'
      })
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.settings.hasKey).toBe(true)
    expect(data.settings.maskedKey).toBe('AIzaSy***9999')
    expect(data.settings.maskedKey).not.toContain('custom_user_gemini_key')
    expect(data.settings.customModel).toBe('gemini-1.5-flash')

    // Verificar se no armazenamento está criptografada com salt:iv:ciphertext
    const stored = mockUserAiSettingsStore.get(testUserId)
    expect(stored).toBeDefined()
    expect(stored?.apiKeyEncrypted).toContain(':')
    expect(stored?.apiKeyEncrypted).not.toBe('AIzaSyB3_custom_user_gemini_key_9999')
  })

  it('POST /api/v1/user-ai/test-key deve validar a chave informada', async () => {
    const res = await app.request('/api/v1/user-ai/test-key', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'gemini',
        apiKey: 'AIzaSyValidFormatKey123456789'
      })
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('valid')
    expect(data.valid).toBe(true)
  })

  it('DELETE /api/v1/user-ai/settings deve remover a chave configurada', async () => {
    // Configurar chave primeiro
    mockUserAiSettingsStore.set(testUserId, {
      id: 'ai-set-1',
      userId: testUserId,
      provider: 'gemini',
      apiKeyEncrypted: 'salt:iv:cipher',
      customModel: null,
      isValidated: true,
      lastTestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    const res = await app.request('/api/v1/user-ai/settings', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('removida')

    // Confirmar que foi removida da store
    expect(mockUserAiSettingsStore.has(testUserId)).toBe(false)
  })
})
