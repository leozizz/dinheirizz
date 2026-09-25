import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

export interface UserAiSettingsData {
  provider: string
  customModel: string
  isActive: boolean
  hasKey: boolean
  maskedKey: string | null
  lastTestedAt: string | null
  role: 'free' | 'pro' | 'admin'
}

export interface UpdateUserAiSettingsInput {
  apiKey?: string
  provider?: string
  customModel?: string
  isActive?: boolean
}

export const USER_AI_QUERY_KEY = ['user-ai-settings'] as const

function getApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export function useUserAiSettings() {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: USER_AI_QUERY_KEY,
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 5, // 5 minutos
    queryFn: async (): Promise<UserAiSettingsData> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/user-ai/settings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Falha ao obter configurações de IA')
      }

      const json = await res.json()
      return json.settings
    }
  })
}

export function useUpdateUserAiSettings() {
  const { session } = useAuth()
  const token = session?.access_token
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateUserAiSettingsInput): Promise<UserAiSettingsData> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/user-ai/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson.error || 'Falha ao salvar configurações de IA')
      }

      const json = await res.json()
      return json.settings
    },
    onSuccess: (data) => {
      queryClient.setQueryData(USER_AI_QUERY_KEY, data)
      queryClient.invalidateQueries({ queryKey: USER_AI_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] })
      toast.success('Configurações de IA salvas com sucesso!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar configurações de IA')
    }
  })
}

export function useTestUserAiKey() {
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async ({ apiKey, provider }: { apiKey: string; provider?: string }): Promise<{ success: boolean; message: string; modelName: string }> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/user-ai/test-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ apiKey, provider })
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json.error || 'Chave de API inválida ou sem conectividade')
      }

      return json
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Chave de API validada com sucesso!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao validar chave de API')
    }
  })
}

export function useDeleteUserAiSettings() {
  const { session } = useAuth()
  const token = session?.access_token
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/user-ai/settings`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Falha ao remover chave de API')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_AI_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] })
      toast.success('Chave de API removida com sucesso.')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao remover chave')
    }
  })
}
