import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DayTransactionsDrawer } from '../components/dashboard/DayTransactionsDrawer'
import type { CalendarDaySummary } from '../lib/calendar'

const mockDaySummary: CalendarDaySummary = {
  date: new Date(2026, 9, 15, 12, 0, 0),
  dateString: '2026-10-15',
  dayNumber: 15,
  isCurrentMonth: true,
  isToday: false,
  isWeekend: false,
  isHoliday: false,
  holidayName: null,
  totalIncome: 2500,
  totalExpense: 450,
  netDayChange: 2050,
  projectedBalance: 7500,
  hasPending: true,
  transactions: [
    {
      id: 'tx-1',
      description: 'Consultoria Dev',
      amount: 2500,
      paid: true,
      status: 'completed',
      occurred_at: '2026-10-15T10:00:00Z',
      type: 'income',
      category: { name: 'Serviços', color: '#10b981' }
    },
    {
      id: 'tx-2',
      description: 'Conta de Energia',
      amount: -450,
      paid: false,
      status: 'pending',
      occurred_at: '2026-10-01T00:00:00Z',
      dueDate: '2026-10-15T00:00:00Z',
      type: 'expense',
      category: { name: 'Contas', color: '#f59e0b' }
    }
  ]
}

describe('DayTransactionsDrawer (TDD)', () => {
  it('não deve renderizar conteúdo quando isOpen for false', () => {
    render(
      <DayTransactionsDrawer
        isOpen={false}
        onClose={vi.fn()}
        daySummary={mockDaySummary}
      />
    )
    expect(screen.queryByTestId('day-transactions-drawer')).not.toBeInTheDocument()
  })

  it('deve renderizar o drawer com data formatada e resumo financeiro do dia quando aberto', () => {
    render(
      <DayTransactionsDrawer
        isOpen={true}
        onClose={vi.fn()}
        daySummary={mockDaySummary}
      />
    )

    expect(screen.getByTestId('day-transactions-drawer')).toBeInTheDocument()
    // Deve conter o dia 15 e Outubro
    expect(screen.getByText(/15/)).toBeInTheDocument()
    expect(screen.getByText(/outubro/i)).toBeInTheDocument()

    // Resumo financeiro do dia: receitas, despesas e saldo projetado
    expect(screen.getAllByText(/2\.500,00/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/450,00/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/7\.500,00/)).toBeInTheDocument()
  })

  it('deve listar as transações do dia com detalhes e categorias', () => {
    render(
      <DayTransactionsDrawer
        isOpen={true}
        onClose={vi.fn()}
        daySummary={mockDaySummary}
      />
    )

    expect(screen.getByText('Consultoria Dev')).toBeInTheDocument()
    expect(screen.getByText('Conta de Energia')).toBeInTheDocument()
    expect(screen.getByText('Serviços')).toBeInTheDocument()
    expect(screen.getByText('Contas')).toBeInTheDocument()
  })

  it('deve exibir botão "Dar Baixa" para transação pendente, fechar o drawer e chamar onPayTransaction ao clicar', () => {
    const handlePay = vi.fn()
    const handleClose = vi.fn()
    render(
      <DayTransactionsDrawer
        isOpen={true}
        onClose={handleClose}
        daySummary={mockDaySummary}
        onPayTransaction={handlePay}
      />
    )

    const payBtn = screen.getByTestId('drawer-pay-btn-tx-2')
    expect(payBtn).toBeInTheDocument()

    fireEvent.click(payBtn)
    expect(handleClose).toHaveBeenCalled()
    expect(handlePay).toHaveBeenCalledWith('tx-2')
  })

  it('deve chamar onClose ao clicar no botão de fechar', () => {
    const handleClose = vi.fn()
    render(
      <DayTransactionsDrawer
        isOpen={true}
        onClose={handleClose}
        daySummary={mockDaySummary}
      />
    )

    const closeBtn = screen.getByTestId('close-day-drawer-btn')
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalled()
  })

  it('deve exibir badge de feriado quando isHoliday for true', () => {
    const holidaySummary: CalendarDaySummary = {
      ...mockDaySummary,
      isHoliday: true,
      holidayName: 'N. Sra. Aparecida'
    }

    render(
      <DayTransactionsDrawer
        isOpen={true}
        onClose={vi.fn()}
        daySummary={holidaySummary}
      />
    )

    const holidayBadge = screen.getByTestId('drawer-holiday-badge')
    expect(holidayBadge).toBeInTheDocument()
    expect(holidayBadge).toHaveTextContent(/N\. Sra\. Aparecida/i)
  })
})
