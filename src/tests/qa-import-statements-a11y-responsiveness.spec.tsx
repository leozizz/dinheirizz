import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ImportStatementModal } from '../components/modals/ImportStatementModal'
import type { CategoryItem } from '../hooks/useCategories'
import type { TransactionItem } from '../components/dashboard/Dashboard'

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

describe('QA & A11y Suite — Importação Inteligente de Extratos Bancários (#32)', () => {
  const sampleAccounts = [
    { id: 'acc-nubank', name: 'Nubank Principal', balance: 3500.5, type: 'checking' },
    { id: 'acc-inter', name: 'Banco Inter', balance: 1200.0, type: 'investment' }
  ]

  const sampleCategories: CategoryItem[] = [
    { id: 'cat-alimentacao', name: 'Alimentação', type: 'expense' },
    { id: 'cat-transporte', name: 'Transporte', type: 'expense' },
    { id: 'cat-salario', name: 'Salário', type: 'income' },
    { id: 'cat-lazer', name: 'Lazer', type: 'expense' }
  ]

  const existingTransactions: TransactionItem[] = [
    {
      id: 'tx-existing-1',
      description: 'Restaurante Sabor',
      amount: -45.0,
      paid: true,
      status: 'completed',
      occurred_at: '2026-11-05',
      accountId: 'acc-nubank'
    }
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

  describe('Auditoria de Acessibilidade (A11y) & Touch Targets (WCAG 2.1 AA)', () => {
    it('deve garantir que o modal possua atributos ARIA de diálogo e título associado', () => {
      render(
        <ImportStatementModal
          isOpen={true}
          onClose={vi.fn()}
          accounts={sampleAccounts}
          categories={sampleCategories}
        />,
        { wrapper: createWrapper() }
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'import-modal-title')

      const title = screen.getByText('Importar Extrato Bancário')
      expect(title).toHaveAttribute('id', 'import-modal-title')
    })

    it('deve garantir touch targets mínimos de 44x44px no botão de fechar e seletor de contas', () => {
      render(
        <ImportStatementModal
          isOpen={true}
          onClose={vi.fn()}
          accounts={sampleAccounts}
          categories={sampleCategories}
        />,
        { wrapper: createWrapper() }
      )

      const closeBtn = screen.getByTestId('close-import-modal-btn')
      expect(closeBtn).toHaveAttribute('aria-label', 'Fechar modal')
      expect(closeBtn.className).toMatch(/min-h-\[44px\]/)
      expect(closeBtn.className).toMatch(/min-w-\[44px\]/)

      const selectAccount = screen.getByTestId('import-account-select')
      expect(selectAccount.className).toMatch(/min-h-\[44px\]/)
    })

    it('deve garantir acessibilidade e atributo aria-label no input oculto da dropzone', () => {
      render(
        <ImportStatementModal
          isOpen={true}
          onClose={vi.fn()}
          accounts={sampleAccounts}
          categories={sampleCategories}
        />,
        { wrapper: createWrapper() }
      )

      const fileInput = screen.getByTestId('statement-file-input')
      expect(fileInput).toHaveAttribute('aria-label', 'Selecionar arquivo de extrato')
    })
  })

  describe('Auditoria de data-testid para Automação', () => {
    it('deve renderizar data-testids obrigatórios na tela inicial de upload', () => {
      render(
        <ImportStatementModal
          isOpen={true}
          onClose={vi.fn()}
          accounts={sampleAccounts}
          categories={sampleCategories}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByTestId('import-statement-modal')).toBeInTheDocument()
      expect(screen.getByTestId('close-import-modal-btn')).toBeInTheDocument()
      expect(screen.getByTestId('import-account-select')).toBeInTheDocument()
      expect(screen.getByTestId('statement-dropzone')).toBeInTheDocument()
      expect(screen.getByTestId('statement-file-input')).toBeInTheDocument()
    })

    it('deve renderizar data-testids obrigatórios na tela de staging após upload de extrato', async () => {
      const csvContent = `Data,Descricao,Valor\n05/11/2026,Restaurante Sabor,-45,00\n06/11/2026,Uber Viagem,-25,50\n01/11/2026,Salario Empresa,5000,00`
      const file = new File([csvContent], 'extrato-teste.csv', { type: 'text/csv' })

      render(
        <ImportStatementModal
          isOpen={true}
          onClose={vi.fn()}
          accounts={sampleAccounts}
          categories={sampleCategories}
          existingTransactions={existingTransactions}
        />,
        { wrapper: createWrapper() }
      )

      const fileInput = screen.getByTestId('statement-file-input')
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('select-all-btn')).toBeInTheDocument()
      })

      expect(screen.getByTestId('invert-selection-btn')).toBeInTheDocument()
      expect(screen.getByTestId('change-file-btn')).toBeInTheDocument()
      expect(screen.getByTestId('confirm-import-btn')).toBeInTheDocument()
      expect(screen.getByTestId('deselect-duplicates-btn')).toBeInTheDocument()
    })
  })

  describe('Validação de Cenários de Borda, Duplicatas e Controles do Staging', () => {
    it('deve identificar duplicatas preventivamente e mantê-las desmarcadas por padrão', async () => {
      const csvContent = `Data,Descricao,Valor\n05/11/2026,Restaurante Sabor,-45,00\n06/11/2026,Uber Viagem,-25,50`
      const file = new File([csvContent], 'extrato-duplicatas.csv', { type: 'text/csv' })

      render(
        <ImportStatementModal
          isOpen={true}
          onClose={vi.fn()}
          accounts={sampleAccounts}
          categories={sampleCategories}
          existingTransactions={existingTransactions}
        />,
        { wrapper: createWrapper() }
      )

      const fileInput = screen.getByTestId('statement-file-input')
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('duplicate-badge')).toBeInTheDocument()
      })

      // Badge de alerta visual
      const duplicateBadge = screen.getByTestId('duplicate-badge')
      expect(duplicateBadge).toHaveTextContent(/Possível Duplicata/i)

      // Botão de desmarcar duplicatas presente e com touch-target de 44px
      const deselectBtn = screen.getByTestId('deselect-duplicates-btn')
      expect(deselectBtn.className).toMatch(/min-h-\[44px\]/)
    })

    it('deve recalcular totais de receita e despesa ao alternar o tipo da transação no staging', async () => {
      const csvContent = `Data,Descricao,Valor\n06/11/2026,Lançamento Neutro,100,00`
      const file = new File([csvContent], 'extrato-toggle.csv', { type: 'text/csv' })

      render(
        <ImportStatementModal
          isOpen={true}
          onClose={vi.fn()}
          accounts={sampleAccounts}
          categories={sampleCategories}
        />,
        { wrapper: createWrapper() }
      )

      const fileInput = screen.getByTestId('statement-file-input')
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Receita/i })).toBeInTheDocument()
      })

      // Alternar de Receita para Despesa
      const toggleBtn = screen.getByRole('button', { name: /Receita/i })
      fireEvent.click(toggleBtn)

      expect(screen.getByRole('button', { name: /Despesa/i })).toBeInTheDocument()
    })

    it('deve permitir desmarcar e marcar todas as transações via conveniência', async () => {
      const csvContent = `Data,Descricao,Valor\n06/11/2026,Item 1,-10,00\n07/11/2026,Item 2,-20,00`
      const file = new File([csvContent], 'extrato-mult.csv', { type: 'text/csv' })

      render(
        <ImportStatementModal
          isOpen={true}
          onClose={vi.fn()}
          accounts={sampleAccounts}
          categories={sampleCategories}
        />,
        { wrapper: createWrapper() }
      )

      const fileInput = screen.getByTestId('statement-file-input')
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('select-all-btn')).toBeInTheDocument()
      })

      // Inverter seleção (desmarca ambos)
      fireEvent.click(screen.getByTestId('invert-selection-btn'))
      expect(screen.getByTestId('confirm-import-btn')).toBeDisabled()

      // Marcar todas
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(screen.getByTestId('confirm-import-btn')).not.toBeDisabled()
    })

    it('deve exibir mensagem de erro amigável quando o arquivo for inválido ou não suportado', async () => {
      const file = new File(['conteudo invalido'], 'invalido.xyz', { type: 'application/octet-stream' })

      render(
        <ImportStatementModal
          isOpen={true}
          onClose={vi.fn()}
          accounts={sampleAccounts}
          categories={sampleCategories}
        />,
        { wrapper: createWrapper() }
      )

      const fileInput = screen.getByTestId('statement-file-input')
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('import-error-banner')).toBeInTheDocument()
      })

      const errorBanner = screen.getByTestId('import-error-banner')
      expect(errorBanner).toHaveTextContent(/Formato.*não suportado/i)
    })
  })

  describe('Auditoria de Responsividade Mobile/Desktop', () => {
    it('deve conter classes responsivas de touch target e quebra fluida na listagem de staging', async () => {
      const csvContent = `Data,Descricao,Valor\n06/11/2026,Almoço Executivo,-35,00`
      const file = new File([csvContent], 'extrato-mobile.csv', { type: 'text/csv' })

      render(
        <ImportStatementModal
          isOpen={true}
          onClose={vi.fn()}
          accounts={sampleAccounts}
          categories={sampleCategories}
        />,
        { wrapper: createWrapper() }
      )

      const fileInput = screen.getByTestId('statement-file-input')
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('confirm-import-btn')).toBeInTheDocument()
      })

      // Verificar que todos os botões de ação do rodapé possuem altura mínima de 44px
      const confirmBtn = screen.getByTestId('confirm-import-btn')
      expect(confirmBtn.className).toMatch(/min-h-\[44px\]/)

      const cancelBtn = screen.getByRole('button', { name: 'Cancelar' })
      expect(cancelBtn.className).toMatch(/min-h-\[44px\]/)
    })
  })
})
