import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

export type SubscriptionFrequency = 'monthly' | 'yearly'

export interface SubscriptionPriceAlert {
  previousAverageAmount: number
  currentAmount: number
  increasePercentage: number
}

export interface SubscriptionDuplicateAlert {
  duplicateCount: number
  dates: string[]
}

export interface DetectedSubscription {
  id: string
  normalizedKey: string
  name: string
  frequency: SubscriptionFrequency
  averageAmount: number
  lastAmount: number
  monthlyCost: number
  annualCost: number
  occurrencesCount: number
  lastChargedAt: string
  nextEstimatedChargeAt: string
  latestTransactionId: string
  accountId: string
  categoryId: string | null
  isConfirmedRecurring: boolean
  priceAlert: SubscriptionPriceAlert | null
  duplicateAlert: SubscriptionDuplicateAlert | null
}

export interface SubscriptionsSummary {
  totalMonthlyCost: number
  totalAnnualCost: number
  activeCount: number
  alertsCount: number
}

export interface SubscriptionsResponse {
  subscriptions: DetectedSubscription[]
  summary: SubscriptionsSummary
  generatedAt: string
}

export interface ConfirmSubscriptionInput {
  transactionId: string
  frequency: SubscriptionFrequency
  recurrenceDay?: number
}

export interface UseSubscriptionsOptions {
  accountId?: string | null
  windowDays?: number
}

export const SUBSCRIPTIONS_QUERY_KEY = ['subscriptions'] as const

const getApiOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

const roundTwoDecimals = (value: number): number => Math.round(value * 100) / 100

const getDemoIsoDate = (daysOffset: number): string => {
  const now = new Date()
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysOffset, 12, 0, 0)
  )
  return target.toISOString()
}

export const getDemoSubscriptions = (): DetectedSubscription[] => [
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
    lastChargedAt: getDemoIsoDate(-26),
    nextEstimatedChargeAt: getDemoIsoDate(4),
    latestTransactionId: 'demo-sub-tx-netflix',
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
    occurrencesCount: 5,
    lastChargedAt: getDemoIsoDate(-22),
    nextEstimatedChargeAt: getDemoIsoDate(8),
    latestTransactionId: 'demo-sub-tx-spotify',
    accountId: 'acc-1',
    categoryId: null,
    isConfirmedRecurring: true,
    priceAlert: null,
    duplicateAlert: null
  },
  {
    id: 'icloud',
    normalizedKey: 'icloud',
    name: 'iCloud+ 200GB',
    frequency: 'monthly',
    averageAmount: 14.9,
    lastAmount: 14.9,
    monthlyCost: 14.9,
    annualCost: 178.8,
    occurrencesCount: 3,
    lastChargedAt: getDemoIsoDate(-18),
    nextEstimatedChargeAt: getDemoIsoDate(12),
    latestTransactionId: 'demo-sub-tx-icloud',
    accountId: 'acc-1',
    categoryId: null,
    isConfirmedRecurring: false,
    priceAlert: null,
    duplicateAlert: null
  },
  {
    id: 'academia-smartfit',
    normalizedKey: 'academia-smartfit',
    name: 'Smart Fit',
    frequency: 'monthly',
    averageAmount: 139.9,
    lastAmount: 139.9,
    monthlyCost: 139.9,
    annualCost: 1678.8,
    occurrencesCount: 6,
    lastChargedAt: getDemoIsoDate(-12),
    nextEstimatedChargeAt: getDemoIsoDate(18),
    latestTransactionId: 'demo-sub-tx-smartfit',
    accountId: 'acc-1',
    categoryId: null,
    isConfirmedRecurring: false,
    priceAlert: null,
    duplicateAlert: null
  }
]

const buildSummary = (subscriptions: DetectedSubscription[]): SubscriptionsSummary => ({
  totalMonthlyCost: roundTwoDecimals(
    subscriptions.reduce((acc, sub) => acc + sub.monthlyCost, 0)
  ),
  totalAnnualCost: roundTwoDecimals(
    subscriptions.reduce((acc, sub) => acc + sub.annualCost, 0)
  ),
  activeCount: subscriptions.length,
  alertsCount: subscriptions.reduce(
    (acc, sub) => acc + (sub.priceAlert ? 1 : 0) + (sub.duplicateAlert ? 1 : 0),
    0
  )
})

