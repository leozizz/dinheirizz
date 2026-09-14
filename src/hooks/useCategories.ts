import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'

export interface CategoryItem {
  id: string
  name: string
  type: 'income' | 'expense'
  icon?: string | null
  color?: string | null
}

function getApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export const CATEGORIES_QUERY_KEY = ['categories'] as const

export function useCategories() {
  const { session } = useAuth()
  const token = session?.access_token

  const query = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    enabled: Boolean(token),
    queryFn: async (): Promise<CategoryItem[]> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`${origin}/api/v1/categories`, { headers })
      if (!res.ok) {
        throw new Error('Falha ao carregar categorias')
      }
      const json = await res.json()
      return json.data || []
    }
  })

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  }
}
