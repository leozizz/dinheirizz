import { describe, it, expect, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import { mockTransactionsStore } from '../src/routes/transactions'
import { mockAccountsStore } from '../src/routes/accounts'

describe('BFF Recurring Transactions & Due Dates API (Issue #29 TDD)', () => {
  let authToken: string
  const testUserId = 'user-recurring-test-123'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'recurring@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )

    // Configura conta para os testes
    mockAccountsStore.set('acc-recurring-1', {
      id: 'acc-recurring-1',
      userId: testUserId,
      name: 'Conta Teste Recorrência',
      type: 'checking',
      balance: '1000.00',
      createdAt: new Date().toISOString()
    })
  })

  describe('POST /api/v1/transactions - Contas Pendentes e Parcelamentos', () => {
    it('deve criar uma transação com status "pending" sem debitar/alterar o saldo da conta', async () => {
      const initialBalance = Number(mockAccountsStore.get('acc-recurring-1')?.balance)

      const res = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 250,
          type: 'expense',
          description: 'Conta de Energia (A vencer)',
          accountId: 'acc-recurring-1',
          dueDate: '2026-10-15T00:00:00.000Z',
          status: 'pending',
          paid: false
        })
      })

      expect(res.status).toBe(201)
      const json = await res.json()

      expect(json).toHaveProperty('id')
      expect(json.status).toBe('pending')
      expect(json.paid).toBe(false)
      expect(json.dueDate).toBeDefined()

      // Verifica que o saldo NÃO foi alterado porque está pendente
      const currentBalance = Number(mockAccountsStore.get('acc-recurring-1')?.balance)
      expect(currentBalance).toBe(initialBalance)
    })

    it('deve gerar N parcelas quando installmentTotal for informado com vencimentos progressivos', async () => {
      const res = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 300,
          type: 'expense',
          description: 'Curso Online',
          accountId: 'acc-recurring-1',
          dueDate: '2026-10-01T00:00:00.000Z',
          status: 'pending',
          installmentTotal: 3
        })
      })

      expect(res.status).toBe(201)
      const json = await res.json()

      // Retorna a primeira parcela ou indicador de série
      expect(json.installmentTotal).toBe(3)
      expect(json.installmentCurrent).toBe(1)
      expect(Number(json.amount)).toBe(-100) // 300 / 3

      // Verifica se as outras parcelas foram inseridas no store
      const allTx = Array.from(mockTransactionsStore.values()).filter(
        (t) => t.description && t.description.includes('Curso Online')
      )
      expect(allTx.length).toBe(3)
      expect(allTx[0].installmentCurrent).toBe(1)
      expect(allTx[1].installmentCurrent).toBe(2)
      expect(allTx[2].installmentCurrent).toBe(3)
    })
  })

  describe('GET /api/v1/transactions - Filtros por status', () => {
    it('deve permitir filtrar apenas transações com status "pending"', async () => {
      const res = await app.request('/api/v1/transactions?status=pending', {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(Array.isArray(json.data)).toBe(true)
      for (const item of json.data) {
        expect(item.status).toBe('pending')
      }
    })

    it('deve permitir filtrar apenas transações com status "completed"', async () => {
      const res = await app.request('/api/v1/transactions?status=completed', {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(Array.isArray(json.data)).toBe(true)
      for (const item of json.data) {
        expect(item.status).toBe('completed')
      }
    })
  })

  describe('PATCH /api/v1/transactions/:id/pay - Conciliação e Baixa Rápida', () => {
    it('deve retornar 404 ao tentar dar baixa em uma transação inexistente', async () => {
      const res = await app.request('/api/v1/transactions/tx-inexistente/pay', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(res.status).toBe(404)
    })

    it('deve alterar status para "completed", marcar paid=true, preencher paidAt e debitar saldo da conta', async () => {
      // 1. Cria transação pendente
      const createRes = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 80,
          type: 'expense',
          description: 'Conta de Água',
          accountId: 'acc-recurring-1',
          dueDate: '2026-10-05T00:00:00.000Z',
          status: 'pending'
        })
      })
      const created = await createRes.json()
      const txId = created.id

      const balanceBeforePay = Number(mockAccountsStore.get('acc-recurring-1')?.balance)

      // 2. Dá baixa
      const payRes = await app.request(`/api/v1/transactions/${txId}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(payRes.status).toBe(200)
      const payJson = await payRes.json()

      expect(payJson.transaction.status).toBe('completed')
      expect(payJson.transaction.paid).toBe(true)
      expect(payJson.transaction.paidAt).toBeDefined()

      // Saldo da conta deve ter sido debitado em 80
      const balanceAfterPay = Number(mockAccountsStore.get('acc-recurring-1')?.balance)
      expect(balanceAfterPay).toBe(balanceBeforePay - 80)
    })

    it('se a transação for recorrente contínua (isRecurring=true), deve projetar a próxima no mês subsequente', async () => {
      const createRes = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 45,
          type: 'expense',
          description: 'Assinatura Streaming',
          accountId: 'acc-recurring-1',
          dueDate: '2026-10-10T00:00:00.000Z',
          status: 'pending',
          isRecurring: true,
          recurrencePeriod: 'monthly'
        })
      })
      const created = await createRes.json()

      const payRes = await app.request(`/api/v1/transactions/${created.id}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(payRes.status).toBe(200)
      const payJson = await payRes.json()

      expect(payJson.nextRecurringTransaction).toBeDefined()
      expect(payJson.nextRecurringTransaction.status).toBe('pending')
      expect(payJson.nextRecurringTransaction.isRecurring).toBe(true)
    })

    it('deve aceitar e persistir recurrenceDay e adjustBusinessDay ao cadastrar transação recorrente', async () => {
      const res = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 150,
          type: 'expense',
          description: 'Internet Fibra',
          accountId: 'acc-recurring-1',
          status: 'pending',
          isRecurring: true,
          recurrencePeriod: 'monthly',
          recurrenceDay: 10,
          adjustBusinessDay: true
        })
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.recurrenceDay).toBe(10)
      expect(json.adjustBusinessDay).toBe(true)
      // Vencimento gerado automaticamente para o dia útil apropriado
      expect(json.dueDate).toBeDefined()
    })

    it('deve filtrar transações por scope=current_month excluindo parcelas futuras distantes', async () => {
      await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 1000,
          type: 'expense',
          description: 'Notebook Parcelado Teste',
          accountId: 'acc-recurring-1',
          occurredAt: new Date().toISOString(),
          status: 'pending',
          installmentTotal: 10
        })
      })

      const res = await app.request('/api/v1/transactions?scope=current_month', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const json = await res.json()

      const hasDistantInstallment = json.data.some(
        (t: any) => t.description && t.description.includes('(10/10)')
      )
      expect(hasDistantInstallment).toBe(false)
    })

    it('deve listar parcelas futuras em ordem crescente quando scope=future', async () => {
      const res = await app.request('/api/v1/transactions?scope=future', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      expect(res.status).toBe(200)
      const json = await res.json()

      expect(json.data.length).toBeGreaterThan(0)
      const firstTime = new Date(json.data[0].dueDate || json.data[0].occurredAt).getTime()
      const lastTime = new Date(json.data[json.data.length - 1].dueDate || json.data[json.data.length - 1].occurredAt).getTime()
      expect(firstTime).toBeLessThanOrEqual(lastTime)
    })
  })
})
