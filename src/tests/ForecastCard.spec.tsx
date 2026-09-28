import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { ForecastCard } from '../components/dashboard/ForecastCard'
import * as useForecastModule from '../hooks/useForecast'

const mockForecastSafe: useForecastModule.ForecastResponse = {
  startingBalance: 6000,
  projectedEndBalance: 4200,
  netChange: -1800,
  dailyBurnRate: 60,
  healthStatus: 'safe',
  healthMessage: 'Saldo saudável e previsível.',
  lowestPoint: { date: '2026-10-28', balance: 4200 },
  timeline: [
    { date: '2026-09-29', balance: 5940, scheduledIncome: 0, scheduledExpense: 0, variableBurn: 60 },
    { date: '2026-09-30', balance: 5880, scheduledIncome: 0, scheduledExpense: 0, variableBurn: 60 },
    { date: '2026-10-01', balance: 4200, scheduledIncome: 0, scheduledExpense: 1620, variableBurn: 60 }
  ]
}

const mockForecastDanger: useForecastModule.ForecastResponse = {
  startingBalance: 1000,
  projectedEndBalance: -500,
  netChange: -1500,
  dailyBurnRate: 50,
  healthStatus: 'danger',
  healthMessage: 'Atenção: Risco de saldo negativo identificado.',
  lowestPoint: { date: '2026-10-25', balance: -500 },
  timeline: [
    { date: '2026-09-29', balance: 950, scheduledIncome: 0, scheduledExpense: 0, variableBurn: 50 },
    { date: '2026-10-25', balance: -500, scheduledIncome: 0, scheduledExpense: 1400, variableBurn: 50 }
  ]
}

function renderComponent(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ForecastCard {...props} />
    </QueryClientProvider>
  )
}

describe('ForecastCard Component (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar o card de previsão com saldo projetado e badge Tranquilo', () => {
    vi.spyOn(useForecastModule, 'useForecast').mockReturnValue({
      data: mockForecastSafe,
      isLoading: false,
      isError: false
    } as any)

    renderComponent()

    expect(screen.getByText(/Previsão de Saldo/i)).toBeInTheDocument()
    expect(screen.getByText('Tranquilo')).toBeInTheDocument()
    expect(screen.getAllByText(/4\.200/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Gasto Diário Médio/i)).toBeInTheDocument()
  })

  it('deve renderizar badge Risco de Saldo Negativo quando status for danger', () => {
    vi.spyOn(useForecastModule, 'useForecast').mockReturnValue({
      data: mockForecastDanger,
      isLoading: false,
      isError: false
    } as any)

    renderComponent()

    expect(screen.getByText('Risco de Saldo Negativo')).toBeInTheDocument()
    expect(screen.getByText(/Atenção: Risco de saldo negativo identificado/i)).toBeInTheDocument()
  })

  it('deve alternar entre 30 e 60 dias ao clicar nos botões', () => {
    const useForecastSpy = vi.spyOn(useForecastModule, 'useForecast').mockReturnValue({
      data: mockForecastSafe,
      isLoading: false,
      isError: false
    } as any)

    renderComponent()

    const btn60 = screen.getByRole('button', { name: /60 Dias|60 dias/i })
    expect(btn60).toBeInTheDocument()

    fireEvent.click(btn60)

    expect(useForecastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ days: 60 })
    )
  })

  it('deve renderizar o elemento SVG da curva de projeção', () => {
    vi.spyOn(useForecastModule, 'useForecast').mockReturnValue({
      data: mockForecastSafe,
      isLoading: false,
      isError: false
    } as any)

    const { container } = renderComponent()
    const svgCurve = container.querySelector('svg.cashflow-curve')
    expect(svgCurve).toBeInTheDocument()
  })
})
