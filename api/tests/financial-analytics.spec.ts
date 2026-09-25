import { describe, it, expect } from 'vitest'
import {
  calculateMonthlyMetrics,
  type FinancialTransactionInput
} from '../src/services/financial-analytics'

describe('Motor de Agregação Financeira (TDD)', () => {
  it('deve calcular corretamente totais de receita, despesa, saldo e taxa de poupança', () => {
    const transactions: FinancialTransactionInput[] = [
      {
        id: '1',
        amount: 8000,
        paid: true,
        type: 'income',
        categoryName: 'Salário',
        occurredAt: new Date('2026-09-05T10:00:00Z')
      },
      {
        id: '2',
        amount: -2000,
        paid: true,
        type: 'expense',
        categoryName: 'Moradia',
        occurredAt: new Date('2026-09-06T12:00:00Z')
      },
      {
        id: '3',
        amount: -1000,
        paid: true,
        type: 'expense',
        categoryName: 'Alimentação',
        occurredAt: new Date('2026-09-10T15:00:00Z')
      }
    ]

    const metrics = calculateMonthlyMetrics(transactions)

    expect(metrics.totalIncome).toBe(8000)
    expect(metrics.totalExpense).toBe(3000)
    expect(metrics.netBalance).toBe(5000)
    // Savings rate = ((8000 - 3000) / 8000) * 100 = 62.5%
    expect(metrics.savingsRate).toBe(62.5)
  })

  it('deve agrupar gastos por categoria e identificar a de maior peso', () => {
    const transactions: FinancialTransactionInput[] = [
      {
        id: '1',
        amount: -2500,
        paid: true,
        type: 'expense',
        categoryName: 'Moradia',
        occurredAt: new Date('2026-09-02T10:00:00Z')
      },
      {
        id: '2',
        amount: -800,
        paid: true,
        type: 'expense',
        categoryName: 'Alimentação',
        occurredAt: new Date('2026-09-03T12:00:00Z')
      },
      {
        id: '3',
        amount: -400,
        paid: true,
        type: 'expense',
        categoryName: 'Alimentação',
        occurredAt: new Date('2026-09-05T14:00:00Z')
      }
    ]

    const metrics = calculateMonthlyMetrics(transactions)

    expect(metrics.topCategory).toBe('Moradia')
    expect(metrics.categoriesBreakdown).toEqual([
      { categoryName: 'Moradia', amount: 2500, percentage: 67.57 },
      { categoryName: 'Alimentação', amount: 1200, percentage: 32.43 }
    ])
  })

  it('deve lidar graciosamente com histórico vazio retornando métricas zeradas', () => {
    const metrics = calculateMonthlyMetrics([])

    expect(metrics.totalIncome).toBe(0)
    expect(metrics.totalExpense).toBe(0)
    expect(metrics.netBalance).toBe(0)
    expect(metrics.savingsRate).toBe(0)
    expect(metrics.topCategory).toBeNull()
    expect(metrics.categoriesBreakdown).toEqual([])
  })

  it('deve ignorar transações não pagas nos cálculos mensais', () => {
    const transactions: FinancialTransactionInput[] = [
      {
        id: '1',
        amount: 5000,
        paid: true,
        type: 'income',
        categoryName: 'Salário',
        occurredAt: new Date('2026-09-01T10:00:00Z')
      },
      {
        id: '2',
        amount: -1500,
        paid: false, // não paga
        type: 'expense',
        categoryName: 'Cartão',
        occurredAt: new Date('2026-09-28T10:00:00Z')
      }
    ]

    const metrics = calculateMonthlyMetrics(transactions)

    expect(metrics.totalIncome).toBe(5000)
    expect(metrics.totalExpense).toBe(0)
    expect(metrics.netBalance).toBe(5000)
    expect(metrics.savingsRate).toBe(100)
  })
})
