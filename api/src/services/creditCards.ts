export interface BillingCycleDates {
  period: string
  closingDate: string
  dueDate: string
}

export const formatPeriod = (year: number, month: number): string => {
  const m = month < 10 ? `0${month}` : `${month}`
  return `${year}-${m}`
}

export const determineInvoicePeriodForPurchase = (
  occurredAt: Date,
  closingDay: number
): string => {
  const year = occurredAt.getUTCFullYear()
  const month = occurredAt.getUTCMonth() + 1 // 1-12
  const day = occurredAt.getUTCDate()

  if (day < closingDay) {
    return formatPeriod(year, month)
  }

  // A partir do dia de fechamento (melhor dia de compra), cai no próximo mês
  if (month === 12) {
    return formatPeriod(year + 1, 1)
  }
  return formatPeriod(year, month + 1)
}

export const calculateBillingCycleDates = (
  closingDay: number,
  dueDay: number,
  refPeriod?: string // 'YYYY-MM'
): BillingCycleDates => {
  let year: number
  let month: number

  if (refPeriod) {
    const parts = refPeriod.split('-')
    year = parseInt(parts[0], 10)
    month = parseInt(parts[1], 10)
  } else {
    const now = new Date()
    year = now.getUTCFullYear()
    month = now.getUTCMonth() + 1
  }

  const period = formatPeriod(year, month)

  // Data de fechamento no mês de referência
  // Clamping caso o mês tenha menos dias (ex: dia 31 em fevereiro)
  const maxDaysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const effectiveClosingDay = Math.min(closingDay, maxDaysInMonth)
  const closingDateObj = new Date(Date.UTC(year, month - 1, effectiveClosingDay, 23, 59, 59, 999))

  // Data de vencimento: se dueDay <= closingDay, o vencimento é no mês seguinte
  let dueYear = year
  let dueMonth = month
  if (dueDay <= closingDay) {
    if (month === 12) {
      dueYear = year + 1
      dueMonth = 1
    } else {
      dueMonth = month + 1
    }
  }

  const maxDaysInDueMonth = new Date(Date.UTC(dueYear, dueMonth, 0)).getUTCDate()
  const effectiveDueDay = Math.min(dueDay, maxDaysInDueMonth)
  const dueDateObj = new Date(Date.UTC(dueYear, dueMonth - 1, effectiveDueDay, 23, 59, 59, 999))

  return {
    period,
    closingDate: closingDateObj.toISOString(),
    dueDate: dueDateObj.toISOString()
  }
}

export interface LimitInvoiceItem {
  amount: string | number
  paidAmount?: string | number | null
  status: string
}

export interface CalculatedLimits {
  limitAmount: number
  usedLimit: number
  availableLimit: number
}

export const calculateCreditLimits = (
  limitAmount: number | string,
  invoices: LimitInvoiceItem[]
): CalculatedLimits => {
  const numericLimit = typeof limitAmount === 'string' ? parseFloat(limitAmount) || 0 : limitAmount

  let usedLimit = 0
  for (const inv of invoices) {
    if (inv.status === 'open' || inv.status === 'closed' || inv.status === 'overdue') {
      const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) || 0 : inv.amount
      const paid = typeof inv.paidAmount === 'string' ? parseFloat(inv.paidAmount) || 0 : inv.paidAmount || 0
      const pending = Math.max(0, amount - paid)
      usedLimit += pending
    }
  }

  // Arredondamento para 2 casas decimais
  const roundedUsed = Math.round(usedLimit * 100) / 100
  const availableLimit = Math.max(0, Math.round((numericLimit - roundedUsed) * 100) / 100)

  return {
    limitAmount: Math.round(numericLimit * 100) / 100,
    usedLimit: roundedUsed,
    availableLimit
  }
}
