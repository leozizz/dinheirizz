import { z } from 'zod'

export const MCP_SCOPES = [
  'read:accounts',
  'read:transactions',
  'read:forecast',
  'read:budgets',
  'read:invoices'
] as const

export const mcpScopeSchema = z.enum(MCP_SCOPES)
export type McpScope = z.infer<typeof mcpScopeSchema>

export const createApiTokenSchema = z.object({
  name: z
    .string({ required_error: 'Nome do token é obrigatório' })
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(60, 'Nome deve ter no máximo 60 caracteres'),
  scopes: z
    .array(mcpScopeSchema)
    .min(1, 'Selecione pelo menos um escopo')
    .default([...MCP_SCOPES]),
  expiresInDays: z
    .number()
    .int('Validade deve ser um número inteiro de dias')
    .positive('Validade deve ser maior que zero')
    .max(365, 'Validade máxima é de 365 dias')
    .nullable()
    .optional()
})

export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>

export const mcpJsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional()
})

export type McpJsonRpcRequest = z.infer<typeof mcpJsonRpcRequestSchema>

export const mcpToolCallParamsSchema = z.object({
  name: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).optional().default({})
})

export const getBalanceSummaryInputSchema = z.object({
  profileId: z.string().uuid('profileId deve ser um UUID válido').optional()
})

export const listTransactionsInputSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().uuid('categoryId deve ser um UUID válido').optional(),
  accountId: z.string().uuid('accountId deve ser um UUID válido').optional(),
  type: z.enum(['income', 'expense']).optional(),
  limit: z.number().int().min(1).max(100).optional().default(25)
})

export const getCashflowForecastInputSchema = z.object({
  days: z.union([z.literal(30), z.literal(60)]).optional().default(30),
  accountId: z.string().uuid('accountId deve ser um UUID válido').optional(),
  profileId: z.string().uuid('profileId deve ser um UUID válido').optional()
})

export const getBudgetStatusInputSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period deve estar no formato YYYY-MM')
    .optional(),
  profileId: z.string().uuid('profileId deve ser um UUID válido').optional()
})

export const getCreditCardInvoicesInputSchema = z.object({
  creditCardId: z.string().uuid('creditCardId deve ser um UUID válido').optional(),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period deve estar no formato YYYY-MM')
    .optional(),
  status: z.enum(['open', 'closed', 'paid', 'overdue']).optional()
})
