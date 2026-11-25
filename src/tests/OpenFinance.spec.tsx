import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { OpenFinanceModal } from '../components/modals/OpenFinanceModal'
import { OpenFinanceSettings } from '../components/settings/OpenFinanceSettings'
import type {
  OpenFinanceConnection,
  OpenFinanceHookReturn,
  ConnectTokenResponse,
  CreateConnectionResponse,
  SyncConnectionResponse,
  RevokeConnectionResponse
} from '../types/openFinance'

let mockHookState: OpenFinanceHookReturn

const mockPluggyInit = vi.fn()
let lastPluggyOptions: {
  connectToken: string
  includeSandbox?: boolean
  onSuccess?: (data: {
    item: {
      id: string
      connector?: { id?: number | string; name?: string; imageUrl?: string | null }
    }
  }) => void
  onError?: (error: { message?: string }) => void
  onClose?: () => void
} | null = null

vi.mock('pluggy-connect-sdk', () => ({
  PluggyConnect: vi.fn().mockImplementation((options: NonNullable<typeof lastPluggyOptions>) => {
    lastPluggyOptions = options
    return {
      init: mockPluggyInit
    }
  })
}))

vi.mock('../hooks/useOpenFinance', () => ({
  useOpenFinance: () => mockHookState
}))

const sampleConnections: OpenFinanceConnection[] = [
  {
    id: 'conn-1',
    provider: 'pluggy',
    externalItemId: 'item-nubank-1',
    institutionId: '201',
    institutionName: 'Nubank',
    institutionLogoUrl: null,
    status: 'active',
    consentScope: 'read_only',
    consentExpiresAt: '2027-11-21T11:15:00.000Z',
    lastSyncAt: '2026-11-21T11:15:00.000Z',
    lastError: null,
    linkedAccounts: [
      {
        id: 'link-1',
        externalAccountId: 'acc-ext-1',
        externalAccountType: 'BANK',
        externalAccountName: 'Conta Corrente',
        accountId: 'acc-1',
        creditCardId: null,
        lastBalance: '4250.80'
      }
    ]
  },
  {
    id: 'conn-2',
    provider: 'belvo',
    externalItemId: 'item-itau-2',
    institutionId: '341',
    institutionName: 'Itaú',
    institutionLogoUrl: null,
    status: 'login_error',
    consentScope: 'read_only',
    consentExpiresAt: '2027-11-21T11:15:00.000Z',
    lastSyncAt: '2026-11-20T09:00:00.000Z',
    lastError: 'Credenciais expiradas no banco',
    linkedAccounts: []
  }
]

