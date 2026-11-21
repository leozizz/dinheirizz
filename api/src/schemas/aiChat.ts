import { z } from 'zod'

export const aiChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .trim()
    .min(1, 'A mensagem não pode estar vazia')
    .max(2000, 'A mensagem não pode exceder 2000 caracteres')
})

export const aiChatRequestSchema = z.object({
  messages: z
    .array(aiChatMessageSchema)
    .min(1, 'Envie ao menos uma mensagem')
    .max(20, 'O histórico da conversa é limitado a 20 mensagens'),
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Período deve estar no formato YYYY-MM')
    .optional(),
  profileId: z.string().uuid('ID de perfil financeiro inválido').optional()
})

export const aiChatCitationSchema = z.object({
  label: z.string(),
  value: z.string(),
  period: z.string().optional()
})

export const createTransactionActionCardSchema = z.object({
  id: z.string(),
  type: z.literal('create_transaction'),
  title: z.string(),
  summary: z.string(),
  payload: z.object({
    amount: z.number().positive(),
    type: z.enum(['expense', 'income']),
    description: z.string().min(1),
    categoryId: z.string().nullable().optional(),
    categoryName: z.string().nullable().optional(),
    accountId: z.string().nullable().optional(),
    accountName: z.string().nullable().optional(),
    occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })
})

export const createBudgetActionCardSchema = z.object({
  id: z.string(),
  type: z.literal('create_budget'),
  title: z.string(),
  summary: z.string(),
  payload: z.object({
    categoryId: z.string().min(1),
    categoryName: z.string().min(1),
    amountLimit: z.number().positive(),
    period: z.string().min(1)
  })
})

export const cashflowSimulationActionCardSchema = z.object({
  id: z.string(),
  type: z.literal('cashflow_simulation'),
  title: z.string(),
  summary: z.string(),
  payload: z.object({
    totalAmount: z.number().positive(),
    installments: z.number().int().min(1),
    installmentValue: z.number().positive(),
    projectedMinBalance30d: z.number(),
    projectedMinBalance60d: z.number(),
    willGoNegative: z.boolean()
  })
})

export const aiActionCardSchema = z.discriminatedUnion('type', [
  createTransactionActionCardSchema,
  createBudgetActionCardSchema,
  cashflowSimulationActionCardSchema
])

export const aiChatResponseSchema = z.object({
  reply: z.string(),
  source: z.enum(['byok', 'system', 'fallback']),
  modelName: z.string().nullable(),
  requiresApiKey: z.boolean(),
  citations: z.array(aiChatCitationSchema),
  actionCards: z.array(aiActionCardSchema)
})

export type AiChatRequestInput = z.infer<typeof aiChatRequestSchema>
export type AiChatResponseOutput = z.infer<typeof aiChatResponseSchema>
