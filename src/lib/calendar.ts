import type { TransactionItem } from '../components/dashboard/Dashboard'
import { calculateRecurringDueDate, isNationalHoliday, getNationalHolidayName } from './businessDays'

export interface CalendarDaySummary {
  date: Date
  dateString: string // 'YYYY-MM-DD'
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  isHoliday: boolean
  holidayName: string | null
  totalIncome: number
  totalExpense: number
  netDayChange: number
  projectedBalance: number
  transactions: TransactionItem[]
  hasPending: boolean
}

export interface MonthMatrixOptions {
  year: number
  month: number // 0-indexed (0 = Jan, 9 = Out, 11 = Dez)
  transactions: TransactionItem[]
  initialBalance: number
  referenceDate?: Date
}

interface RecurringSeries {
  seriesId: string
  amount: number
  description: string | null
  type?: string
  category?: { name: string; color?: string | null; icon?: string | null } | null
  accountId?: string | null
  recurrenceDay: number
  adjustBusinessDay: boolean
  startYear: number
  startMonth: number
}

export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10) - 1,
      day: parseInt(match[3], 10)
    }
  }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth(), day: 1 }
  }
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() }
}

export function formatYMD(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Retorna a data de impacto da transação no formato 'YYYY-MM-DD'.
 * Prioriza dueDate (data de vencimento/agendamento) e faz fallback para occurred_at.
 * Caso a transação seja recorrente e possua adjustBusinessDay: true,
 * aplica a regra de dia útil bancário (prorrogando fins de semana e feriados nacionais).
 */
export function getEffectiveTransactionDate(tx: TransactionItem): string {
  const isRec = Boolean(tx.isRecurring ?? (tx as any).is_recurring)
  const adjustBD = Boolean(tx.adjustBusinessDay ?? (tx as any).adjust_business_day)
  const recDay = tx.recurrenceDay ?? (tx as any).recurrence_day

  const dateStr = tx.dueDate || tx.occurred_at
  if (!dateStr) return ''

  const parts = parseDateParts(dateStr)

  if (isRec && adjustBD) {
    const dayToUse = recDay ?? parts.day
    const adjusted = calculateRecurringDueDate(parts.year, parts.month, dayToUse, true)
    return formatYMD(adjusted)
  }

  return `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

/**
 * Formata mês e ano por extenso em português (ex: "Outubro de 2026").
 */
export function formatCalendarMonthYear(date: Date): string {
  const raw = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/**
 * Extrai as regras de recorrência únicas a partir da lista de transações.
 */
function extractRecurringSeries(transactions: TransactionItem[]): RecurringSeries[] {
  const seriesMap = new Map<string, RecurringSeries>()

  for (const t of transactions) {
    const isRecurring = Boolean(t.isRecurring ?? (t as any).is_recurring)
    if (!isRecurring) continue

    const seriesId = t.parentTransactionId || t.id
    if (!seriesMap.has(seriesId)) {
      const baseDateStr = t.dueDate || t.occurred_at || ''
      const parts = parseDateParts(baseDateStr)
      const recurrenceDay = t.recurrenceDay ?? (t as any).recurrence_day ?? parts.day
      const adjustBusinessDay = Boolean(t.adjustBusinessDay ?? (t as any).adjust_business_day)

      seriesMap.set(seriesId, {
        seriesId,
        amount: t.amount,
        description: t.description,
        type: t.type,
        category: t.category,
        accountId: t.accountId || t.account_id,
        recurrenceDay,
        adjustBusinessDay,
        startYear: parts.year,
        startMonth: parts.month
      })
    }
  }

  return Array.from(seriesMap.values())
}

/**
 * Retorna as transações (concretas e projetadas recorrentes) para um determinado mês (year, month).
 */
function getTransactionsForMonth(
  targetYear: number,
  targetMonth: number,
  transactions: TransactionItem[],
  recurringSeriesList: RecurringSeries[]
): Map<string, TransactionItem[]> {
  const txByDate = new Map<string, TransactionItem[]>()

  // 1. Mapeia transações concretas cujo effectiveDate caia no targetYear e targetMonth
  const targetPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-`
  const concreteSeriesInMonth = new Set<string>()

  for (const tx of transactions) {
    const key = getEffectiveTransactionDate(tx)
    if (!key) continue
    if (key.startsWith(targetPrefix)) {
      const list = txByDate.get(key) || []
      list.push(tx)
      txByDate.set(key, list)

      if (tx.isRecurring) {
        concreteSeriesInMonth.add(tx.parentTransactionId || tx.id)
      }
    }
  }

  // 2. Projeta transações recorrentes para este mês caso não haja ocorrência concreta
  for (const series of recurringSeriesList) {
    const isAfterStart =
      targetYear > series.startYear ||
      (targetYear === series.startYear && targetMonth >= series.startMonth)

    if (isAfterStart && !concreteSeriesInMonth.has(series.seriesId)) {
      const occDate = calculateRecurringDueDate(
        targetYear,
        targetMonth,
        series.recurrenceDay,
        series.adjustBusinessDay
      )
      const dateKey = formatYMD(occDate)

      const projectedTx: TransactionItem = {
        id: `rec-proj-${series.seriesId}-${targetYear}-${targetMonth}`,
        description: series.description,
        amount: series.amount,
        paid: false,
        status: 'pending',
        occurred_at: occDate.toISOString(),
        dueDate: occDate.toISOString(),
        category: series.category,
        type: series.type,
        accountId: series.accountId,
        isRecurring: true,
        recurrenceDay: series.recurrenceDay,
        adjustBusinessDay: series.adjustBusinessDay,
        parentTransactionId: series.seriesId
      }

      const list = txByDate.get(dateKey) || []
      list.push(projectedTx)
      txByDate.set(dateKey, list)
    }
  }

  return txByDate
}

/**
 * Calcula a variação líquida total (income - expense) de um mapa de transações.
 */
function calculateNetChange(txMap: Map<string, TransactionItem[]>): number {
  let net = 0
  for (const list of txMap.values()) {
    for (const t of list) {
      net += t.amount
    }
  }
  return net
}

/**
 * Constrói a grade completa do mês (semanas de Domingo a Sábado, 35 a 42 células),
 * com projeção exponencial de transações recorrentes e propagação contínua de saldo.
 */
export function buildMonthCalendarMatrix({
  year,
  month,
  transactions,
  initialBalance,
  referenceDate = new Date()
}: MonthMatrixOptions): CalendarDaySummary[] {
  const today = referenceDate
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const recurringSeriesList = extractRecurringSeries(transactions)

  // Mapeia transações do mês alvo
  const currentMonthTx = getTransactionsForMonth(year, month, transactions, recurringSeriesList)

  // Primeiro dia do mês desejado ao meio-dia para evitar shifts de DST
  const firstDayOfMonth = new Date(year, month, 1, 12, 0, 0, 0)
  // Último dia do mês desejado ao meio-dia
  const lastDayOfMonth = new Date(year, month + 1, 0, 12, 0, 0, 0)

  // O primeiro dia da grade é o domingo anterior ou o próprio 1º dia
  const startDayOfWeek = firstDayOfMonth.getDay() // 0 = Domingo, 1 = Segunda...
  const startDate = new Date(year, month, 1 - startDayOfWeek, 12, 0, 0, 0)

  // O último dia da grade é o sábado posterior ou o próprio último dia
  const endDayOfWeek = lastDayOfMonth.getDay()
  const daysToAdd = 6 - endDayOfWeek
  const endDate = new Date(year, month, lastDayOfMonth.getDate() + daysToAdd, 12, 0, 0, 0)

  // Também mapeia meses vizinhos para preencher transações dos padding days (semana inicial/final)
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const prevMonthTx = getTransactionsForMonth(prevYear, prevMonth, transactions, recurringSeriesList)

  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  const nextMonthTx = getTransactionsForMonth(nextYear, nextMonth, transactions, recurringSeriesList)

  // ==========================================
  // CÁLCULO DE PROPAGAÇÃO DO SALDO ACUMULADO
  // ==========================================
  const refYear = today.getFullYear()
  const refMonth = today.getMonth()
  const refDay = today.getDate()

  let startingBalanceAtFirstOfMonth = initialBalance

  const monthDiff = (year - refYear) * 12 + (month - refMonth)

  if (monthDiff > 0) {
    // Mês alvo está no FUTURO em relação ao mês de referência
    // 1. Adiciona movimentações do mês de referência que ocorrem APÓS o dia de hoje
    const refMonthTx = getTransactionsForMonth(refYear, refMonth, transactions, recurringSeriesList)
    let netAfterTodayInRefMonth = 0
    for (const [dateStr, list] of refMonthTx.entries()) {
      const dayNum = parseInt(dateStr.slice(8, 10), 10)
      if (dayNum > refDay) {
        for (const t of list) {
          netAfterTodayInRefMonth += t.amount
        }
      }
    }
    startingBalanceAtFirstOfMonth += netAfterTodayInRefMonth

    // 2. Adiciona todas as movimentações dos meses intermediários completos
    let curY = refYear
    let curM = refMonth + 1
    if (curM > 11) {
      curM = 0
      curY += 1
    }

    while (curY < year || (curY === year && curM < month)) {
      const interTx = getTransactionsForMonth(curY, curM, transactions, recurringSeriesList)
      startingBalanceAtFirstOfMonth += calculateNetChange(interTx)

      curM += 1
      if (curM > 11) {
        curM = 0
        curY += 1
      }
    }
  } else if (monthDiff < 0) {
    // Mês alvo está no PASSADO
    let curY = refYear
    let curM = refMonth

    while (curY > year || (curY === year && curM > month)) {
      curM -= 1
      if (curM < 0) {
        curM = 11
        curY -= 1
      }
      const interTx = getTransactionsForMonth(curY, curM, transactions, recurringSeriesList)
      startingBalanceAtFirstOfMonth -= calculateNetChange(interTx)
    }
  }

  // Se a grade começa com dias do mês anterior (padding days), ajusta o saldo inicial da grade
  let paddingNetChange = 0
  if (startDate.getTime() < firstDayOfMonth.getTime()) {
    const iterPad = new Date(startDate)
    while (iterPad.getTime() < firstDayOfMonth.getTime()) {
      const padDateStr = formatYMD(iterPad)
      const list = prevMonthTx.get(padDateStr) || []
      for (const t of list) {
        paddingNetChange += t.amount
      }
      iterPad.setDate(iterPad.getDate() + 1)
    }
  }

  let runningBalance = startingBalanceAtFirstOfMonth - paddingNetChange

  // ==========================================
  // CONSTRUÇÃO DA GRADE DE DIAS
  // ==========================================
  const days: CalendarDaySummary[] = []
  const iter = new Date(startDate)

  while (iter.getTime() <= endDate.getTime()) {
    const iterYear = iter.getFullYear()
    const iterMonth = iter.getMonth()
    const iterDate = iter.getDate()
    const dateString = `${iterYear}-${String(iterMonth + 1).padStart(2, '0')}-${String(iterDate).padStart(2, '0')}`

    const isCurrentMonth = iterMonth === month && iterYear === year
    const isToday = dateString === todayStr
    const dayOfWeek = iter.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Obtém transações do mês correspondente
    let dayTx: TransactionItem[] = []
    if (isCurrentMonth) {
      dayTx = currentMonthTx.get(dateString) || []
    } else if (iterMonth === prevMonth && iterYear === prevYear) {
      dayTx = prevMonthTx.get(dateString) || []
    } else {
      dayTx = nextMonthTx.get(dateString) || []
    }

    let totalIncome = 0
    let totalExpense = 0
    let hasPending = false

    for (const t of dayTx) {
      if (t.amount > 0) {
        totalIncome += t.amount
      } else {
        totalExpense += Math.abs(t.amount)
      }
      if (!t.paid || t.status === 'pending') {
        hasPending = true
      }
    }

    const netDayChange = totalIncome - totalExpense
    runningBalance += netDayChange

    const isHoliday = isNationalHoliday(iter)
    const holidayName = isHoliday ? getNationalHolidayName(iter) : null

    days.push({
      date: new Date(iter),
      dateString,
      dayNumber: iterDate,
      isCurrentMonth,
      isToday,
      isWeekend,
      isHoliday,
      holidayName,
      totalIncome,
      totalExpense,
      netDayChange,
      projectedBalance: runningBalance,
      transactions: dayTx,
      hasPending
    })

    iter.setDate(iter.getDate() + 1)
  }

  return days
}
