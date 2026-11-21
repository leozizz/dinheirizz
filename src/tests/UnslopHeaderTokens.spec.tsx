import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { AiInsightsCard } from '../components/dashboard/AiInsightsCard'
import { AccountsBar } from '../components/dashboard/AccountsBar'
import { CashFlowChart } from '../components/dashboard/CashFlowChart'
import { Dashboard, type TransactionItem } from '../components/dashboard/Dashboard'
import { ForecastCard } from '../components/dashboard/ForecastCard'
import * as useForecastModule from '../hooks/useForecast'
import type { AiInsightData } from '../hooks/useAiInsights'
import type { AccountItem } from '../hooks/useAccounts'

const FORBIDDEN_TOKEN_PATTERNS = [
  'border-white/',
  'bg-white/',
  'text-neutral-',
  'bg-zinc-900',
  'text-stone-400'
]

const assertNoForbiddenTokens = (container: HTMLElement) => {
  const allElements = [container, ...Array.from(container.querySelectorAll('*'))]
  for (const el of allElements) {
    const className = typeof el.className === 'string' ? el.className : el.getAttribute('class') || ''
    for (const pattern of FORBIDDEN_TOKEN_PATTERNS) {
      expect(className).not.toContain(pattern)
    }
  }
}

const mockInsight: AiInsightData = {
  id: 'insight-unslop',
  period: '2026-11',
  summary: 'Fluxo equilibrado no período atual.',
  financialHealthScore: 85,
  highlights: ['Reserva de emergência cresceu 10%'],
  alerts: ['Atenção aos gastos com assinaturas'],
  recommendations: ['Revisar assinaturas recorrentes'],
  metrics: {
    totalIncome: 8000,
    totalExpense: 4000,
    netBalance: 4000,
    savingsRate: 50,
    topCategory: 'Moradia'
  },
  source: 'system',
  isFallback: false,
  createdAt: '2026-11-20T12:00:00Z'
}

const mockAccounts: AccountItem[] = [
  {
    id: 'acc-1',
    name: 'Nubank Principal',
    bank: 'Nubank',
    type: 'checking',
    balance: 5000,
    color: '#820ad1'
  }
]

const mockTransactions: TransactionItem[] = [
  {
    id: 'tx-1',
    description: 'Aluguel',
    amount: -1800,
    paid: false,
    occurred_at: '2026-11-20',
    type: 'expense',
    category: { name: 'Moradia' },
    status: 'pending'
  },
  {
    id: 'tx-2',
    description: 'Salário',
    amount: 6500,
    paid: true,
    occurred_at: '2026-11-05',
    type: 'income',
    category: { name: 'Salário' },
    status: 'completed'
  }
]

const mockForecastSafe: useForecastModule.ForecastResponse = {
  startingBalance: 6000,
  projectedEndBalance: 4200,
  netChange: -1800,
  dailyBurnRate: 60,
  healthStatus: 'safe',
  healthMessage: 'Saldo saudável e previsível.',
  lowestPoint: { date: '2026-11-28', balance: 4200 },
  timeline: [
    { date: '2026-11-20', balance: 5940, scheduledIncome: 0, scheduledExpense: 0, variableBurn: 60 },
    { date: '2026-11-21', balance: 5880, scheduledIncome: 500, scheduledExpense: 0, variableBurn: 60 },
    { date: '2026-11-22', balance: 4200, scheduledIncome: 0, scheduledExpense: 1620, variableBurn: 60 }
  ]
}

const mockForecastDanger: useForecastModule.ForecastResponse = {
  startingBalance: 1000,
  projectedEndBalance: -500,
  netChange: -1500,
  dailyBurnRate: 50,
  healthStatus: 'danger',
  healthMessage: 'Atenção: Risco de saldo negativo identificado.',
  lowestPoint: { date: '2026-11-25', balance: -500 },
  timeline: [
    { date: '2026-11-20', balance: 950, scheduledIncome: 0, scheduledExpense: 0, variableBurn: 50 },
    { date: '2026-11-25', balance: -500, scheduledIncome: 0, scheduledExpense: 1400, variableBurn: 50 }
  ]
}

