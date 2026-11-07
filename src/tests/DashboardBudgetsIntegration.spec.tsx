import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { Dashboard } from '../components/dashboard/Dashboard'
import type { BudgetProgressItem } from '../hooks/useBudgets'

describe('Dashboard Budgets Integration (TDD)', () => {
  const mockBudgets: BudgetProgressItem[] = [
    {
      id: 'b-1',
      categoryId: 'cat-1',
      categoryName: 'Alimentação',
      categoryColor: '#10b981',
      categoryIcon: 'utensils',
      amountLimit: 1200,
      spentAmount: 600,
      remainingAmount: 600,
      percentageUsed: 50,
      isOverBudget: false,
      status: 'normal'
    }
  ]

  const mockSummary = {
    totalBudgetLimit: 1200,
    totalSpent: 600,
    totalRemaining: 600,
    overallPercentageUsed: 50
  }

  it('deve renderizar o widget de orçamentos no Dashboard quando fornecido', () => {
    const onOpenBudgetModal = vi.fn()
    render(
      <Dashboard
        totalBalance={5000}
        totalIncome={6000}
        totalExpense={1000}
        transactions={[]}
        onActionClick={vi.fn()}
        budgets={mockBudgets}
        budgetSummary={mockSummary}
        onOpenBudgetModal={onOpenBudgetModal}
      />
    )

    expect(screen.getByText('Orçamento Mensal')).toBeInTheDocument()
    expect(screen.getByText('Alimentação')).toBeInTheDocument()

    const adjustBtn = screen.getByRole('button', { name: /ajustar limites/i })
    fireEvent.click(adjustBtn)
    expect(onOpenBudgetModal).toHaveBeenCalledTimes(1)
  })
})
