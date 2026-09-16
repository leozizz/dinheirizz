import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccountsBar } from '../components/dashboard/AccountsBar'
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

  it('exibe a identificação/sigla do banco inferida pelo nome ou instituição', () => {
    render(
      <AccountsBar
        accounts={mockAccounts}
        selectedAccountId={null}
        onSelectAccount={vi.fn()}
        onNewAccount={vi.fn()}
      />
    )

    expect(screen.getByText('NU')).toBeInTheDocument()
    expect(screen.getByText('IT')).toBeInTheDocument()
  })
})

