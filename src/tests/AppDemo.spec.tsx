import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import App from '../App'

describe('App — Modo Demonstração Rico (TDD)', () => {
  it('deve exibir os 4 cards da Visão Geral não-zerados e orçamentos preenchidos no Modo Demonstração', async () => {
    render(<App />)
    const demoBtn = await screen.findByTestId('welcome-demo-btn')
    fireEvent.click(demoBtn)

    expect(await screen.findByText(/modo de demonstração/i)).toBeInTheDocument()

    const payableCard = screen.getByTestId('overview-card-payable')
    const receivableCard = screen.getByTestId('overview-card-receivable')
    const creditCard = screen.getByTestId('overview-card-credit-card')
    const transfersCard = screen.getByTestId('overview-card-transfers')

    expect(within(payableCard).queryByText('R$ 0,00')).not.toBeInTheDocument()
    expect(within(receivableCard).queryByText('R$ 0,00')).not.toBeInTheDocument()
    expect(within(creditCard).queryByText('R$ 0,00')).not.toBeInTheDocument()
    expect(within(creditCard).getByText('1 cartão vinculado')).toBeInTheDocument()
    expect(within(transfersCard).queryByText('R$ 0,00')).not.toBeInTheDocument()

    // OnboardingChecklist não deve aparecer no modo demo
    expect(screen.queryByTestId('onboarding-checklist')).not.toBeInTheDocument()

    // Orçamento de Transporte deve ter consumo > R$ 0,00 no BudgetProgressWidget
    const budgetWidget = screen.getByTestId('widget-budget-progress')
    expect(within(budgetWidget).getByText('Transporte')).toBeInTheDocument()
    expect(within(budgetWidget).getByText('Alimentação')).toBeInTheDocument()
    expect(within(budgetWidget).getByText('Infraestrutura')).toBeInTheDocument()
    expect(within(budgetWidget).getByText(/R\$\s*320,00/)).toBeInTheDocument()
  })
})
