import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { CategoryDonutChart } from '../components/dashboard/CategoryDonutChart'
import type { TransactionItem } from '../components/dashboard/Dashboard'

const mockExpenses: TransactionItem[] = [
  {
    id: 'tx-1',
    description: 'Aluguel',
    amount: -1500,
    paid: true,
    occurred_at: '2026-09-01T10:00:00Z',
    category: { name: 'Moradia', color: '#f43f5e' },
    type: 'expense'
  },
  {
    id: 'tx-2',
    description: 'Supermercado',
    amount: -1000,
    paid: true,
    occurred_at: '2026-09-02T10:00:00Z',
    category: { name: 'Alimentação', color: '#f59e0b' },
    type: 'expense'
  },
  {
    id: 'tx-3',
    description: 'Internet Fibra',
    amount: -500,
    paid: false,
    status: 'pending',
    occurred_at: '2026-09-03T10:00:00Z',
    category: { name: 'Serviços', color: '#06b6d4' },
    type: 'expense'
  }
]

const mockIncomes: TransactionItem[] = [
  {
    id: 'tx-4',
    description: 'Salário Tech',
    amount: 8000,
    paid: true,
    occurred_at: '2026-09-05T10:00:00Z',
    category: { name: 'Salário', color: '#10b981' },
    type: 'income'
  },
  {
    id: 'tx-5',
    description: 'Consultoria Externa',
    amount: 2000,
    paid: true,
    occurred_at: '2026-09-06T10:00:00Z',
    category: { name: 'Freelance', color: '#8b5cf6' },
    type: 'income'
  }
]

const allTransactions = [...mockExpenses, ...mockIncomes]

describe('CategoryDonutChart Component (TDD)', () => {
  it('deve renderizar o título do bloco e os seletores com indicadores deslizantes', () => {
    render(<CategoryDonutChart transactions={allTransactions} />)

    expect(screen.getByText('Distribuição por Categoria')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^despesas$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^receitas$/i })).toBeInTheDocument()
  })

  it('deve exibir despesas por padrão com o total central e as fatias de categorias', () => {
    render(<CategoryDonutChart transactions={allTransactions} />)

    // Total de despesas: 1500 + 1000 + 500 = 3000
    expect(screen.getByTestId('donut-center-total')).toHaveTextContent('R$ 3.000,00')
    expect(screen.getByText('Moradia')).toBeInTheDocument()
    expect(screen.getByText('Alimentação')).toBeInTheDocument()
    expect(screen.getByText('Serviços')).toBeInTheDocument()

    // 1500 / 3000 = 50.0%
    expect(screen.getByText(/50\.0%/)).toBeInTheDocument()
    // 1000 / 3000 = 33.3%
    expect(screen.getByText(/33\.3%/)).toBeInTheDocument()
    // 500 / 3000 = 16.7%
    expect(screen.getByText(/16\.7%/)).toBeInTheDocument()
  })

  it('deve alternar para receitas ao clicar no botão de receitas ou nas bolinhas de slide', () => {
    render(<CategoryDonutChart transactions={allTransactions} />)

    const btnReceitas = screen.getByTestId('donut-btn-incomes')
    fireEvent.click(btnReceitas)

    // Total de receitas: 8000 + 2000 = 10000
    expect(screen.getByTestId('donut-center-total')).toHaveTextContent('R$ 10.000,00')
    expect(screen.getByText('Salário')).toBeInTheDocument()
    expect(screen.getByText('Freelance')).toBeInTheDocument()
    expect(screen.getByText(/80\.0%/)).toBeInTheDocument()
    expect(screen.getByText(/20\.0%/)).toBeInTheDocument()
  })

  it('deve exibir estado vazio elegante quando não há despesas ou receitas', () => {
    render(<CategoryDonutChart transactions={[]} />)

    expect(screen.getByText('Sem lançamentos no período')).toBeInTheDocument()
    expect(screen.getByTestId('donut-center-total')).toHaveTextContent('R$ 0,00')
  })
})