describe('OpenFinance Frontend (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastPluggyOptions = null

    const tokenRes: ConnectTokenResponse = {
      connectToken: 'sandbox-token-123',
      provider: 'pluggy',
      mode: 'sandbox',
      consentScope: 'read_only',
      expiresAt: '2026-11-21T12:00:00.000Z'
    }

    const createRes: CreateConnectionResponse = {
      connection: sampleConnections[0],
      syncSummary: {
        accountsLinked: 2,
        transactionsImported: 18,
        duplicatesSkipped: 3,
        reconciledCount: 5
      }
    }

    const syncRes: SyncConnectionResponse = {
      connectionId: 'conn-1',
      status: 'active',
      lastSyncAt: '2026-11-21T11:25:00.000Z',
      syncSummary: {
        accountsLinked: 2,
        transactionsImported: 4,
        duplicatesSkipped: 1,
        reconciledCount: 1
      }
    }

    const revokeRes: RevokeConnectionResponse = {
      revoked: true,
      id: 'conn-1',
      status: 'revoked'
    }

    mockHookState = {
      connections: sampleConnections,
      total: sampleConnections.length,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      createConnectToken: vi.fn().mockResolvedValue(tokenRes),
      isCreatingToken: false,
      createConnection: vi.fn().mockResolvedValue(createRes),
      isCreatingConnection: false,
      syncConnection: vi.fn().mockResolvedValue(syncRes),
      isSyncing: false,
      revokeConnection: vi.fn().mockResolvedValue(revokeRes),
      isRevoking: false
    }
  })

  describe('OpenFinanceModal', () => {
    it('não exibe opção de Belvo e mostra guia Meu Pluggy e disclaimer de 5 contas por CPF antes do consentimento', () => {
      render(<OpenFinanceModal isOpen={true} onClose={vi.fn()} />)

      expect(screen.queryByTestId('open-finance-provider-belvo')).not.toBeInTheDocument()
      expect(screen.queryByText(/Belvo/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Agregador alternativo/i)).not.toBeInTheDocument()

      expect(screen.getByTestId('open-finance-meu-pluggy-guide')).toBeInTheDocument()
      const meuPluggyLink = screen.getByTestId('open-finance-meu-pluggy-link')
      expect(meuPluggyLink).toHaveAttribute('href', 'https://meu.pluggy.ai')
      expect(meuPluggyLink).toHaveAttribute('target', '_blank')
      expect(meuPluggyLink).toHaveAttribute('rel', 'noopener noreferrer')

      const disclaimer = screen.getByTestId('open-finance-pluggy-disclaimer')
      expect(disclaimer).toBeInTheDocument()
      expect(disclaimer.textContent).toMatch(/5\s*(conexões|contas).*CPF/i)
    })

    it('exibe passo 1 com aviso explícito de acesso Somente Leitura e avança para conexão Sandbox até o resumo', async () => {
      const onClose = vi.fn()
      render(<OpenFinanceModal isOpen={true} onClose={onClose} />)

      expect(screen.getByTestId('open-finance-modal')).toBeInTheDocument()
      expect(screen.getByText(/Acesso estritamente Somente Leitura/i)).toBeInTheDocument()
      expect(screen.getByText(/sem permissão.*pix|não realiza movimentações/i)).toBeInTheDocument()

      const continueBtn = screen.getByTestId('open-finance-consent-continue-btn')
      fireEvent.click(continueBtn)

      await waitFor(() => {
        expect(mockHookState.createConnectToken).toHaveBeenCalledWith({
          provider: 'pluggy',
          profileId: null
        })
      })

      expect(screen.getByTestId('open-finance-institution-201')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('open-finance-institution-201'))

      const connectSubmitBtn = screen.getByTestId('open-finance-connect-submit-btn')
      fireEvent.click(connectSubmitBtn)

      await waitFor(() => {
        expect(mockHookState.createConnection).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'pluggy',
            institutionId: '201',
            institutionName: 'Nubank'
          })
        )
      })

      expect(screen.getByTestId('open-finance-summary-step')).toBeInTheDocument()
      expect(screen.getByText('18')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('open-finance-finish-btn'))
      expect(onClose).toHaveBeenCalled()
    })

    it('renderiza o modal via portal diretamente em document.body sem truncar o cabeçalho', () => {
      const onClose = vi.fn()
      const { container } = render(
        <div data-testid="nested-modal-host">
          <OpenFinanceModal isOpen={true} onClose={onClose} />
        </div>
      )

      const host = container.querySelector('[data-testid="nested-modal-host"]')
      const modal = screen.getByTestId('open-finance-modal')
      const title = screen.getByText('Conexão Open Finance Brasil')
      const subtitle = screen.getByText(/Etapa 1 de 3/i)

      expect(host?.contains(modal)).toBe(false)
      expect(modal.parentElement).toBe(document.body)
      expect(title.className).not.toContain('truncate')
      expect(subtitle.className).not.toContain('truncate')
    })

    it('em modo production inicia Pluggy Connect e envia externalItemId real no onSuccess', async () => {
      mockHookState.createConnectToken = vi.fn().mockResolvedValue({
        connectToken: 'live-connect-token-xyz',
        provider: 'pluggy',
        mode: 'production',
        consentScope: 'read_only',
        expiresAt: '2026-11-25T12:00:00.000Z'
      })

      render(<OpenFinanceModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByTestId('open-finance-consent-continue-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('open-finance-pluggy-widget-container')).toBeInTheDocument()
      })

      expect(screen.getByTestId('open-finance-pluggy-launch-btn')).toBeInTheDocument()
      expect(lastPluggyOptions?.connectToken).toBe('live-connect-token-xyz')
      expect(mockPluggyInit).toHaveBeenCalledTimes(1)

      await act(async () => {
        await lastPluggyOptions?.onSuccess?.({
          item: {
            id: 'pluggy-item-real-999',
            connector: {
              id: 201,
              name: 'Nubank',
              imageUrl: 'https://cdn.pluggy.ai/nubank.png'
            }
          }
        })
      })

      await waitFor(() => {
        expect(mockHookState.createConnection).toHaveBeenCalledWith({
          provider: 'pluggy',
          externalItemId: 'pluggy-item-real-999',
          institutionId: '201',
          institutionName: 'Nubank',
          institutionLogoUrl: 'https://cdn.pluggy.ai/nubank.png',
          profileId: null
        })
      })

      expect(screen.getByTestId('open-finance-summary-step')).toBeInTheDocument()
    })

    it('exibe erro acessível em open-finance-modal-error quando Pluggy Connect dispara onError', async () => {
      mockHookState.createConnectToken = vi.fn().mockResolvedValue({
        connectToken: 'live-connect-token-xyz',
        provider: 'pluggy',
        mode: 'live',
        consentScope: 'read_only',
        expiresAt: '2026-11-25T12:00:00.000Z'
      })

      render(<OpenFinanceModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByTestId('open-finance-consent-continue-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('open-finance-pluggy-widget-container')).toBeInTheDocument()
      })

      act(() => {
        lastPluggyOptions?.onError?.({ message: 'Falha ao autenticar no banco selecionado' })
      })

      await waitFor(() => {
        const alert = screen.getByTestId('open-finance-modal-error')
        expect(alert).toHaveAttribute('role', 'alert')
        expect(alert.textContent).toContain('Falha ao autenticar no banco selecionado')
      })
    })
  })

  describe('OpenFinanceSettings', () => {
    it('exibe disclaimer de 5 contas por CPF, link Meu Pluggy e badge Legado para conexão Belvo histórica', () => {
      render(<OpenFinanceSettings />)

      const disclaimer = screen.getByTestId('open-finance-settings-pluggy-disclaimer')
      expect(disclaimer).toBeInTheDocument()
      expect(disclaimer.textContent).toMatch(/5\s*(conexões|contas).*CPF/i)

      const meuPluggyLink = screen.getByTestId('open-finance-settings-meu-pluggy-link')
      expect(meuPluggyLink).toHaveAttribute('href', 'https://meu.pluggy.ai')
      expect(meuPluggyLink).toHaveAttribute('target', '_blank')
      expect(meuPluggyLink).toHaveAttribute('rel', 'noopener noreferrer')

      expect(screen.getByText('Legado')).toBeInTheDocument()
    })

    it('lista conexões com status, última sincronização e todos os data-testid obrigatórios', () => {
      render(<OpenFinanceSettings />)

      expect(screen.getByTestId('open-finance-settings-section')).toBeInTheDocument()
      expect(screen.getByTestId('open-finance-connect-btn')).toBeInTheDocument()
      expect(screen.getByText('Nubank')).toBeInTheDocument()
      expect(screen.getByText('Itaú')).toBeInTheDocument()
      expect(screen.getByText('Ativo')).toBeInTheDocument()
      expect(screen.getByText('Erro de login')).toBeInTheDocument()
      expect(screen.getByTestId('open-finance-sync-btn-conn-1')).toBeInTheDocument()
      expect(screen.getByTestId('open-finance-revoke-btn-conn-1')).toBeInTheDocument()
    })

    it('dispara sincronização manual ao clicar no botão Sincronizar', async () => {
      render(<OpenFinanceSettings />)

      fireEvent.click(screen.getByTestId('open-finance-sync-btn-conn-1'))

      await waitFor(() => {
        expect(mockHookState.syncConnection).toHaveBeenCalledWith('conn-1')
      })
    })

    it('exige confirmação explícita antes de revogar acesso e chama DELETE ao confirmar', async () => {
      render(<OpenFinanceSettings />)

      fireEvent.click(screen.getByTestId('open-finance-revoke-btn-conn-1'))

      expect(screen.getByTestId('open-finance-revoke-confirm-box-conn-1')).toBeInTheDocument()
      expect(mockHookState.revokeConnection).not.toHaveBeenCalled()

      fireEvent.click(screen.getByTestId('open-finance-confirm-revoke-btn-conn-1'))

      await waitFor(() => {
        expect(mockHookState.revokeConnection).toHaveBeenCalledWith('conn-1')
      })
    })

    it('exibe estado vazio quando não há conexões bancárias', () => {
      mockHookState.connections = []
      mockHookState.total = 0

      render(<OpenFinanceSettings />)

      expect(screen.getByTestId('open-finance-empty-state')).toBeInTheDocument()
      expect(screen.getByTestId('open-finance-connect-btn')).toBeInTheDocument()
    })
  })
})
