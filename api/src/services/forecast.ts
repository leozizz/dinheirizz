export interface ForecastTransaction {
  id: string
  amount: number | string
  paid: boolean
  status?: string | null
  dueDate?: Date | string | null
  occurredAt?: Date | string | null
  type?: string
  isRecurring?: boolean
  installmentTotal?: number | null
}

export type TransactionForecastInput = ForecastTransaction

export interface ForecastOptions {
  startingBalance?: number
  currentBalance?: number // alias for startingBalance
  days?: number // 30 | 60, default 30
  startDate?: Date | string // default: current date
  historyTransactions?: ForecastTransaction[]
  scheduledTransactions?: ForecastTransaction[]
  pendingTransactions?: ForecastTransaction[] // alias for scheduledTransactions
  historyWindowDays?: number // default 30
}

export interface DailyCashFlowPoint {
  date: string // YYYY-MM-DD
  balance: number
  projectedBalance?: number // alias for balance
  scheduledIncome: number
  scheduledExpense: number
  variableBurn: number
  estimatedBurn?: number // alias for variableBurn
  pendingCount?: number
}

export interface ForecastResult {
  startingBalance: number
  initialBalance: number // alias
  projectedEndBalance: number
  projectedBalance: number // alias
  netChange: number
  dailyBurnRate: number
  healthStatus: 'safe' | 'warning' | 'danger'
  risk: 'safe' | 'warning' | 'danger' // alias
  healthMessage: string
  lowestPoint: {
    date: string
    balance: number
    amount: number // alias
  }
  timeline: DailyCashFlowPoint[]
}

