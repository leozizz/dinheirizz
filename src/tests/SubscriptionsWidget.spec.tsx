import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { SubscriptionsWidget } from '../components/dashboard/SubscriptionsWidget'
import type { DetectedSubscription, SubscriptionsSummary } from '../hooks/useSubscriptions'

const mockSubscriptions: DetectedSubscription[] = [
  {
    id: 'netflix',
    normalizedKey: 'netflix',
    name: 'Netflix',
    frequency: 'monthly',
    averageAmount: 44.9,
    lastAmount: 55.9,
    monthlyCost: 55.9,
    annualCost: 670.8,
    occurrencesCount: 4,
    lastChargedAt: '2026-11-05T10:00:00.000Z',
    nextEstimatedChargeAt: '2026-12-05T10:00:00.000Z',
    latestTransactionId: 'tx-netflix-1',
    accountId: 'acc-1',
    categoryId: null,
    isConfirmedRecurring: false,
    priceAlert: {
      previousAverageAmount: 44.9,
      currentAmount: 55.9,
      increasePercentage: 24.5
    },
    duplicateAlert: null
  },
  {
    id: 'spotify',
    normalizedKey: 'spotify',
    name: 'Spotify Duo',
    frequency: 'monthly',
    averageAmount: 27.9,
    lastAmount: 27.9,
    monthlyCost: 27.9,
    annualCost: 334.8,
    occurrencesCount: 3,
    lastChargedAt: '2026-11-08T10:00:00.000Z',
    nextEstimatedChargeAt: '2026-12-08T10:00:00.000Z',
    latestTransactionId: 'tx-spotify-1',
    accountId: 'acc-1',
    categoryId: null,
    isConfirmedRecurring: true,
    priceAlert: null,
    duplicateAlert: {
      duplicateCount: 2,
      dates: ['2026-11-08T10:00:00.000Z', '2026-11-09T10:00:00.000Z']
    }
  },
  {
    id: 'icloud',
    normalizedKey: 'icloud',
    name: 'iCloud+',
    frequency: 'yearly',
    averageAmount: 149.9,
    lastAmount: 149.9,
    monthlyCost: 12.49,
    annualCost: 149.9,
    occurrencesCount: 2,
    lastChargedAt: '2025-12-10T10:00:00.000Z',
    nextEstimatedChargeAt: '2026-12-10T10:00:00.000Z',
    latestTransactionId: 'tx-icloud-1',
    accountId: 'acc-1',
    categoryId: null,
    isConfirmedRecurring: false,
    priceAlert: null,
    duplicateAlert: null
  },
  {
    id: 'academia',
    normalizedKey: 'academia',
    name: 'Smart Fit',
    frequency: 'monthly',
    averageAmount: 139.9,
    lastAmount: 139.9,
    monthlyCost: 139.9,
    annualCost: 1678.8,
    occurrencesCount: 6,
    lastChargedAt: '2026-11-15T10:00:00.000Z',
    nextEstimatedChargeAt: '2026-12-15T10:00:00.000Z',
    latestTransactionId: 'tx-academia-1',
    accountId: 'acc-1',
    categoryId: null,
    isConfirmedRecurring: false,
    priceAlert: null,
    duplicateAlert: null
  }
]

const mockSummary: SubscriptionsSummary = {
  totalMonthlyCost: 236.19,
  totalAnnualCost: 2834.3,
  activeCount: 4,
  alertsCount: 2
}

