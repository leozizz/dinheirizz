import type { RuntimeEnv } from '../lib/env'
import { isProductionEnv } from '../lib/env'
import type { OpenFinanceProvider } from '../schemas/openFinance'

export interface ConnectTokenResult {
  connectToken: string
  provider: OpenFinanceProvider
  mode: 'sandbox' | 'production'
  consentScope: 'read_only'
  expiresAt: string
}

export interface ExternalItemInfo {
  externalItemId: string
  status: 'active' | 'updating' | 'login_error' | 'outdated'
  institutionId: string
  institutionName: string
  consentExpiresAt: string | null
}

export interface ExternalAccountInfo {
  externalAccountId: string
  type: 'BANK' | 'CREDIT'
  name: string
  balance: number
  creditLimit?: number
  lastFourDigits?: string
  brand?: string
}

export interface ExternalTransactionInfo {
  externalId: string
  externalAccountId: string
  amount: number
  type: 'income' | 'expense'
  description: string
  occurredAt: string
}

export interface OpenFinanceProviderAdapter {
  readonly provider: OpenFinanceProvider
  readonly mode: 'sandbox' | 'production'
  createConnectToken(params: {
    userId: string
    itemId?: string
  }): Promise<ConnectTokenResult>
  getItem(externalItemId: string): Promise<ExternalItemInfo>
  listAccounts(externalItemId: string): Promise<ExternalAccountInfo[]>
  listTransactions(
    externalAccountId: string,
    options?: { from?: string; to?: string }
  ): Promise<ExternalTransactionInfo[]>
  revokeItem(externalItemId: string): Promise<void>
}

const toHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export const computeHmacSha256Hex = async (
  rawBody: string,
  secret: string
): Promise<string> => {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  return toHex(signature)
}

export const verifyHmacSha256Signature = async (
  rawBody: string,
  signatureHeader: string | undefined | null,
  secret: string | undefined | null
): Promise<boolean> => {
  if (!signatureHeader || !secret) return false
  const normalizedHeader = signatureHeader.trim().replace(/^sha256=/i, '').toLowerCase()
  if (!normalizedHeader) return false
  const expected = await computeHmacSha256Hex(rawBody, secret)
  return constantTimeEqual(normalizedHeader, expected.toLowerCase())
}

export class SandboxOpenFinanceAdapter implements OpenFinanceProviderAdapter {
  readonly provider: OpenFinanceProvider
  readonly mode = 'sandbox' as const

  constructor(provider: OpenFinanceProvider = 'sandbox') {
    this.provider = provider
  }

  async createConnectToken(params: {
    userId: string
    itemId?: string
  }): Promise<ConnectTokenResult> {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const suffix = params.itemId ? `reconnect-${params.itemId}` : params.userId.slice(0, 8)
    const token = `sbx-token-${this.provider}-${suffix}-${Date.now()}`
    return {
      connectToken: token,
      provider: this.provider,
      mode: 'sandbox',
      consentScope: 'read_only',
      expiresAt
    }
  }

