import { z } from 'zod'

export const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
] as const

export type AllowedMimeType = (typeof allowedMimeTypes)[number]

export const parseReceiptRequestSchema = z.object({
  fileBase64: z
    .string()
    .min(10, 'O conteúdo do arquivo em base64 é obrigatório'),
  mimeType: z.enum(allowedMimeTypes, {
    errorMap: () => ({ message: 'Tipo de mídia não suportado. Formatos aceitos: JPEG, PNG, WebP e PDF.' })
  }),
  filename: z.string().max(255).optional(),
  availableCategories: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['income', 'expense'])
      })
    )
    .optional()
    .default([])
})

export type ParseReceiptRequestInput = z.infer<typeof parseReceiptRequestSchema>

export const extractedReceiptResponseSchema = z.object({
  amount: z.number().positive('O valor deve ser maior que zero'),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD'),
  description: z.string().min(1).max(255),
  paymentType: z.enum(['pix', 'credit', 'debit', 'boleto', 'cash', 'other']),
  type: z.enum(['expense', 'income']),
  categorySuggestion: z
    .object({
      id: z.string().optional(),
      name: z.string(),
      confidence: z.number().min(0).max(1)
    })
    .nullable(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional()
})

export type ExtractedReceiptOutput = z.infer<typeof extractedReceiptResponseSchema>
