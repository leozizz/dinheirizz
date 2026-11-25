export type OpenFinanceProvider = 'pluggy' | 'belvo' | 'sandbox'

export type OpenFinanceCreateProvider = 'pluggy' | 'sandbox'

export type OpenFinanceStatus =
  | 'active'
  | 'updating'
  | 'login_error'
  | 'outdated'
  | 'revoked'

export interface OpenFinanceLinkedAccount {
  id: string
  externalAccountId: string
  externalAccountType: 'BANK' | 'CREDIT' | string
  externalAccountName: string
  accountId: string | null
  creditCardId: string | null
  lastBalance: string | number | null
}

export interface OpenFinanceConnection {
  id: string
  provider: OpenFinanceProvider
  externalItemId: string
  institutionId: string
  institutionName: string
  institutionLogoUrl: string | null
  status: OpenFinanceStatus
  consentScope: 'read_only' | string
  consentExpiresAt: string | null
  lastSyncAt: string | null
  lastError: string | null
  linkedAccounts: OpenFinanceLinkedAccount[]
}

export interface OpenFinanceSyncSummary {
  accountsLinked: number
  transactionsImported: number
  duplicatesSkipped: number
  reconciledCount: number
}

export interface ConnectTokenRequestInput {
  provider?: OpenFinanceCreateProvider
  itemId?: string
  profileId?: string | null
}

export interface ConnectTokenResponse {
  connectToken: string
  provider: OpenFinanceCreateProvider
  mode: 'live' | 'production' | 'sandbox' | string
  consentScope: 'read_only' | string
  expiresAt: string
}

export interface CreateConnectionInput {
  provider: OpenFinanceCreateProvider
  externalItemId: string
  institutionId: string
  institutionName: string
  institutionLogoUrl?: string | null
  profileId?: string | null
}

export interface CreateConnectionResponse {
  connection: OpenFinanceConnection
  syncSummary: OpenFinanceSyncSummary
}

export interface SyncConnectionResponse {
  connectionId: string
  status: OpenFinanceStatus
  lastSyncAt: string
  syncSummary: OpenFinanceSyncSummary
}

export interface RevokeConnectionResponse {
  revoked: boolean
  id: string
  status: 'revoked'
}

export interface OpenFinanceInstitutionOption {
  id: string
  name: string
  initials: string
  typeLabel: string
}

export const OPEN_FINANCE_SANDBOX_INSTITUTIONS: readonly OpenFinanceInstitutionOption[] = [
  { id: '201', name: 'Nubank', initials: 'NU', typeLabel: 'Conta + Cartão' },
  { id: '341', name: 'Itaú', initials: 'IT', typeLabel: 'Conta Corrente' },
  { id: '077', name: 'Inter', initials: 'IN', typeLabel: 'Conta Digital' },
  { id: '001', name: 'Banco do Brasil', initials: 'BB', typeLabel: 'Conta Corrente' },
  { id: '237', name: 'Bradesco', initials: 'BR', typeLabel: 'Conta + Cartão' },
  { id: '336', name: 'C6 Bank', initials: 'C6', typeLabel: 'Conta Digital' }
] as const

export interface OpenFinanceHookReturn {
  connections: OpenFinanceConnection[]
  total: number
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<unknown>
  createConnectToken: (input?: ConnectTokenRequestInput) => Promise<ConnectTokenResponse>
  isCreatingToken: boolean
  createConnection: (input: CreateConnectionInput) => Promise<CreateConnectionResponse>
  isCreatingConnection: boolean
  syncConnection: (connectionId: string) => Promise<SyncConnectionResponse>
  isSyncing: boolean
  revokeConnection: (connectionId: string) => Promise<RevokeConnectionResponse>
  isRevoking: boolean
}
