import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DangerZoneModal } from '../components/modals/DangerZoneModal'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'uuid-test-user-1',
      email: 'test@dinheirizz.com'
    },
    session: { access_token: 'fake-token' },
    signOut: vi.fn(),
    updateUser: vi.fn()
  })
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

const renderWithClient = (ui: React.ReactElement, queryClient = createTestQueryClient()) =>
  render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )

describe('DangerZoneModal Component (TDD - Painel da Zona de Perigo)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccessNotification: vi.fn(),
    onDeleteTransactions: vi.fn(),
    onDeletePixKeys: vi.fn(),
    onDeleteAccounts: vi.fn(),
    onResetAllData: vi.fn()
  }

  it('não deve renderizar quando isOpen={false}', () => {
    const { container } = renderWithClient(
      <DangerZoneModal {...defaultProps} isOpen={false} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('deve renderizar as 4 opções de exclusão destrutiva', () => {
    renderWithClient(<DangerZoneModal {...defaultProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/zona de perigo \(gerenciamento de dados\)/i)).toBeInTheDocument()

    // 4 ações
    expect(screen.getByText('Excluir Histórico de Transações')).toBeInTheDocument()
    expect(screen.getByText('Excluir Chaves Pix')).toBeInTheDocument()
    expect(screen.getByText('Excluir Contas Financeiras')).toBeInTheDocument()
    expect(screen.getByText('Reset Geral de Dados')).toBeInTheDocument()

    // Botões
    expect(screen.getByRole('button', { name: 'Apagar Transações' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apagar Chaves Pix' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apagar Contas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resetar Tudo' })).toBeInTheDocument()
  })

  it('deve abrir modal de dupla confirmação ao clicar em "Apagar Transações"', async () => {
    const onDeleteTx = vi.fn().mockResolvedValue(undefined)
    renderWithClient(
      <DangerZoneModal {...defaultProps} onDeleteTransactions={onDeleteTx} />
    )

    const btn = screen.getByRole('button', { name: 'Apagar Transações' })
    fireEvent.click(btn)

    // O modal de dupla confirmação deve aparecer
    expect(screen.getByText('apagar todas as minhas transações')).toBeInTheDocument()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'apagar todas as minhas transações' } })

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar Exclusão das Transações' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(onDeleteTx).toHaveBeenCalledTimes(1)
    })
  })

  it('deve abrir modal de dupla confirmação com aviso de cascata ao clicar em "Apagar Contas"', () => {
    renderWithClient(<DangerZoneModal {...defaultProps} />)

    const btn = screen.getByRole('button', { name: 'Apagar Contas' })
    fireEvent.click(btn)

    expect(screen.getByText(/efeito em cascata/i)).toBeInTheDocument()
    expect(screen.getByText('apagar todas as contas')).toBeInTheDocument()
  })

  it('deve abrir modal de confirmação ao clicar em "Resetar Tudo"', async () => {
    const onReset = vi.fn().mockResolvedValue(undefined)
    renderWithClient(
      <DangerZoneModal {...defaultProps} onResetAllData={onReset} />
    )

    const btn = screen.getByRole('button', { name: 'Resetar Tudo' })
    fireEvent.click(btn)

    expect(screen.getByText('resetar todos os meus dados')).toBeInTheDocument()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'resetar todos os meus dados' } })

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar Reset Geral' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(onReset).toHaveBeenCalledTimes(1)
    })
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deve chamar onClose ao clicar no botão fechar (X)', () => {
    const onCloseMock = vi.fn()
    renderWithClient(<DangerZoneModal {...defaultProps} onClose={onCloseMock} />)

    const closeBtn = screen.getByRole('button', { name: /fechar/i })
    fireEvent.click(closeBtn)
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('deve expor todos os data-testid do contrato no painel e no modal de confirmação', () => {
    renderWithClient(<DangerZoneModal {...defaultProps} />)

    expect(screen.getByTestId('danger-zone-modal')).toBeInTheDocument()
    expect(screen.getByTestId('danger-zone-close-btn')).toBeInTheDocument()
    expect(screen.getByTestId('danger-zone-transactions-btn')).toBeInTheDocument()
    expect(screen.getByTestId('danger-zone-pix-keys-btn')).toBeInTheDocument()
    expect(screen.getByTestId('danger-zone-accounts-btn')).toBeInTheDocument()
    expect(screen.getByTestId('danger-zone-reset-all-btn')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('danger-zone-reset-all-btn'))

    expect(screen.getByTestId('danger-confirm-modal')).toBeInTheDocument()
    expect(screen.getByTestId('danger-confirm-close-btn')).toBeInTheDocument()
    expect(screen.getByTestId('danger-confirm-phrase-copy')).toBeInTheDocument()
    expect(screen.getByTestId('danger-confirm-phrase-input')).toBeInTheDocument()
    expect(screen.getByTestId('danger-confirm-cancel-btn')).toBeInTheDocument()
    expect(screen.getByTestId('danger-confirm-submit-btn')).toBeInTheDocument()
  })

  it('deve exibir danger-confirm-error e manter modal aberto quando a API retorna HTTP 500', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: 'Erro ao executar reset geral',
        message: 'Falha interna ao limpar dados'
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithClient(
      <DangerZoneModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccessNotification={vi.fn()}
      />
    )

    fireEvent.click(screen.getByTestId('danger-zone-reset-all-btn'))
    const input = screen.getByTestId('danger-confirm-phrase-input')
    fireEvent.change(input, { target: { value: 'resetar todos os meus dados' } })
    fireEvent.click(screen.getByTestId('danger-confirm-submit-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('danger-confirm-error')).toHaveTextContent('Falha interna ao limpar dados')
    })

    expect(screen.getByTestId('danger-confirm-modal')).toBeInTheDocument()
    expect(screen.getByTestId('danger-confirm-phrase-input')).not.toBeDisabled()
    expect(screen.getByTestId('danger-confirm-cancel-btn')).not.toBeDisabled()
    expect(screen.getByTestId('danger-confirm-submit-btn')).not.toBeDisabled()
  })

  it('deve fechar modal de confirmação, exibir danger-zone-feedback e invalidar cache no sucesso HTTP 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Reset geral concluído.',
        defaultAccountId: 'acc-1'
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const onSuccessNotification = vi.fn()

    renderWithClient(
      <DangerZoneModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccessNotification={onSuccessNotification}
      />,
      queryClient
    )

    fireEvent.click(screen.getByTestId('danger-zone-reset-all-btn'))
    fireEvent.change(screen.getByTestId('danger-confirm-phrase-input'), {
      target: { value: 'resetar todos os meus dados' }
    })
    fireEvent.click(screen.getByTestId('danger-confirm-submit-btn'))

    await waitFor(() => {
      expect(screen.queryByTestId('danger-confirm-modal')).not.toBeInTheDocument()
      expect(screen.getByTestId('danger-zone-feedback')).toBeInTheDocument()
    })

    expect(onSuccessNotification).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['transactions'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['pix-keys'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['forecast'] })
  })
})
