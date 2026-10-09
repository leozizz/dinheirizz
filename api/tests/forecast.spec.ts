import { describe, it, expect } from 'vitest'
import {
  calculateCashFlowForecast,
  type ForecastTransaction,
  type ForecastOptions
} from '../src/services/forecast'

describe('Motor de Projeção de Fluxo de Caixa (Forecast - TDD)', () => {
  const baseDate = new Date('2026-10-01T00:00:00Z')

  it('deve projetar saldo diário determinístico com receitas, despesas agendadas e burn rate', () => {
    // 30 dias a partir de 2026-10-01
    // Saldo inicial: R$ 5.000,00
    // Histórico de 30 dias com R$ 1.500 de gastos variáveis -> Burn rate diário de R$ 50,00
    const history: ForecastTransaction[] = [
      {
        id: 'h1',
        amount: -1500,
        paid: true,
        status: 'completed',
        occurredAt: '2026-09-15T12:00:00Z',
        isRecurring: false,
        type: 'expense'
      }
    ]

    // Transações futuras agendadas:
    // Dia 05/10: Despesa de R$ 1.000 (Boleto)
    // Dia 10/10: Receita de R$ 3.000 (Salário/Freelance)
    const scheduled: ForecastTransaction[] = [
      {
        id: 's1',
        amount: -1000,
        paid: false,
        status: 'pending',
        dueDate: '2026-10-05T12:00:00Z',
        type: 'expense'
      },
      {
        id: 's2',
        amount: 3000,
        paid: false,
        status: 'pending',
        dueDate: '2026-10-10T12:00:00Z',
        type: 'income'
      }
    ]

    const options: ForecastOptions = {
      startingBalance: 5000,
      days: 30,
      startDate: baseDate,
      historyTransactions: history,
      scheduledTransactions: scheduled
    }

    const result = calculateCashFlowForecast(options)

    expect(result.startingBalance).toBe(5000)
    expect(result.timeline).toHaveLength(30)
    expect(result.dailyBurnRate).toBe(50)

    // Dia 1 (2026-10-01): 5000 - 50 = 4950
    expect(result.timeline[0].date).toBe('2026-10-01')
    expect(result.timeline[0].balance).toBe(4950)
    expect(result.timeline[0].variableBurn).toBe(50)

    // Dia 5 (2026-10-05): Saldo anterior (4800) - 50 (burn) - 1000 (despesa agendada) = 3750
    const day5 = result.timeline.find((p) => p.date === '2026-10-05')
    expect(day5).toBeDefined()
    expect(day5?.scheduledExpense).toBe(1000)
    expect(day5?.balance).toBe(3750)

    // Dia 10 (2026-10-10): Receita agendada de 3000 entra
    const day10 = result.timeline.find((p) => p.date === '2026-10-10')
    expect(day10).toBeDefined()
    expect(day10?.scheduledIncome).toBe(3000)
    expect(day10?.balance).toBeGreaterThan(6000)

    // O status de saúde deve ser 'safe'
    expect(result.healthStatus).toBe('safe')
    expect(result.lowestPoint.balance).toBeGreaterThan(0)
  })

  it('deve detectar risco e alertar "danger" quando o saldo projetado se torna negativo', () => {
    // Saldo inicial: R$ 1.000,00
    // Despesa agendada volumosa no dia 3: R$ 1.800,00
    const scheduled: ForecastTransaction[] = [
      {
        id: 'bill-1',
        amount: -1800,
        paid: false,
        status: 'pending',
        dueDate: '2026-10-03T10:00:00Z',
        type: 'expense'
      }
    ]

    const result = calculateCashFlowForecast({
      startingBalance: 1000,
      days: 30,
      startDate: baseDate,
      historyTransactions: [],
      scheduledTransactions: scheduled
    })

    expect(result.healthStatus).toBe('danger')
    expect(result.lowestPoint.balance).toBe(-800)
    expect(result.lowestPoint.date).toBe('2026-10-03')
    expect(result.healthMessage).toMatch(/risco de saldo negativo/i)
  })

  it('deve alertar "warning" quando o saldo fica perigosamente baixo mas não negativo', () => {
    // Saldo inicial: R$ 2.000,00
    // Despesa agendada de R$ 1.800 (restam R$ 200, que é < 15% do saldo inicial)
    const scheduled: ForecastTransaction[] = [
      {
        id: 'bill-warn',
        amount: -1800,
        paid: false,
        status: 'pending',
        dueDate: '2026-10-04T10:00:00Z',
        type: 'expense'
      }
    ]

    const result = calculateCashFlowForecast({
      startingBalance: 2000,
      days: 30,
      startDate: baseDate,
      historyTransactions: [],
      scheduledTransactions: scheduled
    })

    expect(result.healthStatus).toBe('warning')
    expect(result.lowestPoint.balance).toBe(200)
    expect(result.healthMessage).toMatch(/atenção/i)
  })

  it('deve excluir transações recorrentes e parceladas do cálculo de despesas variáveis para evitar dupla contagem', () => {
    // Histórico de 30 dias:
    // 1 despesa variável: R$ 600 (Alimentação) -> R$ 20/dia
    // 1 despesa recorrente: R$ 1.200 (Aluguel) -> deve ser ignorada no burn rate variável
    const history: ForecastTransaction[] = [
      {
        id: 'h-var',
        amount: -600,
        paid: true,
        occurredAt: '2026-09-10T00:00:00Z',
        isRecurring: false,
        type: 'expense'
      },
      {
        id: 'h-rec',
        amount: -1200,
        paid: true,
        occurredAt: '2026-09-05T00:00:00Z',
        isRecurring: true,
        type: 'expense'
      }
    ]

    const result = calculateCashFlowForecast({
      startingBalance: 3000,
      days: 30,
      startDate: baseDate,
      historyTransactions: history,
      scheduledTransactions: []
    })

    // Burn rate deve considerar apenas os 600 variáveis / 30 dias = 20
    expect(result.dailyBurnRate).toBe(20)
  })

  it('deve suportar horizonte de 60 dias corretamente', () => {
    const result = calculateCashFlowForecast({
      startingBalance: 10000,
      days: 60,
      startDate: baseDate,
      historyTransactions: [],
      scheduledTransactions: []
    })

    expect(result.timeline).toHaveLength(60)
    expect(result.timeline[59].date).toBe('2026-11-29')
  })

  it('deve projetar despesas recorrentes ciclicamente em cada mês no horizonte mesmo se já pagas no mês anterior', () => {
    const history: ForecastTransaction[] = [
      {
        id: 'rec-1',
        amount: -800,
        paid: true,
        occurredAt: '2026-09-15T00:00:00Z',
        dueDate: '2026-09-15T00:00:00Z',
        isRecurring: true,
        type: 'expense'
      }
    ]

    const result = calculateCashFlowForecast({
      startingBalance: 5000,
      days: 60,
      startDate: new Date('2026-10-01T00:00:00Z'),
      historyTransactions: history,
      scheduledTransactions: []
    })

    // No dia 15/10, deve haver scheduledExpense de 800
    const pointOct15 = result.timeline.find((p) => p.date === '2026-10-15')
    expect(pointOct15).toBeDefined()
    expect(pointOct15?.scheduledExpense).toBe(800)

    // No dia 15/11, deve haver scheduledExpense de 800
    const pointNov15 = result.timeline.find((p) => p.date === '2026-11-15')
    expect(pointNov15).toBeDefined()
    expect(pointNov15?.scheduledExpense).toBe(800)
  })

  it('deve projetar recorrência respeitando recurrenceDay e adjustBusinessDay (ajustando fim de semana para próximo dia útil)', () => {
    // Em maio de 2026: dia 10 é Domingo. Com adjustBusinessDay: true, deve projetar em 11/05/2026 (Segunda-feira).
    const recurringTx: ForecastTransaction = {
      id: 'rec-sunday-adjust',
      amount: -450,
      paid: true,
      isRecurring: true,
      recurrenceDay: 10,
      adjustBusinessDay: true,
      occurredAt: '2026-04-10T00:00:00Z',
      type: 'expense'
    }

    const result = calculateCashFlowForecast({
      startingBalance: 3000,
      days: 30,
      startDate: new Date('2026-05-01T00:00:00Z'),
      historyTransactions: [recurringTx],
      scheduledTransactions: []
    })

    // O dia 10/05 (domingo) NÃO deve ter o gasto agendado
    const pointMay10 = result.timeline.find((p) => p.date === '2026-05-10')
    expect(pointMay10?.scheduledExpense).toBe(0)

    // O dia 11/05 (segunda-feira) DEVE ter o gasto agendado de 450
    const pointMay11 = result.timeline.find((p) => p.date === '2026-05-11')
    expect(pointMay11).toBeDefined()
    expect(pointMay11?.scheduledExpense).toBe(450)
  })
})
