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

  it('no modo transfer deve exibir Conta de Origem e Conta de Destino e validar contas iguais', async () => {
    const handleSubmit = vi.fn()
    render(
      <TransactionModal
        isOpen={true}
        mode="transfer"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    )

    expect(screen.getByText('Conta de Origem')).toBeInTheDocument()
    expect(screen.getByText('Conta de Destino')).toBeInTheDocument()

    const amountInput = screen.getByPlaceholderText('0,00')
    fireEvent.change(amountInput, { target: { value: '200,00' } })

    const originSelect = screen.getByTestId('from-account-select')
    const destSelect = screen.getByTestId('to-account-select')

    // Definir mesma conta para origem e destino
    fireEvent.change(originSelect, { target: { value: 'acc-1' } })
    fireEvent.change(destSelect, { target: { value: 'acc-1' } })

    const submitBtn = screen.getByTestId('transaction-submit-btn')
    fireEvent.click(submitBtn)

    expect(handleSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/origem e de destino não podem ser iguais/i)).toBeInTheDocument()

    // Corrigir destino para acc-2
    fireEvent.change(destSelect, { target: { value: 'acc-2' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 200,
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          type: 'transfer'
        })
      )
    })
  })

  it('deve inverter contas de origem e destino ao clicar no botão de swap', () => {
    render(
      <TransactionModal
        isOpen={true}
        mode="transfer"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const originSelect = screen.getByTestId('from-account-select') as HTMLSelectElement
    const destSelect = screen.getByTestId('to-account-select') as HTMLSelectElement

    expect(originSelect.value).toBe('acc-1')
    expect(destSelect.value).toBe('acc-2')

    const swapBtn = screen.getByTestId('swap-accounts-btn')
    fireEvent.click(swapBtn)

    expect(originSelect.value).toBe('acc-2')
    expect(destSelect.value).toBe('acc-1')
  })

  it('deve permitir alternar para status Pendente e submeter com data de vencimento', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
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

    const amountInput = screen.getByPlaceholderText('0,00')
    const descInput = screen.getByPlaceholderText('Descrição da movimentação')
    fireEvent.change(amountInput, { target: { value: '89,90' } })
    fireEvent.change(descInput, { target: { value: 'Conta de Energia' } })

    const pendingBtn = screen.getByTestId('status-pending-btn')
    fireEvent.click(pendingBtn)

    const dueDateInput = screen.getByTestId('due-date-input')
    fireEvent.change(dueDateInput, { target: { value: '2026-10-15' } })

    const submitBtn = screen.getByTestId('transaction-submit-btn')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 89.9,
          description: 'Conta de Energia',
          status: 'pending',
          dueDate: '2026-10-15'
        })
      )
    })
  })

  it('deve permitir ativar parcelamento, exibir prévia das parcelas e submeter', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
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

    const amountInput = screen.getByPlaceholderText('0,00')
    fireEvent.change(amountInput, { target: { value: '600,00' } })

    const installmentToggle = screen.getByTestId('installment-toggle')
    fireEvent.click(installmentToggle)

    const installmentSelect = screen.getByTestId('installment-select')
    fireEvent.change(installmentSelect, { target: { value: '6' } })

    expect(screen.getByText(/6x de R\$ 100,00/i)).toBeInTheDocument()

    const submitBtn = screen.getByTestId('transaction-submit-btn')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 600,
          installmentTotal: 6
        })
      )
    })
  })

  it('deve permitir configurar transação recorrente fixa', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
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

    const amountInput = screen.getByPlaceholderText('0,00')
    fireEvent.change(amountInput, { target: { value: '49,90' } })

    const recurringToggle = screen.getByTestId('recurring-toggle')
    fireEvent.click(recurringToggle)

    const periodSelect = screen.getByTestId('recurrence-period-select')
    fireEvent.change(periodSelect, { target: { value: 'monthly' } })

    const submitBtn = screen.getByTestId('transaction-submit-btn')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 49.9,
          isRecurring: true,
          recurrencePeriod: 'monthly',
          recurrenceDay: 10,
          adjustBusinessDay: false
        })
      )
    })
  })

  it('deve permitir configurar dia fixo de recorrência e vencimento dinâmico em dia útil', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
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

    const amountInput = screen.getByPlaceholderText('0,00')
    fireEvent.change(amountInput, { target: { value: '120,00' } })

    const recurringToggle = screen.getByTestId('recurring-toggle')
    fireEvent.click(recurringToggle)

    expect(screen.getByText('Vence todo dia')).toBeInTheDocument()
    expect(screen.getByText('Vencimento dinâmico em dia útil')).toBeInTheDocument()

    const daySelect = screen.getByTestId('recurrence-day-select')
    fireEvent.change(daySelect, { target: { value: '25' } })

    const businessDayToggle = screen.getByTestId('adjust-business-day-toggle')
    fireEvent.click(businessDayToggle)

    const submitBtn = screen.getByTestId('transaction-submit-btn')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 120.0,
          isRecurring: true,
          recurrenceDay: 25,
          adjustBusinessDay: true
        })
      )
    })
  })
})

