import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useForecast } from '../hooks/useForecast'

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

describe('useForecast Hook (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = {
      access_token: 'valid-test-token',
      user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
    }

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = typeof url === 'string' ? url : ''

      if (urlStr.includes('/api/v1/forecast')) {
        const urlObj = new URL(urlStr, 'http://localhost:3000')
        const days = urlObj.searchParams.get('days') || '30'
        const accountId = urlObj.searchParams.get('accountId')

        const timelineCount = parseInt(days, 10)
        const timeline = Array.from({ length: timelineCount }, (_, i) => ({
          date: `2026-10-${String(i + 1).padStart(2, '0')}`,
          balance: 5000 - i * 50,
          scheduledIncome: i === 5 ? 2000 : 0,
          scheduledExpense: i === 10 ? 1000 : 0,
          variableBurn: 50
        }))

        return {
          ok: true,
          status: 200,
          json: async () => ({
            startingBalance: accountId ? 2500 : 5000,
            projectedEndBalance: accountId ? 1800 : 3500,
            netChange: accountId ? -700 : -1500,
            dailyBurnRate: 50,
            healthStatus: 'safe',
            healthMessage: 'Saldo saudável e previsível.',
            lowestPoint: { date: '2026-10-30', balance: 3500 },
            timeline
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

  it('deve carregar dados de projeção de 30 dias para usuário autenticado', async () => {
    const { result } = renderHook(() => useForecast({ days: 30 }), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(result.current.data?.startingBalance).toBe(5000)
    expect(result.current.data?.projectedEndBalance).toBe(3500)
    expect(result.current.data?.timeline).toHaveLength(30)
    expect(result.current.data?.healthStatus).toBe('safe')
  })

  it('deve alternar horizonte para 60 dias via parâmetro days', async () => {
    const { result } = renderHook(() => useForecast({ days: 60 }), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.timeline).toHaveLength(60)
  })

  it('deve repassar accountId quando especificado', async () => {
    const { result } = renderHook(() => useForecast({ days: 30, accountId: 'acc-1' }), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.startingBalance).toBe(2500)
  })

  it('deve fornecer fallback gracioso em modo não autenticado (demo mode)', async () => {
    mockSession = null

    const { result } = renderHook(() => useForecast({ days: 30 }), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.data).toBeDefined())

    expect(result.current.data?.startingBalance).toBeDefined()
    expect(result.current.data?.timeline).toHaveLength(30)
  })
})
