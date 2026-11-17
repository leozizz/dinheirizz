import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { InvoicePaymentModal } from '../components/modals/InvoicePaymentModal'
import { AnticipateInstallmentsModal } from '../components/modals/AnticipateInstallmentsModal'
import { CreditCardModal } from '../components/modals/CreditCardModal'
import { InvoiceDetailsModal } from '../components/modals/InvoiceDetailsModal'
import type { CreditCard, Invoice } from '../types/database.types'
import type { AccountItem } from '../hooks/useAccounts'

describe('InvoicePaymentModal & Modals (TDD)', () => {
  const mockAccounts: AccountItem[] = [
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Conta Corrente Nubank',
      type: 'checking',
      balance: 5000
    },
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      name: 'Poupança Itaú',
      type: 'savings',
      balance: 12000
    }
  ]

  const mockCard: CreditCard = {
    id: 'card-1',
    name: 'Nubank Ultravioleta',
    brand: 'mastercard',
    limitAmount: 10000,
    usedLimit: 3000,
    availableLimit: 7000,
    closingDay: 25,
    dueDay: 5,
    color: '#7bc816',
    lastFourDigits: '8821',
    accountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    currentInvoice: {
      id: 'inv-1',
      period: '2026-11',
      amount: 1250.4,
      status: 'open',
      closingDate: '2026-11-25T00:00:00.000Z',
      dueDate: '2026-12-05T00:00:00.000Z'
    }
  }

  const mockInvoice: Invoice = {
    id: 'inv-1',
    creditCardId: 'card-1',
    period: '2026-11',
    amount: 1250.4,
    status: 'open',
    closingDate: '2026-11-25T00:00:00.000Z',
    dueDate: '2026-12-05T00:00:00.000Z',
    paidAmount: 0,
    paidAt: null,
    items: [
      {
        id: 'tx-1',
        description: 'Supermercado Pão de Açúcar',
        amount: 450,
        occurredAt: '2026-11-10T12:00:00.000Z',
        installmentCurrent: 1,
        installmentTotal: 1,
        category: { name: 'Alimentação', color: '#10b981' }
      },
      {
        id: 'tx-2',
        description: 'Notebook Dell (2/10)',
        amount: 800.4,
        occurredAt: '2026-11-12T15:00:00.000Z',
        installmentCurrent: 2,
        installmentTotal: 10,
        category: { name: 'Tecnologia', color: '#38bdf8' }
      }
    ]
  }

  it('deve abrir o modal de liquidação de fatura com o valor da fatura pré-preenchido', () => {
    render(
      <InvoicePaymentModal
        isOpen={true}
        card={mockCard}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onConfirmPayment={vi.fn()}
      />
    )

    expect(screen.getByTestId('invoice-payment-modal')).toBeDefined()
    const amountElem = screen.getByTestId('invoice-payment-amount')
    expect(amountElem.textContent).toContain('1.250,40')
  })

  it('deve selecionar a conta bancária de débito e disparar a liquidação com sucesso', async () => {
    const onConfirmPayment = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(
      <InvoicePaymentModal
        isOpen={true}
        card={mockCard}
        accounts={mockAccounts}
        onClose={onClose}
        onConfirmPayment={onConfirmPayment}
      />
    )

    const select = screen.getByTestId('invoice-payment-account-select')
    fireEvent.change(select, { target: { value: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' } })

    const confirmBtn = screen.getByTestId('btn-confirm-invoice-payment')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(onConfirmPayment).toHaveBeenCalledWith({
        invoiceId: 'inv-1',
        paymentAccountId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        amount: 1250.4
      })
    })
  })

  it('deve permitir selecionar parcelas futuras e confirmar a antecipação no AnticipateInstallmentsModal', async () => {
    const onConfirmAnticipation = vi.fn().mockResolvedValue(undefined)
    const mockFutureInstallments = [
      {
        id: 'tx-inst-1',
        description: 'iPhone 15 Pro (2/10)',
        amount: 550,
        installmentCurrent: 2,
        installmentTotal: 10,
        period: '2026-12'
      },
      {
        id: 'tx-inst-2',
        description: 'MacBook Air (3/12)',
        amount: 600,
        installmentCurrent: 3,
        installmentTotal: 12,
        period: '2026-12'
      }
    ]

    render(
      <AnticipateInstallmentsModal
        isOpen={true}
        card={mockCard}
        futureInstallments={mockFutureInstallments}
        onClose={vi.fn()}
        onConfirmAnticipation={onConfirmAnticipation}
      />
    )

    expect(screen.getByTestId('anticipate-installments-modal')).toBeDefined()
    expect(screen.getByTestId('anticipate-item-tx-inst-1')).toBeDefined()
    expect(screen.getByTestId('anticipate-item-tx-inst-2')).toBeDefined()

    const checkbox1 = screen.getByTestId('anticipate-checkbox-tx-inst-1') as HTMLInputElement
    fireEvent.click(checkbox1)
    expect(checkbox1.checked).toBe(true)

    const confirmBtn = screen.getByTestId('btn-confirm-anticipation')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(onConfirmAnticipation).toHaveBeenCalledWith({
        cardId: 'card-1',
        transactionIds: ['tx-inst-1']
      })
    })
  })

  it('deve renderizar o CreditCardModal com todos os campos e data-testids', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(
      <CreditCardModal
        isOpen={true}
        accounts={mockAccounts}
        onClose={onClose}
        onSave={onSave}
      />
    )

    expect(screen.getByTestId('credit-card-modal')).toBeDefined()
    expect(screen.getByTestId('credit-card-name-input')).toBeDefined()
    expect(screen.getByTestId('credit-card-brand-select')).toBeDefined()
    expect(screen.getByTestId('credit-card-limit-input')).toBeDefined()
    expect(screen.getByTestId('credit-card-closing-day-input')).toBeDefined()
    expect(screen.getByTestId('credit-card-due-day-input')).toBeDefined()
    expect(screen.getByTestId('credit-card-account-select')).toBeDefined()
    expect(screen.getByTestId('credit-card-digits-input')).toBeDefined()
    expect(screen.getByTestId('btn-save-credit-card')).toBeDefined()

    fireEvent.change(screen.getByTestId('credit-card-name-input'), {
      target: { value: 'Cartão Inter Black' }
    })
    fireEvent.change(screen.getByTestId('credit-card-digits-input'), {
      target: { value: '5566' }
    })

    fireEvent.click(screen.getByTestId('btn-save-credit-card'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled()
    })
  })

  it('deve renderizar o InvoiceDetailsModal exibindo os itens da fatura e botão de pagamento', () => {
    const onPay = vi.fn()
    const onAnticipate = vi.fn()

    render(
      <InvoiceDetailsModal
        isOpen={true}
        card={mockCard}
        invoice={mockInvoice}
        onClose={vi.fn()}
        onPayInvoice={onPay}
        onAnticipate={onAnticipate}
      />
    )

    expect(screen.getByTestId('invoice-details-modal')).toBeDefined()
    expect(screen.getByText('Supermercado Pão de Açúcar')).toBeDefined()
    expect(screen.getByText('Notebook Dell (2/10)')).toBeDefined()
    expect(screen.getByTestId('btn-pay-from-details')).toBeDefined()

    fireEvent.click(screen.getByTestId('btn-pay-from-details'))
    expect(onPay).toHaveBeenCalledTimes(1)
  })
})

