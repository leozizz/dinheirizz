import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from '../components/dashboard/Dashboard'

vi.mock('../components/dashboard/ForecastCard', () => ({
  ForecastCard: () => <div data-testid="mock-forecast-card" />
}))

vi.mock('../components/dashboard/CategoryDonutChart', () => ({
  CategoryDonutChart: () => <div data-testid="mock-category-donut" />
}))

vi.mock('../components/dashboard/BudgetProgressWidget', () => ({
  BudgetProgressWidget: () => <div data-testid="mock-budget-widget" />
}))

describe('Microcopy e Pluralização PT-BR (Unslop Copy TDD - Issue LEO-32)', () => {
  it('deve pluralizar corretamente cartões de crédito vinculados (0, 1 e N)', () => {
    // Caso 1: 1 cartão vinculado
    const { rerender } = render(
      <Dashboard
        totalBalance={1000}
        totalIncome={2000}
        totalExpense={500}
        transactions={[]}
        onActionClick={vi.fn()}
        accounts={[
          { id: 'c1', name: 'Nubank Ultravioleta', balance: -500, type: 'credit' }
        ]}
      />
    )

    expect(screen.getByText('1 cartão vinculado')).toBeInTheDocument()
    expect(screen.queryByText(/cartão\(ões\) vinculado\(s\)/i)).not.toBeInTheDocument()

    // Caso 2: 2 cartões vinculados
    rerender(
      <Dashboard
        totalBalance={1000}
        totalIncome={2000}
        totalExpense={500}
        transactions={[]}
        onActionClick={vi.fn()}
        accounts={[
          { id: 'c1', name: 'Nubank Ultravioleta', balance: -500, type: 'credit' },
          { id: 'c2', name: 'XP Infinite', balance: -1200, type: 'credit' }
        ]}
      />
    )

    expect(screen.getByText('2 cartões vinculados')).toBeInTheDocument()
    expect(screen.queryByText(/cartão\(ões\) vinculado\(s\)/i)).not.toBeInTheDocument()

    // Caso 3: 0 cartões vinculados
    rerender(
      <Dashboard
        totalBalance={1000}
        totalIncome={2000}
        totalExpense={500}
        transactions={[]}
        onActionClick={vi.fn()}
        accounts={[]}
      />
    )

    expect(screen.getByText('Sem faturas em aberto')).toBeInTheDocument()
  })

  it('deve pluralizar corretamente transferências (0, 1 e N) sem concatenar "movimentaçãoões"', () => {
    // Caso 1: 0 transferências
    const { rerender } = render(
      <Dashboard
        totalBalance={1000}
        totalIncome={2000}
        totalExpense={500}
        transactions={[]}
        onActionClick={vi.fn()}
      />
    )

    expect(screen.getByText('0 transferências')).toBeInTheDocument()
    expect(screen.queryByText(/movimentação/i)).not.toBeInTheDocument()

    // Caso 2: 1 transferência
    rerender(
      <Dashboard
        totalBalance={1000}
        totalIncome={2000}
        totalExpense={500}
        transactions={[
          {
            id: 'tx-tr-1',
            description: 'Transferência para Poupança',
            amount: -300,
            paid: true,
            occurred_at: '2026-09-01T10:00:00Z',
            category: { name: 'Transferência', color: '#3b82f6', icon: 'arrow-left-right' },
            type: 'transfer'
          }
        ]}
        onActionClick={vi.fn()}
      />
    )

    expect(screen.getByText('1 transferência')).toBeInTheDocument()

    // Caso 3: 2 transferências
    rerender(
      <Dashboard
        totalBalance={1000}
        totalIncome={2000}
        totalExpense={500}
        transactions={[
          {
            id: 'tx-tr-1',
            description: 'Transferência para Poupança',
            amount: -300,
            paid: true,
            occurred_at: '2026-09-01T10:00:00Z',
            category: { name: 'Transferência', color: '#3b82f6', icon: 'arrow-left-right' },
            type: 'transfer'
          },
          {
            id: 'tx-tr-2',
            description: 'Pix entre contas',
            amount: -150,
            paid: true,
            occurred_at: '2026-09-02T10:00:00Z',
            category: { name: 'Transferência', color: '#3b82f6', icon: 'arrow-left-right' },
            type: 'transfer'
          }
        ]}
        onActionClick={vi.fn()}
      />
    )

    expect(screen.getByText('2 transferências')).toBeInTheDocument()
  })
})
