import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccountsBar } from '../components/dashboard/AccountsBar'
import { AccountModal } from '../components/modals/AccountModal'
import type { AccountItem } from '../hooks/useAccounts'

describe('AccountsBar Component', () => {
  const mockAccounts: AccountItem[] = [
    {
      id: 'acc-1',
      name: 'Nubank Principal',
      type: 'checking',
      balance: 1540.5,
      bank: 'Nubank',
      color: '#820ad1'
    },
    {
      id: 'acc-2',
      name: 'Reserva Itaú',
      type: 'savings',
      balance: 5000.0,
      bank: 'Itaú',
      color: '#ec7000'
    }
  ]

  it('renders "Todas as contas" and all account items with their balances', () => {
    render(
      <AccountsBar
        accounts={mockAccounts}
        selectedAccountId={null}
        onSelectAccount={vi.fn()}
        onNewAccount={vi.fn()}
      />
    )

    expect(screen.getByText('Todas as contas')).toBeInTheDocument()
    expect(screen.getByText('Nubank Principal')).toBeInTheDocument()
    expect(screen.getByText('Reserva Itaú')).toBeInTheDocument()
    expect(screen.getByText(/1\.540,50/)).toBeInTheDocument()
    expect(screen.getByText(/5\.000,00/)).toBeInTheDocument()
  })

  it('triggers onSelectAccount when clicking an account or "Todas as contas"', () => {
    const handleSelect = vi.fn()
    render(
      <AccountsBar
        accounts={mockAccounts}
        selectedAccountId={null}
        onSelectAccount={handleSelect}
        onNewAccount={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Nubank Principal'))
    expect(handleSelect).toHaveBeenCalledWith('acc-1')

    fireEvent.click(screen.getByText('Todas as contas'))
    expect(handleSelect).toHaveBeenCalledWith(null)
  })

  it('highlights the selected account', () => {
    render(
      <AccountsBar
        accounts={mockAccounts}
        selectedAccountId="acc-1"
        onSelectAccount={vi.fn()}
        onNewAccount={vi.fn()}
      />
    )

    const nubankBtn = screen.getByRole('button', { name: /Nubank Principal/i })
    expect(nubankBtn).toHaveAttribute('data-active', 'true')
  })

  it('triggers onNewAccount when clicking "+ Nova Conta"', () => {
    const handleNew = vi.fn()
    render(
      <AccountsBar
        accounts={mockAccounts}
        selectedAccountId={null}
        onSelectAccount={vi.fn()}
        onNewAccount={handleNew}
      />
    )

    const newAccBtn = screen.getByRole('button', { name: /Nova Conta/i })
    fireEvent.click(newAccBtn)
    expect(handleNew).toHaveBeenCalled()
  })

  it('exibe o BankLogo correspondente ao banco inferido pelo nome ou instituição e monograma para conta genérica', () => {
    const accountsWithGeneric: AccountItem[] = [
      ...mockAccounts,
      {
        id: 'acc-3',
        name: 'Carteira Física',
        type: 'checking',
        balance: 200,
        color: '#3b82f6'
      }
    ]

    render(
      <AccountsBar
        accounts={accountsWithGeneric}
        selectedAccountId={null}
        onSelectAccount={vi.fn()}
        onNewAccount={vi.fn()}
      />
    )

    const nubankLogo = screen.getByTestId('bank-logo-nubank')
    expect(nubankLogo).toHaveAttribute('aria-label', 'Logo Nubank')
    expect(nubankLogo.querySelector('svg')).not.toBeNull()

    const itauLogo = screen.getByTestId('bank-logo-itau')
    expect(itauLogo).toHaveAttribute('aria-label', 'Logo Itaú')
    expect(itauLogo.querySelector('svg')).not.toBeNull()

    const genericLogo = screen.getByTestId('bank-logo-generic')
    expect(genericLogo.textContent).toContain('CF')
  })

  it('exibe preview em tempo real do banco no AccountModal ao digitar nome ou instituição', () => {
    render(
      <AccountModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const preview = screen.getByTestId('account-bank-preview')
    expect(preview).toBeInTheDocument()

    const nameInput = screen.getByPlaceholderText('Ex: Nubank Principal, Itaú Reserva')
    fireEvent.change(nameInput, { target: { value: 'Nubank Ultravioleta' } })

    expect(screen.getByTestId('bank-logo-nubank')).toBeInTheDocument()
    expect(preview.textContent).toContain('Nubank')
  })
})

