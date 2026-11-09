import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { BudgetProgressWidget } from '../components/dashboard/BudgetProgressWidget'
import { BudgetModal } from '../components/modals/BudgetModal'
import type { BudgetProgressItem } from '../hooks/useBudgets'

describe('QA & A11y Suite — Orçamentos Mensais e Widgets (#31)', () => {
  const sampleBudgets: BudgetProgressItem[] = [
    {
      id: 'b-normal',
      categoryId: 'cat-alimentacao',
      categoryName: 'Alimentação',
      categoryColor: '#10b981',
      categoryIcon: 'utensils',
      amountLimit: 1000,
      spentAmount: 450,
      remainingAmount: 550,
      percentageUsed: 45,
      isOverBudget: false,
      status: 'normal'
    },
    {
      id: 'b-warning',
      categoryId: 'cat-lazer',
      categoryName: 'Lazer',
      categoryColor: '#f59e0b',
      categoryIcon: 'smile',
      amountLimit: 800,
      spentAmount: 640,
      remainingAmount: 160,
      percentageUsed: 80,
      isOverBudget: false,
      status: 'warning'
    },
    {
      id: 'b-exceeded',
      categoryId: 'cat-transporte',
      categoryName: 'Transporte',
      categoryColor: '#ef4444',
      categoryIcon: 'car',
      amountLimit: 500,
      spentAmount: 650,
      remainingAmount: 0,
      percentageUsed: 130,
      isOverBudget: true,
      status: 'exceeded'
    }
  ]

  const sampleCategories = [
    { id: 'cat-alimentacao', name: 'Alimentação', type: 'expense', color: '#10b981' },
    { id: 'cat-lazer', name: 'Lazer', type: 'expense', color: '#f59e0b' },
    { id: 'cat-transporte', name: 'Transporte', type: 'expense', color: '#ef4444' }
  ]

  describe('Auditoria de Acessibilidade (A11y) & Touch Targets (WCAG 2.1 AA)', () => {
    it('deve garantir que todos os botões do BudgetProgressWidget possuam touch target mínimo de 44x44px', () => {
      render(
        <BudgetProgressWidget
          budgets={sampleBudgets}
          totalBudgetLimit={2300}
          totalSpent={1740}
          totalRemaining={560}
          overallPercentageUsed={75.7}
          onOpenBudgetModal={vi.fn()}
        />
      )

      const adjustBtn = screen.getByTestId('open-budget-modal-btn')
      expect(adjustBtn.className).toMatch(/min-h-\[44px\]/)
      expect(adjustBtn.className).toMatch(/min-w-\[44px\]/)
    })

    it('deve garantir touch targets mínimos de 44x44px no Empty State do widget', () => {
      render(
        <BudgetProgressWidget
          budgets={[]}
          totalBudgetLimit={0}
          totalSpent={0}
          totalRemaining={0}
          overallPercentageUsed={0}
          onOpenBudgetModal={vi.fn()}
        />
      )

      const defineBtn = screen.getByTestId('open-budget-modal-btn')
      expect(defineBtn.className).toMatch(/min-h-\[44px\]/)
      expect(defineBtn.className).toMatch(/min-w-\[44px\]/)
    })

    it('deve garantir atributos ARIA e touch targets mínimos de 44x44px no BudgetModal', () => {
      render(
        <BudgetModal
          isOpen={true}
          onClose={vi.fn()}
          categories={sampleCategories}
          budgets={sampleBudgets}
          onSaveBudget={vi.fn()}
          onDeleteBudget={vi.fn()}
        />
      )

      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby', 'budget-modal-title')

      // Botão fechar modal
      const closeBtn = screen.getByTestId('btn-close-budget-modal')
      expect(closeBtn).toHaveAttribute('aria-label', 'Fechar modal')
      expect(closeBtn.className).toMatch(/min-h-\[44px\]/)
      expect(closeBtn.className).toMatch(/min-w-\[44px\]/)

      // Botões de salvar para cada categoria
      sampleCategories.forEach((cat) => {
        const saveBtn = screen.getByTestId(`btn-save-budget-${cat.id}`)
        expect(saveBtn).toHaveAttribute('aria-label', `Salvar ${cat.name}`)
        expect(saveBtn.className).toMatch(/min-h-\[44px\]/)
        expect(saveBtn.className).toMatch(/min-w-\[44px\]/)

        const input = screen.getByTestId(`input-budget-${cat.id}`)
        expect(input).toHaveAttribute('aria-label', `Teto para ${cat.name}`)
      })

      // Botões de remover orçamento
      const deleteBtn = screen.getByTestId('delete-budget-btn-Alimentação')
      expect(deleteBtn).toHaveAttribute('aria-label', 'Remover orçamento de Alimentação')
      expect(deleteBtn.className).toMatch(/min-h-\[44px\]/)
      expect(deleteBtn.className).toMatch(/min-w-\[44px\]/)

      // Botão Concluir no rodapé
      const finishBtn = screen.getByTestId('btn-finish-budget-modal')
      expect(finishBtn.className).toMatch(/min-h-\[44px\]/)
    })
  })

  describe('Auditoria de data-testid para Automação', () => {
    it('deve conter data-testids obrigatórios em todos os componentes interativos do fluxo', () => {
      const { rerender } = render(
        <BudgetProgressWidget
          budgets={[]}
          totalBudgetLimit={0}
          totalSpent={0}
          totalRemaining={0}
          overallPercentageUsed={0}
          onOpenBudgetModal={vi.fn()}
        />
      )

      expect(screen.getByTestId('widget-budget-progress-empty')).toBeInTheDocument()
      expect(screen.getByTestId('open-budget-modal-btn')).toBeInTheDocument()

      rerender(
        <BudgetProgressWidget
          budgets={sampleBudgets}
          totalBudgetLimit={2300}
          totalSpent={1740}
          totalRemaining={560}
          overallPercentageUsed={75.7}
          onOpenBudgetModal={vi.fn()}
        />
      )

      expect(screen.getByTestId('widget-budget-progress')).toBeInTheDocument()
      sampleBudgets.forEach((b) => {
        expect(screen.getByTestId(`budget-envelope-${b.categoryId}`)).toBeInTheDocument()
      })
    })
  })

  describe('Resiliência e Comportamento Visual em Diferentes Estados', () => {
    it('deve renderizar skeleton pulse quando isLoading for true sem quebrar o layout', () => {
      const { container } = render(
        <BudgetProgressWidget
          budgets={[]}
          totalBudgetLimit={0}
          totalSpent={0}
          totalRemaining={0}
          overallPercentageUsed={0}
          onOpenBudgetModal={vi.fn()}
          isLoading={true}
        />
      )

      const skeleton = container.querySelector('.animate-pulse')
      expect(skeleton).toBeInTheDocument()
    })

    it('deve formatar corretamente categorias excedidas com badge pulsante e excesso calculado', () => {
      render(
        <BudgetProgressWidget
          budgets={sampleBudgets}
          totalBudgetLimit={2300}
          totalSpent={1740}
          totalRemaining={560}
          overallPercentageUsed={75.7}
          onOpenBudgetModal={vi.fn()}
        />
      )

      // Categoria Transporte excedeu em R$ 150
      expect(screen.getByText(/130% • Estourado \(\+R\$\s*150,00\)/)).toBeInTheDocument()
      expect(screen.getByText(/80% \(Atenção\)/)).toBeInTheDocument()
      expect(screen.getByText(/45%/)).toBeInTheDocument()
    })
  })
})
