import { useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { ACCOUNTS_QUERY_KEY } from './useAccounts'
import { FORECAST_QUERY_KEY } from './useForecast'
import type { TransactionItem } from '../components/dashboard/Dashboard'

export interface CreateTransactionInput {
  amount: number
  description?: string
  categoryId?: string | null
  accountId?: string
  occurredAt?: string
  paid?: boolean
  dueDate?: string | null
  status?: 'completed' | 'pending' | 'cancelled'
  isRecurring?: boolean
  recurrencePeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  recurrenceDay?: number | null
  adjustBusinessDay?: boolean
  installmentTotal?: number | null
  type?: 'income' | 'expense' | 'transfer'
}

export interface UseTransactionsOptions {
  accountId?: string | null
  limit?: number
  startDate?: string
  endDate?: string
  status?: 'all' | 'completed' | 'pending'
  isRecurring?: boolean
  dueDateStart?: string
  dueDateEnd?: string
  scope?: 'current_month' | 'future' | 'all'
  month?: string
}

export interface PaginatedTransactionsResponse {
  data: TransactionItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}

export const TRANSACTIONS_QUERY_KEY = ['transactions'] as const

export const getTransactionsQueryKey = (options?: UseTransactionsOptions) =>
  [
    'transactions',
    {
      accountId: options?.accountId || null,
      limit: options?.limit || 20,
      startDate: options?.startDate || null,
      endDate: options?.endDate || null,
      status: options?.status || null,
      isRecurring: options?.isRecurring ?? null,
      dueDateStart: options?.dueDateStart || null,
      dueDateEnd: options?.dueDateEnd || null,
      scope: options?.scope || null,
      month: options?.month || null
    }
  ] as const

function getApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export function useTransactions(options?: UseTransactionsOptions) {
  const { session } = useAuth()
  const token = session?.access_token

  const query = useInfiniteQuery({
    queryKey: getTransactionsQueryKey(options),
    enabled: Boolean(token),
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam = 1 }): Promise<PaginatedTransactionsResponse> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const params = new URLSearchParams()
      params.set('page', String(pageParam))
      params.set('limit', String(options?.limit || 20))
      if (options?.accountId) params.set('accountId', options.accountId)
      if (options?.startDate) params.set('startDate', options.startDate)
      if (options?.endDate) params.set('endDate', options.endDate)
      if (options?.status && options.status !== 'all') params.set('status', options.status)
      if (typeof options?.isRecurring === 'boolean') params.set('isRecurring', String(options.isRecurring))
      if (options?.dueDateStart) params.set('dueDateStart', options.dueDateStart)
      if (options?.dueDateEnd) params.set('dueDateEnd', options.dueDateEnd)
      if (options?.scope) params.set('scope', options.scope)
      if (options?.month) params.set('month', options.month)

      const res = await fetch(`${origin}/api/v1/transactions?${params.toString()}`, { headers })
      if (!res.ok) {
        throw new Error('Falha ao carregar transações')
      }

      const json = await res.json()
      const rawList = Array.isArray(json.data) ? json.data : []

      const mapped = rawList.map((item: any): TransactionItem => {
        const amountNum = Number(item.amount) || 0
        const isPaid = item.paid ?? (item.status === 'completed')
        const statusVal = item.status || (isPaid ? 'completed' : 'pending')
        return {
          id: item.id,
          description: item.description ?? null,
          amount: amountNum,
          paid: isPaid,
          status: statusVal,
          dueDate: item.dueDate || item.due_date || null,
          paidAt: item.paidAt || item.paid_at || null,
          isRecurring: item.isRecurring ?? item.is_recurring ?? false,
          recurrencePeriod: item.recurrencePeriod || item.recurrence_period || null,
          recurrenceDay: item.recurrenceDay ?? item.recurrence_day ?? null,
          adjustBusinessDay: item.adjustBusinessDay ?? item.adjust_business_day ?? false,
          installmentCurrent: item.installmentCurrent ?? item.installment_current ?? null,
          installmentTotal: item.installmentTotal ?? item.installment_total ?? null,
          parentTransactionId: item.parentTransactionId || item.parent_transaction_id || null,
          occurred_at: item.occurredAt || item.occurred_at || new Date().toISOString(),
          category: item.category ?? null,
          type: item.type || (amountNum >= 0 ? 'income' : 'expense'),
          accountId: item.accountId || item.account_id || null
        }
      })

      const sorted = (mapped as TransactionItem[]).sort(
        (a: TransactionItem, b: TransactionItem) => {
          if (options?.scope === 'future') {
            const timeA = new Date(a.dueDate || a.occurred_at).getTime()
            const timeB = new Date(b.dueDate || b.occurred_at).getTime()
            return timeA - timeB
          }
          return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
        }
      )

      return {
        data: sorted,
        total: typeof json.total === 'number' ? json.total : sorted.length,
        page: typeof json.page === 'number' ? json.page : Number(pageParam),
        limit: typeof json.limit === 'number' ? json.limit : (options?.limit || 20),
        totalPages: typeof json.totalPages === 'number' ? json.totalPages : 1,
        hasMore: typeof json.hasMore === 'boolean' ? json.hasMore : false
      }
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined)
  })

  const transactions = query.data?.pages.flatMap((page) => page.data) || []
  const total = query.data?.pages[0]?.total ?? transactions.length
  const lastPage = query.data?.pages[query.data.pages.length - 1]
  const currentPage = lastPage?.page ?? 1
  const totalPages = lastPage?.totalPages ?? 1
  const hasMore = Boolean(query.hasNextPage)

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage()
    }
  }

  // Cálculo consolidado de receitas, despesas, pendências e saldo projetado
  let totalIncome = 0
  let totalExpense = 0
  let pendingIncome = 0
  let pendingExpense = 0

  for (const t of transactions) {
    const isPending = !t.paid || t.status === 'pending'
    if (t.amount > 0) {
      totalIncome += t.amount
      if (isPending) pendingIncome += t.amount
    } else {
      const absAmount = Math.abs(t.amount)
      totalExpense += absAmount
      if (isPending) pendingExpense += absAmount
    }
  }

  const totalBalance = totalIncome - totalExpense
  const projectedBalance = totalBalance + pendingIncome - pendingExpense

  return {
    transactions,
    total,
    page: currentPage,
    totalPages,
    hasMore,
    loadMore,
    isLoadingMore: query.isFetchingNextPage,
    totalBalance,
    totalIncome,
    totalExpense,
    pendingIncome,
    pendingExpense,
    projectedBalance,
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
        paid: input.paid ?? (input.status === 'pending' ? false : true),
        status: input.status || (input.paid === false ? 'pending' : 'completed'),
        dueDate: input.dueDate || undefined,
        isRecurring: input.isRecurring ?? false,
        recurrencePeriod: input.recurrencePeriod || undefined,
        installmentTotal: input.installmentTotal || undefined
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
      // Invalidação reativa imediata do cache de transações, contas e previsão de saldo
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY })
    }
  })
}

export interface PayTransactionInput {
  transactionId: string
  paidAt?: string
}

export function usePayTransaction() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async ({ transactionId, paidAt }: PayTransactionInput) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/transactions/${transactionId}/pay`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(paidAt ? { paidAt } : {})
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Erro ao dar baixa na transação')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY })
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
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY })
    }
  })
}
