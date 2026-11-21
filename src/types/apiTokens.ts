export const MCP_SCOPES = [
  'read:accounts',
  'read:transactions',
  'read:forecast',
  'read:budgets',
  'read:invoices'
] as const

export type ApiTokenScope = (typeof MCP_SCOPES)[number]

export const MCP_SCOPE_LABELS: Record<ApiTokenScope, string> = {
  'read:accounts': 'Saldos e contas',
  'read:transactions': 'Extrato e transações',
  'read:forecast': 'Previsão de fluxo de caixa',
  'read:budgets': 'Orçamentos',
  'read:invoices': 'Faturas de cartão'
}

export interface PersonalApiToken {
  id: string
  name: string
  tokenPrefix: string
  scopes: ApiTokenScope[]
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface CreateApiTokenPayload {
  name: string
  scopes: ApiTokenScope[]
  expiresInDays?: number | null
}

export interface CreateApiTokenResponse {
  token: PersonalApiToken
  plainTextToken: string
}

export interface RevokeApiTokenResponse {
  revoked: boolean
  id: string
  revokedAt: string
}

export interface McpAuditLog {
  id: string
  tokenId: string
  tokenName: string
  toolName: string
  status: 'success' | 'forbidden' | 'error'
  createdAt: string
}
