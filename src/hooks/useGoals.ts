import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { appendProfileIdParam, getApiOrigin, normalizeProfileId } from '../lib/profileQuery'
import type { GoalFormData } from '../schemas/goals'

export interface SavingsGoalItem {
  id: string
  userId: string
  profileId: string | null
  name: string
  targetAmount: number
  currentAmount: number
  remainingAmount: number
  progressPercentage: number
  deadline: string | null
  monthsRemaining: number | null
  monthlyRequiredAmount: number | null
  isCompleted: boolean
  icon: string | null
  color: string | null
  createdAt: string
}

export interface GoalsSummary {
  totalSaved: number
  totalTarget: number
  activeCount: number
  completedCount: number
}

export interface GoalsResponse {
  goals: SavingsGoalItem[]
  summary: GoalsSummary
}

export const GOALS_QUERY_KEY = ['goals'] as const

const round1 = (value: number): number => Math.round(value * 10) / 10
const round2 = (value: number): number => Math.round(value * 100) / 100

export const calculateGoalMetricsClient = (input: {
  targetAmount: number
  currentAmount: number
  deadline?: string | null
  referenceDate?: Date
}): {
  remainingAmount: number
  progressPercentage: number
  isCompleted: boolean
  monthsRemaining: number | null
  monthlyRequiredAmount: number | null
} => {
  const target = Math.max(0, Number(input.targetAmount) || 0)
  const current = Math.max(0, Number(input.currentAmount) || 0)
  const remainingAmount = Math.max(0, round2(target - current))
  const progressPercentage = target > 0 ? Math.min(100, round1((current / target) * 100)) : 0
  const isCompleted = target > 0 && current >= target

  let monthsRemaining: number | null = null
  let monthlyRequiredAmount: number | null = isCompleted ? 0 : null

  if (!isCompleted && remainingAmount > 0 && input.deadline) {
    const deadlineDate = new Date(input.deadline)
    if (!isNaN(deadlineDate.getTime())) {
      const ref = input.referenceDate ?? new Date()
      const diffMs = deadlineDate.getTime() - ref.getTime()
      const rawMonths = diffMs / (1000 * 60 * 60 * 24 * 30.4375)
      monthsRemaining = diffMs <= 0 ? 1 : Math.max(1, Math.ceil(rawMonths))
      monthlyRequiredAmount = round2(remainingAmount / monthsRemaining)
    }
  }

  return {
    remainingAmount,
    progressPercentage,
    isCompleted,
    monthsRemaining,
    monthlyRequiredAmount
  }
}

const buildFutureIsoDate = (monthsAhead: number): string => {
  const now = new Date()
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAhead, 15))
  return target.toISOString()
}

const buildDemoGoal = (
  base: Omit<
    SavingsGoalItem,
    'remainingAmount' | 'progressPercentage' | 'monthsRemaining' | 'monthlyRequiredAmount' | 'isCompleted'
  >
): SavingsGoalItem => ({
  ...base,
  ...calculateGoalMetricsClient({
    targetAmount: base.targetAmount,
    currentAmount: base.currentAmount,
    deadline: base.deadline
  })
})

const createInitialDemoGoals = (): SavingsGoalItem[] => [
  buildDemoGoal({
    id: 'demo-goal-emergency',
    userId: 'demo-user',
    profileId: 'demo-profile-personal',
    name: 'Reserva de Emergência',
    targetAmount: 15000,
    currentAmount: 9000,
    deadline: buildFutureIsoDate(6),
    icon: 'shield-check',
    color: '#7bc816',
    createdAt: '2026-01-10T10:00:00.000Z'
  }),
  buildDemoGoal({
    id: 'demo-goal-macbook',
    userId: 'demo-user',
    profileId: 'demo-profile-business',
    name: 'MacBook Pro PJ',
    targetAmount: 12000,
    currentAmount: 4800,
    deadline: buildFutureIsoDate(4),
    icon: 'laptop',
    color: '#3b82f6',
    createdAt: '2026-02-01T10:00:00.000Z'
  }),
  buildDemoGoal({
    id: 'demo-goal-vacation',
    userId: 'demo-user',
    profileId: 'demo-profile-personal',
    name: 'Viagem Férias',
    targetAmount: 6000,
    currentAmount: 2400,
    deadline: buildFutureIsoDate(3),
    icon: 'plane',
    color: '#10b981',
    createdAt: '2026-03-05T10:00:00.000Z'
  })
]

const computeSummary = (items: SavingsGoalItem[]): GoalsSummary => {
  const totalSaved = round2(items.reduce((sum, g) => sum + g.currentAmount, 0))
  const totalTarget = round2(items.reduce((sum, g) => sum + g.targetAmount, 0))
  const completedCount = items.filter((g) => g.isCompleted).length
  return {
    totalSaved,
    totalTarget,
    activeCount: items.length - completedCount,
    completedCount
  }
}

