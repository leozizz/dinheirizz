import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { PushNotificationBanner } from '../components/dashboard/PushNotificationBanner'
import type { PushNotificationHookReturn } from '../hooks/usePushNotifications'

let mockHookState: PushNotificationHookReturn

vi.mock('../hooks/usePushNotifications', () => ({
  usePushNotifications: () => mockHookState
}))

describe('PushNotificationBanner Component (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockHookState = {
      preferences: {
        pushEnabled: false,
        billsDueAlerts: true,
        billsDueDaysBefore: 1,
        budgetLimitAlerts: true,
        budgetThresholdPercent: 85,
        invoiceDueAlerts: true,
        updatedAt: null
      },
      isSupported: true,
      permission: 'default',
      isLoading: false,
      isSubscribing: false,
      isUpdatingPreferences: false,
      isSendingTest: false,
      hasActiveSubscription: false,
      subscribeToPush: vi.fn().mockResolvedValue(true),
      unsubscribeFromPush: vi.fn().mockResolvedValue(true),
      updatePreferences: vi.fn().mockResolvedValue(true),
      sendTestNotification: vi.fn().mockResolvedValue({ success: true, message: 'OK' }),
      refreshPermission: vi.fn()
    }
  })

  it('renderiza o banner quando suportado, permissão for default e não dispensado', () => {
    render(<PushNotificationBanner />)

    expect(screen.getByTestId('push-notification-banner')).toBeInTheDocument()
    expect(screen.getByTestId('btn-enable-push-banner')).toBeInTheDocument()
    expect(screen.getByTestId('btn-dismiss-push-banner')).toBeInTheDocument()
    expect(screen.getByText(/evite juros e multas/i)).toBeInTheDocument()
  })

  it('não renderiza o banner se o navegador não suportar notificações', () => {
    mockHookState.isSupported = false
    mockHookState.permission = 'unsupported'

    render(<PushNotificationBanner />)
    expect(screen.queryByTestId('push-notification-banner')).not.toBeInTheDocument()
  })

  it('não renderiza o banner se a permissão já foi concedida (granted)', () => {
    mockHookState.permission = 'granted'
    mockHookState.hasActiveSubscription = true

    render(<PushNotificationBanner />)
    expect(screen.queryByTestId('push-notification-banner')).not.toBeInTheDocument()
  })

  it('não renderiza o banner se a permissão foi bloqueada (denied)', () => {
    mockHookState.permission = 'denied'

    render(<PushNotificationBanner />)
    expect(screen.queryByTestId('push-notification-banner')).not.toBeInTheDocument()
  })

  it('não renderiza o banner se foi dispensado anteriormente pelo usuário (localStorage)', () => {
    localStorage.setItem('dinheirizz_push_banner_dismissed', 'true')

    render(<PushNotificationBanner />)
    expect(screen.queryByTestId('push-notification-banner')).not.toBeInTheDocument()
  })

  it('permite dispensar o banner salvando no localStorage', () => {
    render(<PushNotificationBanner />)

    const dismissBtn = screen.getByTestId('btn-dismiss-push-banner')
    fireEvent.click(dismissBtn)

    expect(screen.queryByTestId('push-notification-banner')).not.toBeInTheDocument()
    expect(localStorage.getItem('dinheirizz_push_banner_dismissed')).toBe('true')
  })

  it('chama subscribeToPush ao clicar no botão Ativar Alertas', async () => {
    render(<PushNotificationBanner />)

    const enableBtn = screen.getByTestId('btn-enable-push-banner')
    fireEvent.click(enableBtn)

    await waitFor(() => {
      expect(mockHookState.subscribeToPush).toHaveBeenCalled()
    })
  })
})
