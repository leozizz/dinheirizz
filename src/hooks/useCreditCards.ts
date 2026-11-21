import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { appendProfileIdParam, getApiOrigin, normalizeProfileId } from '../lib/profileQuery'
import type {
  CreditCard,
  CreditCardBrand,
  Invoice,
  InvoiceStatus,
  InvoiceItem
} from '../types/database.types'
import type {
  CreateCreditCardInput,
  UpdateCreditCardInput,
  PayInvoiceInput,
  AnticipateInstallmentsInput
} from '../schemas/creditCards'

export const CREDIT_CARDS_QUERY_KEY = ['credit-cards'] as const
export const INVOICES_QUERY_KEY = ['invoices'] as const

interface RawCreditCardResponse {
  id: string
  name: string
  brand: string
  limitAmount: number | string
  usedLimit: number | string
  availableLimit: number | string
  closingDay: number
  dueDay: number
  color: string | null
  lastFourDigits: string | null
  accountId: string
  userId?: string
  archived?: boolean
  createdAt?: string
  updatedAt?: string | null
  currentInvoice?: {
    id: string
    period: string
    amount: number | string
    status: string
    closingDate: string
    dueDate: string
  } | null
  invoices?: Array<{
    id: string
    creditCardId: string
    period: string
    closingDate: string
    dueDate: string
    amount: number | string
    status: string
    paidAmount: number | string
    paidAt: string | null
    paymentAccountId?: string | null
    paymentTransactionId?: string | null
  }>
}

interface RawInvoiceItem {
  id: string
  description?: string | null
  amount?: number | string
  occurredAt?: string
  installmentCurrent?: number | null
  installmentTotal?: number | null
  category?: {
    name: string
    color?: string | null
  } | null
}

const mapCreditCard = (raw: RawCreditCardResponse): CreditCard => ({
  id: raw.id,
  name: raw.name,
  brand: (raw.brand || 'mastercard') as CreditCardBrand,
  limitAmount: Number(raw.limitAmount) || 0,
  usedLimit: Number(raw.usedLimit) || 0,
  availableLimit: Number(raw.availableLimit) || 0,
  closingDay: Number(raw.closingDay) || 1,
  dueDay: Number(raw.dueDay) || 10,
  color: raw.color || '#7bc816',
  lastFourDigits: raw.lastFourDigits || null,
  accountId: raw.accountId,
  userId: raw.userId,
  archived: Boolean(raw.archived),
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  currentInvoice: raw.currentInvoice
    ? {
        id: raw.currentInvoice.id,
        period: raw.currentInvoice.period,
        amount: Number(raw.currentInvoice.amount) || 0,
        status: (raw.currentInvoice.status || 'open') as InvoiceStatus,
        closingDate: raw.currentInvoice.closingDate,
        dueDate: raw.currentInvoice.dueDate
      }
    : null,
  invoices: raw.invoices?.map((inv) => ({
    id: inv.id,
    creditCardId: inv.creditCardId,
    period: inv.period,
    closingDate: inv.closingDate,
    dueDate: inv.dueDate,
    amount: Number(inv.amount) || 0,
    status: (inv.status || 'open') as InvoiceStatus,
    paidAmount: Number(inv.paidAmount) || 0,
    paidAt: inv.paidAt
  }))
})

export const useCreditCards = (profileId?: string | null) => {
  const { session } = useAuth()
  const token = session?.access_token
  const normalizedProfileId = normalizeProfileId(profileId)

  const query = useQuery({
    queryKey: [...CREDIT_CARDS_QUERY_KEY, normalizedProfileId || 'all'],
    enabled: Boolean(token),
    queryFn: async (): Promise<CreditCard[]> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const params = new URLSearchParams()
      appendProfileIdParam(params, normalizedProfileId)
      const qs = params.toString()
      const url = qs ? `${origin}/api/v1/credit-cards?${qs}` : `${origin}/api/v1/credit-cards`

      const res = await fetch(url, { headers })
      if (!res.ok) {
        throw new Error('Falha ao carregar cartões de crédito')
      }

      const json = await res.json()
      const rawList: RawCreditCardResponse[] = Array.isArray(json.data) ? json.data : []
      return rawList.map(mapCreditCard)
    }
  })

  return {
    creditCards: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  }
}

export const useCreditCard = (id: string | null | undefined) => {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: ['credit-cards', id],
    enabled: Boolean(token && id),
    queryFn: async (): Promise<CreditCard> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/credit-cards/${id}`, { headers })
      if (!res.ok) {
        throw new Error('Falha ao obter dados do cartão de crédito')
      }

      const json = await res.json()
      return mapCreditCard(json.card || json)
    }
  })
}

export const useInvoice = (id: string | null | undefined) => {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: ['invoices', id],
    enabled: Boolean(token && id),
    queryFn: async (): Promise<Invoice> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/invoices/${id}`, { headers })
      if (!res.ok) {
        throw new Error('Falha ao carregar detalhes da fatura')
      }

      const json = await res.json()
      const rawInv = json.invoice || json

      return {
        id: rawInv.id,
        creditCardId: rawInv.creditCardId,
        period: rawInv.period,
        closingDate: rawInv.closingDate,
        dueDate: rawInv.dueDate,
        amount: Number(rawInv.amount) || 0,
        status: (rawInv.status || 'open') as InvoiceStatus,
        paidAmount: Number(rawInv.paidAmount) || 0,
        paidAt: rawInv.paidAt,
        paymentAccountId: rawInv.paymentAccountId,
        paymentTransactionId: rawInv.paymentTransactionId,
        items: Array.isArray(rawInv.items)
          ? rawInv.items.map((item: RawInvoiceItem): InvoiceItem => ({
              id: item.id,
              description: item.description ?? null,
              amount: Number(item.amount) || 0,
              occurredAt: item.occurredAt || new Date().toISOString(),
              installmentCurrent: item.installmentCurrent ?? null,
              installmentTotal: item.installmentTotal ?? null,
              category: item.category || null
            }))
          : []
      }
    }
  })
}

export const useCreateCreditCard = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (input: CreateCreditCardInput): Promise<CreditCard> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/credit-cards`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson.message || errorJson.error || 'Falha ao criar cartão de crédito')
      }

      const json = await res.json()
      return mapCreditCard(json.data || json)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY })
    }
  })
}

export const useUpdateCreditCard = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string
      data: UpdateCreditCardInput
    }): Promise<CreditCard> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/credit-cards/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson.message || errorJson.error || 'Falha ao atualizar cartão de crédito')
      }

      const json = await res.json()
      return mapCreditCard(json.data || json)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['credit-cards', variables.id] })
    }
  })
}

export const useDeleteCreditCard = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/credit-cards/${id}`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson.message || errorJson.error || 'Falha ao excluir cartão de crédito')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY })
    }
  })
}

export const usePayInvoice = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async ({
      invoiceId,
      data
    }: {
      invoiceId: string
      data: PayInvoiceInput
    }) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson.message || errorJson.error || 'Falha ao pagar fatura')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })
}

export const useAnticipateInstallments = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async ({
      cardId,
      data
    }: {
      cardId: string
      data: AnticipateInstallmentsInput
    }) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/credit-cards/${cardId}/anticipate-installments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson.message || errorJson.error || 'Falha ao antecipar parcelas')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    }
  })
}
