import type { ParsedStatementResult, ParsedTransactionCandidate } from '../../types/import'

const parseDateString = (raw: string): string => {
  const parts = raw.split(/[/-]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
    }
    // DD-MM-YYYY
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  return new Date().toISOString().split('T')[0]
}

const parseAmountString = (raw: string): { amount: number; isNegative: boolean } | null => {
  let clean = raw.trim()
  let isNegative = false

  if (clean.includes('-')) {
    isNegative = true
  }

  // Remove currency, signs and spaces
  clean = clean.replace(/[R$\s\-+]/g, '')

  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',')
    const lastDot = clean.lastIndexOf('.')
    if (lastComma > lastDot) {
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else {
      clean = clean.replace(/,/g, '')
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }

  const num = parseFloat(clean)
  if (Number.isNaN(num)) return null

  return {
    amount: Math.abs(num),
    isNegative
  }
}

export const parsePDF = (content: string, fileName = 'statement.pdf'): ParsedStatementResult => {
  if (!content || typeof content !== 'string') {
    throw new Error(
      'Não foi possível extrair transações deste PDF. Se for um documento escaneado (imagem), recomendamos exportar o extrato no formato OFX ou CSV.'
    )
  }

  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  const transactions: ParsedTransactionCandidate[] = []

  // Regex pattern matching: Date, description, and amount
  // Ex: "05/10/2026 Supermercado Pão de Açúcar -R$ 185,40"
  const lineRegex = /^(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s+(.+?)\s+([+-]?\s*R?\$?\s*[+-]?\d[\d.,]*)$/i

  let totalIncome = 0
  let totalExpense = 0

  for (const line of lines) {
    const match = line.match(lineRegex)
    if (!match) continue

    const rawDate = match[1]
    const description = match[2].trim()
    const rawAmount = match[3]

    const parsedAmount = parseAmountString(rawAmount)
    if (!parsedAmount || parsedAmount.amount === 0) continue

    const date = parseDateString(rawDate)
    const type: 'income' | 'expense' = parsedAmount.isNegative ? 'expense' : 'income'

    if (type === 'income') {
      totalIncome += parsedAmount.amount
    } else {
      totalExpense += parsedAmount.amount
    }

    transactions.push({
      id: crypto.randomUUID(),
      date,
      description,
      amount: parsedAmount.amount,
      type,
      selected: true
    })
  }

  if (transactions.length === 0) {
    throw new Error(
      'Não foi possível extrair transações deste PDF. Se for um documento escaneado (imagem), recomendamos exportar o extrato no formato OFX ou CSV.'
    )
  }

  return {
    format: 'pdf',
    fileName,
    transactions,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100
  }
}
