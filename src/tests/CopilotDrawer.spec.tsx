import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CopilotDrawer } from '../components/ai/CopilotDrawer'
import type { AiChatResponse } from '../types/aiChat'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { access_token: 'mock-jwt-token' },
    user: { id: 'user-1', email: 'test@dinheirizz.com' }
  })
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

const renderWithQuery = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('CopilotDrawer (TDD)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('não deve renderizar quando isOpen for false', () => {
    renderWithQuery(<CopilotDrawer isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByTestId('copilot-drawer')).toBeNull()
  })

  it('deve renderizar chips sugeridos, input e botão de envio com data-testid obrigatórios', () => {
    renderWithQuery(<CopilotDrawer isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByTestId('copilot-drawer')).toBeInTheDocument()
    expect(screen.getByTestId('copilot-close-btn')).toBeInTheDocument()
    expect(screen.getByTestId('copilot-suggested-chip-0')).toBeInTheDocument()
    expect(screen.getByTestId('copilot-suggested-chip-1')).toBeInTheDocument()
    expect(screen.getByTestId('copilot-suggested-chip-2')).toBeInTheDocument()
    expect(screen.getByTestId('copilot-messages-list')).toBeInTheDocument()
    expect(screen.getByTestId('copilot-input')).toBeInTheDocument()
    expect(screen.getByTestId('copilot-send-btn')).toBeInTheDocument()
  })

  it('ao clicar em chip sugerido deve enviar mensagem e exibir resposta com citações e badge de origem', async () => {
    const mockResponse: AiChatResponse = {
      reply: 'Você gastou R$ 620,00 com delivery nos últimos 30 dias.',
      source: 'byok',
      modelName: 'gemini-2.5-flash',
      requiresApiKey: false,
      citations: [
        {
          label: 'Delivery (30d)',
          value: 'R$ 620,00',
          period: '2026-11'
        }
      ],
      actionCards: []
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    renderWithQuery(<CopilotDrawer isOpen={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByTestId('copilot-suggested-chip-0'))

    await waitFor(() => {
      expect(screen.getByTestId('copilot-message-user-0')).toBeInTheDocument()
      expect(screen.getByTestId('copilot-message-assistant-1')).toBeInTheDocument()
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/ai/chat'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-jwt-token'
        })
      })
    )

    expect(screen.getByTestId('copilot-source-badge')).toHaveTextContent(/BYOK/i)
    expect(screen.getByText(/Delivery \(30d\)/i)).toBeInTheDocument()
    expect(screen.getAllByText(/R\$ 620,00/i).length).toBeGreaterThanOrEqual(2)
  })

  it('deve renderizar Action Card e só chamar POST /api/v1/budgets após clicar em Confirmar', async () => {
    const mockResponse: AiChatResponse = {
      reply: 'Preparei uma proposta de orçamento mensal para Alimentação.',
      source: 'byok',
      modelName: 'gemini-2.5-flash',
      requiresApiKey: false,
      citations: [],
      actionCards: [
        {
          id: 'card-budget-1',
          type: 'create_budget',
          title: 'Criar orçamento de Alimentação',
          summary: 'Limite mensal de R$ 800,00 para Alimentação.',
          payload: {
            categoryId: 'cat-food',
            categoryName: 'Alimentação',
            amountLimit: 800,
            period: '2026-11'
          }
        }
      ]
    }

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'budget-123' })
      } as Response)

    renderWithQuery(<CopilotDrawer isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByTestId('copilot-input')
    fireEvent.change(input, { target: { value: 'Crie um orçamento de R$ 800 para Alimentação' } })
    fireEvent.click(screen.getByTestId('copilot-send-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('copilot-action-card-card-budget-1')).toBeInTheDocument()
    })

    // Ainda não deve ter chamado /api/v1/budgets antes da confirmação
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const confirmBtn = screen.getByTestId('copilot-action-confirm-card-budget-1')
    expect(screen.getByTestId('copilot-action-cancel-card-budget-1')).toBeInTheDocument()

    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/v1/budgets'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('cat-food')
      })
    )

    await waitFor(() => {
      expect(screen.getByText('Confirmado')).toBeInTheDocument()
    })
  })

  it('deve exibir banner orientativo e copilot-missing-key-cta quando requiresApiKey for true', async () => {
    const onOpenAiSettings = vi.fn()
    const onClose = vi.fn()
    const mockFallback: AiChatResponse = {
      reply: 'Cadastre sua chave gratuita do Google Gemini em Configurações > Inteligência Artificial (BYOK).',
      source: 'fallback',
      modelName: null,
      requiresApiKey: true,
      citations: [],
      actionCards: []
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockFallback
    } as Response)

    renderWithQuery(
      <CopilotDrawer isOpen={true} onClose={onClose} onOpenAiSettings={onOpenAiSettings} />
    )

    fireEvent.click(screen.getByTestId('copilot-suggested-chip-1'))

    await waitFor(() => {
      expect(screen.getByTestId('copilot-missing-key-cta')).toBeInTheDocument()
    })

    expect(screen.getByTestId('copilot-source-badge')).toHaveTextContent(/Sem Chave/i)

    fireEvent.click(screen.getByTestId('copilot-missing-key-cta'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onOpenAiSettings).toHaveBeenCalledTimes(1)
  })
})
