import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import {
  mockPushSubscriptionsStore,
  mockNotificationPreferencesStore
} from '../src/routes/push'
import { mockTransactionsStore } from '../src/routes/transactions'
import { mockBudgetsStore } from '../src/routes/budgets'
import { mockInvoicesStore } from '../src/routes/creditCards'
import * as webPushService from '../src/services/webPush'

describe('BFF Push Notifications API (TDD)', () => {
  let authToken: string
  const testUserId = 'user-push-test-123'
  const otherUserId = 'user-push-other-456'
  const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

  const validEndpoint = 'https://fcm.googleapis.com/fcm/send/test-device-token-123'
  const validKeys = {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5SamplePublicKeyBase64String',
    auth: 'tBHItJI5svbpez7KI4CCXg=='
  }

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    authToken = await sign(
      {
        sub: testUserId,
        email: 'test-push@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    mockPushSubscriptionsStore?.clear()
    mockNotificationPreferencesStore?.clear()
    mockTransactionsStore?.clear()
    mockBudgetsStore?.clear()
    mockInvoicesStore?.clear()
  })

  describe('GET /api/v1/push/public-key', () => {
    it('deve retornar 200 com a chave pública VAPID configurada', async () => {
      const res = await app.request('/api/v1/push/public-key', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('vapidPublicKey')
      expect(typeof data.vapidPublicKey).toBe('string')
      expect(data.vapidPublicKey.length).toBeGreaterThan(20)
    })
  })

  describe('GET /api/v1/push/preferences', () => {
    it('deve retornar 401 se a requisição não tiver token de autenticação', async () => {
      const res = await app.request('/api/v1/push/preferences')
      expect(res.status).toBe(401)
    })

    it('deve retornar 200 com preferências padrão quando o usuário ainda não tiver registro', async () => {
      const res = await app.request('/api/v1/push/preferences', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('preferences')
      expect(data.preferences.pushEnabled).toBe(true)
      expect(data.preferences.billsDueAlerts).toBe(true)
      expect(data.preferences.billsDueDaysBefore).toBe(1)
      expect(data.preferences.budgetLimitAlerts).toBe(true)
      expect(data.preferences.budgetThresholdPercent).toBe(85)
      expect(data.preferences.invoiceDueAlerts).toBe(true)
    })
  })

  describe('PUT /api/v1/push/preferences', () => {
    it('deve rejeitar preferências com payload inválido (400)', async () => {
      const res = await app.request('/api/v1/push/preferences', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          billsDueDaysBefore: 99 // Inválido
        })
      })

      expect(res.status).toBe(400)
    })

    it('deve atualizar preferências do usuário com sucesso (200)', async () => {
      const updated = {
        pushEnabled: true,
        billsDueAlerts: true,
        billsDueDaysBefore: 3,
        budgetLimitAlerts: true,
        budgetThresholdPercent: 90,
        invoiceDueAlerts: false
      }

      const res = await app.request('/api/v1/push/preferences', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updated)
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.preferences.billsDueDaysBefore).toBe(3)
      expect(data.preferences.budgetThresholdPercent).toBe(90)
      expect(data.preferences.invoiceDueAlerts).toBe(false)
    })
  })

  describe('POST /api/v1/push/subscribe', () => {
    it('deve rejeitar inscrição sem endpoint ou com chaves ausentes (400)', async () => {
      const res = await app.request('/api/v1/push/subscribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint: 'invalid-url' })
      })

      expect(res.status).toBe(400)
    })

    it('deve cadastrar nova inscrição com sucesso (201)', async () => {
      const payload = {
        endpoint: validEndpoint,
        keys: validKeys,
        userAgent: 'Chrome Test Browser'
      }

      const res = await app.request('/api/v1/push/subscribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toHaveProperty('subscriptionId')
      expect(data.message).toContain('sucesso')
    })
  })

  describe('DELETE /api/v1/push/unsubscribe', () => {
    it('deve remover inscrição por endpoint (200)', async () => {
      // Primeiro inscreve
      await app.request('/api/v1/push/subscribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: validEndpoint,
          keys: validKeys
        })
      })

      // Agora cancela
      const res = await app.request('/api/v1/push/unsubscribe', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint: validEndpoint })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toContain('cancelada com sucesso')
    })
  })

  describe('POST /api/v1/push/test', () => {
    it('deve disparar push de teste para as inscrições do usuário autenticado (200)', async () => {
      // Registrar inscrição
      await app.request('/api/v1/push/subscribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: validEndpoint,
          keys: validKeys
        })
      })

      const sendSpy = vi.spyOn(webPushService, 'sendWebPushNotification')
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: 201 })
      )

      const res = await app.request('/api/v1/push/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.sentCount).toBe(1)
      expect(sendSpy).toHaveBeenCalledTimes(1)
      expect(sendSpy.mock.calls[0][1]).toMatchObject({
        icon: '/dinheirizz-dark/android-chrome-192x192.png',
        badge: '/dinheirizz-dark/favicon-32x32.png'
      })
    })
  })

  describe('POST /api/v1/push/dispatch-alerts', () => {
    it('deve processar contas a vencer e limites de orçamento e disparar pushes (200)', async () => {
      // Registrar inscrição do usuário
      await app.request('/api/v1/push/subscribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: validEndpoint,
          keys: validKeys
        })
      })

      // Mockar transação a vencer amanhã
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      mockTransactionsStore.set('tx-due-soon', {
        id: 'tx-due-soon',
        userId: testUserId,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        amount: '120.00',
        description: 'Internet Fibra',
        dueDate: tomorrowStr,
        paid: false,
        status: 'pending',
        type: 'expense',
        occurredAt: tomorrow.toISOString(),
        createdAt: new Date().toISOString()
      })

      mockInvoicesStore.set('inv-open-1', {
        id: 'inv-open-1',
        userId: testUserId,
        creditCardId: 'card-1',
        period: tomorrowStr.substring(0, 7),
        closingDate: tomorrowStr,
        dueDate: tomorrowStr,
        amount: '450.00',
        status: 'open',
        paidAmount: '0.00',
        paidAt: null,
        paymentAccountId: null,
        paymentTransactionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: null
      })

      mockBudgetsStore.set('budget-1', {
        id: 'budget-1',
        userId: testUserId,
        categoryId: 'cat-1',
        amountLimit: '100.00',
        period: tomorrowStr.substring(0, 7),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const sendSpy = vi.spyOn(webPushService, 'sendWebPushNotification')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 201 })
      )

      const res = await app.request('/api/v1/push/dispatch-alerts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.dispatchedAlerts).toBeGreaterThanOrEqual(3)
      expect(sendSpy).toHaveBeenCalledTimes(3)
      for (const call of sendSpy.mock.calls) {
        expect(call[1]).toMatchObject({
          icon: '/dinheirizz-dark/android-chrome-192x192.png',
          badge: '/dinheirizz-dark/favicon-32x32.png'
        })
      }
    })
  })
})
