import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import type { PixKeyItem } from '../components/modals/PixWalletModal'

export interface CreatePixKeyInput {
  keyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  keyValue: string
  bankName?: string
  description?: string
  label?: string
}

interface RawPixKeyItem {
  id: string
  keyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  key_type?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  keyValue?: string
  key_value?: string
  bankName?: string
  bank_name?: string
  description?: string | null
}

export const PIX_KEYS_QUERY_KEY = ['pix-keys'] as const

const getApiOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export const usePixKeys = () => {
  const { session } = useAuth()
  const token = session?.access_token

  const query = useQuery({
    queryKey: PIX_KEYS_QUERY_KEY,
    enabled: Boolean(token),
    queryFn: async (): Promise<PixKeyItem[]> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/pix-keys`, { headers })
      if (!res.ok) {
        throw new Error('Falha ao carregar chaves Pix')
      }

      const json = await res.json()
      const rawList: RawPixKeyItem[] = Array.isArray(json.data) ? json.data : []

      return rawList.map((item: RawPixKeyItem): PixKeyItem => ({
        id: item.id,
        key_type: item.keyType || item.key_type || 'random',
        key_value: item.keyValue || item.key_value || '',
        bank_name: item.bankName || item.bank_name || '',
        description: item.description ?? null
      }))
    }
  })

  return {
    pixKeys: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  }
}

export const useCreatePixKey = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (input: CreatePixKeyInput) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/pix-keys`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Erro ao cadastrar chave Pix')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIX_KEYS_QUERY_KEY })
    }
  })
}

export const useDeletePixKey = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (pixKeyId: string) => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${origin}/api/v1/pix-keys/${pixKeyId}`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        throw new Error('Erro ao remover chave Pix')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIX_KEYS_QUERY_KEY })
    }
  })
}
