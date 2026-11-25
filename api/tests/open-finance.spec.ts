import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import {
  mockOpenFinanceConnectionsStore,
  mockOpenFinanceAccountLinksStore
} from '../src/routes/openFinance'
import { mockAccountsStore } from '../src/routes/accounts'
import { mockTransactionsStore } from '../src/routes/transactions'
import { mockCreditCardsStore } from '../src/routes/creditCards'
import {
  computeHmacSha256Hex,
  verifyHmacSha256Signature,
  SandboxOpenFinanceAdapter
} from '../src/services/openFinance'
import { syncOpenFinanceConnection } from '../src/services/openFinanceSync'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'
const TEST_WEBHOOK_SECRET = 'test-webhook-secret-open-finance-hmac-256'

const createToken = async (userId: string, email: string): Promise<string> => {
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

describe('Open Finance Brasil (Pluggy-only / Sandbox) - TDD', () => {
  const userA = '11111111-1111-4111-8111-111111111111'
  const userB = '22222222-2222-4222-8222-222222222222'
  let tokenA: string
  let tokenB: string

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    process.env.OPEN_FINANCE_SANDBOX = 'true'
    process.env.PLUGGY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
    process.env.PLUGGY_CLIENT_SECRET = 'super-secret-pluggy-client-secret-do-not-leak'
    tokenA = await createToken(userA, 'usera@dinheirizz.com')
    tokenB = await createToken(userB, 'userb@dinheirizz.com')
  })

  beforeEach(() => {
    process.env.OPEN_FINANCE_SANDBOX = 'true'
    process.env.ENVIRONMENT = 'test'
    process.env.NODE_ENV = 'test'
    process.env.PLUGGY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
    process.env.PLUGGY_CLIENT_ID = ''
    process.env.PLUGGY_CLIENT_SECRET = 'super-secret-pluggy-client-secret-do-not-leak'
    mockOpenFinanceConnectionsStore.clear()
    mockOpenFinanceAccountLinksStore.clear()
    mockAccountsStore.clear()
    mockTransactionsStore.clear()
    mockCreditCardsStore.clear()
  })

  describe('POST /api/v1/open-finance/connect-token', () => {
    it('deve retornar 401 sem JWT válido', async () => {
      const res = await app.request('/api/v1/open-finance/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'pluggy' })
      })

      expect(res.status).toBe(401)
    })

    it('deve retornar connectToken efêmero em modo sandbox com consentScope read_only e sem vazar segredos', async () => {
      const res = await app.request('/api/v1/open-finance/connect-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ provider: 'pluggy' })
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as Record<string, unknown>
      expect(typeof json.connectToken).toBe('string')
      expect((json.connectToken as string).length).toBeGreaterThan(10)
      expect(json.provider).toBe('pluggy')
      expect(json.mode).toBe('sandbox')
      expect(json.consentScope).toBe('read_only')
      expect(typeof json.expiresAt).toBe('string')

      const serialized = JSON.stringify(json)
      expect(serialized).not.toContain('super-secret-pluggy-client-secret-do-not-leak')
      expect(serialized).not.toContain(TEST_WEBHOOK_SECRET)
    })

    it('deve retornar 400 ao tentar gerar connect-token com provider belvo', async () => {
      const res = await app.request('/api/v1/open-finance/connect-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ provider: 'belvo' })
      })

      expect(res.status).toBe(400)
    })

    it('deve retornar 503 em produção quando PLUGGY_CLIENT_ID/PLUGGY_CLIENT_SECRET não estiverem configurados', async () => {
      process.env.ENVIRONMENT = 'production'
      process.env.NODE_ENV = 'production'
      process.env.OPEN_FINANCE_SANDBOX = 'false'
      process.env.PLUGGY_CLIENT_ID = ''
      process.env.PLUGGY_CLIENT_SECRET = ''

      const res = await app.request('/api/v1/open-finance/connect-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ provider: 'pluggy' })
      })

      expect(res.status).toBe(503)
    })
  })

  describe('POST /api/v1/open-finance/connections & GET /api/v1/open-finance/connections', () => {
    it('deve criar conexão, vincular contas/cartões, sincronizar transações e isolar por userId', async () => {
      const createRes = await app.request('/api/v1/open-finance/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          provider: 'pluggy',
          externalItemId: 'sandbox-item-nubank-01',
          institutionId: '201',
          institutionName: 'Nubank'
        })
      })

      expect(createRes.status).toBe(201)
      const created = (await createRes.json()) as {
        connection: {
          id: string
          provider: string
          institutionId: string
          institutionName: string
          status: string
          consentScope: string
          lastSyncAt: string
        }
        syncSummary: {
          accountsLinked: number
          transactionsImported: number
          duplicatesSkipped: number
          reconciledCount: number
        }
      }

      expect(created.connection.provider).toBe('pluggy')
      expect(created.connection.institutionName).toBe('Nubank')
      expect(created.connection.status).toBe('active')
      expect(created.connection.consentScope).toBe('read_only')
      expect(created.syncSummary.accountsLinked).toBeGreaterThanOrEqual(2)
      expect(created.syncSummary.transactionsImported).toBeGreaterThan(0)

      // User A vê sua conexão com linkedAccounts
      const listARes = await app.request('/api/v1/open-finance/connections', {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(listARes.status).toBe(200)
      const listA = (await listARes.json()) as {
        data: Array<{ id: string; linkedAccounts: Array<unknown> }>
        total: number
      }
      expect(listA.total).toBe(1)
      expect(listA.data[0].id).toBe(created.connection.id)
      expect(listA.data[0].linkedAccounts.length).toBeGreaterThanOrEqual(2)

      // User B não vê a conexão de User A
      const listBRes = await app.request('/api/v1/open-finance/connections', {
        headers: { Authorization: `Bearer ${tokenB}` }
      })
      expect(listBRes.status).toBe(200)
      const listB = (await listBRes.json()) as { data: Array<unknown>; total: number }
      expect(listB.total).toBe(0)
    })

    it('deve retornar 400 ao tentar criar conexão com provider belvo', async () => {
      const res = await app.request('/api/v1/open-finance/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          provider: 'belvo',
          externalItemId: 'belvo-item-01',
          institutionId: '201',
          institutionName: 'Nubank'
        })
      })

      expect(res.status).toBe(400)
    })

    it('deve reutilizar/atualizar conexão de forma idempotente para o mesmo (provider, externalItemId) e userId', async () => {
      const firstRes = await app.request('/api/v1/open-finance/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          provider: 'pluggy',
          externalItemId: 'pluggy-item-idempotent-01',
          institutionId: '201',
          institutionName: 'Nubank'
        })
      })
      expect(firstRes.status).toBe(201)
      const firstJson = (await firstRes.json()) as { connection: { id: string } }

      const secondRes = await app.request('/api/v1/open-finance/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          provider: 'pluggy',
          externalItemId: 'pluggy-item-idempotent-01',
          institutionId: '201',
          institutionName: 'Nubank Atualizado'
        })
      })
      expect([200, 201]).toContain(secondRes.status)
      const secondJson = (await secondRes.json()) as {
        connection: { id: string; institutionName: string }
      }
      expect(secondJson.connection.id).toBe(firstJson.connection.id)
      expect(secondJson.connection.institutionName).toBe('Nubank Atualizado')

      const listRes = await app.request('/api/v1/open-finance/connections', {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const listJson = (await listRes.json()) as { total: number }
      expect(listJson.total).toBe(1)
    })

    it('deve retornar 409 ao tentar vincular externalItemId já pertencente a outro usuário', async () => {
      const firstRes = await app.request('/api/v1/open-finance/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          provider: 'pluggy',
          externalItemId: 'pluggy-item-shared-conflict',
          institutionId: '201',
          institutionName: 'Nubank'
        })
      })
      expect(firstRes.status).toBe(201)

      const conflictRes = await app.request('/api/v1/open-finance/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          provider: 'pluggy',
          externalItemId: 'pluggy-item-shared-conflict',
          institutionId: '201',
          institutionName: 'Nubank'
        })
      })
      expect(conflictRes.status).toBe(409)
    })
  })

  describe('POST /api/v1/open-finance/connections/:id/sync', () => {
    it('deve sincronizar novamente evitando duplicidades e retornar 404 para outro usuário', async () => {
      const createRes = await app.request('/api/v1/open-finance/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          provider: 'pluggy',
          externalItemId: 'sandbox-item-itau-01',
          institutionId: '341',
          institutionName: 'Itaú Unibanco'
        })
      })
      const { connection } = (await createRes.json()) as { connection: { id: string } }

      // Segundo sync deve pular todas as transações já importadas por externalId
      const syncRes = await app.request(`/api/v1/open-finance/connections/${connection.id}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(syncRes.status).toBe(200)
      const syncJson = (await syncRes.json()) as {
        connectionId: string
        status: string
        syncSummary: {
          transactionsImported: number
          duplicatesSkipped: number
        }
      }
      expect(syncJson.connectionId).toBe(connection.id)
      expect(syncJson.status).toBe('active')
      expect(syncJson.syncSummary.transactionsImported).toBe(0)
      expect(syncJson.syncSummary.duplicatesSkipped).toBeGreaterThan(0)

      // Outro usuário recebe 404
      const forbiddenSync = await app.request(`/api/v1/open-finance/connections/${connection.id}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      })
      expect(forbiddenSync.status).toBe(404)
    })

    it('deve retornar 400 ao tentar sincronizar registro legado belvo orientando reconexão via Pluggy', async () => {
      const legacyId = '66666666-6666-4666-8666-666666666666'
      mockOpenFinanceConnectionsStore.set(legacyId, {
        id: legacyId,
        userId: userA,
        profileId: null,
        provider: 'belvo',
        externalItemId: 'legacy-belvo-item-sync',
        institutionId: '201',
        institutionName: 'Nubank (Belvo)',
        institutionLogoUrl: null,
        status: 'active',
        consentScope: 'read_only',
        consentExpiresAt: null,
        lastSyncAt: null,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const syncRes = await app.request(`/api/v1/open-finance/connections/${legacyId}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(syncRes.status).toBe(400)
    })
  })

  describe('DELETE /api/v1/open-finance/connections/:id', () => {
    it('deve chamar revokeItem no adapter, atualizar status para revoked e retornar 404 para outro userId', async () => {
      const revokeSpy = vi.spyOn(SandboxOpenFinanceAdapter.prototype, 'revokeItem')

      const createRes = await app.request('/api/v1/open-finance/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          provider: 'sandbox',
          externalItemId: 'sandbox-item-revoke-01',
          institutionId: '201',
          institutionName: 'Nubank'
        })
      })
      const { connection } = (await createRes.json()) as { connection: { id: string } }

      // Outro usuário não pode revogar
      const otherDel = await app.request(`/api/v1/open-finance/connections/${connection.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` }
      })
      expect(otherDel.status).toBe(404)

      // Dono revoga
      const delRes = await app.request(`/api/v1/open-finance/connections/${connection.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(delRes.status).toBe(200)
      const delJson = (await delRes.json()) as { revoked: boolean; id: string; status: string }
      expect(delJson).toEqual({
        revoked: true,
        id: connection.id,
        status: 'revoked'
      })
      expect(revokeSpy).toHaveBeenCalledWith('sandbox-item-revoke-01')

      revokeSpy.mockRestore()
    })

    it('deve revogar localmente registro legado belvo sem chamar adaptador externo', async () => {
      const revokeSpy = vi.spyOn(SandboxOpenFinanceAdapter.prototype, 'revokeItem')
      const legacyId = '77777777-7777-4777-8777-777777777777'
      mockOpenFinanceConnectionsStore.set(legacyId, {
        id: legacyId,
        userId: userA,
        profileId: null,
        provider: 'belvo',
        externalItemId: 'legacy-belvo-item-revoke',
        institutionId: '201',
        institutionName: 'Nubank (Belvo)',
        institutionLogoUrl: null,
        status: 'active',
        consentScope: 'read_only',
        consentExpiresAt: null,
        lastSyncAt: null,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const delRes = await app.request(`/api/v1/open-finance/connections/${legacyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(delRes.status).toBe(200)
      const delJson = (await delRes.json()) as { revoked: boolean; id: string; status: string }
      expect(delJson).toEqual({
        revoked: true,
        id: legacyId,
        status: 'revoked'
      })
      expect(revokeSpy).not.toHaveBeenCalled()
      expect(mockOpenFinanceConnectionsStore.get(legacyId)?.status).toBe('revoked')

      revokeSpy.mockRestore()
    })
  })

  describe('POST /api/v1/open-finance/webhook (HMAC-SHA256)', () => {
    it('deve rejeitar com 401 quando assinatura HMAC-SHA256 estiver ausente ou inválida', async () => {
      const payload = JSON.stringify({
        event: 'transactions/created',
        itemId: 'sandbox-item-wh-01',
        accountId: 'acc-ext-1'
      })

      const missingSig = await app.request('/api/v1/open-finance/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      })
      expect(missingSig.status).toBe(401)

      const invalidSig = await app.request('/api/v1/open-finance/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pluggy-signature': 'deadbeef00000000000000000000000000000000000000000000000000000000'
        },
        body: payload
      })
      expect(invalidSig.status).toBe(401)

      process.env.BELVO_WEBHOOK_SECRET = 'legacy-belvo-webhook-secret-should-not-work'
      const belvoSig = await computeHmacSha256Hex(payload, process.env.BELVO_WEBHOOK_SECRET)
      const rejectedBelvoSig = await app.request('/api/v1/open-finance/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-open-finance-signature': belvoSig
        },
        body: payload
      })
      expect(rejectedBelvoSig.status).toBe(401)
      delete process.env.BELVO_WEBHOOK_SECRET
    })

    it('deve processar sincronização e retornar 200 quando assinatura HMAC-SHA256 for válida', async () => {
      const createRes = await app.request('/api/v1/open-finance/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          provider: 'pluggy',
          externalItemId: 'sandbox-item-wh-valid',
          institutionId: '201',
          institutionName: 'Nubank'
        })
      })
      expect(createRes.status).toBe(201)

      const payload = JSON.stringify({
        event: 'transactions/created',
        itemId: 'sandbox-item-wh-valid',
        accountId: 'sandbox-acc-checking-sandbox-item-wh-valid'
      })
      const signature = await computeHmacSha256Hex(payload, TEST_WEBHOOK_SECRET)
      expect(await verifyHmacSha256Signature(payload, signature, TEST_WEBHOOK_SECRET)).toBe(true)

      const webhookRes = await app.request('/api/v1/open-finance/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pluggy-signature': signature
        },
        body: payload
      })

      expect(webhookRes.status).toBe(200)
      const json = (await webhookRes.json()) as { received: boolean; processed: boolean }
      expect(json).toEqual({ received: true, processed: true })
    })
  })

  describe('Motor de Conciliação Anti-Duplicidade (openFinanceSync)', () => {
    it('deve conciliar lançamento manual/OFX existente na mesma conta com |diff| <= 0.01 e janela <= 2 dias sem duplicar', async () => {
      const connId = '33333333-3333-4333-8333-333333333333'
      const localAccId = '44444444-4444-4444-8444-444444444444'
      const externalItemId = 'sandbox-item-reconcile'
      const externalAccountId = `sandbox-acc-checking-${externalItemId}`

      mockAccountsStore.set(localAccId, {
        id: localAccId,
        userId: userA,
        name: 'Nubank - Conta Corrente',
        type: 'checking',
        balance: '1000.00',
        createdAt: new Date().toISOString()
      })

      mockOpenFinanceConnectionsStore.set(connId, {
        id: connId,
        userId: userA,
        profileId: null,
        provider: 'sandbox',
        externalItemId,
        institutionId: '201',
        institutionName: 'Nubank',
        institutionLogoUrl: null,
        status: 'active',
        consentScope: 'read_only',
        consentExpiresAt: null,
        lastSyncAt: null,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      mockOpenFinanceAccountLinksStore.set('link-1', {
        id: 'link-1',
        connectionId: connId,
        userId: userA,
        externalAccountId,
        externalAccountType: 'BANK',
        externalAccountName: 'Conta Corrente',
        accountId: localAccId,
        creditCardId: null,
        lastBalance: '1000.00',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      // Adapter sandbox gera transação de R$ 42.90 em 2026-11-18 ('iFood *Restaurante')
      // Criamos lançamento manual equivalente em 2026-11-19 (1 dia de diferença) sem externalId
      const manualTxId = '55555555-5555-4555-8555-555555555555'
      mockTransactionsStore.set(manualTxId, {
        id: manualTxId,
        userId: userA,
        accountId: localAccId,
        categoryId: null,
        amount: '42.90',
        description: 'iFood pedido manual',
        paid: true,
        status: 'completed',
        type: 'expense',
        occurredAt: '2026-11-19T12:00:00.000Z',
        createdAt: new Date().toISOString(),
        externalId: null,
        source: 'manual'
      })

      const adapter = new SandboxOpenFinanceAdapter()
      const summary = await syncOpenFinanceConnection({
        connectionId: connId,
        userId: userA,
        adapter
      })

      expect(summary.reconciledCount).toBe(1)
      const updatedManualTx = mockTransactionsStore.get(manualTxId)
      expect(updatedManualTx?.externalId).toBe(`sandbox-tx-1-${externalItemId}`)

      // Nenhuma duplicata foi criada para o iFood
      const allUserTxs = Array.from(mockTransactionsStore.values()).filter((t) => t.userId === userA)
      const ifoodMatches = allUserTxs.filter((t) => Number(t.amount) === 42.9)
      expect(ifoodMatches).toHaveLength(1)
    })
  })
})
