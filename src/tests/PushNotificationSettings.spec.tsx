import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import React from 'react'
import { PushNotificationSettings } from '../components/settings/PushNotificationSettings'
import type { PushNotificationHookReturn } from '../hooks/usePushNotifications'

let mockHookState: PushNotificationHookReturn

vi.mock('../hooks/usePushNotifications', () => ({
  usePushNotifications: () => mockHookState
}))

describe('PushNotificationSettings Component (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookState = {
      preferences: {
        pushEnabled: true,
        billsDueAlerts: true,
        billsDueDaysBefore: 1,
        budgetLimitAlerts: true,
        budgetThresholdPercent: 85,
        invoiceDueAlerts: true,
        updatedAt: '2026-11-17T05:00:00Z'
      },
      isSupported: true,
      permission: 'granted',
      isLoading: false,
      isSubscribing: false,
      isUpdatingPreferences: false,
      isSendingTest: false,
      hasActiveSubscription: true,
      subscribeToPush: vi.fn().mockResolvedValue(true),
      unsubscribeFromPush: vi.fn().mockResolvedValue(true),
      updatePreferences: vi.fn().mockResolvedValue(true),
      sendTestNotification: vi.fn().mockResolvedValue({ success: true, message: 'Push de teste disparado!' }),
      refreshPermission: vi.fn()
    }
  })

  it('renderiza todos os data-testid obrigatórios da seção', () => {
    render(<PushNotificationSettings />)

    expect(screen.getByTestId('push-notifications-section')).toBeInTheDocument()
    expect(screen.getByTestId('switch-push-master')).toBeInTheDocument()
    expect(screen.getByTestId('switch-bills-due-alert')).toBeInTheDocument()
    expect(screen.getByTestId('select-bills-days-before')).toBeInTheDocument()
    expect(screen.getByTestId('switch-budget-limit-alert')).toBeInTheDocument()
    expect(screen.getByTestId('select-budget-threshold')).toBeInTheDocument()
    expect(screen.getByTestId('switch-invoice-due-alert')).toBeInTheDocument()
    expect(screen.getByTestId('btn-test-push-notification')).toBeInTheDocument()
  })

  it('permite alterar antecedência de contas a vencer e percentual de orçamento', async () => {
    render(<PushNotificationSettings />)

    const selectBills = screen.getByTestId('select-bills-days-before')
    fireEvent.click(selectBills)
    fireEvent.click(within(screen.getByRole('listbox')).getByText(/3 dias de antecedência/i))

    expect(mockHookState.updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        billsDueDaysBefore: 3
      })
    )

    const selectBudget = screen.getByTestId('select-budget-threshold')
    fireEvent.click(selectBudget)
    fireEvent.click(within(screen.getByRole('listbox')).getByText(/Aos 90% do teto/i))

    expect(mockHookState.updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetThresholdPercent: 90
      })
    )
  })

  it('dispara notificação de teste ao clicar no botão', async () => {
    render(<PushNotificationSettings />)

    const testBtn = screen.getByTestId('btn-test-push-notification')
    fireEvent.click(testBtn)

    await waitFor(() => {
      expect(mockHookState.sendTestNotification).toHaveBeenCalled()
    })
  })

  it('exibe alerta explicativo quando a permissão no navegador está bloqueada (denied)', () => {
    mockHookState.permission = 'denied'
    render(<PushNotificationSettings />)

    expect(screen.getByText(/permissão bloqueada/i)).toBeInTheDocument()
    expect(screen.getByText(/desbloqueie as notificações nas configurações do seu navegador/i)).toBeInTheDocument()
  })

  it('exibe aviso caso o navegador não suporte Web Push API', () => {
    mockHookState.isSupported = false
    mockHookState.permission = 'unsupported'
    render(<PushNotificationSettings />)

    expect(screen.getByText(/não suportadas neste navegador/i)).toBeInTheDocument()
  })
})
