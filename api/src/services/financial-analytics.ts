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

export type SubscriptionFrequency = 'monthly' | 'yearly'

export interface SubscriptionTransactionInput {
  id: string
  accountId: string
  categoryId?: string | null
  amount: number | string
  description?: string | null
  occurredAt: Date | string
  type?: string
  status?: string
  paid?: boolean
  isRecurring?: boolean
  recurrencePeriod?: string | null
  installmentTotal?: number | null
}

export interface DetectSubscriptionsOptions {
  windowDays?: number
  referenceDate?: Date
}

export interface SubscriptionPriceAlert {
  previousAverageAmount: number
  currentAmount: number
  increasePercentage: number
}

export interface SubscriptionDuplicateAlert {
  duplicateCount: number
  dates: string[]
}

export interface DetectedSubscription {
  id: string
  normalizedKey: string
  name: string
  frequency: SubscriptionFrequency
  averageAmount: number
  lastAmount: number
  monthlyCost: number
  annualCost: number
  occurrencesCount: number
  lastChargedAt: string
  nextEstimatedChargeAt: string
  latestTransactionId: string
  accountId: string
  categoryId: string | null
  isConfirmedRecurring: boolean
  priceAlert: SubscriptionPriceAlert | null
  duplicateAlert: SubscriptionDuplicateAlert | null
}

