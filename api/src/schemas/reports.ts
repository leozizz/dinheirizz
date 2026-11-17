import { z } from 'zod'

export const reportPeriodTypeSchema = z.enum(['monthly', 'yearly'])
export type ReportPeriodType = z.infer<typeof reportPeriodTypeSchema>

export const reportFilterSchema = z
  .object({
    periodType: reportPeriodTypeSchema.default('monthly'),
    period: z.string().regex(/^(\d{4}-\d{2}|\d{4})$/, {
      message: 'Formato de período inválido. Use YYYY-MM para mensal ou YYYY para anual.'
    }),
    accountId: z.string().uuid('ID de conta inválido').optional(),
    status: z.enum(['all', 'completed', 'pending']).default('completed')
  })
  .refine(
    (data) => {
      if (data.periodType === 'monthly') {
        return /^\d{4}-\d{2}$/.test(data.period)
      }
      if (data.periodType === 'yearly') {
        return /^\d{4}$/.test(data.period)
      }
      return true
    },
    {
      message: 'O período informado não corresponde ao tipo selecionado (mensal requer YYYY-MM, anual requer YYYY).',
      path: ['period']
    }
  )

export type ReportFilterInput = z.infer<typeof reportFilterSchema>

export const reportKpiSchema = z.object({
  totalIncome: z.number(),
  totalExpense: z.number(),
  netBalance: z.number(),
  savingsRate: z.number(),
  transactionCount: z.number()
})

export type ReportKpi = z.infer<typeof reportKpiSchema>

export const categoryBreakdownItemSchema = z.object({
  categoryId: z.string().nullable(),
  categoryName: z.string(),
  categoryColor: z.string().nullable(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  percentage: z.number(),
  count: z.number()
})

export type CategoryBreakdownItem = z.infer<typeof categoryBreakdownItemSchema>

export const costCenterSummaryItemSchema = z.object({
  accountId: z.string(),
  accountName: z.string(),
  income: z.number(),
  expense: z.number(),
  net: z.number()
})

export type CostCenterSummaryItem = z.infer<typeof costCenterSummaryItemSchema>

export const cashFlowPointSchema = z.object({
  label: z.string(),
  date: z.string().optional(),
  income: z.number(),
  expense: z.number(),
  balance: z.number(),
  accumulatedBalance: z.number()
})

export type CashFlowPoint = z.infer<typeof cashFlowPointSchema>

export const reportSummaryResponseSchema = z.object({
  periodType: reportPeriodTypeSchema,
  period: z.string(),
  accountName: z.string().optional(),
  generatedAt: z.string(),
  kpis: reportKpiSchema,
  categoriesBreakdown: z.array(categoryBreakdownItemSchema),
  costCentersSummary: z.array(costCenterSummaryItemSchema),
  cashFlowTimeline: z.array(cashFlowPointSchema)
})

export type ReportSummaryResponse = z.infer<typeof reportSummaryResponseSchema>
