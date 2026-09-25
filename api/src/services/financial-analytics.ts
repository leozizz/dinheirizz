export interface FinancialTransactionInput {
  id: string
  amount: number | string
  paid: boolean
  type?: string
  categoryName?: string | null
  occurredAt?: Date | string
}

export interface CategoryBreakdown {
  categoryName: string
  amount: number
  percentage: number
}

export interface MonthlyFinancialMetrics {
  totalIncome: number
  totalExpense: number
  netBalance: number
  savingsRate: number
  topCategory: string | null
  categoriesBreakdown: CategoryBreakdown[]
}

/**
 * Agrega e calcula indicadores analíticos a partir do histórico de transações
 */
export function calculateMonthlyMetrics(
  transactions: FinancialTransactionInput[]
): MonthlyFinancialMetrics {
  let totalIncome = 0
  let totalExpense = 0
  const categoryMap = new Map<string, number>()

  for (const tx of transactions) {
    if (!tx.paid) continue

    const rawAmount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount
    if (isNaN(rawAmount)) continue

    if (rawAmount > 0) {
      totalIncome += rawAmount
    } else if (rawAmount < 0) {
      const expenseAmount = Math.abs(rawAmount)
      totalExpense += expenseAmount

      const catName = tx.categoryName?.trim() || 'Outros'
      categoryMap.set(catName, (categoryMap.get(catName) || 0) + expenseAmount)
    }
  }

  // Arredondamentos para 2 casas decimais
  totalIncome = Math.round(totalIncome * 100) / 100
  totalExpense = Math.round(totalExpense * 100) / 100
  const netBalance = Math.round((totalIncome - totalExpense) * 100) / 100

  // Taxa de poupança (%)
  let savingsRate = 0
  if (totalIncome > 0) {
    const rawRate = ((totalIncome - totalExpense) / totalIncome) * 100
    savingsRate = Math.round(Math.max(0, Math.min(100, rawRate)) * 100) / 100
  }

  // Distribuição por categoria ordenada por maior valor
  const categoriesBreakdown: CategoryBreakdown[] = []
  let topCategory: string | null = null
  let maxAmount = 0

  for (const [categoryName, amount] of categoryMap.entries()) {
    const roundedAmount = Math.round(amount * 100) / 100
    const percentage =
      totalExpense > 0 ? Math.round((roundedAmount / totalExpense) * 10000) / 100 : 0

    categoriesBreakdown.push({
      categoryName,
      amount: roundedAmount,
      percentage
    })

    if (roundedAmount > maxAmount) {
      maxAmount = roundedAmount
      topCategory = categoryName
    }
  }

  categoriesBreakdown.sort((a, b) => b.amount - a.amount)

  return {
    totalIncome,
    totalExpense,
    netBalance,
    savingsRate,
    topCategory,
    categoriesBreakdown
  }
}
