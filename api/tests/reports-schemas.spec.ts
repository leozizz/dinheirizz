import { describe, it, expect } from 'vitest'
import {
  reportPeriodTypeSchema,
  reportFilterSchema,
  reportKpiSchema,
  categoryBreakdownItemSchema,
  costCenterSummaryItemSchema,
  cashFlowPointSchema,
  reportSummaryResponseSchema
} from '../src/schemas/reports'

describe('Reports Zod Schemas (TDD)', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000'

  describe('reportPeriodTypeSchema', () => {
    it('deve aceitar monthly e yearly', () => {
      expect(reportPeriodTypeSchema.safeParse('monthly').success).toBe(true)
      expect(reportPeriodTypeSchema.safeParse('yearly').success).toBe(true)
    })

    it('deve rejeitar outros períodos', () => {
      expect(reportPeriodTypeSchema.safeParse('weekly').success).toBe(false)
      expect(reportPeriodTypeSchema.safeParse('daily').success).toBe(false)
      expect(reportPeriodTypeSchema.safeParse('').success).toBe(false)
    })
  })

  describe('reportFilterSchema', () => {
    it('deve validar filtro mensal válido com defaults', () => {
      const payload = {
        period: '2026-11'
      }
      const result = reportFilterSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.periodType).toBe('monthly')
        expect(result.data.status).toBe('completed')
        expect(result.data.period).toBe('2026-11')
      }
    })

    it('deve validar filtro anual válido com status e accountId', () => {
      const payload = {
        periodType: 'yearly',
        period: '2026',
        accountId: validUUID,
        status: 'all'
      }
      const result = reportFilterSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.periodType).toBe('yearly')
        expect(result.data.period).toBe('2026')
        expect(result.data.accountId).toBe(validUUID)
        expect(result.data.status).toBe('all')
      }
    })

    it('deve rejeitar periodType monthly com formato anual YYYY', () => {
      const payload = {
        periodType: 'monthly',
        period: '2026'
      }
      const result = reportFilterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar periodType yearly com formato mensal YYYY-MM', () => {
      const payload = {
        periodType: 'yearly',
        period: '2026-11'
      }
      const result = reportFilterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar formato de data totalmente inválido', () => {
      const payload = {
        periodType: 'monthly',
        period: 'invalid-date'
      }
      const result = reportFilterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar accountId que não seja UUID', () => {
      const payload = {
        period: '2026-11',
        accountId: 'not-a-uuid'
      }
      const result = reportFilterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar status inválido', () => {
      const payload = {
        period: '2026-11',
        status: 'archived'
      }
      const result = reportFilterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('reportSummaryResponseSchema', () => {
    it('deve validar uma resposta completa de resumo de relatório', () => {
      const payload = {
        periodType: 'monthly',
        period: '2026-11',
        accountName: 'Banco Inter',
        generatedAt: '2026-11-16T23:45:00.000Z',
        kpis: {
          totalIncome: 12500.5,
          totalExpense: 4200.75,
          netBalance: 8299.75,
          savingsRate: 66.39,
          transactionCount: 42
        },
        categoriesBreakdown: [
          {
            categoryId: validUUID,
            categoryName: 'Alimentação',
            categoryColor: '#ff5722',
            type: 'expense',
            amount: 1500.0,
            percentage: 35.71,
            count: 15
          }
        ],
        costCentersSummary: [
          {
            accountId: validUUID,
            accountName: 'Banco Inter',
            income: 12500.5,
            expense: 4200.75,
            net: 8299.75
          }
        ],
        cashFlowTimeline: [
          {
            label: '01/11',
            date: '2026-11-01',
            income: 5000.0,
            expense: 1200.0,
            balance: 3800.0,
            accumulatedBalance: 3800.0
          }
        ]
      }

      const result = reportSummaryResponseSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('deve aceitar categoryId nulo e categoryColor nulo na distribuição de categorias', () => {
      const item = {
        categoryId: null,
        categoryName: 'Sem Categoria',
        categoryColor: null,
        type: 'expense',
        amount: 300,
        percentage: 10,
        count: 2
      }
      const result = categoryBreakdownItemSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it('deve validar cashFlowPoint sem date opcional', () => {
      const point = {
        label: 'Jan',
        income: 10000,
        expense: 6000,
        balance: 4000,
        accumulatedBalance: 4000
      }
      const result = cashFlowPointSchema.safeParse(point)
      expect(result.success).toBe(true)
    })
  })
})
