import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import type { TransactionItem } from '../components/dashboard/Dashboard'

export interface CreateTransactionInput {
  amount: number
  description?: string
  categoryId?: string | null
  accountId?: string
  occurredAt?: string
  paid?: boolean
  type?: 'income' | 'expense' | 'transfer'
}

export const TRANSACTIONS_QUERY_KEY = ['transactions'] as const

function getApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export function useTransactions() {
  const { session } = useAuth()
  const token = session?.access_token

  const query = useQuery({
    queryKey: TRANSACTIONS_QUERY_KEY,
    enabled: Boolean(token),
    queryFn: async (): Promise<TransactionItem[]> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/transactions`, { headers })
      if (!res.ok) {
        throw new Error('Falha ao carregar transações')
      }

      const json = await res.json()
      const rawList = Array.isArray(json.data) ? json.data : []

      return rawList.map((item: any): TransactionItem => {
        const amountNum = Number(item.amount) || 0
        return {
          id: item.id,
          description: item.description ?? null,
          amount: amountNum,
          paid: item.paid ?? true,
          occurred_at: item.occurredAt || item.occurred_at || new Date().toISOString(),
          category: item.category ?? null,
          type: item.type || (amountNum >= 0 ? 'income' : 'expense')
        }
      })
    }
  })

  const transactions = query.data || []

  // Cálculo consolidado de receitas, despesas e saldo disponível
  let totalIncome = 0
  let totalExpense = 0

  for (const t of transactions) {
    if (t.amount > 0) {
      totalIncome += t.amount
    } else {
      totalExpense += Math.abs(t.amount)
    }
  }

  const totalBalance = totalIncome - totalExpense

  return {
    transactions,
    totalBalance,
    totalIncome,
    totalExpense,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  }
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Ajusta o sinal do valor conforme o tipo selecionado
      let normalizedAmount = Math.abs(input.amount)
      if (input.type === 'expense') {
        normalizedAmount = -normalizedAmount
      }

      const payload = {
        amount: Math.abs(input.amount),
        type: input.type || 'expense',
        description: input.description?.trim() || null,
        categoryId: input.categoryId || null,
        accountId: input.accountId || undefined,
        occurredAt: input.occurredAt || new Date().toISOString(),
        paid: input.paid ?? true
      }

      const res = await fetch(`${origin}/api/v1/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Erro ao registrar transação')
      }

      return res.json()
    },
    onSuccess: () => {
      // Invalidação reativa imediata do cache de transações
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
    }
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/transactions/${transactionId}`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        throw new Error('Erro ao deletar transação')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
    }
  })
}
