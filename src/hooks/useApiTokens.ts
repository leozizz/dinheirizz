import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { getApiOrigin } from '../lib/profileQuery'
import type {
  CreateApiTokenPayload,
  CreateApiTokenResponse,
  McpAuditLog,
  PersonalApiToken,
  RevokeApiTokenResponse
} from '../types/apiTokens'

export const API_TOKENS_KEY = ['api-tokens'] as const
export const MCP_AUDIT_LOGS_KEY = ['mcp-audit-logs'] as const

const extractErrorMessage = async (res: Response, fallback: string): Promise<string> => {
  try {
    const data = (await res.json()) as { message?: string; error?: string }
    return data.message || data.error || fallback
  } catch {
    return fallback
  }
}

const buildAuthHeaders = (token?: string | null, withJson = false): Record<string, string> => {
  const headers: Record<string, string> = {}
  if (withJson) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const useApiTokens = () => {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: API_TOKENS_KEY,
    enabled: Boolean(token),
    queryFn: async (): Promise<PersonalApiToken[]> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/api-tokens`, {
        headers: buildAuthHeaders(token)
      })

      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Falha ao carregar tokens MCP')
        throw new Error(message)
      }

      const json = (await res.json()) as { tokens?: PersonalApiToken[] }
      return Array.isArray(json.tokens) ? json.tokens : []
    }
  })
}

export const useMcpAuditLogs = (enabled = true) => {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: MCP_AUDIT_LOGS_KEY,
    enabled: Boolean(token && enabled),
    queryFn: async (): Promise<McpAuditLog[]> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/api-tokens/logs`, {
        headers: buildAuthHeaders(token)
      })

      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Falha ao carregar logs de auditoria MCP')
        throw new Error(message)
      }

      const json = (await res.json()) as { logs?: McpAuditLog[] }
      return Array.isArray(json.logs) ? json.logs : []
    }
  })
}

export const useCreateApiToken = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (payload: CreateApiTokenPayload): Promise<CreateApiTokenResponse> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/api-tokens`, {
        method: 'POST',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Não foi possível gerar o token MCP')
        throw new Error(message)
      }

      return (await res.json()) as CreateApiTokenResponse
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: API_TOKENS_KEY })
    }
  })
}

export const useRevokeApiToken = () => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (tokenId: string): Promise<RevokeApiTokenResponse> => {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/api-tokens/${tokenId}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(token)
      })

      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Não foi possível revogar o token MCP')
        throw new Error(message)
      }

      return (await res.json()) as RevokeApiTokenResponse
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: API_TOKENS_KEY }),
        queryClient.invalidateQueries({ queryKey: MCP_AUDIT_LOGS_KEY })
      ])
    }
  })
}
