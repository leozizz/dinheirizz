import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReceiptOcr } from '../hooks/useReceiptOcr'

const mockSession = {
  access_token: 'fake-jwt-token',
  user: { id: 'test-user-id', email: 'test@dinheirizz.com' }
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockSession.user,
    session: mockSession,
    loading: false
  })
}))

describe('Hook useReceiptOcr (TDD)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deve rejeitar arquivo com tipo MIME não suportado sem fazer requisição de rede', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { result } = renderHook(() => useReceiptOcr())

    const invalidFile = new File(['conteúdo'], 'documento.txt', { type: 'text/plain' })

    await act(async () => {
      try {
        await result.current.scanReceipt(invalidFile)
      } catch {
        // esperado
      }
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current.error).toContain('Formato inválido')
    expect(result.current.errorCode).toBe('UNSUPPORTED_MEDIA')
  })

  it('deve rejeitar arquivo maior que 10MB sem fazer requisição de rede', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { result } = renderHook(() => useReceiptOcr())

    // Simula arquivo de 11MB
    const bigFile = new File(['a'], 'comprovante-pesado.png', { type: 'image/png' })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })

    await act(async () => {
      try {
        await result.current.scanReceipt(bigFile)
      } catch {
        // esperado
      }
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current.error).toContain('10MB')
    expect(result.current.errorCode).toBe('FILE_TOO_LARGE')
  })

  it('deve enviar payload para /api/v1/ai/parse-receipt e retornar dados extraídos', async () => {
    const mockExtractedData = {
      amount: 84.5,
      occurredAt: '2026-11-08',
      description: 'Supermercado Pão de Açúcar',
      paymentType: 'pix' as const,
      type: 'expense' as const,
      categorySuggestion: { id: 'cat-1', name: 'Alimentação', confidence: 0.95 },
      confidence: 0.92
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockExtractedData,
        source: 'byok',
        provider: 'gemini',
        modelName: 'gemini-1.5-flash'
      })
    } as Response)

    const { result } = renderHook(() => useReceiptOcr())

    const validFile = new File(['fake-image-bytes'], 'cupom.jpg', { type: 'image/jpeg' })

    let scanResponse: unknown
    await act(async () => {
      scanResponse = await result.current.scanReceipt(validFile, [
        { id: 'cat-1', name: 'Alimentação', type: 'expense' }
      ])
    })

    expect(result.current.isScanning).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.extractedData).toEqual(mockExtractedData)
    expect(scanResponse).toEqual(mockExtractedData)
  })

  it('deve capturar erro 403 AI_KEY_REQUIRED e preencher errorCode correspondente', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: 'Chave de IA necessária',
        code: 'AI_KEY_REQUIRED',
        message: 'Cadastre sua chave Gemini'
      })
    } as Response)

    const { result } = renderHook(() => useReceiptOcr())

    const validFile = new File(['fake-image-bytes'], 'cupom.png', { type: 'image/png' })

    await act(async () => {
      try {
        await result.current.scanReceipt(validFile)
      } catch {
        // esperado
      }
    })

    expect(result.current.errorCode).toBe('AI_KEY_REQUIRED')
    expect(result.current.error).toBe('Cadastre sua chave Gemini')
  })

  it('deve capturar erro 422 RECEIPT_UNREADABLE e preencher mensagem amigável', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        error: 'Documento ilegível',
        code: 'RECEIPT_UNREADABLE',
        message: 'Não foi possível identificar dados financeiros no comprovante.'
      })
    } as Response)

    const { result } = renderHook(() => useReceiptOcr())

    const validFile = new File(['fake-image-bytes'], 'cupom.png', { type: 'image/png' })

    await act(async () => {
      try {
        await result.current.scanReceipt(validFile)
      } catch {
        // esperado
      }
    })

    expect(result.current.errorCode).toBe('RECEIPT_UNREADABLE')
    expect(result.current.error).toContain('Não foi possível identificar dados financeiros')
  })
})
