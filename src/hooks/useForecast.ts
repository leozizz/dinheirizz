import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'

export interface DailyCashFlowPoint {
  date: string
  balance: number
  scheduledIncome: number
  scheduledExpense: number
  variableBurn: number
}

export interface ForecastResponse {
  startingBalance: number
  projectedEndBalance: number
  netChange: number
  dailyBurnRate: number
  healthStatus: 'safe' | 'warning' | 'danger'
  healthMessage: string
  lowestPoint: {
    date: string
    balance: number
  }
  timeline: DailyCashFlowPoint[]
}

export interface UseForecastOptions {
  days?: 30 | 60
  accountId?: string | null
}

function getApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export function getDemoForecast(days: 30 | 60 = 30): ForecastResponse {
  const startingBalance = 8450.0
  const dailyBurnRate = 65.0
  const timeline: DailyCashFlowPoint[] = []
  let currentBalance = startingBalance
  let lowestBalance = startingBalance
  let lowestDate = ''

  const now = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i))
    const dateStr = d.toISOString().split('T')[0]
    if (i === 0) lowestDate = dateStr

    let scheduledIncome = 0
    let scheduledExpense = 0

    if (i === 5) scheduledIncome = 5000
    if (i === 10) scheduledExpense = 1800
    if (i === 20) scheduledExpense = 1200
    if (days === 60 && i === 35) scheduledIncome = 5000
    if (days === 60 && i === 40) scheduledExpense = 1800
    if (days === 60 && i === 50) scheduledExpense = 1200

    currentBalance =
      Math.round((currentBalance + scheduledIncome - scheduledExpense - dailyBurnRate) * 100) / 100

    timeline.push({
      date: dateStr,
      balance: currentBalance,
      scheduledIncome,
      scheduledExpense,
      variableBurn: dailyBurnRate
    })

    if (currentBalance < lowestBalance) {
      lowestBalance = currentBalance
      lowestDate = dateStr
    }
  }

  const projectedEndBalance = timeline[days - 1]?.balance ?? startingBalance
  const netChange = Math.round((projectedEndBalance - startingBalance) * 100) / 100

  return {
    startingBalance,
    projectedEndBalance,
    netChange,
    dailyBurnRate,
    healthStatus: 'safe',
    healthMessage: 'Saldo projetado estável com margem confortável de liquidez.',
    lowestPoint: {
      date: lowestDate,
      balance: lowestBalance
    },
    timeline
  }
}

export function useForecast(options?: UseForecastOptions) {
  let hasQueryClient = true
  try {
    useQueryClient()
  } catch {
    hasQueryClient = false
  }

  let session = null
  try {
    const auth = useAuth()
    session = auth?.session
  } catch {
    session = null
  }

  const days = options?.days === 60 ? 60 : 30
  const accountId = options?.accountId || null

  if (!hasQueryClient) {
    const demo = getDemoForecast(days)
    return {
      data: demo,
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      status: 'success'
    } as any
  }

  const token = session?.access_token

  return useQuery<ForecastResponse>({
    queryKey: ['forecast', { days, accountId, token: Boolean(token) }],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ForecastResponse> => {
      if (!token) {
        return getDemoForecast(days)
      }

      const origin = getApiOrigin()
      const params = new URLSearchParams()
      params.set('days', String(days))
      if (accountId) {
        params.set('accountId', accountId)
      }

      const res = await fetch(`${origin}/api/v1/forecast?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        return getDemoForecast(days)
      }

      return res.json()
    }
  })
}
