import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { appendProfileIdParam, getApiOrigin, normalizeProfileId } from '../lib/profileQuery'
import type {
  ConnectTokenRequestInput,
  ConnectTokenResponse,
  CreateConnectionInput,
  CreateConnectionResponse,
  OpenFinanceConnection,
  OpenFinanceHookReturn,
  RevokeConnectionResponse,
  SyncConnectionResponse
} from '../types/openFinance'

export const OPEN_FINANCE_CONNECTIONS_KEY = ['open-finance-connections'] as const

const extractErrorMessage = async (res: Response, fallback: string): Promise<string> => {
  try {
    const data = (await res.json()) as { message?: string; error?: string }
    return data.message || data.error || fallback
  } catch {
    return fallback
  }
}

export const useOpenFinance = (profileId?: string | null): OpenFinanceHookReturn => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const normalizedProfileId = normalizeProfileId(profileId)

  const invalidateFinancialCaches = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: OPEN_FINANCE_CONNECTIONS_KEY }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
    ])
  }

  const connectionsQuery = useQuery({
    queryKey: [...OPEN_FINANCE_CONNECTIONS_KEY, normalizedProfileId || 'all'],
    enabled: Boolean(token),
    queryFn: async (): Promise<{ data: OpenFinanceConnection[]; total: number }> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const params = new URLSearchParams()
      appendProfileIdParam(params, normalizedProfileId)
      const qs = params.toString()
      const url = qs
        ? `${origin}/api/v1/open-finance/connections?${qs}`
        : `${origin}/api/v1/open-finance/connections`

      const res = await fetch(url, { headers })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Falha ao carregar conexões Open Finance')
        throw new Error(message)
      }

      const json = (await res.json()) as { data?: OpenFinanceConnection[]; total?: number }
      const list = Array.isArray(json.data) ? json.data : []
      return {
        data: list,
        total: typeof json.total === 'number' ? json.total : list.length
      }
    }
  })

  const createConnectTokenMutation = useMutation({
    mutationFn: async (input: ConnectTokenRequestInput = {}): Promise<ConnectTokenResponse> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/open-finance/connect-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: input.provider ?? 'pluggy',
          itemId: input.itemId,
          profileId: input.profileId ?? normalizedProfileId
        })
      })

      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Não foi possível iniciar a conexão bancária')
        throw new Error(message)
      }

      return (await res.json()) as ConnectTokenResponse
    }
  })

  const createConnectionMutation = useMutation({
    mutationFn: async (input: CreateConnectionInput): Promise<CreateConnectionResponse> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/open-finance/connections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...input,
          profileId: input.profileId ?? normalizedProfileId
        })
      })

      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Falha ao registrar conexão bancária')
        throw new Error(message)
      }

      return (await res.json()) as CreateConnectionResponse
    },
    onSuccess: async () => {
      await invalidateFinancialCaches()
    }
  })

  const syncConnectionMutation = useMutation({
    mutationFn: async (connectionId: string): Promise<SyncConnectionResponse> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/open-finance/connections/${connectionId}/sync`, {
        method: 'POST',
        headers
      })

      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Falha ao sincronizar conexão bancária')
        throw new Error(message)
      }

      return (await res.json()) as SyncConnectionResponse
    },
    onSuccess: async () => {
      await invalidateFinancialCaches()
    }
  })

  const revokeConnectionMutation = useMutation({
    mutationFn: async (connectionId: string): Promise<RevokeConnectionResponse> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/open-finance/connections/${connectionId}`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Falha ao revogar consentimento bancário')
        throw new Error(message)
      }

      return (await res.json()) as RevokeConnectionResponse
    },
    onSuccess: async () => {
      await invalidateFinancialCaches()
    }
  })

  return {
    connections: connectionsQuery.data?.data ?? [],
    total: connectionsQuery.data?.total ?? 0,
    isLoading: connectionsQuery.isLoading,
    isError: connectionsQuery.isError,
    error: connectionsQuery.error instanceof Error ? connectionsQuery.error : null,
    refetch: connectionsQuery.refetch,
    createConnectToken: (input: ConnectTokenRequestInput = {}) =>
      createConnectTokenMutation.mutateAsync(input),
    isCreatingToken: createConnectTokenMutation.isPending,
    createConnection: createConnectionMutation.mutateAsync,
    isCreatingConnection: createConnectionMutation.isPending,
    syncConnection: syncConnectionMutation.mutateAsync,
    isSyncing: syncConnectionMutation.isPending,
    revokeConnection: revokeConnectionMutation.mutateAsync,
    isRevoking: revokeConnectionMutation.isPending
  }
}