export const useGoals = (profileId?: string | null) => {
  const { session } = useAuth()
  const token = session?.access_token
  const queryClient = useQueryClient()
  const normalizedProfileId = normalizeProfileId(profileId)

  const [demoGoals, setDemoGoals] = useState<SavingsGoalItem[]>(createInitialDemoGoals)

  const query = useQuery({
    queryKey: [...GOALS_QUERY_KEY, normalizedProfileId || 'all'],
    enabled: Boolean(token),
    queryFn: async (): Promise<GoalsResponse> => {
      const origin = getApiOrigin()
      const params = new URLSearchParams()
      appendProfileIdParam(params, normalizedProfileId)
      const qs = params.toString()
      const url = qs ? `${origin}/api/v1/goals?${qs}` : `${origin}/api/v1/goals`

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Falha ao carregar metas de economia')
      }

      return res.json() as Promise<GoalsResponse>
    }
  })

  const filteredDemoGoals = useMemo(() => {
    if (!normalizedProfileId) {
      return demoGoals
    }
    return demoGoals.filter((g) => g.profileId === normalizedProfileId)
  }, [demoGoals, normalizedProfileId])

  const demoSummary = useMemo(() => computeSummary(filteredDemoGoals), [filteredDemoGoals])

  const goals = token ? (query.data?.goals ?? []) : filteredDemoGoals
  const summary: GoalsSummary = token
    ? (query.data?.summary ?? { totalSaved: 0, totalTarget: 0, activeCount: 0, completedCount: 0 })
    : demoSummary

  const createGoalMutation = useMutation({
    mutationFn: async (input: GoalFormData): Promise<SavingsGoalItem> => {
      const payload = {
        ...input,
        deadline: input.deadline ? new Date(input.deadline).toISOString() : null,
        profileId: input.profileId ?? normalizedProfileId ?? null
      }

      if (!token) {
        const created = buildDemoGoal({
          id: `demo-goal-${Date.now()}`,
          userId: 'demo-user',
          profileId: payload.profileId || 'demo-profile-personal',
          name: payload.name.trim(),
          targetAmount: payload.targetAmount,
          currentAmount: payload.currentAmount ?? 0,
          deadline: payload.deadline,
          icon: payload.icon || 'piggy-bank',
          color: payload.color || '#7bc816',
          createdAt: new Date().toISOString()
        })
        setDemoGoals((prev) => [...prev, created])
        return created
      }

      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || 'Erro ao criar meta')
      }

      const json = (await res.json()) as { goal: SavingsGoalItem }
      return json.goal
    },
    onSuccess: (goal) => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY })
      toast.success(`Meta "${goal.name}" criada!`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Falha ao criar meta')
    }
  })

  const updateGoalMutation = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string
      data: Partial<GoalFormData>
    }): Promise<SavingsGoalItem> => {
      const payload = {
        ...data,
        deadline:
          data.deadline === undefined
            ? undefined
            : data.deadline
              ? new Date(data.deadline).toISOString()
              : null
      }

      if (!token) {
        const existing = demoGoals.find((g) => g.id === id)
        if (!existing) {
          throw new Error('Meta não encontrada')
        }
        const updatedItem = buildDemoGoal({
          ...existing,
          name: payload.name ?? existing.name,
          targetAmount: payload.targetAmount ?? existing.targetAmount,
          currentAmount: payload.currentAmount ?? existing.currentAmount,
          deadline: payload.deadline !== undefined ? payload.deadline : existing.deadline,
          profileId: payload.profileId !== undefined ? payload.profileId : existing.profileId,
          icon: payload.icon ?? existing.icon,
          color: payload.color ?? existing.color
        })
        setDemoGoals((prev) => prev.map((g) => (g.id === id ? updatedItem : g)))
        return updatedItem
      }

      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/goals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || 'Erro ao atualizar meta')
      }

      const json = (await res.json()) as { goal: SavingsGoalItem }
      return json.goal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY })
      toast.success('Meta atualizada!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Falha ao atualizar meta')
    }
  })

  const contributeGoalMutation = useMutation({
    mutationFn: async ({
      id,
      amount
    }: {
      id: string
      amount: number
    }): Promise<SavingsGoalItem> => {
      if (!token) {
        const existing = demoGoals.find((g) => g.id === id)
        if (!existing) {
          throw new Error('Meta não encontrada')
        }
        const updatedItem = buildDemoGoal({
          ...existing,
          currentAmount: round2(existing.currentAmount + amount)
        })
        setDemoGoals((prev) => prev.map((g) => (g.id === id ? updatedItem : g)))
        return updatedItem
      }

      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/goals/${id}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || 'Erro ao realizar aporte')
      }

      const json = (await res.json()) as { goal: SavingsGoalItem }
      return json.goal
    },
    onSuccess: (goal) => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY })
      toast.success(
        goal.isCompleted
          ? `Parabéns! Meta "${goal.name}" atingida!`
          : `Aporte registrado em "${goal.name}"!`
      )
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Não foi possível registrar o aporte')
    }
  })

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!token) {
        setDemoGoals((prev) => prev.filter((g) => g.id !== id))
        return
      }

      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/goals/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || 'Erro ao excluir meta')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY })
      toast.success('Meta excluída!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Falha ao excluir meta')
    }
  })

  return {
    goals,
    summary,
    isLoading: token ? query.isLoading : false,
    isError: token ? query.isError : false,
    createGoal: createGoalMutation.mutateAsync,
    isCreatingGoal: createGoalMutation.isPending,
    updateGoal: updateGoalMutation.mutateAsync,
    isUpdatingGoal: updateGoalMutation.isPending,
    contributeGoal: contributeGoalMutation.mutateAsync,
    isContributing: contributeGoalMutation.isPending,
    deleteGoal: deleteGoalMutation.mutateAsync,
    isDeletingGoal: deleteGoalMutation.isPending,
    refetch: query.refetch
  }
}
