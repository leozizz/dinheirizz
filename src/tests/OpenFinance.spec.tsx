import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  })

  describe('OpenFinanceSettings', () => {
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
