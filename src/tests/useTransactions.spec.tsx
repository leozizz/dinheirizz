import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useTransactions, useCreateTransaction, useDeleteTransaction } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { AuthProvider } from '../contexts/AuthContext'

let mockSession: { access_token: string; user: any } | null = {
  access_token: 'valid-test-token',
  user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
}

vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual<any>('../contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      user: mockSession?.user || null,
      session: mockSession,
      loading: false,
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn()
    })
  }
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false }
    }
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('Finance Hooks with TanStack Query (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = {
      access_token: 'valid-test-token',
      user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
    }

    // Mock do fetch global para simular as respostas da API
    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : ''

      if (urlStr.includes('/api/v1/transactions')) {
        if (init?.method === 'POST') {
          const body = JSON.parse((init?.body as string) || '{}')
          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: 'tx-created-123',
              amount: String(body.amount),
              description: body.description,
              occurredAt: new Date().toISOString(),
              paid: true,
              type: body.amount >= 0 ? 'income' : 'expense'
            })
          } as Response
        }

        if (init?.method === 'DELETE') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true })
          } as Response
        }

        // GET /api/v1/transactions
        const urlObj = new URL(urlStr, 'http://localhost:3000')
        const page = parseInt(urlObj.searchParams.get('page') || '1', 10)

        if (page === 2) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [
                {
                  id: 'tx-3',
                  amount: '-200.00',
                  description: 'Farmácia',
                  occurredAt: '2026-09-09T10:00:00Z',
                  paid: true,
                  categoryId: '3',
                  category: { name: 'Saúde', color: '#06b6d4', icon: 'cross' }
                }
              ],
              total: 3,
              page: 2,
              limit: 2,
              totalPages: 2,
              hasMore: false
            })
          } as Response
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: 'tx-1',
                amount: '5000.00',
                description: 'Salário',
                occurredAt: '2026-09-10T12:00:00Z',
                paid: true,
                categoryId: '1',
                category: { name: 'Renda', color: '#10b981', icon: 'wallet' }
              },
              {
                id: 'tx-2',
                amount: '-1500.00',
                description: 'Aluguel',
                occurredAt: '2026-09-11T12:00:00Z',
                paid: true,
                categoryId: '2',
                category: { name: 'Moradia', color: '#f43f5e', icon: 'home' }
              }
            ],
            total: 3,
            page: 1,
            limit: 2,
            totalPages: 2,
            hasMore: true
          })
        } as Response
      }

      if (urlStr.includes('/api/v1/categories')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { id: '1', name: 'Alimentação', type: 'expense', icon: 'utensils', color: '#fb923c' },
              { id: '2', name: 'Salário', type: 'income', icon: 'banknote', color: '#34d399' }
            ],
            count: 2
          })
        } as Response
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      } as Response
    })
  })

  it('deve buscar transações e calcular saldo, total de receitas e despesas corretamente', async () => {
    const { result } = renderHook(() => useTransactions(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.transactions).toHaveLength(2)
    expect(result.current.totalIncome).toBe(5000)
    expect(result.current.totalExpense).toBe(1500)
    expect(result.current.totalBalance).toBe(3500)
  })

  it('deve carregar a listagem de categorias via useCategories', async () => {
    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.categories).toHaveLength(2)
    expect(result.current.categories[0].name).toBe('Alimentação')
  })

  it('deve disparar mutação para criar transação via useCreateTransaction', async () => {
    const { result } = renderHook(() => useCreateTransaction(), {
      wrapper: createWrapper()
    })

    await result.current.mutateAsync({
      amount: 250,
      description: 'Freelance Design',
      type: 'income',
      categoryId: '2'
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/transactions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      })
    )
  })

  it('deve disparar mutação para deletar transação via useDeleteTransaction', async () => {
    const { result } = renderHook(() => useDeleteTransaction(), {
      wrapper: createWrapper()
    })

    await result.current.mutateAsync('tx-1')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/transactions/tx-1'),
      expect.objectContaining({
        method: 'DELETE'
      })
    )
  })

  it('não deve disparar requisição GET /api/v1/transactions quando o usuário não estiver autenticado', async () => {
    mockSession = null

    const { result } = renderHook(() => useTransactions(), {
      wrapper: createWrapper()
    })

    expect(result.current.transactions).toEqual([])
    expect(result.current.totalBalance).toBe(0)
    // Verifica que fetch NÃO foi chamado com GET em /api/v1/transactions
    const getTxCalls = (global.fetch as any).mock.calls.filter(
      ([url, init]: [string, RequestInit | undefined]) =>
        url.includes('/api/v1/transactions') && (!init?.method || init.method === 'GET')
    )
    expect(getTxCalls).toHaveLength(0)
  })

  it('deve carregar a primeira página com metadados de paginação e acumular novos dados ao chamar loadMore()', async () => {
    const { result } = renderHook(() => useTransactions({ limit: 2 }), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.transactions).toHaveLength(2)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.total).toBe(3)

    // Aciona o carregamento da próxima página
    result.current.loadMore()

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(3)
    })

    expect(result.current.hasMore).toBe(false)
  })
})
