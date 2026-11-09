import { describe, it, expect } from 'vitest'
import {
  allowedMimeTypes,
  parseReceiptRequestSchema,
  extractedReceiptResponseSchema
} from '../../api/src/schemas/aiReceipt'

describe('Validações de Schemas Zod do Leitor de Comprovantes (#33)', () => {
  describe('allowedMimeTypes', () => {
    it('deve conter apenas os tipos permitidos de imagem e pdf', () => {
      expect(allowedMimeTypes).toContain('image/jpeg')
      expect(allowedMimeTypes).toContain('image/png')
      expect(allowedMimeTypes).toContain('image/webp')
      expect(allowedMimeTypes).toContain('application/pdf')
      expect(allowedMimeTypes).not.toContain('image/gif')
      expect(allowedMimeTypes).not.toContain('text/plain')
    })
  })

  describe('parseReceiptRequestSchema', () => {
    it('deve validar com sucesso um payload correto', () => {
      const validPayload = {
        fileBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png' as const,
        filename: 'comprovante.png',
        availableCategories: [
          { id: 'cat-1', name: 'Alimentação', type: 'expense' as const }
        ]
      }

      const result = parseReceiptRequestSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mimeType).toBe('image/png')
        expect(result.data.availableCategories).toHaveLength(1)
      }
    })

    it('deve falhar quando fileBase64 for muito curto ou ausente', () => {
      const invalidPayload = {
        fileBase64: 'abc',
        mimeType: 'image/jpeg'
      }

      const result = parseReceiptRequestSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('fileBase64')
      }
    })

    it('deve falhar para formato de arquivo não suportado', () => {
      const invalidPayload = {
        fileBase64: 'dGVzdGUtY29udGV1ZG8tYmFzZTY0LWxvbmdv',
        mimeType: 'image/gif'
      }

      const result = parseReceiptRequestSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('mimeType')
      }
    })

    it('deve assumir availableCategories vazio por padrão quando omitido', () => {
      const payloadWithoutCategories = {
        fileBase64: 'dGVzdGUtY29udGV1ZG8tYmFzZTY0LWxvbmdv',
        mimeType: 'application/pdf' as const
      }

      const result = parseReceiptRequestSchema.safeParse(payloadWithoutCategories)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.availableCategories).toEqual([])
      }
    })
  })

  describe('extractedReceiptResponseSchema', () => {
    it('deve validar com sucesso os dados extraídos válidos', () => {
      const validData = {
        amount: 84.5,
        occurredAt: '2026-11-08',
        description: 'Supermercado Pão de Açúcar',
        paymentType: 'pix' as const,
        type: 'expense' as const,
        categorySuggestion: {
          id: 'cat-1',
          name: 'Alimentação',
          confidence: 0.95
        },
        confidence: 0.92,
        notes: 'Cupom fiscal NFC-e'
      }

      const result = extractedReceiptResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar valor negativo ou zero', () => {
      const invalidData = {
        amount: 0,
        occurredAt: '2026-11-08',
        description: 'Mercado',
        paymentType: 'debit' as const,
        type: 'expense' as const,
        categorySuggestion: null,
        confidence: 0.8
      }

      const result = extractedReceiptResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('amount')
      }
    })

    it('deve rejeitar formato de data que não seja YYYY-MM-DD', () => {
      const invalidData = {
        amount: 50.0,
        occurredAt: '08/11/2026',
        description: 'Padaria',
        paymentType: 'cash' as const,
        type: 'expense' as const,
        categorySuggestion: null,
        confidence: 0.85
      }

      const result = extractedReceiptResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('occurredAt')
      }
    })
  })
})
