import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { ACCOUNTS_QUERY_KEY } from './useAccounts'
import { PIX_KEYS_QUERY_KEY } from './usePixKeys'
import { FORECAST_QUERY_KEY } from './useForecast'

export const TRANSACTIONS_QUERY_KEY = ['transactions'] as const

export interface DeleteActionResponse {
  success: boolean
  message: string
  defaultAccountId?: string
}

export interface DeleteErrorPayload {
  error?: string
  message?: string
}

const getApiOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

const executeDeleteAction = async (
  endpoint: string,
  fallbackMessage: string,
  token?: string
): Promise<DeleteActionResponse> => {
  const origin = getApiOrigin()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${origin}${endpoint}`, {
    method: 'DELETE',
    headers
  })

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as DeleteErrorPayload
    throw new Error(errorData.message || errorData.error || fallbackMessage)
  }

  return (await res.json()) as DeleteActionResponse
}

export const useDeleteTransactions = () => {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  return useMutation<DeleteActionResponse, Error, void>({
    mutationFn: () =>
      executeDeleteAction(
        '/api/v1/user-data/transactions',
        'Falha ao excluir transações',
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY })
    }
  })
}

export const useDeletePixKeys = () => {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  return useMutation<DeleteActionResponse, Error, void>({
    mutationFn: () =>
      executeDeleteAction(
        '/api/v1/user-data/pix-keys',
        'Falha ao excluir chaves Pix',
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIX_KEYS_QUERY_KEY })
    }
  })
}

export const useDeleteAccounts = () => {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  return useMutation<DeleteActionResponse, Error, void>({
    mutationFn: () =>
      executeDeleteAction(
        '/api/v1/user-data/accounts',
        'Falha ao excluir contas',
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY })
    }
  })
}

export const useResetAllData = () => {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  return useMutation<DeleteActionResponse, Error, void>({
    mutationFn: () =>
      executeDeleteAction(
        '/api/v1/user-data/reset-all',
        'Falha ao executar reset geral',
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PIX_KEYS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY })
    }
  })
}
