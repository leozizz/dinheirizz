import { z } from 'zod'

export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1, 'Chave pública p256dh é obrigatória'),
  auth: z.string().min(1, 'Segredo de autenticação auth é obrigatório')
})

export const subscribePushSchema = z.object({
  endpoint: z.string().url('Endpoint de push deve ser uma URL válida'),
  keys: pushSubscriptionKeysSchema,
  userAgent: z.string().optional()
})

export const unsubscribePushSchema = z.object({
  endpoint: z.string().url('Endpoint de push deve ser uma URL válida')
})

export const updateNotificationPreferencesSchema = z.object({
  pushEnabled: z.boolean({ required_error: 'pushEnabled é obrigatório' }),
  billsDueAlerts: z.boolean({ required_error: 'billsDueAlerts é obrigatório' }),
  billsDueDaysBefore: z.union([z.literal(0), z.literal(1), z.literal(3)], {
    errorMap: () => ({ message: 'billsDueDaysBefore deve ser 0, 1 ou 3 dias' })
  }),
  budgetLimitAlerts: z.boolean({ required_error: 'budgetLimitAlerts é obrigatório' }),
  budgetThresholdPercent: z.union([z.literal(80), z.literal(85), z.literal(90), z.literal(100)], {
    errorMap: () => ({ message: 'budgetThresholdPercent deve ser 80, 85, 90 ou 100%' })
  }),
  invoiceDueAlerts: z.boolean({ required_error: 'invoiceDueAlerts é obrigatório' })
})

export type PushSubscriptionKeys = z.infer<typeof pushSubscriptionKeysSchema>
export type SubscribePushInput = z.infer<typeof subscribePushSchema>
export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>

export interface NotificationPreferences {
  pushEnabled: boolean
  billsDueAlerts: boolean
  billsDueDaysBefore: 0 | 1 | 3
  budgetLimitAlerts: boolean
  budgetThresholdPercent: 80 | 85 | 90 | 100
  invoiceDueAlerts: boolean
  updatedAt?: string | null
}
