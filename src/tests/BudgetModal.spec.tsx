import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { BudgetModal } from '../components/modals/BudgetModal'

describe('BudgetModal Component (TDD)', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Alimentação', type: 'expense', color: '#10b981', icon: 'utensils' },
    { id: 'cat-2', name: 'Transporte', type: 'expense', color: '#3b82f6', icon: 'car' },
    { id: 'cat-3', name: 'Salário', type: 'income', color: '#8b5cf6', icon: 'wallet' }
  ]

  const mockBudgets = [
    {
      id: 'b-1',
      categoryId: 'cat-1',
      categoryName: 'Alimentação',
      categoryColor: '#10b981',
      categoryIcon: 'utensils',
      amountLimit: 1200,
      spentAmount: 800,
      remainingAmount: 400,
      percentageUsed: 66.7,
      isOverBudget: false,
      status: 'normal' as const
    }
  ]

  it('não deve renderizar quando isOpen for false', () => {
    const { container } = render(
      <BudgetModal
        isOpen={false}
        onClose={vi.fn()}
        categories={mockCategories}
        budgets={mockBudgets}
        onSaveBudget={vi.fn()}
        onDeleteBudget={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('deve listar apenas categorias de despesa quando isOpen for true', () => {
    render(
      <BudgetModal
        isOpen={true}
        onClose={vi.fn()}
        categories={mockCategories}
        budgets={mockBudgets}
        onSaveBudget={vi.fn()}
        onDeleteBudget={vi.fn()}
      />
    )

    expect(screen.getByText('Alimentação')).toBeInTheDocument()
    expect(screen.getByText('Transporte')).toBeInTheDocument()
    // 'Salário' é income e não deve aparecer na lista de envelopes de despesa
    expect(screen.queryByText('Salário')).not.toBeInTheDocument()
  })

  it('deve chamar onClose ao clicar no botão fechar ou pressionar Escape', () => {
    const onClose = vi.fn()
    render(
      <BudgetModal
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        budgets={mockBudgets}
        onSaveBudget={vi.fn()}
        onDeleteBudget={vi.fn()}
      />
    )

    const closeBtn = screen.getByRole('button', { name: /fechar/i })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('deve permitir alterar valor e chamar onSaveBudget', () => {
    const onSaveBudget = vi.fn()
    render(
      <BudgetModal
        isOpen={true}
        onClose={vi.fn()}
        categories={mockCategories}
        budgets={mockBudgets}
        onSaveBudget={onSaveBudget}
        onDeleteBudget={vi.fn()}
      />
    )

    // Alimentação tem teto de 1200
    const input = screen.getByDisplayValue('1.200,00')
    fireEvent.change(input, { target: { value: '1.500,00' } })

    const saveBtn = screen.getByRole('button', { name: /salvar alimentação/i })
    fireEvent.click(saveBtn)

    expect(onSaveBudget).toHaveBeenCalledWith({
      categoryId: 'cat-1',
      amountLimit: 1500
    })
  })

  it('deve chamar onDeleteBudget ao clicar no botão de remover orçamento', () => {
    const onDeleteBudget = vi.fn()
    render(
      <BudgetModal
        isOpen={true}
        onClose={vi.fn()}
        categories={mockCategories}
        budgets={mockBudgets}
        onSaveBudget={vi.fn()}
        onDeleteBudget={onDeleteBudget}
      />
    )

    const removeBtn = screen.getByRole('button', { name: /remover orçamento de alimentação/i })
    fireEvent.click(removeBtn)

    expect(onDeleteBudget).toHaveBeenCalledWith('b-1')
  })
})
