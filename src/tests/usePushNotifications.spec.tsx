import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  isPushNotificationSupported,
  urlBase64ToUint8Array
} from '../lib/push/pushClient'
import { usePushNotifications } from '../hooks/usePushNotifications'
import type { NotificationPreferences } from '../schemas/push'

interface MockUser {
  id: string
  email: string
}

interface MockSession {
  access_token: string
  user: MockUser
}

let mockSession: MockSession | null = {
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

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
  return Wrapper
}

describe('usePushNotifications & pushClient (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = {
      access_token: 'valid-test-token',
      user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
    }

    // Default mock Notification
    const mockNotificationObj = {
      permission: 'default' as NotificationPermission,
      requestPermission: vi.fn().mockImplementation(async () => {
        mockNotificationObj.permission = 'granted'
        return 'granted'
      })
    }
    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: mockNotificationObj
    })

    // Default mock PushManager
    Object.defineProperty(window, 'PushManager', {
      writable: true,
      configurable: true,
      value: {}
    })

    // Default mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe: vi.fn().mockResolvedValue({
              endpoint: 'https://push.example.com/sub/123',
              getKey: (name: string) => {
                if (name === 'p256dh') return new Uint8Array([1, 2, 3]).buffer
                if (name === 'auth') return new Uint8Array([4, 5, 6]).buffer
                return null
              },
              unsubscribe: vi.fn().mockResolvedValue(true)
            })
          }
        })
      }
    })

    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (urlStr.includes('/api/v1/push/public-key')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vapidPublicKey: 'BCm_test_vapid_key_for_client_tdd_validation'
          })
        }
      }

      if (urlStr.includes('/api/v1/push/preferences')) {
        if (init?.method === 'PUT') {
          const body = JSON.parse((init.body as string) || '{}') as NotificationPreferences
          return {
            ok: true,
            status: 200,
            json: async () => ({
              message: 'Preferências salvas com sucesso',
              preferences: body
            })
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            preferences: {
              pushEnabled: true,
              billsDueAlerts: true,
              billsDueDaysBefore: 1,
              budgetLimitAlerts: true,
              budgetThresholdPercent: 85,
              invoiceDueAlerts: true,
              updatedAt: '2026-11-17T05:00:00Z'
            }
          })
        }
      }

      if (urlStr.includes('/api/v1/push/subscribe')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            message: 'Inscrição registrada',
            subscriptionId: 'sub-id-test-123'
          })
        }
      }

      if (urlStr.includes('/api/v1/push/unsubscribe')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Inscrição removida'
          })
        }
      }

      if (urlStr.includes('/api/v1/push/test')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Notificação enviada',
            sentCount: 1
          })
        }
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      }
    })
  })

  describe('pushClient utilities', () => {
    it('urlBase64ToUint8Array converte string base64url para Uint8Array', () => {
      const base64 = 'AQIDBA' // bytes [1, 2, 3, 4]
      const uint8 = urlBase64ToUint8Array(base64)
      expect(uint8).toBeInstanceOf(Uint8Array)
      expect(uint8.length).toBe(4)
      expect(Array.from(uint8)).toEqual([1, 2, 3, 4])
    })

    it('isPushNotificationSupported retorna true quando PushManager e serviceWorker existem', () => {
      expect(isPushNotificationSupported()).toBe(true)
    })

    it('isPushNotificationSupported retorna false quando não suportado', () => {
      const originalSW = navigator.serviceWorker
      Object.defineProperty(navigator, 'serviceWorker', {
        writable: true,
        configurable: true,
        value: undefined
      })

      expect(isPushNotificationSupported()).toBe(false)

      Object.defineProperty(navigator, 'serviceWorker', {
        writable: true,
        configurable: true,
        value: originalSW
      })
    })
  })

  describe('usePushNotifications hook', () => {
    it('carrega preferências de notificação com sucesso', async () => {
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.preferences).toBeDefined()
      })

      expect(result.current.preferences?.pushEnabled).toBe(true)
      expect(result.current.preferences?.billsDueDaysBefore).toBe(1)
      expect(result.current.preferences?.budgetThresholdPercent).toBe(85)
      expect(result.current.isSupported).toBe(true)
      expect(result.current.permission).toBe('default')
    })

    it('permite atualizar preferências via mutation', async () => {
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.preferences).toBeDefined()
      })

      await act(async () => {
        await result.current.updatePreferences({
          pushEnabled: false,
          billsDueAlerts: false,
          billsDueDaysBefore: 3,
          budgetLimitAlerts: true,
          budgetThresholdPercent: 90,
          invoiceDueAlerts: true
        })
      })

      expect(result.current.isUpdatingPreferences).toBe(false)
    })

    it('solicita permissão e registra inscrição no navegador e backend', async () => {
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.preferences).toBeDefined()
      })

      let res = false
      await act(async () => {
        res = await result.current.subscribeToPush()
      })

      expect(res).toBe(true)
      expect(result.current.permission).toBe('granted')
    })

    it('executa disparo de notificação push de teste', async () => {
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.preferences).toBeDefined()
      })

      let testRes: { success: boolean; message: string } | undefined
      await act(async () => {
        testRes = await result.current.sendTestNotification()
      })

      expect(testRes?.success).toBe(true)
    })
  })
})
