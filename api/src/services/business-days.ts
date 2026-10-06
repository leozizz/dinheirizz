/**
 * Utilitário de Cálculo de Dias Úteis Bancários Nacionais (Febraban / B3)
 */

function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1 // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month, day, 12, 0, 0))
}

function formatDateMD(date: Date): string {
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${m}-${d}`
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6 // 0 = Domingo, 6 = Sábado
}

export function isNationalHoliday(date: Date): boolean {
  const year = date.getUTCFullYear()
  const md = formatDateMD(date)

  // Feriados Nacionais Fixos (Brasil)
  const fixedHolidays = new Set([
    '01-01', // Confraternização Universal
    '04-21', // Tiradentes
    '05-01', // Dia do Trabalho
    '09-07', // Independência do Brasil
    '10-12', // Nossa Senhora Aparecida
    '11-02', // Finados
    '11-15', // Proclamação da República
    '11-20', // Dia Nacional de Zumbi e da Consciência Negra (Lei 14.759/2023)
    '12-25'  // Natal
  ])

  if (fixedHolidays.has(md)) {
    return true
  }

  // Feriados Móveis baseados no Domingo de Páscoa
  const easter = getEasterDate(year)
  const easterTime = easter.getTime()
  const ONE_DAY = 24 * 60 * 60 * 1000

  const carnivalMonday = new Date(easterTime - 48 * ONE_DAY)
  const carnivalTuesday = new Date(easterTime - 47 * ONE_DAY)
  const goodFriday = new Date(easterTime - 2 * ONE_DAY)
  const corpusChristi = new Date(easterTime + 60 * ONE_DAY)

  const mobileHolidays = new Set([
    formatDateMD(carnivalMonday),
    formatDateMD(carnivalTuesday),
    formatDateMD(goodFriday),
    formatDateMD(corpusChristi)
  ])

  return mobileHolidays.has(md)
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isNationalHoliday(date)
}

/**
 * Avança determinística e sequencialmente a data até o próximo dia útil caso caia em fim de semana ou feriado nacional.
 */
export function adjustToNextBusinessDay(date: Date): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0))

  while (!isBusinessDay(result)) {
    result.setUTCDate(result.getUTCDate() + 1)
  }

  return result
}

/**
 * Calcula a data de vencimento recorrente para determinado ano/mês/dia.
 * Clampa o dia caso o mês tenha menos dias (ex: 31 de Fevereiro -> 28 ou 29).
 * Se adjustBusinessDay for true, avança para o próximo dia útil caso necessário.
 */
export function calculateRecurringDueDate(
  year: number,
  monthIndex: number, // 0-indexed (0 = Jan, 11 = Dez)
  dayOfMonth: number, // 1 a 31
  adjustBusinessDay: boolean = false
): Date {
  // Encontrar o último dia do mês para clamping seguro
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const targetDay = Math.min(Math.max(1, dayOfMonth), daysInMonth)

  const rawDate = new Date(Date.UTC(year, monthIndex, targetDay, 12, 0, 0))

  if (!adjustBusinessDay) {
    return rawDate
  }

  return adjustToNextBusinessDay(rawDate)
}
