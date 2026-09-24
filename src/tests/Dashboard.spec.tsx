import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Dashboard } from '../components/dashboard/Dashboard'
import { QuickActions } from '../components/dashboard/QuickActions'

const mockTransactions = [
  {
    id: 'tx-1',
    description: 'Salário Mensal',
    amount: 8500.0,
    paid: true,
    occurred_at: '2026-09-01T10:00:00Z',
    category: { name: 'Renda', color: '#10b981', icon: 'wallet' },
    type: 'income'
  },
  {
    id: 'tx-2',
    description: 'Supermercado Mensal',
    amount: -650.5,
    paid: true,
    occurred_at: '2026-09-02T14:30:00Z',
    category: { name: 'Alimentação', color: '#f59e0b', icon: 'utensils' },
    type: 'expense'
  }
]

describe('Dashboard & QuickActions (TDD)', () => {
  it('deve renderizar o card de saldo principal com valor formatado e resumo', () => {
    render(
      <Dashboard
        totalBalance={12450.75}
        totalIncome={15000.0}
        totalExpense={2549.25}
        transactions={mockTransactions}
        onActionClick={vi.fn()}
      />
    )

    expect(screen.getByText('Saldo total disponível')).toBeInTheDocument()
    expect(screen.getByText('R$ 12.450,75')).toBeInTheDocument()
    expect(screen.getByText('Receitas do Mês')).toBeInTheDocument()
    expect(screen.getByText('Despesas do Mês')).toBeInTheDocument()
  })

  it('deve renderizar as 4 ações rápidas: Receber, Despesa, Transferir e Pix', () => {
    const handleAction = vi.fn()
    render(<QuickActions onAction={handleAction} />)

    const btnReceber = screen.getByRole('button', { name: /receber/i })
    const btnDespesa = screen.getByRole('button', { name: /despesa/i })
    const btnTransferir = screen.getByRole('button', { name: /transferir/i })
    const btnPix = screen.getByRole('button', { name: /pix/i })

    expect(btnReceber).toBeInTheDocument()
    expect(btnDespesa).toBeInTheDocument()
    expect(btnTransferir).toBeInTheDocument()
    expect(btnPix).toBeInTheDocument()

    fireEvent.click(btnReceber)
    expect(handleAction).toHaveBeenCalledWith('income')

    fireEvent.click(btnDespesa)
    expect(handleAction).toHaveBeenCalledWith('expense')

    fireEvent.click(btnTransferir)
    expect(handleAction).toHaveBeenCalledWith('transfer')

    fireEvent.click(btnPix)
    expect(handleAction).toHaveBeenCalledWith('pix')
  })

  it('deve listar as transações recentes com descrição e formatação correta', () => {
    render(
      <Dashboard
        totalBalance={12450.75}
        totalIncome={15000.0}
        totalExpense={2549.25}
        transactions={mockTransactions}
        onActionClick={vi.fn()}
      />
    )

    expect(screen.getByText('Salário Mensal')).toBeInTheDocument()
    expect(screen.getByText('Supermercado Mensal')).toBeInTheDocument()
    expect(screen.getByText('Renda')).toBeInTheDocument()
    expect(screen.getByText('Alimentação')).toBeInTheDocument()
  })

  it('deve exibir AccountsBar e filtrar transações quando uma conta é selecionada', () => {
    const mockAccountsList = [
      { id: 'acc-1', name: 'Nubank Principal', balance: 3500.0, type: 'checking' as const },
      { id: 'acc-2', name: 'Inter Reserva', balance: 8950.75, type: 'savings' as const }
    ]

    const transactionsWithAccounts = [
      {
        id: 'tx-1',
        description: 'Salário Nubank',
        amount: 3500.0,
        paid: true,
        occurred_at: '2026-09-01T10:00:00Z',
        type: 'income',
        accountId: 'acc-1'
      },
      {
        id: 'tx-2',
        description: 'Rendimento Inter',
        amount: 150.0,
        paid: true,
        occurred_at: '2026-09-02T10:00:00Z',
        type: 'income',
        accountId: 'acc-2'
      }
    ]

    const handleSelect = vi.fn()

    const { rerender } = render(
      <Dashboard
        totalBalance={12450.75}
        totalIncome={15000.0}
        totalExpense={2549.25}
        transactions={transactionsWithAccounts}
        onActionClick={vi.fn()}
        accounts={mockAccountsList}
        selectedAccountId={null}
        onSelectAccount={handleSelect}
        onNewAccount={vi.fn()}
      />
    )

    expect(screen.getByText('Suas Contas')).toBeInTheDocument()
    expect(screen.getByText('Nubank Principal')).toBeInTheDocument()
    expect(screen.getByText('Inter Reserva')).toBeInTheDocument()
    expect(screen.getByText('Salário Nubank')).toBeInTheDocument()
    expect(screen.getByText('Rendimento Inter')).toBeInTheDocument()

    // Quando selecionamos acc-1
    rerender(
      <Dashboard
        totalBalance={12450.75}
        totalIncome={15000.0}
        totalExpense={2549.25}
        transactions={transactionsWithAccounts}
        onActionClick={vi.fn()}
        accounts={mockAccountsList}
        selectedAccountId="acc-1"
        onSelectAccount={handleSelect}
        onNewAccount={vi.fn()}
      />
    )

    // Apenas transações da conta acc-1 devem aparecer
    expect(screen.getByText('Salário Nubank')).toBeInTheDocument()
    expect(screen.queryByText('Rendimento Inter')).not.toBeInTheDocument()
    // O título e o saldo devem refletir a conta selecionada
    expect(screen.getByText('Saldo da conta Nubank Principal')).toBeInTheDocument()
    expect(screen.getAllByText('R$ 3.500,00').length).toBeGreaterThanOrEqual(1)
  })

  it('deve renderizar o botão "Carregar mais movimentações" quando hasMore={true} e acionar onLoadMore ao clicar', () => {
    const onLoadMore = vi.fn()
    render(
      <Dashboard
        totalBalance={1000}
        totalIncome={1500}
        totalExpense={500}
        transactions={mockTransactions}
        onActionClick={vi.fn()}
        hasMore={true}
        onLoadMore={onLoadMore}
        totalCount={10}
      />
    )

    const loadMoreBtn = screen.getByRole('button', { name: /carregar mais movimentações/i })
    expect(loadMoreBtn).toBeInTheDocument()
    expect(screen.getByText(/2 de 10 registros/i)).toBeInTheDocument()

    fireEvent.click(loadMoreBtn)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('deve exibir spinner e desabilitar o botão quando isLoadingMore={true}', () => {
    render(
      <Dashboard
        totalBalance={1000}
        totalIncome={1500}
        totalExpense={500}
        transactions={mockTransactions}
        onActionClick={vi.fn()}
        hasMore={true}
        isLoadingMore={true}
        onLoadMore={vi.fn()}
      />
    )

    const loadingBtn = screen.getByRole('button', { name: /carregando movimentações.../i })
    expect(loadingBtn).toBeDisabled()
  })

  it('deve exibir mensagem de conclusão quando hasMore={false}', () => {
    render(
      <Dashboard
        totalBalance={1000}
        totalIncome={1500}
        totalExpense={500}
        transactions={mockTransactions}
        onActionClick={vi.fn()}
        hasMore={false}
        totalCount={2}
      />
    )

    expect(screen.queryByRole('button', { name: /carregar mais movimentações/i })).not.toBeInTheDocument()
    expect(screen.getByText(/você visualizou todas as 2 movimentações/i)).toBeInTheDocument()
  })
})

