import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FinancialCalendar } from '../components/dashboard/FinancialCalendar'
import type { TransactionItem } from '../components/dashboard/Dashboard'

const mockTransactions: TransactionItem[] = [
  {
    id: 'tx-1',
    description: 'Salário Tech',
    amount: 10000,
    paid: true,
    occurred_at: '2026-10-05T10:00:00Z',
    type: 'income',
    category: { name: 'Salário' }
  },
  {
    id: 'tx-2',
    description: 'Condomínio',
    amount: -800,
    paid: false,
    dueDate: '2026-10-10T00:00:00Z',
    occurred_at: '2026-10-01T00:00:00Z',
    type: 'expense',
    category: { name: 'Moradia' }
  }
]

describe('FinancialCalendar (TDD)', () => {
  it('deve renderizar o cabeçalho de navegação com o mês e os dias da semana', () => {
    render(
      <FinancialCalendar
        transactions={mockTransactions}
        currentBalance={5000}
        initialDate={new Date(2026, 9, 15)} // Outubro 2026
      />
    )

    expect(screen.getByText(/outubro de 2026/i)).toBeInTheDocument()

    // Dias da semana
    expect(screen.getByText('Dom')).toBeInTheDocument()
    expect(screen.getByText('Seg')).toBeInTheDocument()
    expect(screen.getByText('Ter')).toBeInTheDocument()
    expect(screen.getByText('Qua')).toBeInTheDocument()
    expect(screen.getByText('Qui')).toBeInTheDocument()
    expect(screen.getByText('Sex')).toBeInTheDocument()
    expect(screen.getByText('Sáb')).toBeInTheDocument()
  })

  it('deve permitir navegar para o mês anterior e próximo', () => {
    render(
      <FinancialCalendar
        transactions={mockTransactions}
        currentBalance={5000}
        initialDate={new Date(2026, 9, 15)} // Outubro 2026
      />
    )

    const prevBtn = screen.getByTestId('calendar-prev-month-btn')
    const nextBtn = screen.getByTestId('calendar-next-month-btn')

    // Clica no próximo mês -> Novembro de 2026
    fireEvent.click(nextBtn)
    expect(screen.getByText(/novembro de 2026/i)).toBeInTheDocument()

    // Clica no anterior duas vezes -> Setembro de 2026
    fireEvent.click(prevBtn)
    fireEvent.click(prevBtn)
    expect(screen.getByText(/setembro de 2026/i)).toBeInTheDocument()
  })

  it('deve retornar para o mês vigente ao clicar no botão "Hoje"', () => {
    render(
      <FinancialCalendar
        transactions={mockTransactions}
        currentBalance={5000}
        initialDate={new Date(2025, 0, 1)} // Janeiro 2025
      />
    )

    expect(screen.getByText(/janeiro de 2025/i)).toBeInTheDocument()

    const todayBtn = screen.getByTestId('calendar-today-btn')
    fireEvent.click(todayBtn)

    const now = new Date()
    const currentMonthName = now.toLocaleDateString('pt-BR', { month: 'long' })
    expect(screen.getByText(new RegExp(currentMonthName, 'i'))).toBeInTheDocument()
  })

  it('deve exibir indicadores de receitas e despesas nas células correspondentes', () => {
    render(
      <FinancialCalendar
        transactions={mockTransactions}
        currentBalance={5000}
        initialDate={new Date(2026, 9, 15)} // Outubro 2026
      />
    )

    // Dia 5 deve ter badge/indicador de receita (+R$ 10.000,00)
    const day5Cell = screen.getByTestId('calendar-day-2026-10-05')
    expect(day5Cell).toBeInTheDocument()
    expect(day5Cell).toHaveAttribute('data-has-income', 'true')

    // Dia 10 deve ter badge/indicador de despesa (R$ 800,00)
    const day10Cell = screen.getByTestId('calendar-day-2026-10-10')
    expect(day10Cell).toBeInTheDocument()
    expect(day10Cell).toHaveAttribute('data-has-expense', 'true')
  })

  it('deve abrir o DayTransactionsDrawer ao clicar em uma célula com transações', () => {
    render(
      <FinancialCalendar
        transactions={mockTransactions}
        currentBalance={5000}
        initialDate={new Date(2026, 9, 15)} // Outubro 2026
      />
    )

    const day5Cell = screen.getByTestId('calendar-day-2026-10-05')
    fireEvent.click(day5Cell)

    // O drawer deve abrir e exibir a transação 'Salário Tech'
    expect(screen.getByTestId('day-transactions-drawer')).toBeInTheDocument()
    expect(screen.getByText('Salário Tech')).toBeInTheDocument()
  })

  it('deve exibir badge de feriado no calendário para datas comemorativas nacionais', () => {
    render(
      <FinancialCalendar
        transactions={mockTransactions}
        currentBalance={5000}
        initialDate={new Date(2026, 9, 15)} // Outubro 2026
      />
    )

    // 12 de Outubro é N. Sra. Aparecida
    const holidayBadge = screen.getByTestId('holiday-badge-2026-10-12')
    expect(holidayBadge).toBeInTheDocument()
    expect(holidayBadge).toHaveTextContent(/Aparecida/i)
  })

  it('deve posicionar uma transação recorrente do dia 20 exatamente no dia 20 e não no dia 19', () => {
    const recurringDay20Tx: TransactionItem[] = [
      {
        id: 'rec-20',
        description: 'Assinatura Software',
        amount: -150,
        paid: false,
        dueDate: '2026-10-20',
        occurred_at: '2026-10-20T00:00:00Z',
        isRecurring: true,
        recurrenceDay: 20,
        adjustBusinessDay: false,
        status: 'pending'
      }
    ]

    render(
      <FinancialCalendar
        transactions={recurringDay20Tx}
        currentBalance={5000}
        initialDate={new Date(2026, 9, 15)} // Outubro 2026
      />
    )

    const day19Cell = screen.getByTestId('calendar-day-2026-10-19')
    const day20Cell = screen.getByTestId('calendar-day-2026-10-20')

    // Dia 19 NÃO deve ter despesa
    expect(day19Cell).not.toHaveAttribute('data-has-expense')

    // Dia 20 DEVE ter despesa
    expect(day20Cell).toHaveAttribute('data-has-expense', 'true')
  })
})
