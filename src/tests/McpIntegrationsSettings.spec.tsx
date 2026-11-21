import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { McpIntegrationsSettings } from '../components/settings/McpIntegrationsSettings'
import type {
  CreateApiTokenPayload,
  CreateApiTokenResponse,
  McpAuditLog,
  PersonalApiToken,
  RevokeApiTokenResponse
} from '../types/apiTokens'

let mockTokens: PersonalApiToken[] = []
let mockAuditLogs: McpAuditLog[] = []
let mockTokensLoading = false
let mockLogsLoading = false

const mockCreateMutateAsync = vi.fn<
  (payload: CreateApiTokenPayload) => Promise<CreateApiTokenResponse>
>()
const mockRevokeMutateAsync = vi.fn<
  (tokenId: string) => Promise<RevokeApiTokenResponse>
>()

vi.mock('../hooks/useApiTokens', () => ({
  useApiTokens: () => ({
    data: mockTokens,
    isLoading: mockTokensLoading,
    isError: false,
    error: null
  }),
  useMcpAuditLogs: () => ({
    data: mockAuditLogs,
    isLoading: mockLogsLoading,
    isError: false,
    error: null
  }),
  useCreateApiToken: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false
  }),
  useRevokeApiToken: () => ({
    mutateAsync: mockRevokeMutateAsync,
    isPending: false
  })
}))

const sampleTokens: PersonalApiToken[] = [
  {
    id: 'tok-active-1',
    name: 'Claude Desktop',
    tokenPrefix: 'dnz_mcp_9f3a...',
    scopes: ['read:accounts', 'read:transactions'],
    lastUsedAt: '2026-11-21T11:30:00.000Z',
    expiresAt: '2027-02-19T09:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-11-21T09:00:00.000Z'
  },
  {
    id: 'tok-revoked-2',
    name: 'Cursor Antigo',
    tokenPrefix: 'dnz_mcp_1a2b...',
    scopes: ['read:accounts'],
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: '2026-11-20T18:00:00.000Z',
    createdAt: '2026-11-19T09:00:00.000Z'
  },
  {
    id: 'tok-expired-3',
    name: 'Teste Expirado',
    tokenPrefix: 'dnz_mcp_7c8d...',
    scopes: ['read:budgets'],
    lastUsedAt: null,
    expiresAt: '2025-01-01T00:00:00.000Z',
    revokedAt: null,
    createdAt: '2024-12-01T09:00:00.000Z'
  }
]

const sampleLogs: McpAuditLog[] = [
  {
    id: 'log-1',
    tokenId: 'tok-active-1',
    tokenName: 'Claude Desktop',
    toolName: 'get_balance_summary',
    status: 'success',
    createdAt: '2026-11-21T11:30:00.000Z'
  },
  {
    id: 'log-2',
    tokenId: 'tok-active-1',
    tokenName: 'Claude Desktop',
    toolName: 'get_budget_status',
    status: 'forbidden',
    createdAt: '2026-11-21T11:25:00.000Z'
  }
]

