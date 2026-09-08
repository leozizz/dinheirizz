import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionModal } from '../components/modals/TransactionModal'

const mockCategories = [
  { id: 'cat-1', name: 'Alimentação', type: 'expense' },
  { id: 'cat-2', name: 'Salário', type: 'income' },
  { id: 'cat-3', name: 'Transporte', type: 'expense' }
]

const mockAccounts = [
  { id: 'acc-1', name: 'Nubank Principal', balance: 5000 },
  { id: 'acc-2', name: 'Itaú Reserva', balance: 12000 }
]

describe('TransactionModal (TDD)', () => {
  it('deve renderizar o título correto de acordo com o modo', () => {
    const { rerender } = render(
      <TransactionModal
        isOpen={true}
        mode="income"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByText('Nova Receita')).toBeInTheDocument()

    rerender(
      <TransactionModal
        isOpen={true}
        mode="expense"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByText('Nova Despesa')).toBeInTheDocument()

    rerender(
      <TransactionModal
        isOpen={true}
        mode="transfer"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByText('Transferência entre Contas')).toBeInTheDocument()
  })

  it('não deve renderizar quando isOpen for false', () => {
    render(
      <TransactionModal
        isOpen={false}
        mode="income"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.queryByText('Nova Receita')).not.toBeInTheDocument()
  })

  it('deve validar formulário e não submeter se o valor for zero ou inválido', async () => {
    const handleSubmit = vi.fn()
    render(
      <TransactionModal
        isOpen={true}
        mode="expense"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    )

    const submitBtn = screen.getByTestId('transaction-submit-btn')
    fireEvent.click(submitBtn)

    expect(handleSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/informe um valor maior que zero/i)).toBeInTheDocument()
  })

  it('deve submeter os dados corretamente ao preencher campos válidos', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    const handleClose = vi.fn()

    render(
      <TransactionModal
        isOpen={true}
        mode="expense"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    )

    const amountInput = screen.getByPlaceholderText('0,00')
    const descInput = screen.getByPlaceholderText('Descrição da movimentação')
    const submitBtn = screen.getByTestId('transaction-submit-btn')

    fireEvent.change(amountInput, { target: { value: '150,50' } })
    fireEvent.change(descInput, { target: { value: 'Almoço Restaurante' } })

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 150.5,
          description: 'Almoço Restaurante',
          type: 'expense'
        })
      )
    })
  })

  it('deve disparar onClose ao clicar no botão de fechar', () => {
    const handleClose = vi.fn()
    render(
      <TransactionModal
        isOpen={true}
        mode="income"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={handleClose}
        onSubmit={vi.fn()}
      />
    )

    const closeBtn = screen.getByTestId('close-transaction-modal-btn')
    fireEvent.click(closeBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
