import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { PushNotificationSettings } from '../components/settings/PushNotificationSettings'
import { PushNotificationBanner } from '../components/dashboard/PushNotificationBanner'
import type { PushNotificationHookReturn } from '../hooks/usePushNotifications'

let mockHookState: PushNotificationHookReturn

vi.mock('../hooks/usePushNotifications', () => ({
  usePushNotifications: () => mockHookState
}))

describe('QA: Web Push Notifications A11y & Responsiveness (WCAG AA)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
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
      sendTestNotification: vi.fn().mockResolvedValue({ success: true, message: 'Push disparado com sucesso' }),
      refreshPermission: vi.fn()
    }
  })

  it('garante touch targets mínimos de 44x44px em todos os controles interativos', () => {
    render(<PushNotificationSettings />)

    const masterSwitch = screen.getByTestId('switch-push-master')
    const billsSwitch = screen.getByTestId('switch-bills-due-alert')
    const budgetSwitch = screen.getByTestId('switch-budget-limit-alert')
    const invoiceSwitch = screen.getByTestId('switch-invoice-due-alert')
    const selectBills = screen.getByTestId('select-bills-days-before')
    const selectBudget = screen.getByTestId('select-budget-threshold')
    const testBtn = screen.getByTestId('btn-test-push-notification')

    const elements = [
      masterSwitch,
      billsSwitch,
      budgetSwitch,
      invoiceSwitch,
      selectBills,
      selectBudget,
      testBtn
    ]

    elements.forEach((el) => {
      expect(el.className).toMatch(/min-h-\[44px\]/)
    })
  })

  it('garante touch targets mínimos no PushNotificationBanner', () => {
    mockHookState.permission = 'default'
    render(<PushNotificationBanner />)

    const enableBtn = screen.getByTestId('btn-enable-push-banner')
    const dismissBtn = screen.getByTestId('btn-dismiss-push-banner')

    expect(enableBtn.className).toMatch(/min-h-\[44px\]/)
    expect(dismissBtn.className).toMatch(/min-h-\[44px\]/)
    expect(dismissBtn.className).toMatch(/min-w-\[44px\]/)
  })

  it('garante atributos aria-label e roles de acessibilidade nos seletores e switches', () => {
    render(<PushNotificationSettings />)

    const masterSwitch = screen.getByTestId('switch-push-master')
    expect(masterSwitch).toHaveAttribute('role', 'switch')
    expect(masterSwitch).toHaveAttribute('aria-checked', 'true')
    expect(masterSwitch).toHaveAttribute('aria-label')

    const selectBills = screen.getByTestId('select-bills-days-before')
    expect(selectBills).toHaveAttribute('aria-label')

    const selectBudget = screen.getByTestId('select-budget-threshold')
    expect(selectBudget).toHaveAttribute('aria-label')
  })

  it('garante conformidade de layout sem overflow horizontal em viewports mobile (375px/390px) e desktop (1280px)', () => {
    const viewports = [375, 390, 768, 1280]

    viewports.forEach((width) => {
      window.innerWidth = width
      const { container } = render(<PushNotificationSettings />)
      const section = container.querySelector('[data-testid="push-notifications-section"]')
      expect(section).toBeInTheDocument()
      expect(section?.scrollWidth ?? 0).toBeLessThanOrEqual(width)
    })
  })
})
