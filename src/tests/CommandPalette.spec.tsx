import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CommandPalette } from '../components/modals/CommandPalette'
import type { AccountItem } from '../hooks/useAccounts'
import type { CategoryItem } from '../hooks/useCategories'
import type { TransactionItem } from '../components/dashboard/Dashboard'
import type { CreditCard } from '../types/database.types'

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe = () => {}
    unobserve = () => {}
    disconnect = () => {}
  }
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

describe('CommandPalette (TDD)', () => {
  const accounts: AccountItem[] = [
    {
      id: 'acc-nubank',
      name: 'Nubank Conta',
      type: 'checking',
      balance: 2500,
      color: '#820ad1'
    },
    {
      id: 'acc-itau',
      name: 'Itaú Reserva',
      type: 'savings',
      balance: 12000,
      color: '#ec7000'
    }
  ]

  const creditCards: CreditCard[] = [
    {
      id: 'card-ultra',
      name: 'Nubank Ultravioleta',
      brand: 'mastercard',
      closingDay: 10,
      dueDay: 17,
      limitAmount: 10000,
      availableLimit: 8500,
      usedLimit: 1500,
      lastFourDigits: '1234',
      accountId: 'acc-nubank',
      color: '#6366f1'
    }
  ]

  const categories: CategoryItem[] = [
    { id: 'cat-alimentacao', name: 'Alimentação', type: 'expense' },
    { id: 'cat-salario', name: 'Salário', type: 'income' }
  ]

  const transactions: TransactionItem[] = [
    {
      id: 'tx-1',
      description: 'Supermercado Extra',
      amount: -210.4,
      paid: true,
      occurred_at: '2026-11-20',
      categoryId: 'cat-alimentacao',
      category: { name: 'Alimentação' },
      type: 'expense'
    },
    {
      id: 'tx-2',
      description: 'Salário Mensal',
      amount: 6500,
      paid: true,
      occurred_at: '2026-11-05',
      categoryId: 'cat-salario',
      category: { name: 'Salário' },
      type: 'income'
    }
  ]

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    accounts,
    creditCards,
    categories,
    transactions,
    resolvedTheme: 'dark' as const,
    viewMode: 'feed' as const,
    onQuickCreateTransaction: vi.fn(),
    onOpenTransactionModal: vi.fn(),
    onSelectAccount: vi.fn(),
    onToggleTheme: vi.fn(),
    onOpenImportStatement: vi.fn(),
    onOpenExportReport: vi.fn(),
    onToggleViewMode: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não deve renderizar quando isOpen for false', () => {
    render(<CommandPalette {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('command-palette-dialog')).toBeNull()
  })

  it('deve renderizar quando isOpen for true e fechar via botão fechar ou tecla Escape', () => {
    render(<CommandPalette {...defaultProps} />)
    expect(screen.getByTestId('command-palette-dialog')).toBeTruthy()
    expect(screen.getByTestId('command-palette-input')).toBeTruthy()

    fireEvent.click(screen.getByTestId('command-palette-close-btn'))
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2)
  })

  it('deve exibir preview NLP em tempo real ao digitar "Mercado 185,50 ontem nubank" e criar ao clicar ou pressionar Enter', async () => {
    render(<CommandPalette {...defaultProps} />)
    const input = screen.getByTestId('command-palette-input')

    fireEvent.change(input, { target: { value: 'Mercado 185,50 ontem nubank' } })

    const preview = screen.getByTestId('command-nlp-preview')
    expect(preview).toBeTruthy()
    expect(preview.textContent).toContain('Mercado')
    expect(preview.textContent).toContain('185,50')
    expect(preview.textContent).toContain('Nubank Conta')
    expect(preview.textContent).toContain('Alimentação')

    fireEvent.click(screen.getByTestId('command-nlp-submit-btn'))
    await waitFor(() => {
      expect(defaultProps.onQuickCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Mercado',
          amount: 185.5,
          type: 'expense',
          accountId: 'acc-nubank',
          categoryId: 'cat-alimentacao',
          isValidTransaction: true
        })
      )
    })

    fireEvent.change(input, { target: { value: 'Mercado 185,50 ontem nubank' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => {
      expect(defaultProps.onQuickCreateTransaction).toHaveBeenCalledTimes(2)
    })
  })

  it('deve abrir TransactionModal pré-preenchido ao clicar em command-nlp-open-modal-btn', () => {
    render(<CommandPalette {...defaultProps} />)
    const input = screen.getByTestId('command-palette-input')

    fireEvent.change(input, { target: { value: 'Mercado 185,50 ontem nubank' } })
    fireEvent.click(screen.getByTestId('command-nlp-open-modal-btn'))

    expect(defaultProps.onOpenTransactionModal).toHaveBeenCalledWith(
      'expense',
      expect.objectContaining({
        description: 'Mercado',
        amount: 185.5,
        accountId: 'acc-nubank',
        categoryId: 'cat-alimentacao',
        type: 'expense'
      })
    )
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('deve executar ações rápidas e filtrar transações e contas', () => {
    render(<CommandPalette {...defaultProps} />)

    fireEvent.click(screen.getByTestId('command-action-new-expense'))
    expect(defaultProps.onOpenTransactionModal).toHaveBeenCalledWith('expense')

    fireEvent.click(screen.getByTestId('command-action-new-income'))
    expect(defaultProps.onOpenTransactionModal).toHaveBeenCalledWith('income')

    fireEvent.click(screen.getByTestId('command-action-new-transfer'))
    expect(defaultProps.onOpenTransactionModal).toHaveBeenCalledWith('transfer')

    fireEvent.click(screen.getByTestId('command-action-toggle-theme'))
    expect(defaultProps.onToggleTheme).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('command-action-import'))
    expect(defaultProps.onOpenImportStatement).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('command-action-export'))
    expect(defaultProps.onOpenExportReport).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('command-action-toggle-view'))
    expect(defaultProps.onToggleViewMode).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('command-account-item-acc-itau'))
    expect(defaultProps.onSelectAccount).toHaveBeenCalledWith('acc-itau')

    expect(screen.getByTestId('command-tx-item-tx-1')).toBeTruthy()
    expect(screen.getByTestId('command-tx-item-tx-2')).toBeTruthy()
  })
})