interface NormalizedOccurrence {
  tx: SubscriptionTransactionInput
  amount: number
  date: Date
  isoDate: string
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

const roundCurrency = (value: number): number => Math.round(value * 100) / 100

/**
 * Normaliza descrições de despesas para agrupar cobranças recorrentes com pequenas variações
 */
export const normalizeSubscriptionDescription = (description: string): string => {
  let cleaned = description
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  // Remove prefixos bancários/adquirentes comuns (inclusive se encadeados)
  let previous = ''
  while (cleaned !== previous) {
    previous = cleaned
    cleaned = cleaned.replace(
      /^(?:pag\s*\*|mp\s*\*|ifd\s*\*|uber\s*\*|pix\s+|compra\s+cartao\s+)/,
      ''
    ).trim()
  }

  // Remove sufixos de domínio web comuns e referências numéricas/datas
  cleaned = cleaned
    .replace(/\.(?:com(?:\.br)?|net|org|io|br)\b/g, ' ')
    .replace(/\*[a-z0-9]*/g, ' ')
    .replace(/\b\d{1,4}(?:[/-]\d{1,4})+\b/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
}

const formatSubscriptionName = (normalizedKey: string): string =>
  normalizedKey
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const parseOccurredAt = (value: Date | string): Date | null => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const diffInDays = (earlier: Date, later: Date): number =>
  (later.getTime() - earlier.getTime()) / MS_PER_DAY

const addSubscriptionPeriod = (date: Date, frequency: SubscriptionFrequency): Date => {
  const next = new Date(date.getTime())
  const originalDay = next.getUTCDate()

  if (frequency === 'yearly') {
    next.setUTCFullYear(next.getUTCFullYear() + 1)
    return next
  }

  next.setUTCMonth(next.getUTCMonth() + 1)
  // Evita estouro de dia em meses mais curtos (ex.: 31/01 -> 28/02)
  if (next.getUTCDate() < originalDay) {
    next.setUTCDate(0)
  }
  return next
}

const detectFrequency = (occurrences: NormalizedOccurrence[]): SubscriptionFrequency | null => {
  if (occurrences.length < 2) return null

  const cycleIntervals: number[] = []
  let anchorDate = occurrences[0].date

  for (let i = 1; i < occurrences.length; i += 1) {
    const days = diffInDays(anchorDate, occurrences[i].date)
    // Ignora cobranças duplicadas (<= 5 dias) no cálculo do ciclo principal
    if (days <= 5) continue
    cycleIntervals.push(days)
    anchorDate = occurrences[i].date
  }

  if (cycleIntervals.length === 0) return null

  const avgInterval =
    cycleIntervals.reduce((acc, days) => acc + days, 0) / cycleIntervals.length

  if (avgInterval >= 25 && avgInterval <= 35) {
    const isConsistentMonthly = cycleIntervals.every((days) => days >= 18 && days <= 42)
    return isConsistentMonthly ? 'monthly' : null
  }

  if (avgInterval >= 350 && avgInterval <= 380) {
    const isConsistentYearly = cycleIntervals.every((days) => days >= 340 && days <= 390)
    return isConsistentYearly ? 'yearly' : null
  }

  return null
}

const buildPriceAlert = (
  occurrences: NormalizedOccurrence[],
  lastAmount: number
): SubscriptionPriceAlert | null => {
  if (occurrences.length < 2) return null

  const priorOccurrences = occurrences.slice(0, -1)
  const priorSum = priorOccurrences.reduce((acc, item) => acc + item.amount, 0)
  const previousAverageAmount = roundCurrency(priorSum / priorOccurrences.length)

  if (previousAverageAmount <= 0) return null

  const increaseRatio = (lastAmount - previousAverageAmount) / previousAverageAmount
  if (increaseRatio <= 0.1000001) return null

  const increasePercentage = Math.round(increaseRatio * 1000) / 10
  return {
    previousAverageAmount,
    currentAmount: lastAmount,
    increasePercentage
  }
}

const buildDuplicateAlert = (
  occurrences: NormalizedOccurrence[]
): SubscriptionDuplicateAlert | null => {
  if (occurrences.length < 2) return null

  const duplicateIndices = new Set<number>()

  for (let i = 0; i < occurrences.length; i += 1) {
    for (let j = i + 1; j < occurrences.length; j += 1) {
      const daysApart = diffInDays(occurrences[i].date, occurrences[j].date)
      if (daysApart > 5) break

      const maxAmount = Math.max(occurrences[i].amount, occurrences[j].amount)
      const tolerance = Math.max(0.5, maxAmount * 0.01)
      const amountDiff = Math.abs(occurrences[i].amount - occurrences[j].amount)

      if (amountDiff <= tolerance) {
        duplicateIndices.add(i)
        duplicateIndices.add(j)
      }
    }
  }

  if (duplicateIndices.size < 2) return null

  const dates = Array.from(duplicateIndices)
    .sort((a, b) => a - b)
    .map((idx) => occurrences[idx].isoDate)

  return {
    duplicateCount: dates.length,
    dates
  }
}

/**
 * Detecta assinaturas e contas recorrentes implícitas a partir do histórico de transações
 */
export const detectRecurringSubscriptions = (
  transactions: SubscriptionTransactionInput[],
  options: DetectSubscriptionsOptions = {}
): DetectedSubscription[] => {
  const windowDays = options.windowDays ?? 400
  const referenceDate = options.referenceDate ?? new Date()
  const cutoffMs = referenceDate.getTime() - windowDays * MS_PER_DAY

  const groups = new Map<string, NormalizedOccurrence[]>()

  for (const tx of transactions) {
    if (tx.status === 'cancelled') continue
    if (tx.installmentTotal != null && tx.installmentTotal > 1) continue
    if (tx.type === 'income' || tx.type === 'transfer') continue

    const rawAmount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount
    if (!Number.isFinite(rawAmount) || rawAmount === 0) continue

    const isExpense = tx.type === 'expense' || rawAmount < 0
    if (!isExpense) continue

    const description = tx.description?.trim()
    if (!description) continue

    const normalizedKey = normalizeSubscriptionDescription(description)
    if (!normalizedKey) continue

    const parsedDate = parseOccurredAt(tx.occurredAt)
    if (!parsedDate || parsedDate.getTime() < cutoffMs) continue

    const group = groups.get(normalizedKey) ?? []
    group.push({
      tx,
      amount: roundCurrency(Math.abs(rawAmount)),
      date: parsedDate,
      isoDate: parsedDate.toISOString()
    })
    groups.set(normalizedKey, group)
  }

  const detected: DetectedSubscription[] = []

  for (const [normalizedKey, occurrences] of groups.entries()) {
    occurrences.sort((a, b) => a.date.getTime() - b.date.getTime())

    const frequency = detectFrequency(occurrences)
    if (!frequency) continue

    const totalAmount = occurrences.reduce((acc, item) => acc + item.amount, 0)
    const averageAmount = roundCurrency(totalAmount / occurrences.length)
    const latest = occurrences[occurrences.length - 1]
    const lastAmount = latest.amount
    const monthlyCost = frequency === 'monthly' ? lastAmount : roundCurrency(lastAmount / 12)
    const annualCost = frequency === 'monthly' ? roundCurrency(lastAmount * 12) : lastAmount
    const nextEstimatedChargeAt = addSubscriptionPeriod(latest.date, frequency).toISOString()
    const isConfirmedRecurring = occurrences.some((item) => Boolean(item.tx.isRecurring))

    detected.push({
      id: normalizedKey,
      normalizedKey,
      name: formatSubscriptionName(normalizedKey),
      frequency,
      averageAmount,
      lastAmount,
      monthlyCost,
      annualCost,
      occurrencesCount: occurrences.length,
      lastChargedAt: latest.isoDate,
      nextEstimatedChargeAt,
      latestTransactionId: latest.tx.id,
      accountId: latest.tx.accountId,
      categoryId: latest.tx.categoryId ?? null,
      isConfirmedRecurring,
      priceAlert: buildPriceAlert(occurrences, lastAmount),
      duplicateAlert: buildDuplicateAlert(occurrences)
    })
  }

  return detected.sort(
    (a, b) => new Date(a.nextEstimatedChargeAt).getTime() - new Date(b.nextEstimatedChargeAt).getTime()
  )
}
