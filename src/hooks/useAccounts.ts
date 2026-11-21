import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { appendProfileIdParam, getApiOrigin, normalizeProfileId } from '../lib/profileQuery'

export interface AccountItem {
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment' | 'cash' | 'credit'
  balance: number
  bank?: string
  color?: string
  profileId?: string | null
  created_at?: string
}

export interface CreateAccountInput {
  name: string
  type?: 'checking' | 'savings' | 'investment' | 'cash' | 'credit'
  balance?: number
  bank?: string
  color?: string
  profileId?: string | null
}

interface RawAccountItem {
  id: string
  name: string
  type?: 'checking' | 'savings' | 'investment' | 'cash' | 'credit'
  balance?: string | number
  createdAt?: string
  created_at?: string
}

export const ACCOUNTS_QUERY_KEY = ['accounts'] as const

export const useAccounts = (profileId?: string | null) => {
  const { session } = useAuth()
  const token = session?.access_token
  const normalizedProfileId = normalizeProfileId(profileId)

  const query = useQuery({
    queryKey: [...ACCOUNTS_QUERY_KEY, normalizedProfileId || 'all'],
    enabled: Boolean(token),
    queryFn: async (): Promise<AccountItem[]> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const params = new URLSearchParams()
      appendProfileIdParam(params, normalizedProfileId)
      const qs = params.toString()
      const url = qs ? `${origin}/api/v1/accounts?${qs}` : `${origin}/api/v1/accounts`

      const res = await fetch(url, { headers })
      if (!res.ok) {
        throw new Error('Falha ao carregar contas')
      }

      const json = await res.json()
      const rawList: RawAccountItem[] = Array.isArray(json.data) ? json.data : []

      return rawList.map((item: RawAccountItem): AccountItem => ({
        id: item.id,
        name: item.name,
        type: item.type || 'checking',
        balance: Number(item.balance) || 0,
        created_at: item.createdAt || item.created_at
      }))
    }
  })

  const accounts = query.data || []
  const totalAccountsBalance = accounts.reduce((acc, a) => acc + a.balance, 0)

  return {
    accounts,
    totalAccountsBalance,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  }
}

export const useCreateAccount = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Erro ao criar conta')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
    }
  })
}

export const useDeleteAccount = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (accountId: string) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/accounts/${accountId}`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        throw new Error('Erro ao remover conta')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
    }
  })
}