describe('SubscriptionsWidget Component (TDD)', () => {
  it('deve renderizar skeleton de carregamento quando isLoading for true', () => {
    render(
      <SubscriptionsWidget
        subscriptions={[]}
        summary={{ totalMonthlyCost: 0, totalAnnualCost: 0, activeCount: 0, alertsCount: 0 }}
        isLoading
      />
    )

    expect(screen.getByTestId('widget-subscriptions-loading')).toBeInTheDocument()
  })

  it('deve renderizar estado vazio elegante quando não houver assinaturas detectadas', () => {
    render(
      <SubscriptionsWidget
        subscriptions={[]}
        summary={{ totalMonthlyCost: 0, totalAnnualCost: 0, activeCount: 0, alertsCount: 0 }}
      />
    )

    expect(screen.getByTestId('widget-subscriptions-empty')).toBeInTheDocument()
    expect(screen.getByText(/nenhuma assinatura detectada/i)).toBeInTheDocument()
  })

  it('deve renderizar total mensal, anualizado com tabular-nums e badge de alertas', () => {
    render(
      <SubscriptionsWidget
        subscriptions={mockSubscriptions}
        summary={mockSummary}
      />
    )

    expect(screen.getByTestId('widget-subscriptions')).toBeInTheDocument()

    const totalMonthly = screen.getByTestId('subscriptions-total-monthly')
    expect(totalMonthly).toHaveTextContent(/236,19/)
    expect(totalMonthly.className).toContain('tabular-nums')

    const totalAnnual = screen.getByTestId('subscriptions-total-annual')
    expect(totalAnnual).toHaveTextContent(/2\.834,30/)
    expect(totalAnnual.className).toContain('tabular-nums')

    const alertsBadge = screen.getByTestId('subscriptions-alerts-badge')
    expect(alertsBadge).toHaveTextContent(/2/)
  })

  it('deve exibir apenas as próximas 3 cobranças por padrão e permitir expandir todas', () => {
    render(
      <SubscriptionsWidget
        subscriptions={mockSubscriptions}
        summary={mockSummary}
      />
    )

    expect(screen.getByTestId('subscription-item-netflix')).toBeInTheDocument()
    expect(screen.getByTestId('subscription-item-spotify')).toBeInTheDocument()
    expect(screen.getByTestId('subscription-item-icloud')).toBeInTheDocument()
    expect(screen.queryByTestId('subscription-item-academia')).not.toBeInTheDocument()

    const toggleBtn = screen.getByTestId('subscriptions-toggle-all-btn')
    expect(toggleBtn).toHaveTextContent(/ver todas \(4\)/i)

    fireEvent.click(toggleBtn)

    expect(screen.getByTestId('subscription-item-academia')).toBeInTheDocument()
    expect(toggleBtn).toHaveTextContent(/mostrar menos/i)
  })

  it('deve exibir badges contextuais de aumento de preço e duplicidade', () => {
    render(
      <SubscriptionsWidget
        subscriptions={mockSubscriptions}
        summary={mockSummary}
      />
    )

    const priceAlert = screen.getByTestId('subscription-price-alert-netflix')
    expect(priceAlert).toHaveTextContent(/\+25%|\+24,5%|\+24.5%/i)

    const duplicateAlert = screen.getByTestId('subscription-duplicate-alert-spotify')
    expect(duplicateAlert).toHaveTextContent(/duplicada/i)
  })

  it('deve acionar onConfirm e onIgnore ao clicar nos botões de 1 clique', () => {
    const onConfirm = vi.fn()
    const onIgnore = vi.fn()

    render(
      <SubscriptionsWidget
        subscriptions={mockSubscriptions}
        summary={mockSummary}
        onConfirm={onConfirm}
        onIgnore={onIgnore}
      />
    )

    const confirmBtn = screen.getByTestId('subscription-confirm-btn-netflix')
    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith(mockSubscriptions[0])

    const ignoreBtn = screen.getByTestId('subscription-ignore-btn-netflix')
    fireEvent.click(ignoreBtn)
    expect(onIgnore).toHaveBeenCalledTimes(1)
    expect(onIgnore).toHaveBeenCalledWith('netflix')

    // Spotify já está confirmada oficialmente
    expect(screen.queryByTestId('subscription-confirm-btn-spotify')).not.toBeInTheDocument()
    expect(screen.getByText('Confirmada')).toBeInTheDocument()
  })
})
