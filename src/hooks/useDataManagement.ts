import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { ACCOUNTS_QUERY_KEY } from './useAccounts'
import { PIX_KEYS_QUERY_KEY } from './usePixKeys'

export const TRANSACTIONS_QUERY_KEY = ['transactions'] as const

function getApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export function useDeleteTransactions() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  return useMutation({
    mutationFn: async () => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/user-data/transactions`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Falha ao excluir transações')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
    }
  })
}

export function useDeletePixKeys() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  return useMutation({
    mutationFn: async () => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/user-data/pix-keys`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Falha ao excluir chaves Pix')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIX_KEYS_QUERY_KEY })
    }
  })
}

export function useDeleteAccounts() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  return useMutation({
    mutationFn: async () => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/user-data/accounts`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Falha ao excluir contas')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
    }
  })
}

export function useResetAllData() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  return useMutation({
    mutationFn: async () => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/user-data/reset-all`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Falha ao executar reset geral')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PIX_KEYS_QUERY_KEY })
    }
  })
}
