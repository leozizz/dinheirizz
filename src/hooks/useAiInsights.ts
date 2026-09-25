import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

export interface AiInsightMetrics {
  totalIncome: number
  totalExpense: number
  netBalance: number
  savingsRate: number
  topCategory: string | null
}

export interface AiInsightData {
  id: string
  period: string
  summary: string
  financialHealthScore: number
  highlights: string[]
  alerts: string[]
  recommendations: string[]
  metrics?: AiInsightMetrics
  isFallback: boolean
  createdAt: string
}

export const INSIGHTS_QUERY_KEY = ['ai-insights'] as const

function getApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export function useAiInsights(period?: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  const query = useQuery({
    queryKey: [...INSIGHTS_QUERY_KEY, period || 'current'],
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 15, // 15 minutos de cache
    queryFn: async (): Promise<AiInsightData | null> => {
      const origin = getApiOrigin()
      const url = period
        ? `${origin}/api/v1/insights?period=${encodeURIComponent(period)}`
        : `${origin}/api/v1/insights`

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Falha ao carregar análise do Consultor IA')
      }

      const json = await res.json()
      return json.insight || null
    }
  })

  const generateMutation = useMutation({
    mutationFn: async (targetPeriod?: string): Promise<AiInsightData> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/insights/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(targetPeriod ? { period: targetPeriod } : {})
      })

      if (!res.ok) {
        throw new Error('Erro ao gerar análise do Consultor IA')
      }

      const json = await res.json()
      return json.insight
    },
    onSuccess: (data) => {
      queryClient.setQueryData([...INSIGHTS_QUERY_KEY, period || 'current'], data)
      queryClient.invalidateQueries({ queryKey: INSIGHTS_QUERY_KEY })
      toast.success('Diagnóstico do Consultor Dinheirizz atualizado!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar análise financeira')
    }
  })

  return {
    insight: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isGenerating: generateMutation.isPending,
    generateInsights: generateMutation.mutateAsync
  }
}
