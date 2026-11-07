import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { BudgetProgressWidget } from '../components/dashboard/BudgetProgressWidget'
import type { BudgetProgressItem } from '../hooks/useBudgets'

describe('BudgetProgressWidget Component (TDD)', () => {
  const mockBudgets: BudgetProgressItem[] = [
    {
      id: 'b-1',
      categoryId: 'cat-1',
      categoryName: 'Alimentação',
      categoryColor: '#10b981',
      categoryIcon: 'utensils',
      amountLimit: 1000,
      spentAmount: 500,
      remainingAmount: 500,
      percentageUsed: 50,
      isOverBudget: false,
      status: 'normal'
    },
    {
      id: 'b-2',
      categoryId: 'cat-2',
      categoryName: 'Lazer',
      categoryColor: '#f59e0b',
      categoryIcon: 'smile',
      amountLimit: 800,
      spentAmount: 680,
      remainingAmount: 120,
      percentageUsed: 85,
      isOverBudget: false,
      status: 'warning'
    },
    {
      id: 'b-3',
      categoryId: 'cat-3',
      categoryName: 'Transporte',
      categoryColor: '#ef4444',
      categoryIcon: 'car',
      amountLimit: 400,
      spentAmount: 500,
      remainingAmount: 0,
      percentageUsed: 125,
      isOverBudget: true,
      status: 'exceeded'
    }
  ]

  it('deve renderizar empty state com botão de ação quando não houver orçamentos', () => {
    const onOpenModal = vi.fn()
    render(
      <BudgetProgressWidget
        budgets={[]}
        totalBudgetLimit={0}
        totalSpent={0}
        totalRemaining={0}
        overallPercentageUsed={0}
        onOpenBudgetModal={onOpenModal}
      />
    )

    expect(screen.getByText(/nenhum orçamento definido/i)).toBeInTheDocument()
    const defineBtn = screen.getByRole('button', { name: /definir orçamentos/i })
    fireEvent.click(defineBtn)
    expect(onOpenModal).toHaveBeenCalledTimes(1)
  })

  it('deve renderizar resumo consolidado e envelopes quando houver orçamentos', () => {
    render(
      <BudgetProgressWidget
        budgets={mockBudgets}
        totalBudgetLimit={2200}
        totalSpent={1680}
        totalRemaining={520}
        overallPercentageUsed={76.4}
        onOpenBudgetModal={vi.fn()}
      />
    )

    expect(screen.getByText('Alimentação')).toBeInTheDocument()
    expect(screen.getByText('Lazer')).toBeInTheDocument()
    expect(screen.getByText('Transporte')).toBeInTheDocument()

    // Status / Badges esperados
    expect(screen.getByText(/50%/i)).toBeInTheDocument()
    expect(screen.getByText(/85%/i)).toBeInTheDocument()
    expect(screen.getByText(/125%/i)).toBeInTheDocument()
    expect(screen.getByText(/estourado/i)).toBeInTheDocument()
  })

  it('deve chamar onOpenBudgetModal ao clicar no botão de ajuste de limites', () => {
    const onOpenModal = vi.fn()
    render(
      <BudgetProgressWidget
        budgets={mockBudgets}
        totalBudgetLimit={2200}
        totalSpent={1680}
        totalRemaining={520}
        overallPercentageUsed={76.4}
        onOpenBudgetModal={onOpenModal}
      />
    )

    const adjustBtn = screen.getByRole('button', { name: /ajustar limites/i })
    fireEvent.click(adjustBtn)
    expect(onOpenModal).toHaveBeenCalledTimes(1)
  })
})
