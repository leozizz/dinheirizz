import { describe, it, expect } from 'vitest'
import {
  pushSubscriptionKeysSchema,
  subscribePushSchema,
  unsubscribePushSchema,
  updateNotificationPreferencesSchema
} from '../src/schemas/push'

describe('Push Zod Schemas (TDD)', () => {
  const validEndpoint = 'https://fcm.googleapis.com/fcm/send/sample-subscription-token'
  const validKeys = {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5SamplePublicKeyBase64String',
    auth: 'tBHItJI5svbpez7KI4CCXg=='
  }

  describe('pushSubscriptionKeysSchema', () => {
    it('deve aceitar chaves criptográficas p256dh e auth válidas', () => {
      const result = pushSubscriptionKeysSchema.safeParse(validKeys)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar quando p256dh estiver ausente ou vazio', () => {
      const missing = pushSubscriptionKeysSchema.safeParse({ auth: validKeys.auth })
      expect(missing.success).toBe(false)

      const empty = pushSubscriptionKeysSchema.safeParse({ p256dh: '', auth: validKeys.auth })
      expect(empty.success).toBe(false)
    })

    it('deve rejeitar quando auth estiver ausente ou vazio', () => {
      const missing = pushSubscriptionKeysSchema.safeParse({ p256dh: validKeys.p256dh })
      expect(missing.success).toBe(false)

      const empty = pushSubscriptionKeysSchema.safeParse({ p256dh: validKeys.p256dh, auth: '' })
      expect(empty.success).toBe(false)
    })
  })

  describe('subscribePushSchema', () => {
    it('deve validar payload completo de inscrição com userAgent', () => {
      const payload = {
        endpoint: validEndpoint,
        keys: validKeys,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
      const result = subscribePushSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.endpoint).toBe(validEndpoint)
        expect(result.data.keys.p256dh).toBe(validKeys.p256dh)
        expect(result.data.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
      }
    })

    it('deve validar payload de inscrição sem userAgent (opcional)', () => {
      const payload = {
        endpoint: validEndpoint,
        keys: validKeys
      }
      const result = subscribePushSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar endpoint inválido que não seja URL', () => {
      const payload = {
        endpoint: 'endpoint-sem-protocolo-invalido',
        keys: validKeys
      }
      const result = subscribePushSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar payload com chaves inválidas', () => {
      const payload = {
        endpoint: validEndpoint,
        keys: { p256dh: '' }
      }
      const result = subscribePushSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('unsubscribePushSchema', () => {
    it('deve validar cancelamento de inscrição com endpoint válido', () => {
      const payload = { endpoint: validEndpoint }
      const result = unsubscribePushSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar cancelamento sem endpoint ou com endpoint inválido', () => {
      expect(unsubscribePushSchema.safeParse({}).success).toBe(false)
      expect(unsubscribePushSchema.safeParse({ endpoint: 'not-a-url' }).success).toBe(false)
    })
  })

  describe('updateNotificationPreferencesSchema', () => {
    it('deve validar preferências completas válidas', () => {
      const payload = {
        pushEnabled: true,
        billsDueAlerts: true,
        billsDueDaysBefore: 1,
        budgetLimitAlerts: true,
        budgetThresholdPercent: 85,
        invoiceDueAlerts: true
      }
      const result = updateNotificationPreferencesSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('deve aceitar dias de antecedência permitidos (0, 1, 3)', () => {
      const days = [0, 1, 3] as const
      for (const d of days) {
        const payload = {
          pushEnabled: true,
          billsDueAlerts: true,
          billsDueDaysBefore: d,
          budgetLimitAlerts: false,
          budgetThresholdPercent: 80,
          invoiceDueAlerts: false
        }
        expect(updateNotificationPreferencesSchema.safeParse(payload).success).toBe(true)
      }
    })

    it('deve rejeitar dias de antecedência não permitidos', () => {
      const invalidDays = [2, 4, 7, -1]
      for (const d of invalidDays) {
        const payload = {
          pushEnabled: true,
          billsDueAlerts: true,
          billsDueDaysBefore: d,
          budgetLimitAlerts: true,
          budgetThresholdPercent: 85,
          invoiceDueAlerts: true
        }
        expect(updateNotificationPreferencesSchema.safeParse(payload).success).toBe(false)
      }
    })

    it('deve aceitar percentuais de orçamento permitidos (80, 85, 90, 100)', () => {
      const thresholds = [80, 85, 90, 100] as const
      for (const t of thresholds) {
        const payload = {
          pushEnabled: true,
          billsDueAlerts: false,
          billsDueDaysBefore: 0,
          budgetLimitAlerts: true,
          budgetThresholdPercent: t,
          invoiceDueAlerts: true
        }
        expect(updateNotificationPreferencesSchema.safeParse(payload).success).toBe(true)
      }
    })

    it('deve rejeitar percentuais de orçamento não permitidos', () => {
      const invalidThresholds = [50, 75, 95, 105, 0]
      for (const t of invalidThresholds) {
        const payload = {
          pushEnabled: true,
          billsDueAlerts: true,
          billsDueDaysBefore: 1,
          budgetLimitAlerts: true,
          budgetThresholdPercent: t,
          invoiceDueAlerts: true
        }
        expect(updateNotificationPreferencesSchema.safeParse(payload).success).toBe(false)
      }
    })

    it('deve rejeitar quando campos booleanos estiverem ausentes', () => {
      const payload = {
        billsDueDaysBefore: 1,
        budgetThresholdPercent: 85
      }
      expect(updateNotificationPreferencesSchema.safeParse(payload).success).toBe(false)
    })
  })
})
