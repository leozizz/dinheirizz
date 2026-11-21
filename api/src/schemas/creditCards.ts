import { z } from 'zod'

export const creditCardBrandEnum = z.enum([
  'mastercard',
  'visa',
  'elo',
  'amex',
  'hipercard',
  'other'
])

export const createCreditCardSchema = z.object({
  name: z
    .string({ required_error: 'Nome do cartão é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(60, 'Nome deve ter no máximo 60 caracteres'),
  accountId: z
    .string({ required_error: 'Conta padrão para liquidação é obrigatória' })
    .uuid('ID de conta inválido'),
  brand: creditCardBrandEnum.default('mastercard'),
  limitAmount: z
    .number({ required_error: 'Limite de crédito é obrigatório' })
    .positive('Limite deve ser maior que zero'),
  closingDay: z
    .number({ required_error: 'Dia de fechamento é obrigatório' })
    .int('Dia de fechamento deve ser um número inteiro')
    .min(1, 'Dia de fechamento deve ser entre 1 e 31')
    .max(31, 'Dia de fechamento deve ser entre 1 e 31'),
  dueDay: z
    .number({ required_error: 'Dia de vencimento é obrigatório' })
    .int('Dia de vencimento deve ser um número inteiro')
    .min(1, 'Dia de vencimento deve ser entre 1 e 31')
    .max(31, 'Dia de vencimento deve ser entre 1 e 31'),
  color: z
    .string()
    .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Cor hexadecimal inválida')
    .optional()
    .default('#7bc816'),
  lastFourDigits: z
    .string()
    .regex(/^\d{4}$/, 'Informe exatamente 4 dígitos numéricos')
    .optional()
    .nullable(),
  profileId: z.string().uuid('ID de perfil inválido').optional().nullable()
})

export const updateCreditCardSchema = createCreditCardSchema.partial()

export const payInvoiceSchema = z.object({
  paymentAccountId: z
    .string({ required_error: 'Conta bancária de débito é obrigatória' })
    .uuid('ID de conta inválido'),
  amount: z
    .number({ required_error: 'Valor do pagamento é obrigatório' })
    .positive('Valor deve ser positivo'),
  paidAt: z.string().optional()
})

export const anticipateInstallmentsSchema = z.object({
  transactionIds: z
    .array(z.string().uuid('ID de transação inválido'))
    .min(1, 'Selecione ao menos uma parcela para antecipar')
})

export type CreditCardBrand = z.infer<typeof creditCardBrandEnum>
export type CreateCreditCardInput = z.infer<typeof createCreditCardSchema>
export type UpdateCreditCardInput = z.infer<typeof updateCreditCardSchema>
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>
export type AnticipateInstallmentsInput = z.infer<typeof anticipateInstallmentsSchema>
