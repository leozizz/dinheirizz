import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { getApiOrigin } from '../lib/profileQuery'
import type { WorkspaceFormData, WorkspaceType } from '../schemas/goals'

export interface FinancialProfile {
  id: string
  userId: string
  name: string
  type: WorkspaceType
  currency: string
  isDefault: boolean
  createdAt: string
}

export interface WorkspacesResponse {
  profiles: FinancialProfile[]
  activeDefaultId: string | null
}

export const WORKSPACES_QUERY_KEY = ['workspaces'] as const
export const SELECTED_PROFILE_STORAGE_KEY = 'dinheirizz:selected-profile'

export const DEMO_PROFILES: FinancialProfile[] = [
  {
    id: 'demo-profile-personal',
    userId: 'demo-user',
    name: 'Pessoal',
    type: 'personal',
    currency: 'BRL',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'demo-profile-business',
    userId: 'demo-user',
    name: 'Empresa / PJ',
    type: 'business',
    currency: 'BRL',
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
]

const readStoredProfileId = (): string => {
  if (typeof window === 'undefined') {
    return 'all'
  }
  try {
    const stored = window.localStorage.getItem(SELECTED_PROFILE_STORAGE_KEY)
    return stored && stored.trim() ? stored : 'all'
  } catch {
    return 'all'
  }
}

export const useWorkspaces = () => {
  const { session } = useAuth()
  const token = session?.access_token
  const queryClient = useQueryClient()

  const [demoProfiles, setDemoProfiles] = useState<FinancialProfile[]>(DEMO_PROFILES)
  const [selectedProfileId, setSelectedProfileIdState] = useState<string>(readStoredProfileId)

  const query = useQuery({
    queryKey: WORKSPACES_QUERY_KEY,
    enabled: Boolean(token),
    queryFn: async (): Promise<WorkspacesResponse> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/workspaces`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!res.ok) {
        throw new Error('Falha ao carregar perfis financeiros')
      }
      return res.json() as Promise<WorkspacesResponse>
    }
  })

  const profiles = token ? (query.data?.profiles ?? []) : demoProfiles

  // Garante que um profileId obsoleto no localStorage não trave os filtros
  useEffect(() => {
    if (selectedProfileId === 'all' || profiles.length === 0) {
      return
    }
    const exists = profiles.some((p) => p.id === selectedProfileId)
    if (!exists) {
      setSelectedProfileIdState('all')
      try {
        window.localStorage.setItem(SELECTED_PROFILE_STORAGE_KEY, 'all')
      } catch {
        // Ignora falha de storage em ambientes restritos
      }
    }
  }, [profiles, selectedProfileId])

  const setSelectedProfileId = useCallback((nextId: string): void => {
    const normalized = nextId && nextId.trim() ? nextId : 'all'
    setSelectedProfileIdState(normalized)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SELECTED_PROFILE_STORAGE_KEY, normalized)
      } catch {
        // Ignora falha de storage em ambientes restritos
      }
    }
  }, [])

  const createWorkspaceMutation = useMutation({
    mutationFn: async (input: WorkspaceFormData): Promise<FinancialProfile> => {
      if (!token) {
        const created: FinancialProfile = {
          id: `demo-profile-${Date.now()}`,
          userId: 'demo-user',
          name: input.name.trim(),
          type: input.type,
          currency: input.currency || 'BRL',
          isDefault: Boolean(input.isDefault),
          createdAt: new Date().toISOString()
        }
        setDemoProfiles((prev) => {
          const base = created.isDefault
            ? prev.map((p) => ({ ...p, isDefault: false }))
            : prev
          return [...base, created]
        })
        return created
      }

      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || 'Erro ao criar perfil financeiro')
      }

      const json = (await res.json()) as { profile: FinancialProfile }
      return json.profile
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY })
      toast.success(`Perfil "${created.name}" criado com sucesso!`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Não foi possível criar o perfil financeiro')
    }
  })

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (workspaceId: string): Promise<void> => {
      if (!token) {
        const target = demoProfiles.find((p) => p.id === workspaceId)
        if (!target || target.isDefault || demoProfiles.length <= 1) {
          throw new Error('Não é possível excluir o perfil padrão ou único perfil')
        }
        setDemoProfiles((prev) => prev.filter((p) => p.id !== workspaceId))
        return
      }

      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || 'Erro ao excluir perfil financeiro')
      }
    },
    onSuccess: (_data, workspaceId) => {
      if (selectedProfileId === workspaceId) {
        setSelectedProfileId('all')
      }
      queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY })
      toast.success('Perfil removido com sucesso!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Não foi possível excluir o perfil')
    }
  })

  const activeProfile =
    selectedProfileId === 'all'
      ? null
      : (profiles.find((p) => p.id === selectedProfileId) ?? null)

  return {
    profiles,
    activeProfile,
    selectedProfileId,
    setSelectedProfileId,
    isLoading: token ? query.isLoading : false,
    isError: token ? query.isError : false,
    createWorkspace: createWorkspaceMutation.mutateAsync,
    isCreatingWorkspace: createWorkspaceMutation.isPending,
    deleteWorkspace: deleteWorkspaceMutation.mutateAsync,
    isDeletingWorkspace: deleteWorkspaceMutation.isPending,
    refetch: query.refetch
  }
}
