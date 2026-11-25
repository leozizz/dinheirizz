import { z } from 'zod'

export const openFinanceCreateProviderSchema = z.enum(['pluggy', 'sandbox'])
export type OpenFinanceCreateProvider = z.infer<typeof openFinanceCreateProviderSchema>

export const openFinanceProviderSchema = z.enum(['pluggy', 'belvo', 'sandbox'])
export type OpenFinanceProvider = z.infer<typeof openFinanceProviderSchema>

export const openFinanceStatusSchema = z.enum([
  'active',
  'updating',
  'login_error',
  'outdated',
  'revoked'
])
export type OpenFinanceStatus = z.infer<typeof openFinanceStatusSchema>

export const connectTokenRequestSchema = z.object({
  provider: openFinanceCreateProviderSchema.default('pluggy'),
  itemId: z.string().min(1).optional(),
  profileId: z.string().uuid('ID de perfil inválido').optional().nullable()
})
export type ConnectTokenRequest = z.infer<typeof connectTokenRequestSchema>

export const createConnectionRequestSchema = z.object({
  provider: openFinanceCreateProviderSchema,
  externalItemId: z.string().min(1, 'externalItemId é obrigatório'),
  institutionId: z.string().min(1, 'institutionId é obrigatório'),
  institutionName: z.string().min(1, 'institutionName é obrigatório'),
  institutionLogoUrl: z.string().url().optional().nullable(),
  profileId: z.string().uuid('ID de perfil inválido').optional().nullable()
})
export type CreateConnectionRequest = z.infer<typeof createConnectionRequestSchema>

export const webhookEventSchema = z.object({
  event: z.string().min(1),
  itemId: z.string().min(1),
  accountId: z.string().optional(),
  data: z.record(z.unknown()).optional()
})
export type WebhookEventPayload = z.infer<typeof webhookEventSchema>
