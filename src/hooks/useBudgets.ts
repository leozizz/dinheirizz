import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { appendProfileIdParam, getApiOrigin, normalizeProfileId } from '../lib/profileQuery'

export interface BudgetProgressItem {
  id: string
  categoryId: string
  categoryName: string
  categoryColor: string | null
  categoryIcon: string | null
  amountLimit: number
  spentAmount: number
  remainingAmount: number
  percentageUsed: number
  isOverBudget: boolean
  status: 'normal' | 'warning' | 'exceeded'
}

export interface BudgetSummaryResponse {
  period: string
  totalBudgetLimit: number
  totalSpent: number
  totalRemaining: number
  overallPercentageUsed: number
  budgets: BudgetProgressItem[]
}

export interface CreateBudgetInput {
  categoryId: string
  amountLimit: number
  period?: string
  profileId?: string | null
}

export interface UpdateBudgetInput {
  id: string
  amountLimit: number
}

export const BUDGETS_QUERY_KEY = ['budgets'] as const

export const useBudgets = (period?: string, profileId?: string | null) => {
  const { session } = useAuth()
  const token = session?.access_token
  const normalizedProfileId = normalizeProfileId(profileId)

  const query = useQuery({
    queryKey: ['budgets', period || 'current', normalizedProfileId || 'all'],
    enabled: Boolean(token),
    queryFn: async (): Promise<BudgetSummaryResponse> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const params = new URLSearchParams()
      if (period) {
        params.set('period', period)
      }
      appendProfileIdParam(params, normalizedProfileId)
      const qs = params.toString()
      const url = qs ? `${origin}/api/v1/budgets?${qs}` : `${origin}/api/v1/budgets`

      const res = await fetch(url, { headers })
      if (!res.ok) {
        throw new Error('Falha ao carregar orçamentos')
      }
      return res.json()
    }
  })

  return {
    summary: query.data || null,
    budgets: query.data?.budgets || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  }
}

export const useCreateBudget = () => {
  const { session } = useAuth()
  const token = session?.access_token
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`${origin}/api/v1/budgets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao salvar orçamento')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY })
    }
  })
}

export const useUpdateBudget = () => {
  const { session } = useAuth()
  const token = session?.access_token
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, amountLimit }: UpdateBudgetInput) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`${origin}/api/v1/budgets/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ amountLimit })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao atualizar orçamento')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY })
    }
  })
}

export const useDeleteBudget = () => {
  const { session } = useAuth()
  const token = session?.access_token
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`${origin}/api/v1/budgets/${id}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao remover orçamento')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY })
    }
  })
}
