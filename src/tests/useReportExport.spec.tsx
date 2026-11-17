import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useReportSummary,
  useReportExport,
  getDemoReportSummary,
  getDemoPdfData
} from '../hooks/useReportExport'
import type { ReportFilterInput } from '../schemas/reports'

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
      loading: false
    })
  }
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useReportExport Hook (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = {
      access_token: 'valid-test-token',
      user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const monthlyFilter: ReportFilterInput = {
    periodType: 'monthly',
    period: '2026-11',
    status: 'completed'
  }

  const yearlyFilter: ReportFilterInput = {
    periodType: 'yearly',
    period: '2026',
    status: 'completed'
  }

  it('deve gerar dados demonstrativos mensais consistentes através de getDemoReportSummary', () => {
    const demo = getDemoReportSummary(monthlyFilter)
    expect(demo.periodType).toBe('monthly')
    expect(demo.period).toBe('2026-11')
    expect(demo.kpis.totalIncome).toBeGreaterThan(0)
    expect(demo.kpis.totalExpense).toBeGreaterThan(0)
    expect(demo.categoriesBreakdown.length).toBeGreaterThan(0)
    expect(demo.costCentersSummary.length).toBeGreaterThan(0)
    expect(demo.cashFlowTimeline.length).toBeGreaterThan(0)
  })

  it('deve gerar dados demonstrativos anuais com 12 pontos de timeline', () => {
    const demo = getDemoReportSummary(yearlyFilter)
    expect(demo.periodType).toBe('yearly')
    expect(demo.period).toBe('2026')
    expect(demo.cashFlowTimeline.length).toBe(12)
  })

  it('deve retornar dados demo através de useReportSummary quando deslogado', async () => {
    mockSession = null

    const { result } = renderHook(() => useReportSummary(monthlyFilter), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.period).toBe('2026-11')
    expect(result.current.data?.kpis.totalIncome).toBe(12500.0)
  })

  it('deve consultar o endpoint do BFF quando o usuário estiver autenticado', async () => {
    const mockBffResponse = {
      ...getDemoReportSummary(monthlyFilter),
      period: '2026-11',
      kpis: {
        totalIncome: 20000.0,
        totalExpense: 5000.0,
        netBalance: 15000.0,
        savingsRate: 75.0,
        transactionCount: 50
      }
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBffResponse
      })
    )

    const { result } = renderHook(() => useReportSummary(monthlyFilter), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.kpis.totalIncome).toBe(20000.0)
    expect(fetch).toHaveBeenCalled()
  })

  it('deve obter dados para PDF através de fetchPdfData', async () => {
    const mockPdfResponse = getDemoPdfData(monthlyFilter)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPdfResponse
      })
    )

    const { result } = renderHook(() => useReportExport())

    const pdfData = await result.current.fetchPdfData(monthlyFilter)
    expect(pdfData.user).toBeDefined()
    expect(pdfData.summary).toBeDefined()
    expect(pdfData.transactions.length).toBeGreaterThan(0)
  })
})
