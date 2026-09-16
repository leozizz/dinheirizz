export function formatBRL(value: number | string): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numericValue)) return 'R$ 0,00'

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numericValue)
}

export function formatTransactionDate(date: string | Date): string {
  if (!date) return ''
  let d: Date
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, y, m, day] = match
      d = new Date(Number(y), Number(m) - 1, Number(day), 12, 0, 0)
    } else {
      d = new Date(date)
    }
  } else {
    d = date
  }

  if (isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(d)
}

export function parseCurrencyToNumber(value: string): number {
  if (!value) return 0
  let clean = value.replace(/[^\d,.-]/g, '').trim()
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}
