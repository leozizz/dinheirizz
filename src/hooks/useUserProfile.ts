import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'

export interface UserProfile {
  id: string
  email: string
  fullName: string | null
  username: string | null
  avatarUrl: string | null
  provider: string
  providers: string[]
  createdAt?: string | Date
  updatedAt?: string | Date | null
}

export interface UpdateProfileInput {
  fullName?: string
  username?: string
  avatarUrl?: string
}

export const USER_PROFILE_QUERY_KEY = ['user-profile'] as const

function getApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export function useUserProfile() {
  const { session, user: authUser } = useAuth()
  const token = session?.access_token

  const query = useQuery({
    queryKey: USER_PROFILE_QUERY_KEY,
    enabled: Boolean(token),
    queryFn: async (): Promise<UserProfile> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/users/me`, { headers })
      if (!res.ok) {
        throw new Error('Falha ao carregar perfil do usuário')
      }

      const data = await res.json()
      return data.user
    },
    initialData: authUser
      ? {
          id: authUser.id,
          email: authUser.email,
          fullName: authUser.fullName ?? authUser.user_metadata?.full_name ?? null,
          username: authUser.username ?? authUser.user_metadata?.username ?? null,
          avatarUrl: authUser.avatarUrl ?? null,
          provider: authUser.provider ?? 'email',
          providers: authUser.providers ?? ['email']
        }
      : undefined
  })

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  }
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { session, updateUser } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (input: UpdateProfileInput): Promise<UserProfile> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/users/me`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(input)
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar dados do perfil')
      }

      return data.user
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(USER_PROFILE_QUERY_KEY, updatedUser)
      updateUser({
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        avatarUrl: updatedUser.avatarUrl
      })
    }
  })
}
