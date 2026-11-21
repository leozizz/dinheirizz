import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingChecklist } from '../components/dashboard/OnboardingChecklist'

describe('OnboardingChecklist (TDD)', () => {
  it('deve renderizar os 3 passos com todos os data-testid obrigatórios e acionar os callbacks', () => {
    const onOpenAccountModal = vi.fn()
    const onOpenTransactionModal = vi.fn()
    const onOpenImportModal = vi.fn()
    const onOpenBudgetModal = vi.fn()
    const onDismiss = vi.fn()

    render(
      <OnboardingChecklist
        hasAccount={false}
        onOpenAccountModal={onOpenAccountModal}
        onOpenTransactionModal={onOpenTransactionModal}
        onOpenImportModal={onOpenImportModal}
        onOpenBudgetModal={onOpenBudgetModal}
        onDismiss={onDismiss}
      />
    )

    expect(screen.getByTestId('onboarding-checklist')).toBeInTheDocument()

    const accountBtn = screen.getByTestId('onboarding-step-account-btn')
    const txBtn = screen.getByTestId('onboarding-step-transaction-btn')
    const importBtn = screen.getByTestId('onboarding-step-import-btn')
    const budgetBtn = screen.getByTestId('onboarding-step-budget-btn')
    const dismissBtn = screen.getByTestId('onboarding-dismiss-btn')

    expect(accountBtn).toBeInTheDocument()
    expect(txBtn).toBeInTheDocument()
    expect(importBtn).toBeInTheDocument()
    expect(budgetBtn).toBeInTheDocument()
    expect(dismissBtn).toBeInTheDocument()

    fireEvent.click(accountBtn)
    expect(onOpenAccountModal).toHaveBeenCalledTimes(1)

    fireEvent.click(txBtn)
    expect(onOpenTransactionModal).toHaveBeenCalledTimes(1)

    fireEvent.click(importBtn)
    expect(onOpenImportModal).toHaveBeenCalledTimes(1)

    fireEvent.click(budgetBtn)
    expect(onOpenBudgetModal).toHaveBeenCalledTimes(1)

    fireEvent.click(dismissBtn)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('deve indicar visualmente o passo 1 concluído quando hasAccount for true', () => {
    render(
      <OnboardingChecklist
        hasAccount={true}
        onOpenAccountModal={vi.fn()}
        onOpenTransactionModal={vi.fn()}
        onOpenImportModal={vi.fn()}
        onOpenBudgetModal={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    const accountBtn = screen.getByTestId('onboarding-step-account-btn')
    expect(accountBtn).toHaveAttribute('data-completed', 'true')
  })
})
