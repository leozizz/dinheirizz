import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import {
  isPushNotificationSupported,
  subscribeBrowserPush,
  unsubscribeBrowserPush,
  getExistingSubscription,
  arrayBufferToBase64
} from '../lib/push/pushClient'
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
  SubscribePushInput
} from '../schemas/push'

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PushNotificationHookReturn {
  preferences: NotificationPreferences | undefined
  isSupported: boolean
  permission: PushPermissionStatus
  isLoading: boolean
  isSubscribing: boolean
  isUpdatingPreferences: boolean
  isSendingTest: boolean
  hasActiveSubscription: boolean
  subscribeToPush: () => Promise<boolean>
  unsubscribeFromPush: () => Promise<boolean>
  updatePreferences: (data: UpdateNotificationPreferencesInput) => Promise<boolean>
  sendTestNotification: () => Promise<{ success: boolean; message: string }>
  refreshPermission: () => void
}

const DEMO_PREFERENCES_KEY = 'dinheirizz_demo_push_preferences'

const DEFAULT_DEMO_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  billsDueAlerts: true,
  billsDueDaysBefore: 1,
  budgetLimitAlerts: true,
  budgetThresholdPercent: 85,
  invoiceDueAlerts: true,
  updatedAt: new Date().toISOString()
}

const getDemoPreferences = (): NotificationPreferences => {
  if (typeof window === 'undefined') return DEFAULT_DEMO_PREFERENCES
  try {
    const raw = localStorage.getItem(DEMO_PREFERENCES_KEY)
    if (raw) return JSON.parse(raw) as NotificationPreferences
  } catch (_err) {
    // ignore quota/parsing error
  }
  return DEFAULT_DEMO_PREFERENCES
}

const fallbackQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false }
  }
})