const renderWithQuery = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('Unslop Header, Demo Banner & Light Mode Tokens (Issue #76)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve remover jargão técnico do header, limpar gradiente do banner demo e corrigir botão Entrar', async () => {
    render(<App />)
    const demoBtn = await screen.findByTestId('welcome-demo-btn')
    fireEvent.click(demoBtn)

    const title = await screen.findByTestId('header-app-title')
    expect(title).toHaveTextContent('Dinheirizz')
    expect(title.textContent).not.toMatch(/2\.0\s*PWA/i)

    const subtitle = screen.getByTestId('header-app-subtitle')
    expect(subtitle).toHaveTextContent('Finanças Pessoais')
    expect(subtitle.textContent).not.toMatch(/Cloudflare Pages/i)
    expect(subtitle.textContent).not.toMatch(/\bBFF\b/i)

    const banner = screen.getByTestId('demo-mode-banner')
    expect(banner.className).toContain('bg-primary/10')
    expect(banner.className).toContain('border-primary/20')
    expect(banner.className).toContain('text-foreground')
    expect(banner.className).not.toContain('bg-gradient-to-r')
    expect(banner.className).not.toContain('from-blue-600/20')
    expect(banner.className).not.toContain('to-purple-600/20')

    const bannerLoginBtn = screen.getByTestId('demo-banner-login-btn')
    expect(bannerLoginBtn.className).toContain('min-h-[44px]')

    const headerLoginBtn = screen.getByTestId('header-login-btn')
    expect(headerLoginBtn).toHaveAttribute('type', 'button')
    expect(headerLoginBtn.className).toContain('min-h-[44px]')
    expect(headerLoginBtn.className).toContain('bg-primary')
    expect(headerLoginBtn.className).toContain('text-primary-foreground')
    expect(headerLoginBtn.className).not.toContain('bg-blue-600/30')
    expect(headerLoginBtn.className).not.toContain('text-blue-300')
  })

  it('AiInsightsCard não deve conter tokens hardcoded nem animate-pulse decorativo no ícone Sparkles', () => {
    const { container } = render(
      <AiInsightsCard insight={mockInsight} isLoading={false} isGenerating={false} onGenerate={vi.fn()} />
    )
    assertNoForbiddenTokens(container)
    expect(container.querySelector('.animate-pulse')).toBeNull()

    const { container: loadingContainer } = render(
      <AiInsightsCard insight={null} isLoading={true} isGenerating={false} onGenerate={vi.fn()} />
    )
    assertNoForbiddenTokens(loadingContainer)
    expect(loadingContainer.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('AccountsBar não deve conter tokens hardcoded e deve ter data-testid e touch target no botão Nova Conta', () => {
    const { container } = render(
      <AccountsBar
        accounts={mockAccounts}
        selectedAccountId={null}
        onSelectAccount={vi.fn()}
        onNewAccount={vi.fn()}
      />
    )
    assertNoForbiddenTokens(container)

    const newBtn = screen.getByTestId('accounts-bar-new-btn')
    expect(newBtn).toBeInTheDocument()
    expect(newBtn.className).toContain('min-h-[44px]')
  })

  it('CashFlowChart não deve conter tokens hardcoded nem bg-zinc-900 no tooltip', () => {
    const { container } = render(
      <CashFlowChart timeline={mockForecastSafe.timeline} startingBalance={6000} healthStatus="safe" />
    )
    const hitRect = container.querySelector('rect')
    expect(hitRect).not.toBeNull()
    if (hitRect) {
      fireEvent.mouseEnter(hitRect)
    }
    assertNoForbiddenTokens(container)
  })

  it('Dashboard não deve conter tokens hardcoded nem animate-pulse decorativo no badge Ativo', () => {
    vi.spyOn(useForecastModule, 'useForecast').mockReturnValue({
      data: mockForecastSafe,
      isLoading: false,
      isError: false
    } as unknown as ReturnType<typeof useForecastModule.useForecast>)

    const { container } = renderWithQuery(
      <Dashboard
        totalBalance={4700}
        totalIncome={6500}
        totalExpense={1800}
        transactions={mockTransactions}
        onActionClick={vi.fn()}
        onPayTransaction={vi.fn()}
        isLoading={false}
      />
    )
    assertNoForbiddenTokens(container)
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })

  it('ForecastCard deve usar data-testid nos botões de horizonte e não ter animate-pulse decorativo', () => {
    vi.spyOn(useForecastModule, 'useForecast').mockReturnValue({
      data: mockForecastSafe,
      isLoading: false,
      isError: false
    } as unknown as ReturnType<typeof useForecastModule.useForecast>)

    const { container: safeContainer } = renderWithQuery(<ForecastCard />)
    assertNoForbiddenTokens(safeContainer)
    expect(safeContainer.querySelector('.animate-pulse')).toBeNull()

    const btn30 = screen.getByTestId('forecast-horizon-30-btn')
    const btn60 = screen.getByTestId('forecast-horizon-60-btn')
    expect(btn30.className).toContain('min-h-[44px]')
    expect(btn60.className).toContain('min-h-[44px]')

    vi.spyOn(useForecastModule, 'useForecast').mockReturnValue({
      data: mockForecastDanger,
      isLoading: false,
      isError: false
    } as unknown as ReturnType<typeof useForecastModule.useForecast>)

    const { container: dangerContainer } = renderWithQuery(<ForecastCard />)
    assertNoForbiddenTokens(dangerContainer)
    expect(dangerContainer.querySelector('.animate-pulse')).toBeNull()
  })
})