function formatDateToYMD(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function calculateCashFlowForecast(options: ForecastOptions): ForecastResult {
  const startingBalance =
    Math.round((Number(options.startingBalance ?? options.currentBalance) || 0) * 100) / 100
  const days = options.days === 60 ? 60 : 30
  const startDate = options.startDate ? new Date(options.startDate) : new Date()

  // 1. Calcular Burn Rate Diário de Gastos Variáveis
  const history = options.historyTransactions || []
  let totalVariableExpenses = 0

  for (const tx of history) {
    const isCompleted = tx.paid || tx.status === 'completed'
    if (!isCompleted) continue

    // Ignora despesas recorrentes fixas para evitar dupla contagem
    if (tx.isRecurring) continue

    const rawAmount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount
    if (isNaN(rawAmount)) continue

    if (rawAmount < 0) {
      totalVariableExpenses += Math.abs(rawAmount)
    }
  }

  const historyDays = Math.max(1, options.historyWindowDays || 30)
  const dailyBurnRate = Math.round((totalVariableExpenses / historyDays) * 100) / 100

  // 2. Mapear Transações Agendadas e Recorrências Futuras por Data
  const scheduled = options.scheduledTransactions || options.pendingTransactions || []
  const allCandidateRecurring = [
    ...(options.historyTransactions || []),
    ...scheduled
  ].filter((tx) => tx.isRecurring)

  const recurringMap = new Map<string, ForecastTransaction>()
  for (const r of allCandidateRecurring) {
    if (!recurringMap.has(r.id)) {
      recurringMap.set(r.id, r)
    }
  }

  const scheduledByDate = new Map<string, { income: number; expense: number; count: number }>()

  // Transações pontuais agendadas (não-recorrentes)
  for (const tx of scheduled) {
    if (tx.isRecurring) continue // Tratadas no loop de projeção de recorrência
    const isPending = !tx.paid || tx.status === 'pending'
    if (!isPending) continue

    const targetDateStr = tx.dueDate || tx.occurredAt
    if (!targetDateStr) continue

    const txDate = new Date(targetDateStr)
    const dateKey = formatDateToYMD(txDate)

    const rawAmount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount
    if (isNaN(rawAmount)) continue

    const current = scheduledByDate.get(dateKey) || { income: 0, expense: 0, count: 0 }
    if (rawAmount > 0 || tx.type === 'income') {
      current.income += Math.abs(rawAmount)
    } else {
      current.expense += Math.abs(rawAmount)
    }
    current.count += 1
    scheduledByDate.set(dateKey, current)
  }

  // Projetar transações recorrentes ciclicamente ao longo do horizonte (30 ou 60 dias)
  const endDate = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate() + days
  ))

  for (const r of recurringMap.values()) {
    const rawAmount = typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount
    if (isNaN(rawAmount)) continue

    const baseDateStr = r.dueDate || r.occurredAt
    if (!baseDateStr) continue
    const baseDate = new Date(baseDateStr)
    const dayOfMonth = baseDate.getUTCDate()

    const startYear = startDate.getUTCFullYear()
    const startMonth = startDate.getUTCMonth()

    for (let m = -1; m <= 3; m++) {
      const year = startYear + Math.floor((startMonth + m) / 12)
      const month = ((startMonth + m) % 12 + 12) % 12
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
      const targetDay = Math.min(dayOfMonth, daysInMonth)
      const occurrenceDate = new Date(Date.UTC(year, month, targetDay))

      if (occurrenceDate >= startDate && occurrenceDate < endDate) {
        const dateKey = formatDateToYMD(occurrenceDate)
        const current = scheduledByDate.get(dateKey) || { income: 0, expense: 0, count: 0 }
        if (rawAmount > 0 || r.type === 'income') {
          current.income += Math.abs(rawAmount)
        } else {
          current.expense += Math.abs(rawAmount)
        }
        current.count += 1
        scheduledByDate.set(dateKey, current)
      }
    }
  }

  // 3. Projeção Diária do Fluxo de Caixa
  const timeline: DailyCashFlowPoint[] = []
  let currentBalance = startingBalance
  let lowestBalance = startingBalance
  let lowestDate = formatDateToYMD(startDate)

  for (let i = 0; i < days; i++) {
    const pointDate = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate() + i
    ))
    const dateStr = formatDateToYMD(pointDate)

    const scheduledToday = scheduledByDate.get(dateStr) || { income: 0, expense: 0, count: 0 }
    const scheduledIncome = Math.round(scheduledToday.income * 100) / 100
    const scheduledExpense = Math.round(scheduledToday.expense * 100) / 100

    currentBalance = Math.round(
      (currentBalance + scheduledIncome - scheduledExpense - dailyBurnRate) * 100
    ) / 100

    timeline.push({
      date: dateStr,
      balance: currentBalance,
      projectedBalance: currentBalance,
      scheduledIncome,
      scheduledExpense,
      variableBurn: dailyBurnRate,
      estimatedBurn: dailyBurnRate,
      pendingCount: scheduledToday.count
    })

    if (currentBalance < lowestBalance || i === 0) {
      lowestBalance = currentBalance
      lowestDate = dateStr
    }
  }

  const projectedEndBalance = timeline[days - 1]?.balance ?? startingBalance
  const netChange = Math.round((projectedEndBalance - startingBalance) * 100) / 100

  // 4. Detecção de Riscos e Anomalias de Caixa
  let healthStatus: 'safe' | 'warning' | 'danger' = 'safe'
  let healthMessage = 'Saldo saudável com previsão de cobertura de todos os compromissos.'

  if (lowestBalance < 0) {
    healthStatus = 'danger'
    healthMessage = 'Atenção: Risco de saldo negativo identificado durante o período projetado.'
  } else if (startingBalance > 0 && lowestBalance <= startingBalance * 0.15) {
    healthStatus = 'warning'
    healthMessage = 'Atenção: Saldo projetado atinge nível de reserva prudencial reduzido.'
  }

  return {
    startingBalance,
    initialBalance: startingBalance,
    projectedEndBalance,
    projectedBalance: projectedEndBalance,
    netChange,
    dailyBurnRate,
    healthStatus,
    risk: healthStatus,
    healthMessage,
    lowestPoint: {
      date: lowestDate,
      balance: lowestBalance,
      amount: lowestBalance
    },
    timeline
  }
}