export const usePushNotifications = (): PushNotificationHookReturn => {
  let session = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuth()
    session = auth.session
  } catch (_err) {
    session = null
  }

  let clientInstance: QueryClient = fallbackQueryClient
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const qc = useQueryClient()
    if (qc) {
      clientInstance = qc
    }
  } catch (_err) {
    clientInstance = fallbackQueryClient
  }

  const accessToken = session?.access_token

  const isSupported = isPushNotificationSupported()

  const [permission, setPermission] = useState<PushPermissionStatus>(() => {
    if (!isSupported) return 'unsupported'
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as PushPermissionStatus
    }
    return 'unsupported'
  })

  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(false)

  const refreshPermission = useCallback(() => {
    if (!isSupported) {
      setPermission('unsupported')
      return
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission as PushPermissionStatus)
    }
    void getExistingSubscription().then((sub) => {
      setHasActiveSubscription(Boolean(sub))
    })
  }, [isSupported])

  useEffect(() => {
    refreshPermission()
  }, [refreshPermission])

  // Query: Obter chave pública VAPID
  const vapidKeyQuery = useQuery({
    queryKey: ['push-vapid-public-key'],
    queryFn: async (): Promise<string> => {
      const response = await fetch('/api/v1/push/public-key', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
      })
      if (!response.ok) {
        throw new Error('Falha ao obter chave VAPID pública')
      }
      const data = (await response.json()) as { vapidPublicKey: string }
      return data.vapidPublicKey
    },
    enabled: Boolean(accessToken && isSupported && clientInstance !== fallbackQueryClient),
    staleTime: 1000 * 60 * 60 * 24 // 24h
  }, clientInstance)

  // Query: Obter preferências de notificação
  const preferencesQuery = useQuery({
    queryKey: ['push-preferences', session?.user?.id ?? 'demo'],
    queryFn: async (): Promise<NotificationPreferences> => {
      if (!accessToken) {
        return getDemoPreferences()
      }
      const response = await fetch('/api/v1/push/preferences', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        throw new Error('Falha ao obter preferências de notificação')
      }
      const data = (await response.json()) as { preferences: NotificationPreferences }
      return data.preferences
    },
    enabled: Boolean(clientInstance !== fallbackQueryClient)
  }, clientInstance)

  // Mutation: Atualizar preferências de notificação
  const updatePreferencesMutation = useMutation({
    mutationFn: async (input: UpdateNotificationPreferencesInput): Promise<NotificationPreferences> => {
      if (!accessToken) {
        const updated: NotificationPreferences = {
          ...getDemoPreferences(),
          ...input,
          updatedAt: new Date().toISOString()
        }
        try {
          localStorage.setItem(DEMO_PREFERENCES_KEY, JSON.stringify(updated))
        } catch (_err) {
          // ignore error in private mode
        }
        return updated
      }
      const response = await fetch('/api/v1/push/preferences', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })
      if (!response.ok) {
        throw new Error('Falha ao atualizar preferências de notificação')
      }
      const data = (await response.json()) as { preferences: NotificationPreferences }
      return data.preferences
    },
    onSuccess: (updated) => {
      clientInstance.setQueryData(['push-preferences', session?.user?.id ?? 'demo'], updated)
    }
  }, clientInstance)

  // Mutation: Registrar inscrição
  const subscribeMutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (!isSupported) {
        throw new Error('Notificações não são suportadas neste navegador')
      }

      let vapidKey = vapidKeyQuery.data
      if (!vapidKey) {
        const keyRes = await fetch('/api/v1/push/public-key', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
        })
        if (!keyRes.ok) throw new Error('Não foi possível obter chave pública VAPID')
        const keyJson = (await keyRes.json()) as { vapidPublicKey: string }
        vapidKey = keyJson.vapidPublicKey
      }

      const subscription = await subscribeBrowserPush(vapidKey)
      if (!subscription) {
        refreshPermission()
        return false
      }

      const p256dhBuffer = subscription.getKey('p256dh')
      const authBuffer = subscription.getKey('auth')

      if (!p256dhBuffer || !authBuffer) {
        throw new Error('Inscrição não forneceu chaves de criptografia válidas')
      }

      const p256dh = arrayBufferToBase64(p256dhBuffer)
      const auth = arrayBufferToBase64(authBuffer)

      const payload: SubscribePushInput = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh,
          auth
        },
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      }

      const response = await fetch('/api/v1/push/subscribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Falha ao registrar assinatura de push no servidor')
      }

      refreshPermission()
      return true
    }
  }, clientInstance)

  // Mutation: Cancelar inscrição
  const unsubscribeMutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      const existing = await getExistingSubscription()
      if (existing) {
        try {
          await fetch('/api/v1/push/unsubscribe', {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ endpoint: existing.endpoint })
          })
        } catch (_err) {
          // Continua desinscrevendo localmente mesmo se o backend falhar
        }
      }

      const success = await unsubscribeBrowserPush()
      refreshPermission()
      return success
    }
  }, clientInstance)

  // Mutation: Testar notificação
  const testMutation = useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string }> => {
      if (!accessToken) {
        return {
          success: true,
          message: 'Notificação de teste simulada com sucesso (Modo Demonstração)'
        }
      }
      const response = await fetch('/api/v1/push/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(errData.error || 'Falha ao disparar notificação de teste')
      }

      const data = (await response.json()) as { message?: string }
      return {
        success: true,
        message: data.message || 'Notificação de teste disparada com sucesso'
      }
    }
  }, clientInstance)

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    try {
      return await subscribeMutation.mutateAsync()
    } catch (_err) {
      return false
    }
  }, [subscribeMutation])

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    try {
      return await unsubscribeMutation.mutateAsync()
    } catch (_err) {
      return false
    }
  }, [unsubscribeMutation])

  const updatePreferences = useCallback(
    async (data: UpdateNotificationPreferencesInput): Promise<boolean> => {
      try {
        await updatePreferencesMutation.mutateAsync(data)
        return true
      } catch (_err) {
        return false
      }
    },
    [updatePreferencesMutation]
  )

  const sendTestNotification = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      return await testMutation.mutateAsync()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar notificação de teste'
      return { success: false, message }
    }
  }, [testMutation])

  return {
    preferences: preferencesQuery.data,
    isSupported,
    permission,
    isLoading: preferencesQuery.isLoading,
    isSubscribing: subscribeMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    isSendingTest: testMutation.isPending,
    hasActiveSubscription,
    subscribeToPush,
    unsubscribeFromPush,
    updatePreferences,
    sendTestNotification,
    refreshPermission
  }
}
