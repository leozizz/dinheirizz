import { describe, it, expect } from 'vitest'
import {
  buildMonthCalendarMatrix,
  formatCalendarMonthYear,
  getEffectiveTransactionDate,
  type CalendarDaySummary
} from '../lib/calendar'
import type { TransactionItem } from '../components/dashboard/Dashboard'

describe('calendar utility (TDD)', () => {
  describe('getEffectiveTransactionDate', () => {
    it('deve priorizar dueDate quando presente e formatar como YYYY-MM-DD', () => {
      const tx: TransactionItem = {
        id: '1',
        description: 'Boleto Internet',
        amount: -120,
        paid: false,
        occurred_at: '2026-10-01T10:00:00Z',
        dueDate: '2026-10-15T00:00:00Z',
        status: 'pending'
      }
      expect(getEffectiveTransactionDate(tx)).toBe('2026-10-15')
    })

    it('deve usar occurred_at quando dueDate for nulo ou ausente', () => {
      const tx: TransactionItem = {
        id: '2',
        description: 'Supermercado',
        amount: -350,
        paid: true,
        occurred_at: '2026-10-08T18:30:00Z',
        status: 'completed'
      }
      expect(getEffectiveTransactionDate(tx)).toBe('2026-10-08')
    })
  })

  describe('formatCalendarMonthYear', () => {
    it('deve formatar mês e ano em português por extenso com inicial maiúscula', () => {
      const date = new Date(2026, 9, 15) // Outubro de 2026
      const formatted = formatCalendarMonthYear(date)
      expect(formatted.toLowerCase()).toContain('outubro')
      expect(formatted).toContain('2026')
    })
  })

  describe('buildMonthCalendarMatrix', () => {
    it('deve gerar uma matriz com 35 ou 42 dias (múltiplo de 7 semanas completas iniciando em domingo)', () => {
      const result = buildMonthCalendarMatrix({
        year: 2026,
        month: 9, // Outubro 2026 (1º de outubro de 2026 é uma quinta-feira)
        transactions: [],
        initialBalance: 1000
      })

      expect(result.length % 7).toBe(0)
      expect(result.length).toBeGreaterThanOrEqual(35)
      // O primeiro dia da grade deve ser domingo (dia da semana 0)
      expect(result[0].date.getDay()).toBe(0)
      // O último dia da grade deve ser sábado (dia da semana 6)
      expect(result[result.length - 1].date.getDay()).toBe(6)
    })

    it('deve sinalizar corretamente isCurrentMonth, isWeekend e dayNumber', () => {
      const result = buildMonthCalendarMatrix({
        year: 2026,
        month: 9, // Outubro 2026
        transactions: [],
        initialBalance: 1000
      })

      // 1 de outubro de 2026 deve ter isCurrentMonth === true e dayNumber === 1
      const octFirst = result.find(
        (d) => d.isCurrentMonth && d.dayNumber === 1
      )
      expect(octFirst).toBeDefined()
      expect(octFirst?.dateString).toBe('2026-10-01')
      expect(octFirst?.isWeekend).toBe(false) // Quinta-feira

      // Dia de setembro que aparece antes deve ter isCurrentMonth === false
      const prevMonthDay = result[0]
      expect(prevMonthDay.isCurrentMonth).toBe(false)
    })

    it('deve agregar transações de receitas e despesas por dia e calcular totais', () => {
      const transactions: TransactionItem[] = [
        {
          id: 'tx-1',
          description: 'Salário',
          amount: 5000,
          paid: true,
          occurred_at: '2026-10-05T12:00:00Z',
          status: 'completed'
        },
        {
          id: 'tx-2',
          description: 'Aluguel',
          amount: -1800,
          paid: false,
          occurred_at: '2026-10-01T00:00:00Z',
          dueDate: '2026-10-05T00:00:00Z',
          status: 'pending'
        },
        {
          id: 'tx-3',
          description: 'Academia',
          amount: -150,
          paid: true,
          occurred_at: '2026-10-10T10:00:00Z',
          status: 'completed'
        }
      ]

      const result = buildMonthCalendarMatrix({
        year: 2026,
        month: 9, // Outubro 2026
        transactions,
        initialBalance: 2000
      })

      const day5 = result.find((d) => d.dateString === '2026-10-05')
      expect(day5).toBeDefined()
      expect(day5?.transactions.length).toBe(2)
      expect(day5?.totalIncome).toBe(5000)
      expect(day5?.totalExpense).toBe(1800)
      expect(day5?.netDayChange).toBe(3200)
      expect(day5?.hasPending).toBe(true)

      const day10 = result.find((d) => d.dateString === '2026-10-10')
      expect(day10).toBeDefined()
      expect(day10?.transactions.length).toBe(1)
      expect(day10?.totalExpense).toBe(150)
      expect(day10?.hasPending).toBe(false)
    })

    it('deve calcular o saldo acumulado progressivo determinístico ao longo dos dias', () => {
      const transactions: TransactionItem[] = [
        {
          id: 'tx-1',
          description: 'Freelance',
          amount: 1000,
          paid: true,
          occurred_at: '2026-10-02T10:00:00Z',
          status: 'completed'
        },
        {
          id: 'tx-2',
          description: 'Conta Luz',
          amount: -300,
          paid: false,
          occurred_at: '2026-10-01T00:00:00Z',
          dueDate: '2026-10-03T00:00:00Z',
          status: 'pending'
        }
      ]

      const initialBalance = 1500
      const result = buildMonthCalendarMatrix({
        year: 2026,
        month: 9, // Outubro 2026
        transactions,
        initialBalance
      })

      const day1 = result.find((d) => d.dateString === '2026-10-01')
      const day2 = result.find((d) => d.dateString === '2026-10-02')
      const day3 = result.find((d) => d.dateString === '2026-10-03')
      const day4 = result.find((d) => d.dateString === '2026-10-04')

      // Dia 1 não tem movimentações -> Saldo projetado permanece 1500
      expect(day1?.projectedBalance).toBe(1500)
      // Dia 2 teve +1000 -> Saldo 2500
      expect(day2?.projectedBalance).toBe(2500)
      // Dia 3 teve -300 -> Saldo 2200
      expect(day3?.projectedBalance).toBe(2200)
      // Dia 4 sem movimentações -> Permanece 2200
      expect(day4?.projectedBalance).toBe(2200)
    })

    it('deve projetar transações recorrentes em meses futuros distantes além de 60 dias (exponencialmente)', () => {
      const recurringTransactions: TransactionItem[] = [
        {
          id: 'rec-salary',
          description: 'Salário Mensal',
          amount: 8000,
          paid: true,
          status: 'completed',
          occurred_at: '2026-10-05T10:00:00Z',
          isRecurring: true,
          recurrenceDay: 5,
          adjustBusinessDay: false
        },
        {
          id: 'rec-rent',
          description: 'Aluguel Fixo',
          amount: -2500,
          paid: true,
          status: 'completed',
          occurred_at: '2026-10-10T10:00:00Z',
          isRecurring: true,
          recurrenceDay: 10,
          adjustBusinessDay: false
        }
      ]

      // 1. Projeção em Dezembro de 2026 (mês 11)
      const decMatrix = buildMonthCalendarMatrix({
        year: 2026,
        month: 11,
        transactions: recurringTransactions,
        initialBalance: 10000,
        referenceDate: new Date(2026, 9, 1, 12, 0, 0) // Outubro 2026
      })

      const dec5 = decMatrix.find((d) => d.dateString === '2026-12-05')
      expect(dec5).toBeDefined()
      expect(dec5?.transactions.some((t) => t.description === 'Salário Mensal')).toBe(true)

      const dec10 = decMatrix.find((d) => d.dateString === '2026-12-10')
      expect(dec10).toBeDefined()
      expect(dec10?.transactions.some((t) => t.description === 'Aluguel Fixo')).toBe(true)

      // 2. Projeção em Março de 2027 (mês 2 do ano seguinte, 5 meses à frente)
      const marchMatrix = buildMonthCalendarMatrix({
        year: 2027,
        month: 2,
        transactions: recurringTransactions,
        initialBalance: 10000,
        referenceDate: new Date(2026, 9, 1, 12, 0, 0)
      })

      const march5 = marchMatrix.find((d) => d.dateString === '2027-03-05')
      expect(march5).toBeDefined()
      expect(march5?.transactions.some((t) => t.description === 'Salário Mensal')).toBe(true)

      const march10 = marchMatrix.find((d) => d.dateString === '2027-03-10')
      expect(march10).toBeDefined()
      expect(march10?.transactions.some((t) => t.description === 'Aluguel Fixo')).toBe(true)
    })

    it('não deve duplicar transação recorrente se já existir ocorrência concreta para aquele mês', () => {
      const transactions: TransactionItem[] = [
        {
          id: 'rec-1',
          description: 'Internet Fibra',
          amount: -120,
          paid: true,
          status: 'completed',
          occurred_at: '2026-10-15T10:00:00Z',
          isRecurring: true,
          recurrenceDay: 15
        },
        // Ocorrência filha já gerada pela baixa para novembro
        {
          id: 'child-nov',
          parentTransactionId: 'rec-1',
          description: 'Internet Fibra',
          amount: -120,
          paid: false,
          status: 'pending',
          dueDate: '2026-11-15T12:00:00Z',
          occurred_at: '2026-10-15T10:00:00Z',
          isRecurring: true,
          recurrenceDay: 15
        }
      ]

      const novMatrix = buildMonthCalendarMatrix({
        year: 2026,
        month: 10, // Novembro 2026
        transactions,
        initialBalance: 5000,
        referenceDate: new Date(2026, 9, 1, 12, 0, 0)
      })

      const nov15 = novMatrix.find((d) => d.dateString === '2026-11-15')
      expect(nov15?.transactions.length).toBe(1)
    })

    it('deve propagar e acumular o saldo projetado continuamente de mês a mês', () => {
      const transactions: TransactionItem[] = [
        {
          id: 'rec-income',
          description: 'Salário',
          amount: 5000,
          paid: false,
          dueDate: '2026-10-05T12:00:00Z',
          occurred_at: '2026-10-01T10:00:00Z',
          isRecurring: true,
          recurrenceDay: 5
        },
        {
          id: 'rec-expense',
          description: 'Aluguel',
          amount: -2000,
          paid: false,
          dueDate: '2026-10-10T12:00:00Z',
          occurred_at: '2026-10-01T10:00:00Z',
          isRecurring: true,
          recurrenceDay: 10
        }
      ]
      // Variação mensal líquida: +3000 por mês
      // Saldo base em 01/10/2026 = 10.000
      // Fim de Outubro: 10.000 + 3.000 = 13.000
      // Fim de Novembro: 13.000 + 3.000 = 16.000
      // Fim de Dezembro: 16.000 + 3.000 = 19.000

      const decMatrix = buildMonthCalendarMatrix({
        year: 2026,
        month: 11, // Dezembro 2026
        transactions,
        initialBalance: 10000,
        referenceDate: new Date(2026, 9, 1, 12, 0, 0)
      })

      // Dezembro dia 4 deve estar com 16.000
      const dec4 = decMatrix.find((d) => d.dateString === '2026-12-04')
      expect(dec4?.projectedBalance).toBe(16000)

      // Dezembro dia 5 recebe +5000 -> 21.000
      const dec5 = decMatrix.find((d) => d.dateString === '2026-12-05')
      expect(dec5?.projectedBalance).toBe(21000)

      // Dezembro dia 10 paga -2000 -> 19.000
      const dec10 = decMatrix.find((d) => d.dateString === '2026-12-10')
      expect(dec10?.projectedBalance).toBe(19000)
    })

    it('deve marcar isHoliday e holidayName nos feriados bancários nacionais', () => {
      const matrix = buildMonthCalendarMatrix({
        year: 2026,
        month: 9, // Outubro 2026
        transactions: [],
        initialBalance: 1000
      })

      const holiday = matrix.find((d) => d.dateString === '2026-10-12')
      expect(holiday).toBeDefined()
      expect(holiday?.isHoliday).toBe(true)
      expect(holiday?.holidayName).toBe('N. Sra. Aparecida')

      const normalDay = matrix.find((d) => d.dateString === '2026-10-13')
      expect(normalDay?.isHoliday).toBe(false)
      expect(normalDay?.holidayName).toBeNull()
    })

    it('deve projetar transação recorrente do dia 20 exatamente no dia 20 sem deslocamento de timezone', () => {
      const transactions: TransactionItem[] = [
        {
          id: 'rec-dia-20',
          description: 'Serviço Streaming',
          amount: -50,
          paid: false,
          dueDate: '2026-10-20',
          occurred_at: '2026-10-20T00:00:00Z',
          isRecurring: true,
          recurrenceDay: 20,
          adjustBusinessDay: false
        }
      ]

      const octMatrix = buildMonthCalendarMatrix({
        year: 2026,
        month: 9, // Outubro 2026
        transactions,
        initialBalance: 1000
      })

      const oct19 = octMatrix.find((d) => d.dateString === '2026-10-19')
      const oct20 = octMatrix.find((d) => d.dateString === '2026-10-20')
      expect(oct19?.transactions.length).toBe(0)
      expect(oct20?.transactions.length).toBe(1)
      expect(oct20?.transactions[0].description).toBe('Serviço Streaming')

      // Próximo mês: Novembro de 2026 (dia 20 é Feriado da Consciência Negra, mas como adjustBusinessDay é false, cai estritamente no dia 20)
      const novMatrix = buildMonthCalendarMatrix({
        year: 2026,
        month: 10, // Novembro 2026
        transactions,
        initialBalance: 1000,
        referenceDate: new Date(2026, 9, 1, 12, 0, 0)
      })

      const nov19 = novMatrix.find((d) => d.dateString === '2026-11-19')
      const nov20 = novMatrix.find((d) => d.dateString === '2026-11-20')
      expect(nov19?.transactions.length).toBe(0)
      expect(nov20?.transactions.length).toBe(1)
    })

    it('deve ajustar vencimento dinâmico do dia 12 de outubro (feriado) para dia 13 e dia 20 de novembro (feriado) para dia 23', () => {
      const transactions: TransactionItem[] = [
        {
          id: 'rec-dia-12',
          description: 'Boleto Dia 12',
          amount: -120,
          paid: false,
          dueDate: '2026-10-12',
          occurred_at: '2026-10-10T12:00:00Z',
          isRecurring: true,
          recurrenceDay: 12,
          adjustBusinessDay: true
        },
        {
          id: 'rec-dia-20',
          description: 'Boleto Dia 20',
          amount: -250,
          paid: false,
          dueDate: '2026-10-20',
          occurred_at: '2026-10-10T12:00:00Z',
          isRecurring: true,
          recurrenceDay: 20,
          adjustBusinessDay: true
        }
      ]

      // Outubro 2026:
      // - 12 de outubro é Segunda-feira e Feriado (N. Sra. Aparecida) -> deve ir para dia 13 (Terça-feira)
      // - 20 de outubro é Terça-feira (dia útil normal) -> permanece dia 20
      const octMatrix = buildMonthCalendarMatrix({
        year: 2026,
        month: 9, // Outubro
        transactions,
        initialBalance: 5000,
        referenceDate: new Date(2026, 9, 10)
      })

      const oct12 = octMatrix.find((d) => d.dateString === '2026-10-12')
      const oct13 = octMatrix.find((d) => d.dateString === '2026-10-13')
      const oct20 = octMatrix.find((d) => d.dateString === '2026-10-20')

      // Dia 12 não deve ter a despesa do boleto 12
      expect(oct12?.transactions.some((t) => t.description === 'Boleto Dia 12')).toBe(false)
      // Dia 13 DEVE ter a despesa do boleto 12
      expect(oct13?.transactions.some((t) => t.description === 'Boleto Dia 12')).toBe(true)
      // Dia 20 em outubro é dia útil normal, deve estar no dia 20
      expect(oct20?.transactions.some((t) => t.description === 'Boleto Dia 20')).toBe(true)

      // Novembro 2026:
      // - 12 de novembro é Quinta-feira (dia útil normal) -> permanece dia 12
      // - 20 de novembro é Sexta-feira e Feriado (Consciência Negra) -> 21 e 22 são fim de semana -> deve ir para 23 (Segunda-feira)
      const novMatrix = buildMonthCalendarMatrix({
        year: 2026,
        month: 10, // Novembro
        transactions,
        initialBalance: 5000,
        referenceDate: new Date(2026, 9, 10)
      })

      const nov12 = novMatrix.find((d) => d.dateString === '2026-11-12')
      const nov20 = novMatrix.find((d) => d.dateString === '2026-11-20')
      const nov23 = novMatrix.find((d) => d.dateString === '2026-11-23')

      // Dia 12 de novembro é dia útil normal
      expect(nov12?.transactions.some((t) => t.description === 'Boleto Dia 12')).toBe(true)
      // Dia 20 de novembro é feriado, NÃO deve ter a despesa do boleto 20
      expect(nov20?.transactions.some((t) => t.description === 'Boleto Dia 20')).toBe(false)
      // Dia 23 de novembro (segunda-feira) DEVE ter a despesa do boleto 20
      expect(nov23?.transactions.some((t) => t.description === 'Boleto Dia 20')).toBe(true)
    })
  })
})

