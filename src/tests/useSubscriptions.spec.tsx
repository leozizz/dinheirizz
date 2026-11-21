import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSubscriptions } from '../hooks/useSubscriptions'

let mockSession: { access_token: string; user: { id: string; email: string } } | null = {
  access_token: 'valid-test-token',
  user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
}

vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../contexts/AuthContext')
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSubscriptions Hook (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = {
      access_token: 'valid-test-token',
      user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
    }

    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : ''

      if (urlStr.includes('/api/v1/insights/subscriptions/confirm') && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            transaction: {
              id: 'tx-1',
              isRecurring: true,
              recurrencePeriod: 'monthly',
              recurrenceDay: 5
            }
          })
        } as Response
      }

      if (urlStr.includes('/api/v1/insights/subscriptions/ignore') && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            normalizedKey: 'netflix'
          })
        } as Response
      }

      if (urlStr.includes('/api/v1/insights/subscriptions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            subscriptions: [
              {
                id: 'netflix',
                normalizedKey: 'netflix',
                name: 'Netflix',
                frequency: 'monthly',
                averageAmount: 44.9,
                lastAmount: 55.9,
                monthlyCost: 55.9,
                annualCost: 670.8,
                occurrencesCount: 3,
                lastChargedAt: '2026-11-05T10:00:00.000Z',
                nextEstimatedChargeAt: '2026-12-05T10:00:00.000Z',
                latestTransactionId: 'tx-1',
                accountId: 'acc-1',
                categoryId: null,
                isConfirmedRecurring: false,
                priceAlert: {
                  previousAverageAmount: 44.9,
                  currentAmount: 55.9,
                  increasePercentage: 24.5
                },
                duplicateAlert: null
              }
            ],
            summary: {
              totalMonthlyCost: 55.9,
              totalAnnualCost: 670.8,
              activeCount: 1,
              alertsCount: 1
            },
            generatedAt: '2026-11-21T08:00:00.000Z'
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

  it('deve carregar assinaturas da API quando usuário estiver autenticado', async () => {
    const { result } = renderHook(() => useSubscriptions(), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.subscriptions).toHaveLength(1))

    expect(result.current.subscriptions[0].name).toBe('Netflix')
    expect(result.current.summary.totalMonthlyCost).toBe(55.9)
    expect(result.current.summary.alertsCount).toBe(1)
  })

  it('deve retornar dados determinísticos em Modo Demonstração quando não houver sessão', async () => {
    mockSession = null

    const { result } = renderHook(() => useSubscriptions(), {
      wrapper: createWrapper()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.subscriptions.length).toBeGreaterThanOrEqual(4)
    expect(result.current.summary.activeCount).toBe(result.current.subscriptions.length)

    await act(async () => {
      await result.current.ignoreSubscription('netflix')
    })

    expect(result.current.subscriptions.some((s) => s.normalizedKey === 'netflix')).toBe(false)
  })

  it('deve chamar endpoint de confirmação e ignorar via mutations quando autenticado', async () => {
    const { result } = renderHook(() => useSubscriptions(), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.subscriptions).toHaveLength(1))

    await act(async () => {
      await result.current.confirmSubscription({
        transactionId: 'tx-1',
        frequency: 'monthly',
        recurrenceDay: 5
      })
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/insights/subscriptions/confirm'),
      expect.objectContaining({ method: 'POST' })
    )

    await act(async () => {
      await result.current.ignoreSubscription('netflix')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/insights/subscriptions/ignore'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})
