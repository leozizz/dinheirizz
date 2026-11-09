export type StatementFormat = 'ofx' | 'csv' | 'pdf'

export type CategorizationSource = 'ai' | 'history' | 'rule' | 'manual'

export interface ParsedTransactionCandidate {
  id: string
  fitid?: string | null
  date: string // ISO 'YYYY-MM-DD'
  description: string
  amount: number // Positive number
  type: 'income' | 'expense'
  categoryId?: string | null
  categoryName?: string | null
  categorySource?: CategorizationSource
  isDuplicate?: boolean
  duplicateReason?: string
  selected: boolean
}

export interface ParsedStatementResult {
  format: StatementFormat
  fileName: string
  bankName?: string
  accountIdentifier?: string
  transactions: ParsedTransactionCandidate[]
  totalIncome: number
  totalExpense: number
}