describe('McpIntegrationsSettings (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTokens = [...sampleTokens]
    mockAuditLogs = [...sampleLogs]
    mockTokensLoading = false
    mockLogsLoading = false

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      configurable: true
    })

    mockCreateMutateAsync.mockResolvedValue({
      token: {
        id: 'tok-new-9',
        name: 'Antigravity CLI',
        tokenPrefix: 'dnz_mcp_abcd...',
        scopes: ['read:accounts', 'read:transactions', 'read:forecast', 'read:budgets', 'read:invoices'],
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        createdAt: '2026-11-21T12:00:00.000Z'
      },
      plainTextToken: 'dnz_mcp_abcd1234567890secret'
    })

    mockRevokeMutateAsync.mockResolvedValue({
      revoked: true,
      id: 'tok-active-1',
      revokedAt: '2026-11-21T12:05:00.000Z'
    })
  })

  it('deve renderizar a seção Integrações & MCP Pessoal com data-testids obrigatórios', () => {
    render(<McpIntegrationsSettings />)

    expect(screen.getByTestId('mcp-integrations-section')).toBeInTheDocument()
    expect(screen.getByText('Integrações & MCP Pessoal')).toBeInTheDocument()
    expect(screen.getByTestId('mcp-token-name-input')).toBeInTheDocument()
    expect(screen.getByTestId('mcp-token-expiry-select')).toBeInTheDocument()
    expect(screen.getByTestId('mcp-create-token-btn')).toBeInTheDocument()
    expect(screen.getByTestId('mcp-scope-checkbox-read:accounts')).toBeChecked()
    expect(screen.getByTestId('mcp-scope-checkbox-read:transactions')).toBeChecked()
    expect(screen.getByTestId('mcp-scope-checkbox-read:forecast')).toBeChecked()
    expect(screen.getByTestId('mcp-scope-checkbox-read:budgets')).toBeChecked()
    expect(screen.getByTestId('mcp-scope-checkbox-read:invoices')).toBeChecked()
  })

  it('deve exibir estado vazio quando não houver tokens cadastrados', () => {
    mockTokens = []
    render(<McpIntegrationsSettings />)

    expect(screen.getByTestId('mcp-tokens-empty-state')).toBeInTheDocument()
    expect(screen.getByText('Nenhum token MCP criado ainda')).toBeInTheDocument()
  })

  it('deve criar token, exibir mcp-token-reveal-card uma única vez com snippet JSON e permitir copiar', async () => {
    render(<McpIntegrationsSettings />)

    const nameInput = screen.getByTestId('mcp-token-name-input')
    fireEvent.change(nameInput, { target: { value: 'Antigravity CLI' } })

    const createBtn = screen.getByTestId('mcp-create-token-btn')
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        name: 'Antigravity CLI',
        scopes: [
          'read:accounts',
          'read:transactions',
          'read:forecast',
          'read:budgets',
          'read:invoices'
        ],
        expiresInDays: null
      })
    })

    const revealCard = await screen.findByTestId('mcp-token-reveal-card')
    expect(revealCard).toBeInTheDocument()
    expect(revealCard).toHaveTextContent('dnz_mcp_abcd1234567890secret')

    const jsonSnippet = screen.getByTestId('mcp-json-snippet')
    expect(jsonSnippet).toHaveTextContent('dinheirizz')
    expect(jsonSnippet).toHaveTextContent('/api/mcp')
    expect(jsonSnippet).toHaveTextContent('dnz_mcp_abcd1234567890secret')

    fireEvent.click(screen.getByTestId('mcp-copy-token-btn'))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('dnz_mcp_abcd1234567890secret')
    })

    fireEvent.click(screen.getByTestId('mcp-copy-json-btn'))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('"dinheirizz"')
      )
    })
  })

  it('deve exigir ao menos 1 escopo selecionado ao criar token', () => {
    render(<McpIntegrationsSettings />)

    fireEvent.change(screen.getByTestId('mcp-token-name-input'), {
      target: { value: 'Sem Escopo' }
    })

    fireEvent.click(screen.getByTestId('mcp-scope-checkbox-read:accounts'))
    fireEvent.click(screen.getByTestId('mcp-scope-checkbox-read:transactions'))
    fireEvent.click(screen.getByTestId('mcp-scope-checkbox-read:forecast'))
    fireEvent.click(screen.getByTestId('mcp-scope-checkbox-read:budgets'))
    fireEvent.click(screen.getByTestId('mcp-scope-checkbox-read:invoices'))

    expect(screen.getByTestId('mcp-create-token-btn')).toBeDisabled()
  })

  it('deve listar tokens com prefixo mascarado, status Ativo/Revogado/Expirado e revogar com confirmação inline', async () => {
    render(<McpIntegrationsSettings />)

    expect(screen.getByTestId('mcp-token-card-tok-active-1')).toHaveTextContent('dnz_mcp_9f3a...')
    expect(screen.getByTestId('mcp-token-card-tok-active-1')).toHaveTextContent('Ativo')
    expect(screen.getByTestId('mcp-token-card-tok-revoked-2')).toHaveTextContent('Revogado')
    expect(screen.getByTestId('mcp-token-card-tok-expired-3')).toHaveTextContent('Expirado')

    fireEvent.click(screen.getByTestId('mcp-revoke-token-btn-tok-active-1'))
    expect(screen.getByTestId('mcp-revoke-confirm-box-tok-active-1')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('mcp-confirm-revoke-btn-tok-active-1'))

    await waitFor(() => {
      expect(mockRevokeMutateAsync).toHaveBeenCalledWith('tok-active-1')
    })
  })

  it('deve expandir painel recolhível Auditoria de Acessos MCP e exibir logs recentes', () => {
    render(<McpIntegrationsSettings />)

    expect(screen.queryByTestId('mcp-audit-logs-list')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('mcp-audit-toggle-btn'))

    const logsList = screen.getByTestId('mcp-audit-logs-list')
    expect(logsList).toBeInTheDocument()
    expect(logsList).toHaveTextContent('get_balance_summary')
    expect(logsList).toHaveTextContent('get_budget_status')
  })
})
