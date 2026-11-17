import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { CreditCardWidget } from '../components/cards/CreditCardWidget'
import { CreditCardModal } from '../components/modals/CreditCardModal'
import { InvoiceDetailsModal } from '../components/modals/InvoiceDetailsModal'
import { InvoicePaymentModal } from '../components/modals/InvoicePaymentModal'
import { AnticipateInstallmentsModal } from '../components/modals/AnticipateInstallmentsModal'
import type { CreditCard, Invoice } from '../types/database.types'
import type { AccountItem } from '../hooks/useAccounts'

describe('QA Suite — Validação de Cartões de Crédito, Faturas e Ciclos (#53 / LEO-59)', () => {
  const sampleAccounts: AccountItem[] = [
    {
      id: 'acc-1',
      name: 'Conta Corrente Nubank',
      type: 'checking',
      balance: 4500.0,
      color: '#8b5cf6',
      bank: 'Nubank'
    },
    {
      id: 'acc-2',
      name: 'Reserva Itaú',
      type: 'savings',
      balance: 150.0, // Saldo insuficiente proposital para testes de validação
      color: '#f59e0b',
      bank: 'Itaú'
    }
  ]

  const sampleCard: CreditCard = {
    id: 'card-1',
    userId: 'user-123',
    name: 'Nubank Ultravioleta',
    brand: 'mastercard',
    limitAmount: 10000,
    usedLimit: 3500,
    availableLimit: 6500,
    closingDay: 25,
    dueDay: 5,
    accountId: 'acc-1',
    color: '#7bc816',
    lastFourDigits: '8842',
    currentInvoice: {
      id: 'inv-1',
      period: '2026-11',
      amount: 1850.5,
      closingDate: '2026-11-25',
      dueDate: '2026-12-05',
      status: 'open'
    },
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z'
  }

  const sampleInvoice: Invoice = {
    id: 'inv-1',
    creditCardId: 'card-1',
    period: '2026-11',
    amount: 1850.5,
    paidAmount: 0,
    paidAt: null,
    closingDate: '2026-11-25',
    dueDate: '2026-12-05',
    status: 'open',
    items: [
      {
        id: 'tx-1',
        description: 'Supermercado Pão de Açúcar',
        amount: 350.5,
        occurredAt: '2026-11-10T14:30:00Z',
        installmentCurrent: 1,
        installmentTotal: 1
      },
      {
        id: 'tx-2',
        description: 'Notebook Dell XPS',
        amount: 500.0,
        occurredAt: '2026-11-05T10:00:00Z',
        installmentCurrent: 3,
        installmentTotal: 10
      }
    ],
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z'
  }

  const sampleFutureInstallments = [
    {
      id: 'tx-future-1',
      description: 'Notebook Dell XPS (4/10)',
      amount: 500.0,
      installmentCurrent: 4,
      installmentTotal: 10,
      period: '2026-12'
    },
    {
      id: 'tx-future-2',
      description: 'Notebook Dell XPS (5/10)',
      amount: 500.0,
      installmentCurrent: 5,
      installmentTotal: 10,
      period: '2027-01'
    }
  ]

  describe('Critério 1: Auditoria de Acessibilidade (A11y) & Touch Targets (WCAG 2.1/2.2 AA)', () => {
    it('deve garantir que todos os botões de ação do CreditCardWidget tenham touch target mínimo de 44x44px', () => {
      render(
        <CreditCardWidget
          cards={[sampleCard]}
          onOpenCreateCard={vi.fn()}
          onOpenInvoiceDetails={vi.fn()}
          onOpenPayInvoice={vi.fn()}
          onOpenAnticipate={vi.fn()}
        />
      )

      const createBtn = screen.getByTestId('open-create-credit-card-btn')
      expect(createBtn.className).toMatch(/min-h-\[44px\]/)

      const detailsBtn = screen.getByTestId('open-invoice-details-btn-card-1')
      expect(detailsBtn.className).toMatch(/min-h-\[44px\]/)

      const payBtn = screen.getByTestId('open-pay-invoice-btn-card-1')
      expect(payBtn.className).toMatch(/min-h-\[44px\]/)

      const anticipateBtn = screen.getByTestId('open-anticipate-btn-card-1')
      expect(anticipateBtn.className).toMatch(/min-h-\[44px\]/)
    })

    it('deve possuir atributos semânticos de acessibilidade e progressbar no CreditCardWidget', () => {
      render(
        <CreditCardWidget
          cards={[sampleCard]}
          onOpenCreateCard={vi.fn()}
          onOpenInvoiceDetails={vi.fn()}
          onOpenPayInvoice={vi.fn()}
          onOpenAnticipate={vi.fn()}
        />
      )

      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toBeDefined()
      expect(progressbar.getAttribute('aria-valuenow')).toBe('35')
      expect(progressbar.getAttribute('aria-valuemin')).toBe('0')
      expect(progressbar.getAttribute('aria-valuemax')).toBe('100')
    })

    it('deve garantir atributos ARIA de diálogo e botão de fechar acessível no InvoiceDetailsModal', () => {
      render(
        <InvoiceDetailsModal
          isOpen={true}
          card={sampleCard}
          invoice={sampleInvoice}
          onClose={vi.fn()}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog.getAttribute('aria-modal')).toBe('true')
      expect(dialog.getAttribute('aria-labelledby')).toBe('invoice-details-title')

      const closeBtn = screen.getByTestId('close-invoice-details-modal')
      expect(closeBtn.className).toMatch(/min-h-\[44px\]/)
      expect(closeBtn.className).toMatch(/min-w-\[44px\]/)
      expect(closeBtn.getAttribute('aria-label')).toBe('Fechar modal')
    })

    it('deve garantir touch targets mínimos de 44x44px nos formulários de CreditCardModal e InvoicePaymentModal', () => {
      const { unmount } = render(
        <CreditCardModal
          isOpen={true}
          accounts={sampleAccounts}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      )

      const submitCardBtn = screen.getByTestId('btn-save-credit-card')
      expect(submitCardBtn.className).toMatch(/min-h-\[44px\]/)

      unmount()

      render(
        <InvoicePaymentModal
          isOpen={true}
          card={sampleCard}
          accounts={sampleAccounts}
          onClose={vi.fn()}
          onConfirmPayment={vi.fn()}
        />
      )

      const confirmPayBtn = screen.getByTestId('btn-confirm-invoice-payment')
      expect(confirmPayBtn.className).toMatch(/min-h-\[44px\]/)
    })
  })

  describe('Critério 2: Automação e Presença Obrigatória de data-testid', () => {
    it('deve conter data-testid em todos os elementos estruturais e interativos dos cartões', () => {
      render(
        <CreditCardWidget
          cards={[sampleCard]}
          onOpenCreateCard={vi.fn()}
          onOpenInvoiceDetails={vi.fn()}
          onOpenPayInvoice={vi.fn()}
          onOpenAnticipate={vi.fn()}
        />
      )

      expect(screen.getByTestId('credit-cards-container')).toBeDefined()
      expect(screen.getByTestId('credit-card-item-card-1')).toBeDefined()
      expect(screen.getByTestId('credit-card-brand')).toHaveTextContent('mastercard')
      expect(screen.getByTestId('credit-card-digits')).toHaveTextContent('8842')
      expect(screen.getByTestId('credit-card-name')).toHaveTextContent('Nubank Ultravioleta')
      expect(screen.getByTestId('credit-card-invoice-badge')).toHaveTextContent('Aberta')
      expect(screen.getByTestId('credit-card-available-limit')).toBeDefined()
      expect(screen.getByTestId('credit-card-limit-progress')).toBeDefined()
    })

    it('deve conter data-testid no formulário de criação/edição de cartão', () => {
      render(
        <CreditCardModal
          isOpen={true}
          accounts={sampleAccounts}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      )

      expect(screen.getByTestId('credit-card-name-input')).toBeDefined()
      expect(screen.getByTestId('credit-card-brand-select')).toBeDefined()
      expect(screen.getByTestId('credit-card-limit-input')).toBeDefined()
      expect(screen.getByTestId('credit-card-closing-day-input')).toBeDefined()
      expect(screen.getByTestId('credit-card-due-day-input')).toBeDefined()
      expect(screen.getByTestId('credit-card-account-select')).toBeDefined()
      expect(screen.getByTestId('credit-card-digits-input')).toBeDefined()
      expect(screen.getByTestId('btn-save-credit-card')).toBeDefined()
    })
  })

  describe('Critério 3: Regras de Negócio, Ciclos e Cálculos Visuais', () => {
    it('deve exibir corretamente os valores formatados de limite disponível, utilizado e total', () => {
      render(
        <CreditCardWidget
          cards={[sampleCard]}
          onOpenCreateCard={vi.fn()}
        />
      )

      // Disponível: 10000 - 3500 = 6500
      expect(screen.getByTestId('credit-card-available-limit').textContent).toContain('6.500,00')
      expect(screen.getByTestId('credit-card-item-card-1').textContent).toContain('3.500,00')
      expect(screen.getByTestId('credit-card-item-card-1').textContent).toContain('10.000,00')
      expect(screen.getByTestId('credit-card-item-card-1').textContent).toContain('35%')
    })

    it('deve alertar saldo insuficiente no InvoicePaymentModal quando a conta selecionada não tiver saldo suficiente', () => {
      render(
        <InvoicePaymentModal
          isOpen={true}
          card={sampleCard}
          accounts={sampleAccounts}
          onClose={vi.fn()}
          onConfirmPayment={vi.fn()}
        />
      )

      const accountSelect = screen.getByTestId('invoice-payment-account-select')
      // Alterna para acc-2 (Reserva Itaú com R$ 150,00 para fatura de R$ 1850,50)
      fireEvent.change(accountSelect, { target: { value: 'acc-2' } })

      expect(screen.getByText(/O saldo da conta selecionada é inferior ao valor da fatura/i)).toBeDefined()
    })

    it('deve calcular a soma dinâmica de parcelas selecionadas no AnticipateInstallmentsModal', () => {
      render(
        <AnticipateInstallmentsModal
          isOpen={true}
          card={sampleCard}
          futureInstallments={sampleFutureInstallments}
          onClose={vi.fn()}
          onConfirmAnticipation={vi.fn()}
        />
      )

      const confirmBtn = screen.getByTestId('btn-confirm-anticipation')
      // Inicialmente desabilitado
      expect(confirmBtn).toBeDisabled()

      // Seleciona a primeira parcela (R$ 500,00)
      const checkbox1 = screen.getByTestId('anticipate-checkbox-tx-future-1')
      fireEvent.click(checkbox1)

      // Botão agora habilitado e texto de resumo exibido
      expect(confirmBtn).not.toBeDisabled()
      expect(screen.getByText(/\+R\$ 500,00/i)).toBeDefined()

      // Seleciona a segunda parcela (R$ 500,00) -> total R$ 1.000,00
      const checkbox2 = screen.getByTestId('anticipate-checkbox-tx-future-2')
      fireEvent.click(checkbox2)

      expect(screen.getByText(/\+R\$ 1\.000,00/i)).toBeDefined()
    })
  })

  describe('Critério 4: Dual-Theme, Higiene de Código & Anti-Slop', () => {
    it('deve garantir ausência de regras CSS com prioridade forçada inline nos elementos renderizados', () => {
      const { container } = render(
        <CreditCardWidget
          cards={[sampleCard]}
          onOpenCreateCard={vi.fn()}
        />
      )

      const elementsWithStyle = container.querySelectorAll('[style]')
      elementsWithStyle.forEach((el) => {
        const styleAttr = el.getAttribute('style') || ''
        const forbiddenModifier = '!' + 'important'
        expect(styleAttr).not.toContain(forbiddenModifier)
      })
    })

    it('deve usar classes de tokens semânticos suportados pelo Dark Luxury e Light Clean', () => {
      render(
        <CreditCardWidget
          cards={[sampleCard]}
          onOpenCreateCard={vi.fn()}
        />
      )

      const container = screen.getByTestId('credit-cards-container')
      expect(container.className).toContain('bg-card')
      expect(container.className).toContain('border-border')
    })
  })
})
