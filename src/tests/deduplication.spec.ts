import { describe, it, expect } from 'vitest'
import { detectDuplicates } from '../lib/deduplication'
import type { ParsedTransactionCandidate } from '../types/import'
import type { TransactionItem } from '../components/dashboard/Dashboard'

describe('detectDuplicates (TDD)', () => {
  const existingTransactions: TransactionItem[] = [
    {
      id: 'tx-1',
      description: 'Uber *Trip',
      amount: 35.0,
      paid: true,
      occurred_at: '2026-10-10',
      accountId: 'acc-nubank',
      type: 'expense'
    },
    {
      id: 'tx-2',
      description: 'Salário Tech',
      amount: 5000.0,
      paid: true,
      occurred_at: '2026-10-05',
      accountId: 'acc-itau',
      type: 'income'
    }
  ]

  const candidates: ParsedTransactionCandidate[] = [
    {
      id: 'c-1',
      date: '2026-10-10',
      description: 'UBER TRIP SÃO PAULO',
      amount: 35.0,
      type: 'expense',
      selected: true
    },
    {
      id: 'c-2',
      date: '2026-10-11', // 1 dia de diferença (tolerância de até 2 dias corridos)
      description: 'UBER TRIP PENDENTE',
      amount: 35.0,
      type: 'expense',
      selected: true
    },
    {
      id: 'c-3',
      date: '2026-10-15', // 5 dias de diferença -> não é duplicata
      description: 'UBER NOVO',
      amount: 35.0,
      type: 'expense',
      selected: true
    },
    {
      id: 'c-4',
      date: '2026-10-05', // Mesmo valor e data, mas na conta do Nubank (existente é Itaú) -> não é duplicata
      description: 'Depósito Outro',
      amount: 5000.0,
      type: 'income',
      selected: true
    }
  ]

  it('deve marcar duplicata exata e duplicata com até 2 dias de tolerância na mesma conta', () => {
    const results = detectDuplicates(candidates, existingTransactions, 'acc-nubank')

    // c-1: Mesma conta, mesmo valor, mesma data -> Duplicata
    expect(results[0].isDuplicate).toBe(true)
    expect(results[0].selected).toBe(false)
    expect(results[0].duplicateReason).toContain('Transação similar encontrada')

    // c-2: Mesma conta, mesmo valor, 1 dia de diferença -> Duplicata
    expect(results[1].isDuplicate).toBe(true)
    expect(results[1].selected).toBe(false)

    // c-3: 5 dias de diferença -> Não duplicata
    expect(results[2].isDuplicate).toBe(false)
    expect(results[2].selected).toBe(true)

    // c-4: Mesma data/valor, mas a conta existente era 'acc-itau', e o alvo é 'acc-nubank' -> Não duplicata
    expect(results[3].isDuplicate).toBe(false)
    expect(results[3].selected).toBe(true)
  })
})
