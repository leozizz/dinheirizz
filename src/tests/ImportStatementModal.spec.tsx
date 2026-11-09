import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ImportStatementModal } from '../components/modals/ImportStatementModal'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@dinheirizz.com' },
    session: { access_token: 'fake-token' },
    loading: false
  })
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('ImportStatementModal Component (TDD)', () => {
  const mockAccounts = [
    { id: 'acc-nubank', name: 'Nubank', balance: 1200 },
    { id: 'acc-itau', name: 'Itaú Unibanco', balance: 3500 }
  ]

  const mockCategories = [
    { id: 'cat-food', name: 'Alimentação', type: 'expense' as const },
    { id: 'cat-transport', name: 'Transporte', type: 'expense' as const },
    { id: 'cat-salary', name: 'Salário', type: 'income' as const }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = typeof url === 'string' ? url : ''
      if (urlStr.includes('/api/v1/transactions/batch')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            importedCount: 2,
            accountId: 'acc-nubank',
            newBalance: 2000,
            transactions: []
          })
        }
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })
  })

  it('deve renderizar modal com dropzone e seletor de contas quando aberto', () => {
    render(
      <ImportStatementModal
        isOpen={true}
        onClose={vi.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('import-statement-modal')).toBeInTheDocument()
    expect(screen.getByTestId('import-account-select')).toBeInTheDocument()
    expect(screen.getByTestId('statement-dropzone')).toBeInTheDocument()
  })

  it('deve processar upload de arquivo CSV e exibir a tela de staging com transações', async () => {
    const { container } = render(
      <ImportStatementModal
        isOpen={true}
        onClose={vi.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
      { wrapper: createWrapper() }
    )

    const csvContent = `Data;Descrição;Valor
10/10/2026;Restaurante Almoço;-65,00
11/10/2026;Uber Corrida;-25,00
12/10/2026;Depósito Salário;3.000,00`

    const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' })
    const fileInput = screen.getByTestId('statement-file-input')

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('Restaurante Almoço')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Uber Corrida')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Depósito Salário')).toBeInTheDocument()
    })

    // Confirmação com total de itens
    expect(screen.getByTestId('confirm-import-btn')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-import-btn')).toHaveTextContent('Confirmar Importação (3 lançamentos)')
  })

  it('deve sinalizar duplicata com badge e manter desmarcada por padrão', async () => {
    const existingTransactions = [
      {
        id: 'tx-1',
        description: 'Restaurante Almoço',
        amount: 65.0,
        paid: true,
        occurred_at: '2026-10-10',
        accountId: 'acc-nubank',
        type: 'expense'
      }
    ]

    render(
      <ImportStatementModal
        isOpen={true}
        onClose={vi.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
        existingTransactions={existingTransactions}
      />,
      { wrapper: createWrapper() }
    )

    const csvContent = `Data;Descrição;Valor
10/10/2026;Restaurante Almoço;-65,00
11/10/2026;Nova Despesa;-30,00`

    const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' })
    const fileInput = screen.getByTestId('statement-file-input')

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByTestId('duplicate-badge')).toBeInTheDocument()
    })

    // Deve vir 1 selecionado de 2
    expect(screen.getByTestId('confirm-import-btn')).toHaveTextContent('Confirmar Importação (1 lançamento)')
  })

  it('deve disparar confirmação de importação ao clicar no botão confirmar', async () => {
    const onSuccessSpy = vi.fn()

    render(
      <ImportStatementModal
        isOpen={true}
        onClose={vi.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
        onSuccess={onSuccessSpy}
      />,
      { wrapper: createWrapper() }
    )

    const csvContent = '10/10/2026;Lanche;-15,00'
    const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' })
    const fileInput = screen.getByTestId('statement-file-input')

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByTestId('confirm-import-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('confirm-import-btn'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/transactions/batch'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(onSuccessSpy).toHaveBeenCalled()
    })
  })
})
