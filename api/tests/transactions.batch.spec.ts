import { describe, it, expect, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import { mockAccountsStore } from '../src/routes/accounts'

describe('POST /api/v1/transactions/batch (TDD)', () => {
  let authToken: string
  const testUserId = 'user-batch-test-123'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'test-batch@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )

    // Pre-populate an account in mockAccountsStore
    mockAccountsStore.set('acc-batch-target', {
      id: 'acc-batch-target',
      userId: testUserId,
      name: 'Conta Corrente Teste',
      type: 'checking',
      balance: '1000.00',
      createdAt: new Date().toISOString()
    })
  })

  it('deve retornar 401 quando não autenticado', async () => {
    const res = await app.request('/api/v1/transactions/batch', {
      method: 'POST',
      body: JSON.stringify({ accountId: 'acc-batch-target', transactions: [] }),
      headers: { 'Content-Type': 'application/json' }
    })
    expect(res.status).toBe(401)
  })

  it('deve retornar 400 quando o payload for inválido ou vazio', async () => {
    const res = await app.request('/api/v1/transactions/batch', {
      method: 'POST',
      body: JSON.stringify({ accountId: 'acc-batch-target', transactions: [] }),
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Dados inválidos')
  })

  it('deve persistir lote de transações e recalcular saldo da conta de destino', async () => {
    const payload = {
      accountId: 'acc-batch-target',
      transactions: [
        {
          description: 'Restaurante Executivo',
          amount: 50.0,
          type: 'expense',
          occurredAt: '2026-10-10',
          paid: true,
          status: 'completed'
        },
        {
          description: 'Pix Salário',
          amount: 300.0,
          type: 'income',
          occurredAt: '2026-10-11',
          paid: true,
          status: 'completed'
        }
      ]
    }

    const res = await app.request('/api/v1/transactions/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.importedCount).toBe(2)
    expect(json.accountId).toBe('acc-batch-target')
    expect(json.transactions).toHaveLength(2)

    // Initial balance was 1000.00. -50 + 300 = +250. New balance = 1250.00
    expect(json.newBalance).toBe(1250.0)

    const updatedAccount = mockAccountsStore.get('acc-batch-target')
    expect(parseFloat(updatedAccount?.balance || '0')).toBe(1250.0)
  })
})
