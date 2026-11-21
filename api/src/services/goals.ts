export interface GoalMetricsInput {
  targetAmount: number
  currentAmount: number
  deadline: Date | string | null | undefined
  referenceDate?: Date
}

export interface GoalMetrics {
  remainingAmount: number
  progressPercentage: number
  isCompleted: boolean
  monthsRemaining: number | null
  monthlyRequiredAmount: number | null
}

const round1 = (value: number): number => Math.round(value * 10) / 10

const round2 = (value: number): number => Math.round(value * 100) / 100

/**
 * Calcula métricas de progresso e ritmo mensal necessário para uma meta de economia.
 */
export const calculateGoalMetrics = (input: GoalMetricsInput): GoalMetrics => {
  const target = Number.isFinite(input.targetAmount) ? Math.max(0, input.targetAmount) : 0
  const current = Number.isFinite(input.currentAmount) ? Math.max(0, input.currentAmount) : 0

  const remainingAmount = Math.max(0, round2(target - current))
  const progressPercentage =
    target > 0 ? Math.min(100, round1((current / target) * 100)) : 0
  const isCompleted = target > 0 ? current >= target : false

  if (isCompleted || remainingAmount <= 0) {
    return {
      remainingAmount: 0,
      progressPercentage,
      isCompleted: true,
      monthsRemaining: null,
      monthlyRequiredAmount: 0
    }
  }

  if (!input.deadline) {
    return {
      remainingAmount,
      progressPercentage,
      isCompleted: false,
      monthsRemaining: null,
      monthlyRequiredAmount: null
    }
  }

  const deadlineDate =
    input.deadline instanceof Date ? input.deadline : new Date(input.deadline)
  if (isNaN(deadlineDate.getTime())) {
    return {
      remainingAmount,
      progressPercentage,
      isCompleted: false,
      monthsRemaining: null,
      monthlyRequiredAmount: null
    }
  }

  const refDate = input.referenceDate ?? new Date()
  let months =
    (deadlineDate.getUTCFullYear() - refDate.getUTCFullYear()) * 12 +
    (deadlineDate.getUTCMonth() - refDate.getUTCMonth())

  if (deadlineDate.getUTCDate() > refDate.getUTCDate()) {
    months += 1
  }

  const monthsRemaining = Math.max(1, months)
  const monthlyRequiredAmount = round2(remainingAmount / monthsRemaining)

  return {
    remainingAmount,
    progressPercentage,
    isCompleted: false,
    monthsRemaining,
    monthlyRequiredAmount
  }
}
