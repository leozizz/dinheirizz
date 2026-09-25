import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

export interface UserRoleData {
  role: 'free' | 'pro' | 'admin'
  proType: 'subscriber' | 'invited' | null
  proExpiresAt: string | null
  canUseSystemAi: boolean
}

export interface UserAiSettingsData {
  provider: string
  customModel: string | null
  isActive?: boolean
  hasKey: boolean
  maskedKey: string | null
  lastTestedAt: string | null
  role: 'free' | 'pro' | 'admin'
  userRole?: UserRoleData
}

export interface AdminUserData {
  id: string
  email: string
  fullName: string | null
  role: 'free' | 'pro' | 'admin'
  proType: 'subscriber' | 'invited' | null
  proExpiresAt: string | null
  createdAt: string
}

export interface UpdateUserAiSettingsInput {
  apiKey?: string
  provider?: string
  customModel?: string
  isActive?: boolean
}

export const USER_AI_QUERY_KEY = ['user-ai-settings'] as const
export const ADMIN_USERS_QUERY_KEY = ['admin-users'] as const

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
      const role = json.userRole?.role || json.settings?.role || 'free'
      return {
        ...json.settings,
        role,
        userRole: json.userRole
      }
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
      const role = json.userRole?.role || json.settings?.role || 'free'
      return {
        ...json.settings,
        role,
        userRole: json.userRole
      }
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

export function useAdminUsers(enabled: boolean = true) {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    enabled: Boolean(token && enabled),
    queryFn: async (): Promise<AdminUserData[]> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Falha ao listar usuários para administração')
      }

      const json = await res.json()
      return json.users || []
    }
  })
}

export function useSendAdminInvite() {
  const { session } = useAuth()
  const token = session?.access_token
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      targetUserId,
      email,
      action = 'grant',
      expiresAt
    }: {
      targetUserId?: string
      email?: string
      action?: 'grant' | 'revoke'
      expiresAt?: string | null
    }): Promise<{ message: string; user: AdminUserData }> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/admin/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId, email, action, expiresAt })
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Falha ao gerenciar convite')
      }

      return json
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: USER_AI_QUERY_KEY })
      toast.success(data.message || 'Operação realizada com sucesso!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao processar convite')
    }
  })
}
