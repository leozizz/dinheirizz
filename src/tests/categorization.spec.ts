import { describe, it, expect } from 'vitest'
import { suggestLocalCategories } from '../lib/categorization'
import type { ParsedTransactionCandidate } from '../types/import'
import type { TransactionItem } from '../components/dashboard/Dashboard'
import type { CategoryItem } from '../hooks/useCategories'

describe('suggestLocalCategories (TDD)', () => {
  const categories: CategoryItem[] = [
    { id: 'cat-alimentacao', name: 'Alimentação', type: 'expense' },
    { id: 'cat-transporte', name: 'Transporte', type: 'expense' },
    { id: 'cat-saude', name: 'Saúde', type: 'expense' },
    { id: 'cat-servicos', name: 'Assinaturas & Serviços', type: 'expense' },
    { id: 'cat-salario', name: 'Salário', type: 'income' }
  ]

  const existingTransactions: TransactionItem[] = [
    {
      id: 'tx-1',
      description: 'Padaria Dona Joaquina',
      amount: 25.0,
      paid: true,
      occurred_at: '2026-10-01',
      categoryId: 'cat-alimentacao',
      category: { name: 'Alimentação' },
      type: 'expense'
    }
  ]

  const candidates: ParsedTransactionCandidate[] = [
    {
      id: 'c-1',
      date: '2026-10-10',
      description: 'IFOOD *RESTAURANTE SAO PAULO',
      amount: 60.0,
      type: 'expense',
      selected: true
    },
    {
      id: 'c-2',
      date: '2026-10-11',
      description: 'UBER *TRIP BRASIL',
      amount: 28.5,
      type: 'expense',
      selected: true
    },
    {
      id: 'c-3',
      date: '2026-10-12',
      description: 'DROGASIL 1234',
      amount: 45.0,
      type: 'expense',
      selected: true
    },
    {
      id: 'c-4',
      date: '2026-10-13',
      description: 'Padaria Dona Joaquina Centro',
      amount: 18.0,
      type: 'expense',
      selected: true
    },
    {
      id: 'c-5',
      date: '2026-10-14',
      description: 'EMPRESA TECH SALARIO OUTUBRO',
      amount: 6500.0,
      type: 'income',
      selected: true
    },
    {
      id: 'c-6',
      date: '2026-10-15',
      description: 'EMPRESA MISTERIOSA XWZ 999',
      amount: 100.0,
      type: 'expense',
      selected: true
    }
  ]

  it('deve sugerir categorias por regras locais conhecidas (iFood, Uber, Drogasil, Salário)', () => {
    const results = suggestLocalCategories(candidates, existingTransactions, categories)

    // c-1: iFood -> Alimentação (regra)
    expect(results[0].categoryId).toBe('cat-alimentacao')
    expect(results[0].categoryName).toBe('Alimentação')
    expect(results[0].categorySource).toBe('rule')

    // c-2: Uber -> Transporte (regra)
    expect(results[1].categoryId).toBe('cat-transporte')
    expect(results[1].categoryName).toBe('Transporte')
    expect(results[1].categorySource).toBe('rule')

    // c-3: Drogasil -> Saúde (regra)
    expect(results[2].categoryId).toBe('cat-saude')
    expect(results[2].categoryName).toBe('Saúde')
    expect(results[2].categorySource).toBe('rule')

    // c-5: Salario -> Salário (regra)
    expect(results[4].categoryId).toBe('cat-salario')
    expect(results[4].categoryName).toBe('Salário')
    expect(results[4].categorySource).toBe('rule')
  })

  it('deve sugerir categorias por histórico do usuário para estabelecimentos prévios', () => {
    const results = suggestLocalCategories(candidates, existingTransactions, categories)

    // c-4: Padaria Dona Joaquina Centro -> match com histórico 'Padaria Dona Joaquina'
    expect(results[3].categoryId).toBe('cat-alimentacao')
    expect(results[3].categoryName).toBe('Alimentação')
    expect(results[3].categorySource).toBe('history')
  })

  it('deve deixar categoria vazia para estabelecimentos totalmente desconhecidos', () => {
    const results = suggestLocalCategories(candidates, existingTransactions, categories)

    // c-6: Empresa misteriosa -> sem match
    expect(results[5].categoryId).toBeUndefined()
    expect(results[5].categorySource).toBeUndefined()
  })
})
