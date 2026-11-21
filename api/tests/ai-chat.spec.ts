import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../../api/index'
import { mockUserAiSettingsStore } from '../../api/src/routes/userAi'
import { mockAccountsStore } from '../../api/src/routes/accounts'
import { mockTransactionsStore } from '../../api/src/routes/transactions'
import { mockBudgetsStore } from '../../api/src/routes/budgets'
import { mockCategoriesStore } from '../../api/src/routes/categories'
import { mockCreditCardsStore, mockInvoicesStore } from '../../api/src/routes/creditCards'
import { encryptApiKey } from '../../api/src/services/crypto'
import {
  buildCopilotContext,
  executeQueryTransactions,
  executeSimulateCashflowImpact
} from '../../api/src/services/copilotContext'
import * as geminiCopilotModule from '../../api/src/services/geminiCopilot'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'
const userAId = '11111111-1111-4111-8111-111111111111'
const userBId = '22222222-2222-4222-8222-222222222222'
const categoryFoodId = '33333333-3333-4333-8333-333333333333'
const accountAId = '44444444-4444-4444-8444-444444444444'
const accountBId = '55555555-5555-4555-8555-555555555555'

describe('Copiloto Financeiro Conversacional — POST /api/v1/ai/chat (TDD)', () => {
  let userAToken: string

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET

    userAToken = await sign(
      {
        sub: userAId,
        email: 'user.a@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  beforeEach(() => {
    mockUserAiSettingsStore.clear()
    mockAccountsStore.clear()
    mockTransactionsStore.clear()
    mockBudgetsStore.clear()
    mockCategoriesStore.clear()
    mockCreditCardsStore.clear()
    mockInvoicesStore.clear()
    vi.restoreAllMocks()
    delete process.env.GEMINI_API_KEY

    mockCategoriesStore.set(categoryFoodId, {
      id: categoryFoodId,
      userId: userAId,
      name: 'Alimentação',
      type: 'expense',
      icon: 'utensils',
      color: '#fb923c'
    })

    mockAccountsStore.set(accountAId, {
      id: accountAId,
      userId: userAId,
      name: 'Conta Corrente A',
      type: 'checking',
      balance: '1500.00',
      createdAt: new Date().toISOString()
    })

    mockAccountsStore.set(accountBId, {
      id: accountBId,
      userId: userBId,
      name: 'Conta Secreta B',
      type: 'checking',
      balance: '99999.00',
      createdAt: new Date().toISOString()
    })

    const todayIso = new Date().toISOString()
    mockTransactionsStore.set('tx-user-a-1', {
      id: 'tx-user-a-1',
      userId: userAId,
      accountId: accountAId,
      categoryId: categoryFoodId,
      amount: '-180.50',
      description: 'iFood Delivery Jantar',
      paid: true,
      status: 'completed',
      type: 'expense',
      occurredAt: todayIso,
      createdAt: todayIso
    })

    mockTransactionsStore.set('tx-user-b-1', {
      id: 'tx-user-b-1',
      userId: userBId,
      accountId: accountBId,
      categoryId: null,
      amount: '-4500.00',
      description: 'Segredo Usuário B',
      paid: true,
      status: 'completed',
      type: 'expense',
      occurredAt: todayIso,
      createdAt: todayIso
    })
  })

  describe('Passo A1 — Autenticação e Validação Zod', () => {
    it('deve retornar 401 Unauthorized quando sem Bearer token', async () => {
      const res = await app.request('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Quanto gastei este mês?' }]
        })
      })

      expect(res.status).toBe(401)
    })

    it('deve retornar 400 Bad Request quando messages estiver vazio', async () => {
      const res = await app.request('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`
        },
        body: JSON.stringify({ messages: [] })
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Dados inválidos')
    })

    it('deve retornar 400 Bad Request quando messages exceder 20 itens ou 2000 caracteres', async () => {
      const tooManyMessages = Array.from({ length: 21 }, (_, idx) => ({
        role: idx % 2 === 0 ? 'user' : 'assistant',
        content: `Mensagem ${idx}`
      }))

      const resTooMany = await app.request('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`
        },
        body: JSON.stringify({ messages: tooManyMessages })
      })
      expect(resTooMany.status).toBe(400)

      const resTooLong = await app.request('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'a'.repeat(2001) }]
        })
      })
      expect(resTooLong.status).toBe(400)
    })

    it('deve retornar 400 Bad Request quando period ou profileId forem inválidos', async () => {
      const resInvalidPeriod = await app.request('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Resumo do mês' }],
          period: '2026-13'
        })
      })
      expect(resInvalidPeriod.status).toBe(400)

      const resInvalidProfile = await app.request('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Resumo do mês' }],
          profileId: 'not-a-uuid'
        })
      })
      expect(resInvalidProfile.status).toBe(400)
    })
  })

  describe('Passo A2 — Isolamento por userId e Simulação de Forecast', () => {
    it('deve isolar estritamente o contexto agregado e query_transactions por userId', async () => {
      const context = await buildCopilotContext({ userId: userAId })

      expect(context.totalBalance).toBe(1500)
      expect(context.accounts).toHaveLength(1)
      expect(context.accounts[0]?.name).toBe('Conta Corrente A')
      expect(JSON.stringify(context)).not.toContain('Conta Secreta B')
      expect(JSON.stringify(context)).not.toContain('Segredo Usuário B')

      const queryResult = await executeQueryTransactions(userAId, {
        searchText: 'Segredo'
      })
      expect(queryResult.count).toBe(0)
      expect(queryResult.totalAmount).toBe(0)

      const deliveryResult = await executeQueryTransactions(userAId, {
        searchText: 'Delivery'
      })
      expect(deliveryResult.count).toBe(1)
      expect(deliveryResult.totalAmount).toBe(180.5)
    })

    it('deve simular impacto de parcelamento no forecast 30/60d e sinalizar saldo negativo', async () => {
      const simulation = await executeSimulateCashflowImpact(userAId, {
        totalAmount: 4800,
        installments: 2,
        type: 'expense'
      })

      expect(simulation.installmentValue).toBe(2400)
      expect(simulation.willGoNegative).toBe(true)
      expect(simulation.projectedMinBalance30d).toBeLessThan(0)
    })
  })

  describe('Passo A3 — Fallback sem Chave BYOK e Function Calling Controlado', () => {
    it('deve retornar 200 com requiresApiKey=true e source=fallback quando sem chave BYOK', async () => {
      const res = await app.request('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Onde posso economizar este mês?' }]
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.requiresApiKey).toBe(true)
      expect(data.source).toBe('fallback')
      expect(data.actionCards).toEqual([])
      expect(data.reply).toContain('Gemini')
    })

    it('deve retornar actionCard create_budget sem gravar orçamento silenciosamente no banco/store', async () => {
      const encryptedKey = await encryptApiKey('AIzaSy-user-byok-copilot-test')
      mockUserAiSettingsStore.set(userAId, {
        id: 'setting-copilot-1',
        userId: userAId,
        provider: 'gemini',
        apiKeyEncrypted: encryptedKey,
        customModel: 'gemini-1.5-flash',
        isValidated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      vi.spyOn(geminiCopilotModule, 'runCopilotWithGemini').mockResolvedValueOnce({
        reply: 'Preparei a sugestão de orçamento mensal de R$ 800,00 para Alimentação. Confirme abaixo para salvar.',
        citations: [
          { label: 'Gasto recente em Alimentação', value: 'R$ 180,50', period: 'últimos 60d' }
        ],
        actionCards: [
          {
            id: 'card-budget-1',
            type: 'create_budget',
            title: 'Criar orçamento de Alimentação',
            summary: 'Limite mensal de R$ 800,00 para Alimentação',
            payload: {
              categoryId: categoryFoodId,
              categoryName: 'Alimentação',
              amountLimit: 800,
              period: 'monthly'
            }
          }
        ]
      })

      const res = await app.request('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Crie um orçamento de R$ 800 para Alimentação' }]
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.requiresApiKey).toBe(false)
      expect(data.source).toBe('byok')
      expect(data.actionCards).toHaveLength(1)
      expect(data.actionCards[0].type).toBe('create_budget')
      expect(data.citations).toHaveLength(1)
      // Mutação zero no chat: nenhum orçamento gravado automaticamente!
      expect(mockBudgetsStore.size).toBe(0)
    })

    it('deve executar loop de tool call query_transactions no runCopilotWithGemini e retornar citations', async () => {
      const encryptedKey = await encryptApiKey('AIzaSy-user-byok-loop-test')
      mockUserAiSettingsStore.set(userAId, {
        id: 'setting-copilot-2',
        userId: userAId,
        provider: 'gemini',
        apiKeyEncrypted: encryptedKey,
        customModel: 'gemini-1.5-flash',
        isValidated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    role: 'model',
                    parts: [
                      {
                        functionCall: {
                          name: 'query_transactions',
                          args: { days: 60, searchText: 'Delivery' }
                        }
                      }
                    ]
                  }
                }
              ]
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    role: 'model',
                    parts: [
                      {
                        text: 'Nos últimos 60 dias você gastou R$ 180,50 com delivery em 1 lançamento.'
                      }
                    ]
                  }
                }
              ]
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )

      const res = await app.request('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Quanto gastei com delivery nos últimos 60 dias?' }]
        })
      })

      expect(res.status).toBe(200)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const data = await res.json()
      expect(data.reply).toContain('180,50')
      expect(data.citations).toHaveLength(1)
      expect(data.citations[0].label).toContain('1 lançamentos')
    })
  })
})
