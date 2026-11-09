import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseReceiptWithGemini,
  ReceiptOcrError,
  type GeminiReceiptOptions
} from '../src/services/geminiReceipt'

describe('Serviço Gemini Multimodal para Comprovantes (TDD)', () => {
  const mockCategories = [
    { id: 'cat-alimentacao', name: 'Alimentação', type: 'expense' as const },
    { id: 'cat-transporte', name: 'Transporte', type: 'expense' as const },
    { id: 'cat-salario', name: 'Salário', type: 'income' as const }
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deve extrair dados com sucesso de uma resposta formatada em JSON limpo', async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  amount: 142.8,
                  occurredAt: '2026-11-05',
                  description: 'Restaurante Sabor Brasil',
                  paymentType: 'pix',
                  type: 'expense',
                  suggestedCategoryName: 'Alimentação',
                  confidence: 0.96,
                  notes: 'Almoço executivo'
                })
              }
            ]
          }
        }
      ]
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    } as Response)

    const result = await parseReceiptWithGemini({
      fileBase64: 'dGVzdGUtYmFzZTY0',
      mimeType: 'image/jpeg',
      apiKey: 'fake-api-key',
      availableCategories: mockCategories
    })

    expect(result.amount).toBe(142.8)
    expect(result.occurredAt).toBe('2026-11-05')
    expect(result.description).toBe('Restaurante Sabor Brasil')
    expect(result.paymentType).toBe('pix')
    expect(result.type).toBe('expense')
    expect(result.categorySuggestion).toEqual({
      id: 'cat-alimentacao',
      name: 'Alimentação',
      confidence: 0.96
    })
    expect(result.confidence).toBe(0.96)
  })

  it('deve sanitizar blocos markdown (```json ... ```) na resposta do modelo', async () => {
    const markdownResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: '```json\n{\n  "amount": 45.00,\n  "occurredAt": "2026-11-09",\n  "description": "Posto Shell",\n  "paymentType": "credit",\n  "type": "expense",\n  "suggestedCategoryName": "Transporte",\n  "confidence": 0.9\n}\n```'
              }
            ]
          }
        }
      ]
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse(markdownResponse)
    } as Response)

    function mockApiResponse(data: unknown) {
      return data
    }

    const result = await parseReceiptWithGemini({
      fileBase64: 'dGVzdGUtYmFzZTY0',
      mimeType: 'image/png',
      apiKey: 'fake-api-key',
      availableCategories: mockCategories
    })

    expect(result.amount).toBe(45)
    expect(result.description).toBe('Posto Shell')
    expect(result.paymentType).toBe('credit')
    expect(result.categorySuggestion?.id).toBe('cat-transporte')
  })

  it('deve lançar ReceiptOcrError com código RECEIPT_UNREADABLE quando a imagem for ilegível ou não financeira', async () => {
    const unreadableResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  error: 'UNREADABLE_OR_NOT_FINANCIAL',
                  reason: 'Imagem de uma paisagem sem dados contábeis.'
                })
              }
            ]
          }
        }
      ]
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => unreadableResponse
    } as Response)

    await expect(
      parseReceiptWithGemini({
        fileBase64: 'dGVzdGUtYmFzZTY0',
        mimeType: 'image/webp',
        apiKey: 'fake-api-key'
      })
    ).rejects.toThrow(ReceiptOcrError)
  })

  it('deve lidar com data ausente no comprovante usando a data atual (fallback)', async () => {
    const noDateResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  amount: 25.5,
                  description: 'Café da Manhã',
                  paymentType: 'cash',
                  type: 'expense',
                  confidence: 0.8
                })
              }
            ]
          }
        }
      ]
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => noDateResponse
    } as Response)

    const todayStr = new Date().toISOString().split('T')[0]

    const result = await parseReceiptWithGemini({
      fileBase64: 'dGVzdGUtYmFzZTY0',
      mimeType: 'application/pdf',
      apiKey: 'fake-api-key'
    })

    expect(result.amount).toBe(25.5)
    expect(result.occurredAt).toBe(todayStr)
    expect(result.description).toBe('Café da Manhã')
  })
})
