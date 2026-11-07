import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useBudgets,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget
} from '../hooks/useBudgets'

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

describe('useBudgets Hook (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = {
      access_token: 'valid-test-token',
      user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
    }

    global.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = typeof url === 'string' ? url : ''

      if (urlStr.includes('/api/v1/budgets')) {
        const method = options?.method || 'GET'

        if (method === 'GET') {
          return {
            ok: true,
            json: async () => ({
              period: '2026-10',
              totalBudgetLimit: 1500,
              totalSpent: 900,
              totalRemaining: 600,
              overallPercentageUsed: 60,
              budgets: [
                {
                  id: 'b-1',
                  categoryId: 'cat-1',
                  categoryName: 'Alimentação',
                  categoryColor: '#10b981',
                  categoryIcon: 'utensils',
                  amountLimit: 1000,
                  spentAmount: 700,
                  remainingAmount: 300,
                  percentageUsed: 70,
                  isOverBudget: false,
                  status: 'normal'
                }
              ]
            })
          }
        }

        if (method === 'POST') {
          return {
            ok: true,
            json: async () => ({
              budget: {
                id: 'b-created',
                categoryId: 'cat-1',
                amountLimit: 1200
              }
            })
          }
        }

        if (method === 'PUT') {
          return {
            ok: true,
            json: async () => ({
              budget: {
                id: 'b-1',
                amountLimit: 1500
              }
            })
          }
        }

        if (method === 'DELETE') {
          return {
            ok: true,
            json: async () => ({
              success: true
            })
          }
        }
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      }
    })
  })

  it('deve buscar e expor os orçamentos do período com totais consolidados', async () => {
    const { result } = renderHook(() => useBudgets('2026-10'), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.summary).toBeDefined()
    expect(result.current.summary?.totalBudgetLimit).toBe(1500)
    expect(result.current.summary?.totalSpent).toBe(900)
    expect(result.current.budgets).toHaveLength(1)
    expect(result.current.budgets[0].categoryName).toBe('Alimentação')
  })

  it('deve criar novo orçamento via useCreateBudget', async () => {
    const { result } = renderHook(() => useCreateBudget(), {
      wrapper: createWrapper()
    })

    let createdData: any
    await act(async () => {
      createdData = await result.current.mutateAsync({
        categoryId: 'cat-1',
        amountLimit: 1200,
        period: '2026-10'
      })
    })

    expect(createdData.budget.id).toBe('b-created')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/budgets'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('deve atualizar orçamento via useUpdateBudget', async () => {
    const { result } = renderHook(() => useUpdateBudget(), {
      wrapper: createWrapper()
    })

    let updatedData: any
    await act(async () => {
      updatedData = await result.current.mutateAsync({
        id: 'b-1',
        amountLimit: 1500
      })
    })

    expect(updatedData.budget.amountLimit).toBe(1500)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/budgets/b-1'),
      expect.objectContaining({ method: 'PUT' })
    )
  })

  it('deve excluir orçamento via useDeleteBudget', async () => {
    const { result } = renderHook(() => useDeleteBudget(), {
      wrapper: createWrapper()
    })

    await act(async () => {
      await result.current.mutateAsync('b-1')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/budgets/b-1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
