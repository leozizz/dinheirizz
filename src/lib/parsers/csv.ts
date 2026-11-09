import type { ParsedStatementResult, ParsedTransactionCandidate } from '../../types/import'

const detectDelimiter = (content: string): string => {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5)
  if (lines.length === 0) return ';'

  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 }
  for (const line of lines) {
    counts[';'] += (line.match(/;/g) || []).length
    counts[','] += (line.match(/,/g) || []).length
    counts['\t'] += (line.match(/\t/g) || []).length
  }

  if (counts['\t'] > counts[';'] && counts['\t'] > counts[',']) return '\t'
  if (counts[';'] >= counts[',']) return ';'
  return ','
}

const splitCSVLine = (line: string, delimiter: string): string[] => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values.map((val) => val.replace(/^["']|["']$/g, '').trim())
}

const parseCSVDate = (rawDate: string): string | null => {
  const trimmed = rawDate.trim()
  // Match DD/MM/YYYY or DD-MM-YYYY
  const brMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0')
    const month = brMatch[2].padStart(2, '0')
    const year = brMatch[3]
    return `${year}-${month}-${day}`
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (isoMatch) {
    const year = isoMatch[1]
    const month = isoMatch[2].padStart(2, '0')
    const day = isoMatch[3].padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return null
}

const parseCSVAmount = (raw: string): { amount: number; isNegative: boolean } | null => {
  let clean = raw.trim()
  if (!clean) return null

  let isNegative = false
  if (clean.startsWith('(') && clean.endsWith(')')) {
    isNegative = true
    clean = clean.slice(1, -1).trim()
  } else if (clean.startsWith('-')) {
    isNegative = true
    clean = clean.slice(1).trim()
  } else if (clean.endsWith('-')) {
    isNegative = true
    clean = clean.slice(0, -1).trim()
  }

  // Remove currency symbols and spaces
  clean = clean.replace(/[R$\s]/g, '')

  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',')
    const lastDot = clean.lastIndexOf('.')
    if (lastComma > lastDot) {
      // 1.500,50 -> Brazilian
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else {
      // 1,500.50 -> International
      clean = clean.replace(/,/g, '')
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }

  const num = parseFloat(clean)
  if (Number.isNaN(num)) return null

  return {
    amount: Math.abs(num),
    isNegative: isNegative || num < 0
  }
}

export const parseCSV = (content: string, fileName = 'statement.csv'): ParsedStatementResult => {
  if (!content || typeof content !== 'string') {
    return {
      format: 'csv',
      fileName,
      transactions: [],
      totalIncome: 0,
      totalExpense: 0
    }
  }

  const delimiter = detectDelimiter(content)
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length === 0) {
    return {
      format: 'csv',
      fileName,
      transactions: [],
      totalIncome: 0,
      totalExpense: 0
    }
  }

  // Header detection
  const headerCols = splitCSVLine(lines[0], delimiter).map((col) => col.toLowerCase())

  let dateIdx = headerCols.findIndex((col) => /^(data|date|dt)/i.test(col))
  let descIdx = headerCols.findIndex((col) => /(descri|hist|memo|title|detalhe|lan[cç]amento)/i.test(col))
  let amountIdx = headerCols.findIndex((col) => /(valor|amount|vlr)/i.test(col))
  const fitidIdx = headerCols.findIndex((col) => /(docto|doc|fitid|id|documento)/i.test(col))

  // If header wasn't found, try finding them in index order or fallback
  const startIndex = dateIdx !== -1 || amountIdx !== -1 ? 1 : 0
  if (dateIdx === -1) dateIdx = 0
  if (descIdx === -1) descIdx = 1
  if (amountIdx === -1) amountIdx = 2

  const transactions: ParsedTransactionCandidate[] = []
  let totalIncome = 0
  let totalExpense = 0

  for (let i = startIndex; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delimiter)
    if (cols.length <= Math.max(dateIdx, amountIdx)) {
      continue
    }

    const rawDate = cols[dateIdx] ?? ''
    const parsedDate = parseCSVDate(rawDate)
    if (!parsedDate) {
      // Might be a header row or footer summary row
      continue
    }

    const rawAmount = cols[amountIdx] ?? ''
    const parsedAmount = parseCSVAmount(rawAmount)
    if (!parsedAmount || parsedAmount.amount === 0) {
      continue
    }

    const description = cols[descIdx]?.trim() || 'Sem descrição'
    const fitid = fitidIdx !== -1 && cols[fitidIdx] ? cols[fitidIdx].trim() : null
    const type: 'income' | 'expense' = parsedAmount.isNegative ? 'expense' : 'income'

    if (type === 'income') {
      totalIncome += parsedAmount.amount
    } else {
      totalExpense += parsedAmount.amount
    }

    transactions.push({
      id: crypto.randomUUID(),
      fitid,
      date: parsedDate,
      description,
      amount: parsedAmount.amount,
      type,
      selected: true
    })
  }

  return {
    format: 'csv',
    fileName,
    transactions,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100
  }
}
