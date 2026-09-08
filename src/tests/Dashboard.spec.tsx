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
})
