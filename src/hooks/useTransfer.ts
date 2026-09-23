import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { ACCOUNTS_QUERY_KEY } from './useAccounts'
import { TRANSACTIONS_QUERY_KEY } from './useTransactions'

export interface CreateTransferInput {
  fromAccountId: string
  toAccountId: string
  amount: number
  description?: string
  occurredAt?: string
}

function getApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export function useTransferTransaction() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (input: CreateTransferInput) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Erro ao realizar transferência')
      }

      return res.json()
    },
    onSuccess: () => {
      // Invalidação simultânea de contas e transações
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
    }
  })
}
