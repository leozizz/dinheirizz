import type { ParsedTransactionCandidate } from '../types/import'
import type { TransactionItem } from '../components/dashboard/Dashboard'

const getDaysDifference = (dateStr1: string, dateStr2: string): number => {
  const d1 = new Date(dateStr1)
  const d2 = new Date(dateStr2)
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 999
  const diffMs = Math.abs(d1.getTime() - d2.getTime())
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export const detectDuplicates = (
  candidates: ParsedTransactionCandidate[],
  existingTransactions: TransactionItem[],
  targetAccountId: string
): ParsedTransactionCandidate[] => {
  if (!candidates || candidates.length === 0) return []

  // Filter existing transactions belonging to the target account
  const accountTransactions = existingTransactions.filter((tx) => {
    const accId = tx.accountId || tx.account_id
    return accId === targetAccountId
  })

  return candidates.map((candidate) => {
    // Find matching candidate
    const match = accountTransactions.find((existing) => {
      const amountDiff = Math.abs(Math.abs(existing.amount) - Math.abs(candidate.amount))
      if (amountDiff > 0.01) return false

      const dateStr = existing.occurred_at ? existing.occurred_at.split('T')[0] : ''
      const daysDiff = getDaysDifference(candidate.date, dateStr)
      return daysDiff <= 2
    })

    if (match) {
      const matchDate = match.occurred_at ? match.occurred_at.split('T')[0] : ''
      return {
        ...candidate,
        isDuplicate: true,
        duplicateReason: `Transação similar encontrada: "${match.description || 'Sem descrição'}" (${matchDate})`,
        selected: false
      }
    }

    return {
      ...candidate,
      isDuplicate: false,
      duplicateReason: undefined,
      selected: candidate.selected !== undefined ? candidate.selected : true
    }
  })
}