export const useSubscriptions = (options?: UseSubscriptionsOptions) => {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token
  const accountId = options?.accountId || null
  const windowDays = options?.windowDays ?? 180

  const [demoConfirmedIds, setDemoConfirmedIds] = useState<string[]>([])
  const [demoIgnoredKeys, setDemoIgnoredKeys] = useState<string[]>([])

  const demoSubscriptions = useMemo(() => {
    const base = getDemoSubscriptions()
    return base
      .filter((sub) => !accountId || sub.accountId === accountId)
      .filter((sub) => !demoIgnoredKeys.includes(sub.normalizedKey))
      .map((sub) =>
        demoConfirmedIds.includes(sub.latestTransactionId)
          ? { ...sub, isConfirmedRecurring: true }
          : sub
      )
  }, [accountId, demoConfirmedIds, demoIgnoredKeys])

  const demoSummary = useMemo(() => buildSummary(demoSubscriptions), [demoSubscriptions])

  const query = useQuery({
    queryKey: [...SUBSCRIPTIONS_QUERY_KEY, accountId ?? 'all', windowDays],
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<SubscriptionsResponse> => {
      const origin = getApiOrigin()
      const params = new URLSearchParams()
      if (accountId) params.set('accountId', accountId)
      if (windowDays) params.set('windowDays', String(windowDays))
      const qs = params.toString()
      const url = `${origin}/api/v1/insights/subscriptions${qs ? `?${qs}` : ''}`

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Falha ao carregar assinaturas e recorrências')
      }

      return res.json() as Promise<SubscriptionsResponse>
    }
  })

  const confirmMutation = useMutation({
    mutationFn: async (input: ConfirmSubscriptionInput) => {
      if (!token) {
        setDemoConfirmedIds((prev) =>
          prev.includes(input.transactionId) ? prev : [...prev, input.transactionId]
        )
        return {
          success: true,
          transaction: {
            id: input.transactionId,
            isRecurring: true,
            recurrencePeriod: input.frequency,
            recurrenceDay: input.recurrenceDay ?? 1
          }
        }
      }

      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/insights/subscriptions/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errData.error || 'Erro ao confirmar assinatura')
      }

      return res.json()
    },
    onSuccess: () => {
      if (token) {
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['forecast'] })
      }
      toast.success('Assinatura confirmada como recorrência oficial!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao confirmar assinatura')
    }
  })

  const ignoreMutation = useMutation({
    mutationFn: async (normalizedKey: string) => {
      if (!token) {
        setDemoIgnoredKeys((prev) =>
          prev.includes(normalizedKey) ? prev : [...prev, normalizedKey]
        )
        return { success: true, normalizedKey }
      }

      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/insights/subscriptions/ignore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ normalizedKey })
      })

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errData.error || 'Erro ao ignorar assinatura')
      }

      return res.json()
    },
    onSuccess: () => {
      if (token) {
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY })
      }
      toast.success('Assinatura ocultada da lista.')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao ignorar assinatura')
    }
  })

  const confirmSubscription = useCallback(
    async (input: ConfirmSubscriptionInput) => confirmMutation.mutateAsync(input),
    [confirmMutation]
  )

  const ignoreSubscription = useCallback(
    async (normalizedKey: string) => ignoreMutation.mutateAsync(normalizedKey),
    [ignoreMutation]
  )

  const subscriptions = token ? (query.data?.subscriptions ?? []) : demoSubscriptions
  const summary = token ? (query.data?.summary ?? buildSummary([])) : demoSummary

  return {
    subscriptions,
    summary,
    generatedAt: token ? (query.data?.generatedAt ?? null) : null,
    isLoading: token ? query.isLoading : false,
    isError: token ? query.isError : false,
    error: token ? query.error : null,
    refetch: query.refetch,
    confirmSubscription,
    ignoreSubscription,
    isConfirming: confirmMutation.isPending,
    isIgnoring: ignoreMutation.isPending,
    confirmingId: confirmMutation.isPending ? (confirmMutation.variables?.transactionId ?? null) : null,
    ignoringKey: ignoreMutation.isPending ? (ignoreMutation.variables ?? null) : null
  }
}