  async getItem(externalItemId: string): Promise<ExternalItemInfo> {
    return {
      externalItemId,
      status: 'active',
      institutionId: '201',
      institutionName: 'Nubank Sandbox',
      consentExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  async listAccounts(externalItemId: string): Promise<ExternalAccountInfo[]> {
    return [
      {
        externalAccountId: `sandbox-acc-checking-${externalItemId}`,
        type: 'BANK',
        name: 'Conta Corrente',
        balance: 4250.8
      },
      {
        externalAccountId: `sandbox-acc-credit-${externalItemId}`,
        type: 'CREDIT',
        name: 'Cartão Gold',
        balance: -890.5,
        creditLimit: 6000,
        lastFourDigits: '4821',
        brand: 'mastercard'
      }
    ]
  }

  async listTransactions(externalAccountId: string): Promise<ExternalTransactionInfo[]> {
    const itemSuffix = externalAccountId.replace(/^sandbox-acc-(checking|credit)-/, '')
    if (externalAccountId.startsWith('sandbox-acc-credit-')) {
      return [
        {
          externalId: `sandbox-cc-tx-1-${itemSuffix}`,
          externalAccountId,
          amount: 55.9,
          type: 'expense',
          description: 'Netflix.com',
          occurredAt: '2026-11-17T10:00:00.000Z'
        }
      ]
    }

    return [
      {
        externalId: `sandbox-tx-1-${itemSuffix}`,
        externalAccountId,
        amount: 42.9,
        type: 'expense',
        description: 'iFood *Restaurante',
        occurredAt: '2026-11-18T14:30:00.000Z'
      },
      {
        externalId: `sandbox-tx-2-${itemSuffix}`,
        externalAccountId,
        amount: 28.5,
        type: 'expense',
        description: 'Uber *Viagem',
        occurredAt: '2026-11-19T09:15:00.000Z'
      },
      {
        externalId: `sandbox-tx-3-${itemSuffix}`,
        externalAccountId,
        amount: 5500.0,
        type: 'income',
        description: 'Salário Mensal',
        occurredAt: '2026-11-05T08:00:00.000Z'
      }
    ]
  }

  async revokeItem(_externalItemId: string): Promise<void> {
    return Promise.resolve()
  }
}

export class PluggyAdapter implements OpenFinanceProviderAdapter {
  readonly provider = 'pluggy' as const
  readonly mode = 'production' as const
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly baseUrl = 'https://api.pluggy.ai'

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  private async getApiKey(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: this.clientId,
        clientSecret: this.clientSecret
      })
    })
    if (!res.ok) {
      throw new Error(`Pluggy auth failed with status ${res.status}`)
    }
    const data = (await res.json()) as { apiKey: string }
    return data.apiKey
  }

  async createConnectToken(params: {
    userId: string
    itemId?: string
  }): Promise<ConnectTokenResult> {
    const apiKey = await this.getApiKey()
    const res = await fetch(`${this.baseUrl}/connect_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({
        itemId: params.itemId,
        options: { clientUserId: params.userId }
      })
    })
    if (!res.ok) {
      throw new Error(`Pluggy connect_token failed with status ${res.status}`)
    }
    const data = (await res.json()) as { accessToken: string }
    return {
      connectToken: data.accessToken,
      provider: 'pluggy',
      mode: 'production',
      consentScope: 'read_only',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    }
  }

  async getItem(externalItemId: string): Promise<ExternalItemInfo> {
    const apiKey = await this.getApiKey()
    const res = await fetch(`${this.baseUrl}/items/${encodeURIComponent(externalItemId)}`, {
      headers: { 'X-API-KEY': apiKey }
    })
    if (!res.ok) {
      throw new Error(`Pluggy getItem failed with status ${res.status}`)
    }
    const item = (await res.json()) as {
      id: string
      status: string
      connector: { id: number; name: string }
      consentExpiresAt?: string | null
    }
    const normalizedStatus =
      item.status === 'LOGIN_ERROR'
        ? 'login_error'
        : item.status === 'OUTDATED'
          ? 'outdated'
          : item.status === 'UPDATING'
            ? 'updating'
            : 'active'

    return {
      externalItemId: item.id,
      status: normalizedStatus,
      institutionId: String(item.connector.id),
      institutionName: item.connector.name,
      consentExpiresAt: item.consentExpiresAt ?? null
    }
  }

  async listAccounts(externalItemId: string): Promise<ExternalAccountInfo[]> {
    const apiKey = await this.getApiKey()
    const res = await fetch(
      `${this.baseUrl}/accounts?itemId=${encodeURIComponent(externalItemId)}`,
      { headers: { 'X-API-KEY': apiKey } }
    )
    if (!res.ok) {
      throw new Error(`Pluggy listAccounts failed with status ${res.status}`)
    }
    const data = (await res.json()) as {
      results: Array<{
        id: string
        type: 'BANK' | 'CREDIT'
        name: string
        balance: number
        creditData?: { creditLimit?: number }
        number?: string
      }>
    }
    return data.results.map((acc) => ({
      externalAccountId: acc.id,
      type: acc.type === 'CREDIT' ? 'CREDIT' : 'BANK',
      name: acc.name,
      balance: acc.balance,
      creditLimit: acc.creditData?.creditLimit,
      lastFourDigits: acc.number ? acc.number.slice(-4) : undefined
    }))
  }

  async listTransactions(
    externalAccountId: string,
    options?: { from?: string; to?: string }
  ): Promise<ExternalTransactionInfo[]> {
    const apiKey = await this.getApiKey()
    const qs = new URLSearchParams({ accountId: externalAccountId })
    if (options?.from) qs.set('from', options.from)
    if (options?.to) qs.set('to', options.to)

    const res = await fetch(`${this.baseUrl}/transactions?${qs.toString()}`, {
      headers: { 'X-API-KEY': apiKey }
    })
    if (!res.ok) {
      throw new Error(`Pluggy listTransactions failed with status ${res.status}`)
    }
    const data = (await res.json()) as {
      results: Array<{
        id: string
        amount: number
        type: 'DEBIT' | 'CREDIT'
        description: string
        date: string
      }>
    }
    return data.results.map((tx) => ({
      externalId: tx.id,
      externalAccountId,
      amount: Math.abs(tx.amount),
      type: tx.type === 'CREDIT' ? 'income' : 'expense',
      description: tx.description,
      occurredAt: tx.date
    }))
  }

  async revokeItem(externalItemId: string): Promise<void> {
    const apiKey = await this.getApiKey()
    const res = await fetch(`${this.baseUrl}/items/${encodeURIComponent(externalItemId)}`, {
      method: 'DELETE',
      headers: { 'X-API-KEY': apiKey }
    })
    if (!res.ok && res.status !== 404) {
      throw new Error(`Pluggy revokeItem failed with status ${res.status}`)
    }
  }
}

export class OpenFinanceConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OpenFinanceConfigError'
  }
}

export const getOpenFinanceAdapter = (
  provider: OpenFinanceProvider,
  env?: Partial<RuntimeEnv>
): OpenFinanceProviderAdapter => {
  if (provider === 'belvo') {
    throw new Error('Provedor Belvo não é mais suportado. Utilize o Pluggy.')
  }

  const sandboxFlag = env?.OPEN_FINANCE_SANDBOX ?? process.env.OPEN_FINANCE_SANDBOX
  if (provider === 'sandbox' || sandboxFlag === 'true') {
    return new SandboxOpenFinanceAdapter(provider)
  }

  if (provider === 'pluggy') {
    const clientId = env?.PLUGGY_CLIENT_ID ?? process.env.PLUGGY_CLIENT_ID
    const clientSecret = env?.PLUGGY_CLIENT_SECRET ?? process.env.PLUGGY_CLIENT_SECRET
    if (clientId && clientSecret) {
      return new PluggyAdapter(clientId, clientSecret)
    }
  }

  if (isProductionEnv(env)) {
    throw new OpenFinanceConfigError(
      'As credenciais do Pluggy não estão disponíveis neste ambiente.'
    )
  }

  return new SandboxOpenFinanceAdapter(provider)
}
