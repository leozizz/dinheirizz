import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import {
  mockPersonalApiTokensStore,
  mockMcpAuditLogsStore
} from '../src/routes/apiTokens'
import { hashApiToken } from '../src/lib/apiTokenCrypto'
import { mockAccountsStore } from '../src/routes/accounts'
import { mockTransactionsStore } from '../src/routes/transactions'
import { mockBudgetsStore } from '../src/routes/budgets'
import { mockCategoriesStore } from '../src/routes/categories'
import { mockCreditCardsStore, mockInvoicesStore } from '../src/routes/creditCards'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

const createJwt = async (userId: string, email: string): Promise<string> => {
  return sign(
    {
      sub: userId,
      email,
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    TEST_JWT_SECRET,
    'HS256'
  )
}

interface JsonRpcResponseBody {
  jsonrpc: string
  id: string | number | null
  result?: {
    protocolVersion?: string
    capabilities?: Record<string, unknown>
    serverInfo?: { name: string; version: string }
    tools?: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>
    content?: Array<{ type: string; text: string }>
    isError?: boolean
  }
  error?: {
    code: number
    message: string
  }
}

describe('Personal MCP Server & API Tokens (Issue #85) - TDD', () => {
  const userA = '11111111-1111-4111-8111-111111111111'
  const userB = '22222222-2222-4222-8222-222222222222'
  let jwtA: string
  let jwtB: string

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    jwtA = await createJwt(userA, 'usera@dinheirizz.com')
    jwtB = await createJwt(userB, 'userb@dinheirizz.com')
  })

  beforeEach(() => {
    process.env.ENVIRONMENT = 'test'
    process.env.NODE_ENV = 'test'
    mockPersonalApiTokensStore.clear()
    mockMcpAuditLogsStore.clear()
    mockAccountsStore.clear()
    mockTransactionsStore.clear()
    mockBudgetsStore.clear()
    mockCategoriesStore.clear()
    mockCreditCardsStore.clear()
    mockInvoicesStore.clear()
  })

  describe('Gestão de Tokens Pessoais (/api/v1/api-tokens)', () => {
    it('deve criar token pessoal, retornar plainTextToken uma única vez e persistir apenas hash SHA-256', async () => {
      const res = await app.request('/api/v1/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtA}`
        },
        body: JSON.stringify({
          name: 'Claude Desktop',
          scopes: ['read:accounts', 'read:transactions'],
          expiresInDays: 90
        })
      })

      expect(res.status).toBe(201)
      const body = (await res.json()) as {
        token: {
          id: string
          name: string
          tokenPrefix: string
          scopes: string[]
          expiresAt: string | null
          revokedAt: string | null
        }
        plainTextToken: string
      }

      expect(body.plainTextToken.startsWith('dnz_mcp_')).toBe(true)
      expect(body.token.name).toBe('Claude Desktop')
      expect(body.token.tokenPrefix.startsWith('dnz_mcp_')).toBe(true)
      expect(body.token.scopes).toEqual(['read:accounts', 'read:transactions'])
      expect(body.token.expiresAt).not.toBeNull()
      expect(body.token.revokedAt).toBeNull()
      expect('tokenHash' in body.token).toBe(false)

      const stored = mockPersonalApiTokensStore.get(body.token.id)
      expect(stored).toBeDefined()
      const expectedHash = await hashApiToken(body.plainTextToken)
      expect(stored?.tokenHash).toBe(expectedHash)
      expect(stored?.tokenHash).not.toBe(body.plainTextToken)
    })

    it('deve listar tokens sem expor tokenHash nem plainTextToken e isolar por userId', async () => {
      await app.request('/api/v1/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtA}`
        },
        body: JSON.stringify({ name: 'Token User A' })
      })

      await app.request('/api/v1/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtB}`
        },
        body: JSON.stringify({ name: 'Token User B' })
      })

      const listRes = await app.request('/api/v1/api-tokens', {
        headers: { Authorization: `Bearer ${jwtA}` }
      })

      expect(listRes.status).toBe(200)
      const data = (await listRes.json()) as { tokens: Array<Record<string, unknown>> }
      expect(data.tokens).toHaveLength(1)
      expect(data.tokens[0].name).toBe('Token User A')
      expect(data.tokens[0].tokenHash).toBeUndefined()
      expect(data.tokens[0].plainTextToken).toBeUndefined()
    })

    it('deve retornar 404 ao tentar revogar token de outro usuário', async () => {
      const createRes = await app.request('/api/v1/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtA}`
        },
        body: JSON.stringify({ name: 'Token A' })
      })
      const created = (await createRes.json()) as { token: { id: string } }

      const delRes = await app.request(`/api/v1/api-tokens/${created.token.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtB}` }
      })

      expect(delRes.status).toBe(404)
    })
  })

  describe('Autenticação & Protocolo JSON-RPC 2.0 (/api/mcp)', () => {
    it('deve retornar HTTP 401 sem Authorization, com token inválido, expirado ou revogado', async () => {
      const noAuthRes = await app.request('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
      })
      expect(noAuthRes.status).toBe(401)
      const noAuthJson = (await noAuthRes.json()) as JsonRpcResponseBody
      expect(noAuthJson.error?.code).toBe(-32001)

      const invalidRes = await app.request('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer dnz_mcp_invalid_token_123456'
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
      })
      expect(invalidRes.status).toBe(401)

      // Criar token e depois revogar
      const createRes = await app.request('/api/v1/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtA}`
        },
        body: JSON.stringify({ name: 'Cursor' })
      })
      const { token, plainTextToken } = (await createRes.json()) as {
        token: { id: string }
        plainTextToken: string
      }

      const revokeRes = await app.request(`/api/v1/api-tokens/${token.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtA}` }
      })
      expect(revokeRes.status).toBe(200)

      const afterRevokeRes = await app.request('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainTextToken}`
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'ping' })
      })
      expect(afterRevokeRes.status).toBe(401)

      // Token expirado
      const expiredToken = 'dnz_mcp_expired_0000000000000000000000000000000000000000'
      const expiredHash = await hashApiToken(expiredToken)
      mockPersonalApiTokensStore.set('expired-id', {
        id: 'expired-id',
        userId: userA,
        name: 'Expired',
        tokenPrefix: 'dnz_mcp_expi...',
        tokenHash: expiredHash,
        scopes: ['read:accounts'],
        lastUsedAt: null,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        revokedAt: null,
        createdAt: new Date().toISOString()
      })

      const expiredRes = await app.request('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${expiredToken}`
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' })
      })
      expect(expiredRes.status).toBe(401)
    })

    it('deve responder initialize, notifications/initialized, ping e tools/list conforme MCP', async () => {
      const createRes = await app.request('/api/v1/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtA}`
        },
        body: JSON.stringify({ name: 'Antigravity' })
      })
      const { plainTextToken } = (await createRes.json()) as { plainTextToken: string }

      const initRes = await app.request('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainTextToken}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'antigravity', version: '1.0.0' }
          }
        })
      })
      expect(initRes.status).toBe(200)
      const initBody = (await initRes.json()) as JsonRpcResponseBody
      expect(initBody.result?.protocolVersion).toBe('2024-11-05')
      expect(initBody.result?.serverInfo?.name).toBe('dinheirizz-mcp')

      const notifRes = await app.request('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainTextToken}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        })
      })
      expect(notifRes.status).toBe(202)

      const listRes = await app.request('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainTextToken}`
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
      })
      expect(listRes.status).toBe(200)
      const listBody = (await listRes.json()) as JsonRpcResponseBody
      const toolNames = listBody.result?.tools?.map((t) => t.name) ?? []
      expect(toolNames).toEqual([
        'get_balance_summary',
        'list_transactions',
        'get_cashflow_forecast',
        'get_budget_status',
        'get_credit_card_invoices'
      ])
    })

    it('deve bloquear tool sem escopo requerido (isError: true) e registrar log forbidden', async () => {
      const createRes = await app.request('/api/v1/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtA}`
        },
        body: JSON.stringify({
          name: 'Only Transactions',
          scopes: ['read:transactions']
        })
      })
      const { plainTextToken } = (await createRes.json()) as { plainTextToken: string }

      const callRes = await app.request('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainTextToken}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: 'get_balance_summary',
            arguments: {}
          }
        })
      })

      expect(callRes.status).toBe(200)
      const callBody = (await callRes.json()) as JsonRpcResponseBody
      expect(callBody.result?.isError).toBe(true)
      expect(callBody.result?.content?.[0]?.text).toContain('read:accounts')

      const logsRes = await app.request('/api/v1/api-tokens/logs', {
        headers: { Authorization: `Bearer ${jwtA}` }
      })
      expect(logsRes.status).toBe(200)
      const logsData = (await logsRes.json()) as {
        logs: Array<{ toolName: string; status: string }>
      }
      expect(logsData.logs.some((l) => l.toolName === 'get_balance_summary' && l.status === 'forbidden')).toBe(true)
    })

    it('deve retornar erro JSON-RPC -32602 para parâmetros inválidos em tools/call', async () => {
      const createRes = await app.request('/api/v1/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtA}`
        },
        body: JSON.stringify({ name: 'Full Read' })
      })
      const { plainTextToken } = (await createRes.json()) as { plainTextToken: string }

      const badRes = await app.request('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainTextToken}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: {
            name: 'get_cashflow_forecast',
            arguments: { days: 999 }
          }
        })
      })

      expect(badRes.status).toBe(200)
      const badBody = (await badRes.json()) as JsonRpcResponseBody
      expect(badBody.error?.code).toBe(-32602)
    })
  })

  describe('Isolamento Multi-Tenant nas 5 Tools Read-Only', () => {
    it('deve retornar exclusivamente dados do dono do token em todas as 5 tools', async () => {
      const accA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      const accB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      const catA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      const catB = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      const cardA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
      const cardB = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

      mockAccountsStore.set(accA, {
        id: accA,
        userId: userA,
        name: 'Conta User A',
        type: 'checking',
        balance: '5000.00',
        createdAt: new Date().toISOString()
      })
      mockAccountsStore.set(accB, {
        id: accB,
        userId: userB,
        name: 'Conta Secreta B',
        type: 'checking',
        balance: '99999.00',
        createdAt: new Date().toISOString()
      })

      const now = new Date()
      const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

      mockCategoriesStore.set(catA, {
        id: catA,
        userId: userA,
        name: 'Alimentação A',
        type: 'expense',
        icon: 'utensils',
        color: '#7bc816',
        createdAt: now.toISOString()
      })
      mockCategoriesStore.set(catB, {
        id: catB,
        userId: userB,
        name: 'Segredo B',
        type: 'expense',
        icon: 'lock',
        color: '#ff0000',
        createdAt: now.toISOString()
      })

      mockTransactionsStore.set('tx-a', {
        id: 'tx-a',
        userId: userA,
        accountId: accA,
        categoryId: catA,
        amount: '-120.50',
        description: 'Supermercado A',
        paid: true,
        status: 'completed',
        occurredAt: now.toISOString(),
        createdAt: now.toISOString()
      })
      mockTransactionsStore.set('tx-b', {
        id: 'tx-b',
        userId: userB,
        accountId: accB,
        categoryId: catB,
        amount: '-900.00',
        description: 'Compra Secreta B',
        paid: true,
        status: 'completed',
        occurredAt: now.toISOString(),
        createdAt: now.toISOString()
      })

      mockBudgetsStore.set('bud-a', {
        id: 'bud-a',
        userId: userA,
        categoryId: catA,
        amountLimit: '1000.00',
        period: currentPeriod,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      })
      mockBudgetsStore.set('bud-b', {
        id: 'bud-b',
        userId: userB,
        categoryId: catB,
        amountLimit: '5000.00',
        period: currentPeriod,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      })

      mockCreditCardsStore.set(cardA, {
        id: cardA,
        userId: userA,
        accountId: accA,
        name: 'Nubank A',
        brand: 'mastercard',
        limitAmount: '8000.00',
        closingDay: 5,
        dueDay: 12,
        color: '#820ad1',
        lastFourDigits: '1234',
        archived: false,
        createdAt: now.toISOString(),
        updatedAt: null
      })
      mockCreditCardsStore.set(cardB, {
        id: cardB,
        userId: userB,
        accountId: accB,
        name: 'Black B',
        brand: 'visa',
        limitAmount: '50000.00',
        closingDay: 10,
        dueDay: 20,
        color: '#000000',
        lastFourDigits: '9999',
        archived: false,
        createdAt: now.toISOString(),
        updatedAt: null
      })

      mockInvoicesStore.set('inv-a', {
        id: 'inv-a',
        creditCardId: cardA,
        userId: userA,
        period: currentPeriod,
        closingDate: now.toISOString(),
        dueDate: now.toISOString(),
        amount: '450.00',
        status: 'open',
        paidAmount: '0.00',
        paidAt: null,
        paymentAccountId: null,
        paymentTransactionId: null,
        createdAt: now.toISOString(),
        updatedAt: null
      })
      mockInvoicesStore.set('inv-b', {
        id: 'inv-b',
        creditCardId: cardB,
        userId: userB,
        period: currentPeriod,
        closingDate: now.toISOString(),
        dueDate: now.toISOString(),
        amount: '15000.00',
        status: 'open',
        paidAmount: '0.00',
        paidAt: null,
        paymentAccountId: null,
        paymentTransactionId: null,
        createdAt: now.toISOString(),
        updatedAt: null
      })

      const createRes = await app.request('/api/v1/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtA}`
        },
        body: JSON.stringify({ name: 'Suite Completa' })
      })
      const { plainTextToken } = (await createRes.json()) as { plainTextToken: string }

      const callTool = async (name: string, args: Record<string, unknown> = {}) => {
        const res = await app.request('/api/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${plainTextToken}`
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: name,
            method: 'tools/call',
            params: { name, arguments: args }
          })
        })
        expect(res.status).toBe(200)
        const json = (await res.json()) as JsonRpcResponseBody
        expect(json.result?.isError).toBe(false)
        return json.result?.content?.[0]?.text ?? ''
      }

      const balanceText = await callTool('get_balance_summary')
      expect(balanceText).toContain('Conta User A')
      expect(balanceText).toContain('5000')
      expect(balanceText).not.toContain('Conta Secreta B')
      expect(balanceText).not.toContain('99999')

      const txText = await callTool('list_transactions', { type: 'expense' })
      expect(txText).toContain('Supermercado A')
      expect(txText).not.toContain('Compra Secreta B')

      const forecastText = await callTool('get_cashflow_forecast', { days: 30 })
      expect(forecastText).toContain('"startingBalance":5000')
      expect(forecastText).not.toContain('99999')

      const budgetText = await callTool('get_budget_status', { period: currentPeriod })
      expect(budgetText).toContain('Alimentação A')
      expect(budgetText).not.toContain('Segredo B')

      const invoiceText = await callTool('get_credit_card_invoices', { period: currentPeriod })
      expect(invoiceText).toContain('Nubank A')
      expect(invoiceText).toContain('450')
      expect(invoiceText).not.toContain('Black B')
      expect(invoiceText).not.toContain('15000')
    })
  })
})
