import { describe, it, expect, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'

describe('BFF Transfers API (TDD)', () => {
  let authToken: string
  const testUserId = 'user-transfer-test-123'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'test-transfer@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  describe('POST /api/v1/transfers', () => {
    it('deve retornar 401 sem autenticação', async () => {
      const res = await app.request('/api/v1/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 })
      })
      expect(res.status).toBe(401)
    })

    it('deve rejeitar transferência se conta de origem for igual à de destino com status 400', async () => {
      const payload = {
        fromAccountId: 'acc-origin-1',
        toAccountId: 'acc-origin-1',
        amount: 50.0,
        description: 'Transferência inválida'
      }

      const res = await app.request('/api/v1/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json).toHaveProperty('error')
      expect(json.error).toMatch(/diferentes/i)
    })

    it('deve rejeitar transferência com valor negativo ou zero com status 400', async () => {
      const payload = {
        fromAccountId: 'acc-origin-1',
        toAccountId: 'acc-dest-2',
        amount: -50.0
      }

      const res = await app.request('/api/v1/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })

      expect(res.status).toBe(400)
    })

    it('deve rejeitar transferência se o saldo da conta de origem for insuficiente com status 400', async () => {
      // Cria conta com saldo pequeno de R$ 30
      const accOriginRes = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: 'Conta Saldo Baixo', balance: 30 })
      })
      const originAcc = await accOriginRes.json()

      const accDestRes = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: 'Conta Destino Poupança', balance: 100 })
      })
      const destAcc = await accDestRes.json()

      // Tenta transferir R$ 200 (maior que o saldo de 30)
      const transferRes = await app.request('/api/v1/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          fromAccountId: originAcc.id,
          toAccountId: destAcc.id,
          amount: 200.0,
          description: 'Tentativa sem saldo'
        })
      })

      expect(transferRes.status).toBe(400)
      const errJson = await transferRes.json()
      expect(errJson.error).toMatch(/saldo insuficiente/i)
    })

    it('deve realizar transferência atômica com sucesso (201) debitando da origem e creditando no destino', async () => {
      // Cria conta de origem com R$ 500
      const accOriginRes = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: 'Nubank Corrente', balance: 500 })
      })
      const originAcc = await accOriginRes.json()

      // Cria conta de destino com R$ 100
      const accDestRes = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: 'Inter Poupança', balance: 100 })
      })
      const destAcc = await accDestRes.json()

      // Transfere R$ 150
      const transferRes = await app.request('/api/v1/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          fromAccountId: originAcc.id,
          toAccountId: destAcc.id,
          amount: 150.0,
          description: 'Aporte Reserva'
        })
      })

      expect(transferRes.status).toBe(201)
      const data = await transferRes.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('fromTransaction')
      expect(data).toHaveProperty('toTransaction')
      expect(data.fromTransaction.amount).toBe('-150.00')
      expect(data.toTransaction.amount).toBe('150.00')
      expect(data.fromTransaction.accountId).toBe(originAcc.id)
      expect(data.toTransaction.accountId).toBe(destAcc.id)

      // Verifica se os saldos das contas foram devidamente atualizados
      const accountsRes = await app.request('/api/v1/accounts', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const accsList = (await accountsRes.json()).data
      const updatedOrigin = accsList.find((a: any) => a.id === originAcc.id)
      const updatedDest = accsList.find((a: any) => a.id === destAcc.id)

      expect(Number(updatedOrigin.balance)).toBe(350.00) // 500 - 150
      expect(Number(updatedDest.balance)).toBe(250.00)   // 100 + 150
    })
  })
})
