import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import { mockTransactionsStore } from '../src/routes/transactions'
import { mockAccountsStore } from '../src/routes/accounts'
import { mockPixKeysStore } from '../src/routes/pix'

describe('BFF User Data API - Gestão de Dados e Exclusão Destrutiva (Danger Zone)', () => {
  let authTokenUser1: string
  let authTokenUser2: string
  const userId1 = '11111111-1111-1111-1111-111111111111'
  const userId2 = '22222222-2222-2222-2222-222222222222'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET

    authTokenUser1 = await sign(
      {
        sub: userId1,
        email: 'user1@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )

    authTokenUser2 = await sign(
      {
        sub: userId2,
        email: 'user2@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  beforeEach(() => {
    // Popula dados para userId1 e userId2
    mockAccountsStore.set('acc-u1-1', {
      id: 'acc-u1-1',
      userId: userId1,
      name: 'Conta Corrente User 1',
      type: 'checking',
      balance: '1250.00',
      createdAt: new Date().toISOString()
    })
    mockAccountsStore.set('acc-u2-1', {
      id: 'acc-u2-1',
      userId: userId2,
      name: 'Conta User 2',
      type: 'checking',
      balance: '500.00',
      createdAt: new Date().toISOString()
    })

    mockTransactionsStore.set('tx-u1-1', {
      id: 'tx-u1-1',
      userId: userId1,
      accountId: 'acc-u1-1',
      categoryId: null,
      amount: '50.00',
      description: 'Lanche User 1',
      paid: true,
      type: 'expense',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    })
    mockTransactionsStore.set('tx-u2-1', {
      id: 'tx-u2-1',
      userId: userId2,
      accountId: 'acc-u2-1',
      categoryId: null,
      amount: '100.00',
      description: 'Mercado User 2',
      paid: true,
      type: 'expense',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    })

    mockPixKeysStore.set('pix-u1-1', {
      id: 'pix-u1-1',
      userId: userId1,
      keyType: 'email',
      keyValue: 'user1@pix.com',
      bankName: 'Nubank',
      createdAt: new Date().toISOString()
    })
    mockPixKeysStore.set('pix-u2-1', {
      id: 'pix-u2-1',
      userId: userId2,
      keyType: 'phone',
      keyValue: '11999999999',
      bankName: 'Inter',
      createdAt: new Date().toISOString()
    })
  })

  describe('DELETE /api/v1/user-data/transactions', () => {
    it('deve retornar 401 para requisições sem autenticação', async () => {
      const res = await app.request('/api/v1/user-data/transactions', {
        method: 'DELETE'
      })
      expect(res.status).toBe(401)
    })

    it('deve excluir apenas as transações do usuário logado e zerar o saldo das contas', async () => {
      const res = await app.request('/api/v1/user-data/transactions', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authTokenUser1}` }
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('success', true)
      expect(body).toHaveProperty('message')

      // Transações do user 1 devem ser removidas
      expect(mockTransactionsStore.has('tx-u1-1')).toBe(false)
      // Transações do user 2 devem permanecer intactas
      expect(mockTransactionsStore.has('tx-u2-1')).toBe(true)

      // Saldo da conta do user 1 zerado
      const accU1 = mockAccountsStore.get('acc-u1-1')
      expect(accU1?.balance).toBe('0.00')

      // Saldo da conta do user 2 inalterado
      const accU2 = mockAccountsStore.get('acc-u2-1')
      expect(accU2?.balance).toBe('500.00')
    })
  })

  describe('DELETE /api/v1/user-data/pix-keys', () => {
    it('deve excluir apenas as chaves Pix do usuário logado', async () => {
      const res = await app.request('/api/v1/user-data/pix-keys', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authTokenUser1}` }
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('success', true)

      // Chave do user 1 removida
      expect(mockPixKeysStore.has('pix-u1-1')).toBe(false)
      // Chave do user 2 mantida
      expect(mockPixKeysStore.has('pix-u2-1')).toBe(true)
    })
  })

  describe('DELETE /api/v1/user-data/accounts', () => {
    it('deve excluir todas as contas do usuário em cascata com suas transações e reinicializar Conta Principal', async () => {
      const res = await app.request('/api/v1/user-data/accounts', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authTokenUser1}` }
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('success', true)
      expect(body).toHaveProperty('defaultAccountId')

      // Conta antiga do user 1 removida
      expect(mockAccountsStore.has('acc-u1-1')).toBe(false)
      // Transações do user 1 removidas
      expect(mockTransactionsStore.has('tx-u1-1')).toBe(false)

      // Dados do user 2 continuam intactos
      expect(mockAccountsStore.has('acc-u2-1')).toBe(true)
      expect(mockTransactionsStore.has('tx-u2-1')).toBe(true)

      // Uma nova conta padrão do user 1 deve existir
      const user1Accounts = Array.from(mockAccountsStore.values()).filter(
        (a) => a.userId === userId1
      )
      expect(user1Accounts.length).toBe(1)
      expect(user1Accounts[0].name).toBe('Conta Principal')
      expect(user1Accounts[0].balance).toBe('0.00')
    })
  })

  describe('DELETE /api/v1/user-data/reset-all', () => {
    it('deve executar reset geral removendo contas, transações e chaves pix, reinicializando conta padrão', async () => {
      const res = await app.request('/api/v1/user-data/reset-all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authTokenUser1}` }
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('success', true)
      expect(body).toHaveProperty('defaultAccountId')

      // Chaves pix limpas
      expect(mockPixKeysStore.has('pix-u1-1')).toBe(false)
      // Transações limpas
      expect(mockTransactionsStore.has('tx-u1-1')).toBe(false)
      // Contas limpas e reinicializada
      expect(mockAccountsStore.has('acc-u1-1')).toBe(false)

      const user1Accounts = Array.from(mockAccountsStore.values()).filter(
        (a) => a.userId === userId1
      )
      expect(user1Accounts.length).toBe(1)
      expect(user1Accounts[0].name).toBe('Conta Principal')

      // Dados do user 2 continuam intactos
      expect(mockAccountsStore.has('acc-u2-1')).toBe(true)
      expect(mockTransactionsStore.has('tx-u2-1')).toBe(true)
      expect(mockPixKeysStore.has('pix-u2-1')).toBe(true)
    })
  })
})
