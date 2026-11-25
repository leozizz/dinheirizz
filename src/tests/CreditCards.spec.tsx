import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { CreditCardWidget } from '../components/cards/CreditCardWidget'
import { CreditCardModal } from '../components/modals/CreditCardModal'
import type { CreditCard } from '../types/database.types'
import type { AccountItem } from '../hooks/useAccounts'

describe('CreditCardWidget Component (TDD)', () => {
  const mockCards: CreditCard[] = [
    {
      id: 'card-1',
      name: 'Nubank Ultravioleta',
      brand: 'mastercard',
      limitAmount: 10000,
      usedLimit: 3000, // 30% (< 60%)
      availableLimit: 7000,
      closingDay: 25,
      dueDay: 5,
      color: '#7bc816',
      lastFourDigits: '8821',
      accountId: 'acc-1',
      currentInvoice: {
        id: 'inv-1',
        period: '2026-11',
        amount: 1500,
        status: 'open',
        closingDate: '2026-11-25T00:00:00.000Z',
        dueDate: '2026-12-05T00:00:00.000Z'
      }
    },
    {
      id: 'card-2',
      name: 'Itaú Personnalité Black',
      brand: 'visa',
      limitAmount: 20000,
      usedLimit: 14000, // 70% (60% - 85%)
      availableLimit: 6000,
      closingDay: 18,
      dueDay: 28,
      color: '#f59e0b',
      lastFourDigits: '1049',
      accountId: 'acc-2',
      currentInvoice: {
        id: 'inv-2',
        period: '2026-11',
        amount: 4200,
        status: 'closed',
        closingDate: '2026-11-18T00:00:00.000Z',
        dueDate: '2026-11-28T00:00:00.000Z'
      }
    },
    {
      id: 'card-3',
      name: 'Bradesco Elo Nanquim',
      brand: 'elo',
      limitAmount: 5000,
      usedLimit: 4600, // 92% (> 85%)
      availableLimit: 400,
      closingDay: 10,
      dueDay: 20,
      color: '#ef4444',
      lastFourDigits: '3399',
      accountId: 'acc-3',
      currentInvoice: {
        id: 'inv-3',
        period: '2026-10',
        amount: 2100,
        status: 'paid',
        closingDate: '2026-10-10T00:00:00.000Z',
        dueDate: '2026-10-20T00:00:00.000Z'
      }
    }
  ]

  it('deve renderizar o container de cartões e o botão de criar cartão no empty state', () => {
    const onOpenCreate = vi.fn()
    render(
      <CreditCardWidget
        cards={[]}
        onOpenCreateCard={onOpenCreate}
      />
    )

    expect(screen.getByTestId('credit-cards-container')).toBeDefined()
    const createBtn = screen.getByTestId('open-create-credit-card-btn')
    expect(createBtn).toBeDefined()
    fireEvent.click(createBtn)
    expect(onOpenCreate).toHaveBeenCalledTimes(1)
  })

  it('deve renderizar os cartões virtuais com nome, bandeira, dígitos e limite disponível', () => {
    render(
      <CreditCardWidget
        cards={mockCards}
        onOpenCreateCard={vi.fn()}
      />
    )

    expect(screen.getByTestId('credit-card-item-card-1')).toBeDefined()
    expect(screen.getByTestId('credit-card-item-card-2')).toBeDefined()
    expect(screen.getByTestId('credit-card-item-card-3')).toBeDefined()

    expect(screen.getAllByTestId('credit-card-name')[0].textContent).toContain('Nubank Ultravioleta')
    expect(screen.getAllByTestId('credit-card-brand')[0].textContent).toContain('mastercard')
    expect(screen.getAllByTestId('credit-card-digits')[0].textContent).toContain('8821')
    expect(screen.getAllByTestId('credit-card-available-limit')[0].textContent).toContain('7.000')
  })

  it('deve aplicar cores semânticas na barra de limite de acordo com a porcentagem consumida', () => {
    render(
      <CreditCardWidget
        cards={mockCards}
        onOpenCreateCard={vi.fn()}
      />
    )

    const progressBars = screen.getAllByTestId('credit-card-limit-progress')
    expect(progressBars.length).toBe(3)

    // card-1: 30% -> normal/verde
    expect(progressBars[0].getAttribute('aria-valuenow')).toBe('30')
    expect(progressBars[0].className).toContain('emerald')

    // card-2: 70% -> amber/alerta
    expect(progressBars[1].getAttribute('aria-valuenow')).toBe('70')
    expect(progressBars[1].className).toContain('amber')

    // card-3: 92% -> rose/perigo
    expect(progressBars[2].getAttribute('aria-valuenow')).toBe('92')
    expect(progressBars[2].className).toContain('rose')

    // Garante que o percentual de uso seja legível (sem bg-* sólido igual ao texto)
    const percentages = screen.getAllByTestId('credit-card-limit-percentage')
    expect(percentages[0].className).not.toContain('bg-emerald-500')
    expect(percentages[1].className).not.toContain('bg-amber-500')
    expect(percentages[2].className).not.toContain('bg-rose-500')

    // Garante que os dígitos do cartão nunca quebrem linha
    const digits = screen.getAllByTestId('credit-card-digits')
    expect(digits[0].className).toContain('whitespace-nowrap')
  })

  it('deve exibir os badges de status das faturas com texto e estilo apropriados', () => {
    render(
      <CreditCardWidget
        cards={mockCards}
        onOpenCreateCard={vi.fn()}
      />
    )

    const badges = screen.getAllByTestId('credit-card-invoice-badge')
    expect(badges[0].textContent).toBe('Aberta')
    expect(badges[1].textContent).toBe('Fechada')
    expect(badges[2].textContent).toBe('Paga')
  })

  it('deve disparar os callbacks ao clicar nas ações do cartão (ver fatura, pagar, antecipar)', () => {
    const onOpenInvoiceDetails = vi.fn()
    const onOpenPayInvoice = vi.fn()
    const onOpenAnticipate = vi.fn()

    render(
      <CreditCardWidget
        cards={mockCards}
        onOpenCreateCard={vi.fn()}
        onOpenInvoiceDetails={onOpenInvoiceDetails}
        onOpenPayInvoice={onOpenPayInvoice}
        onOpenAnticipate={onOpenAnticipate}
      />
    )

    const detailsBtn = screen.getByTestId('open-invoice-details-btn-card-1')
    fireEvent.click(detailsBtn)
    expect(onOpenInvoiceDetails).toHaveBeenCalledWith(mockCards[0])

    const payBtn = screen.getByTestId('open-pay-invoice-btn-card-1')
    fireEvent.click(payBtn)
    expect(onOpenPayInvoice).toHaveBeenCalledWith(mockCards[0])

    const anticipateBtn = screen.getByTestId('open-anticipate-btn-card-1')
    fireEvent.click(anticipateBtn)
    expect(onOpenAnticipate).toHaveBeenCalledWith(mockCards[0])
  })

  it('aplica a skin do banco (data-bank-slug), BankLogo e CardBrandLogo em cada cartão virtual', () => {
    const cardsWithGeneric: CreditCard[] = [
      ...mockCards,
      {
        id: 'card-4',
        name: 'Cartão Loja XYZ',
        brand: 'hipercard',
        limitAmount: 3000,
        usedLimit: 500,
        availableLimit: 2500,
        closingDay: 15,
        dueDay: 25,
        color: '#3b82f6',
        lastFourDigits: '9912',
        accountId: 'acc-1'
      }
    ]

    render(
      <CreditCardWidget
        cards={cardsWithGeneric}
        onOpenCreateCard={vi.fn()}
      />
    )

    expect(screen.getByTestId('bank-logo-nubank')).toBeInTheDocument()
    expect(screen.getByTestId('bank-logo-itau')).toBeInTheDocument()
    expect(screen.getByTestId('bank-logo-bradesco')).toBeInTheDocument()
    expect(screen.getByTestId('bank-logo-generic')).toBeInTheDocument()

    const nubankCard = screen.getByTestId('credit-card-item-card-1').querySelector('[data-bank-slug="nubank"]')
    expect(nubankCard).not.toBeNull()

    const genericCard = screen.getByTestId('credit-card-item-card-4').querySelector('[data-bank-slug="generic"]')
    expect(genericCard).not.toBeNull()
  })

  it('exibe preview em tempo real do cartão virtual no CreditCardModal', () => {
    const mockAccounts: AccountItem[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Conta Itaú',
        type: 'checking',
        balance: 2000,
        bank: 'Itaú',
        color: '#ec7000'
      }
    ]

    render(
      <CreditCardModal
        isOpen={true}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    const preview = screen.getByTestId('credit-card-preview')
    expect(preview).toBeInTheDocument()

    const nameInput = screen.getByTestId('credit-card-name-input')
    fireEvent.change(nameInput, { target: { value: 'Nubank Ultravioleta' } })

    const digitsInput = screen.getByTestId('credit-card-digits-input')
    fireEvent.change(digitsInput, { target: { value: '4321' } })

    expect(preview.querySelector('[data-bank-slug="nubank"]')).not.toBeNull()
    expect(preview.textContent).toContain('Nubank Ultravioleta')
    expect(preview.textContent).toContain('4321')
  })
})
