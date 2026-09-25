import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../../api/index'
import { mockInsightsStore } from '../../api/src/routes/insights'
import { mockTransactionsStore } from '../../api/src/routes/transactions'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'
const testUserId = '00000000-0000-0000-0000-000000000000'

describe('Rotas de Insights IA no BFF (TDD)', () => {
  let authToken: string

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'usuario.teste@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  beforeEach(() => {
    mockInsightsStore.clear()
    mockTransactionsStore.clear()

    // Configurar transações de teste no mockTransactionsStore
    mockTransactionsStore.set('tx-income-1', {
      id: 'tx-income-1',
      userId: testUserId,
      accountId: 'acc-1',
      categoryId: null,
      amount: '6000.00',
      description: 'Salário Mensal',
      paid: true,
      type: 'income',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    })

    mockTransactionsStore.set('tx-expense-1', {
      id: 'tx-expense-1',
      userId: testUserId,
      accountId: 'acc-1',
      categoryId: null,
      amount: '-2000.00',
      description: 'Aluguel',
      paid: true,
      type: 'expense',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    })
  })

  it('GET /api/v1/insights deve retornar 401 quando não autenticado', async () => {
    const res = await app.request('/api/v1/insights', {
      method: 'GET'
    })

    expect(res.status).toBe(401)
  })

  it('GET /api/v1/insights deve retornar 200 com insight gerado para o usuário', async () => {
    const res = await app.request('/api/v1/insights', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data).toHaveProperty('insight')
    expect(data.insight).toHaveProperty('summary')
    expect(data.insight).toHaveProperty('financialHealthScore')
    expect(data.insight).toHaveProperty('highlights')
    expect(data.insight).toHaveProperty('alerts')
    expect(data.insight).toHaveProperty('recommendations')
    expect(data.insight.financialHealthScore).toBeGreaterThanOrEqual(0)
    expect(data.insight.financialHealthScore).toBeLessThanOrEqual(100)
    expect(data.insight.source).toBe('fallback')
    expect(data.insight.isFallback).toBe(true)
  })

  it('POST /api/v1/insights/generate deve retornar 401 quando não autenticado', async () => {
    const res = await app.request('/api/v1/insights/generate', {
      method: 'POST'
    })

    expect(res.status).toBe(401)
  })

  it('POST /api/v1/insights/generate deve recalcular métricas e atualizar o insight', async () => {
    const res = await app.request('/api/v1/insights/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ period: '2026-09' })
    })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data).toHaveProperty('insight')
    expect(data.insight.period).toBe('2026-09')
    expect(data.insight.source).toBe('fallback')
    expect(data.insight.isFallback).toBe(true)
    expect(data.message).toBe('Análise financeira atualizada com sucesso!')
  })

  it('deve utilizar a chave BYOK do usuário quando configurada', async () => {
    const { encryptApiKey } = await import('../../api/src/services/crypto')
    const { mockUserAiSettingsStore } = await import('../../api/src/routes/userAi')

    const encryptedKey = await encryptApiKey('AIzaSyValidMockKeyForByokTesting123')
    mockUserAiSettingsStore.set(testUserId, {
      id: 'mock-ai-1',
      userId: testUserId,
      provider: 'gemini',
      customModel: 'gemini-1.5-flash',
      apiKeyEncrypted: encryptedKey,
      isValidated: true,
      lastTestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Mock fetch global para simular resposta do Gemini com sucesso
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: any) => {
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        summary: 'Análise gerada com sua chave pessoal BYOK.',
                        financialHealthScore: 88,
                        highlights: ['Uso de chave própria bem-sucedido.'],
                        alerts: [],
                        recommendations: ['Continue poupando.']
                      })
                    }
                  ]
                }
              }
            ]
          })
        } as any
      }
      return originalFetch(url)
    }) as any

    try {
      const res = await app.request('/api/v1/insights/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ period: '2026-10' })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.insight.source).toBe('byok')
      expect(data.insight.isFallback).toBe(false)
      expect(data.insight.summary).toContain('BYOK')
    } finally {
      globalThis.fetch = originalFetch
      mockUserAiSettingsStore.clear()
    }
  })

  it('deve utilizar a chave do sistema corporativo quando o usuário for Admin', async () => {
    const adminToken = await sign(
      {
        sub: 'admin-user-id',
        email: 'leonardocps2015@gmail.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )

    process.env.GEMINI_API_KEY = 'corporate-gemini-key'

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: any) => {
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        summary: 'Análise corporativa gerada via servidor para Admin.',
                        financialHealthScore: 92,
                        highlights: ['Chave interna corporativa utilizada.'],
                        alerts: [],
                        recommendations: ['Excelente gestão!']
                      })
                    }
                  ]
                }
              }
            ]
          })
        } as any
      }
      return originalFetch(url)
    }) as any

    try {
      const res = await app.request('/api/v1/insights/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ period: '2026-11' })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.insight.source).toBe('system')
      expect(data.insight.isFallback).toBe(false)
      expect(data.insight.summary).toContain('corporativa')
    } finally {
      globalThis.fetch = originalFetch
      delete process.env.GEMINI_API_KEY
    }
  })
})

