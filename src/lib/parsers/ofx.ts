import type { ParsedStatementResult, ParsedTransactionCandidate } from '../../types/import'

const extractTagValue = (block: string, tagName: string): string | null => {
  const regex = new RegExp(`<${tagName}>([^<\\r\\n]+)(?:<\\/${tagName}>)?`, 'i')
  const match = block.match(regex)
  return match && match[1] ? match[1].trim() : null
}

const parseOFXDate = (rawDate: string): string => {
  const digits = rawDate.replace(/\D/g, '')
  if (digits.length >= 8) {
    const year = digits.slice(0, 4)
    const month = digits.slice(4, 6)
    const day = digits.slice(6, 8)
    return `${year}-${month}-${day}`
  }
  return new Date().toISOString().split('T')[0]
}

export const parseOFX = (content: string, fileName = 'statement.ofx'): ParsedStatementResult => {
  if (!content || typeof content !== 'string') {
    return {
      format: 'ofx',
      fileName,
      transactions: [],
      totalIncome: 0,
      totalExpense: 0
    }
  }

  const bankName = extractTagValue(content, 'ORG') ?? undefined
  const accountIdentifier = extractTagValue(content, 'ACCTID') ?? undefined

  const blocks = content.split(/<STMTTRN>/i).slice(1)
  const transactions: ParsedTransactionCandidate[] = []

  let totalIncome = 0
  let totalExpense = 0

  for (const block of blocks) {
    const trnType = (extractTagValue(block, 'TRNTYPE') ?? 'OTHER').toUpperCase()
    const dtPostedRaw = extractTagValue(block, 'DTPOSTED') ?? ''
    const trnAmtRaw = extractTagValue(block, 'TRNAMT') ?? '0'
    const fitid = extractTagValue(block, 'FITID') ?? null
    const memo = extractTagValue(block, 'MEMO')
    const name = extractTagValue(block, 'NAME')
    const description = memo || name || 'Sem descrição'

    const parsedNum = parseFloat(trnAmtRaw.replace(',', '.'))
    if (Number.isNaN(parsedNum)) {
      continue
    }

    const isExpense = parsedNum < 0 || trnType === 'DEBIT'
    const amount = Math.abs(parsedNum)
    const type: 'income' | 'expense' = isExpense ? 'expense' : 'income'

    if (type === 'income') {
      totalIncome += amount
    } else {
      totalExpense += amount
    }

    transactions.push({
      id: crypto.randomUUID(),
      fitid,
      date: parseOFXDate(dtPostedRaw),
      description,
      amount,
      type,
      selected: true
    })
  }

  return {
    format: 'ofx',
    fileName,
    bankName,
    accountIdentifier,
    transactions,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100
  }
}
