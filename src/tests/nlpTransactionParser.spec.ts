import { describe, it, expect } from 'vitest'
import { parseNaturalLanguageTransaction } from '../lib/nlpTransactionParser'
import type { CategoryItem } from '../hooks/useCategories'
import type { TransactionItem } from '../components/dashboard/Dashboard'
import type { AccountOption, CreditCardOption } from '../components/modals/TransactionModal'

describe('parseNaturalLanguageTransaction (TDD)', () => {
  const referenceDate = new Date(2026, 10, 21, 10, 0, 0) // 2026-11-21

  const accounts: AccountOption[] = [
    { id: 'acc-nubank', name: 'Nubank Conta', balance: 2500 },
    { id: 'acc-itau', name: 'Itaú Reserva', balance: 12000 },
    { id: 'acc-inter', name: 'Banco Inter', balance: 800 }
  ]

  const creditCards: CreditCardOption[] = [
    {
      id: 'card-ultra',
      name: 'Nubank Ultravioleta',
      brand: 'Mastercard',
      closingDay: 10,
      dueDay: 17,
      accountId: 'acc-nubank'
    }
  ]

  const categories: CategoryItem[] = [
    { id: 'cat-alimentacao', name: 'Alimentação', type: 'expense' },
    { id: 'cat-transporte', name: 'Transporte', type: 'expense' },
    { id: 'cat-saude', name: 'Saúde', type: 'expense' },
    { id: 'cat-salario', name: 'Salário', type: 'income' }
  ]

  const existingTransactions: TransactionItem[] = [
    {
      id: 'tx-1',
      description: 'Padaria Central',
      amount: 18,
      paid: true,
      occurred_at: '2026-11-10',
      categoryId: 'cat-alimentacao',
      category: { name: 'Alimentação' },
      type: 'expense'
    }
  ]

  it('deve extrair despesa completa com valor decimal PT-BR, data relativa e conta ("Mercado 185,50 ontem nubank")', () => {
    const result = parseNaturalLanguageTransaction('Mercado 185,50 ontem nubank', {
      accounts,
      creditCards,
      categories,
      existingTransactions,
      referenceDate
    })

    expect(result.isValidTransaction).toBe(true)
    expect(result.type).toBe('expense')
    expect(result.amount).toBe(185.5)
    expect(result.description).toBe('Mercado')
    expect(result.occurredAt).toBe('2026-11-20')
    expect(result.dateLabel).toBe('Ontem')
    expect(result.accountId).toBe('acc-nubank')
    expect(result.accountName).toBe('Nubank Conta')
    expect(result.categoryId).toBe('cat-alimentacao')
    expect(result.categoryName).toBe('Alimentação')
  })

  it('deve extrair receita por palavra-chave com conta sem acento ("Recebi 3500 salário hoje itau")', () => {
    const result = parseNaturalLanguageTransaction('Recebi 3500 salário hoje itau', {
      accounts,
      creditCards,
      categories,
      existingTransactions,
      referenceDate
    })

    expect(result.isValidTransaction).toBe(true)
    expect(result.type).toBe('income')
    expect(result.amount).toBe(3500)
    expect(result.occurredAt).toBe('2026-11-21')
    expect(result.dateLabel).toBe('Hoje')
    expect(result.accountId).toBe('acc-itau')
    expect(result.accountName).toBe('Itaú Reserva')
    expect(result.categoryId).toBe('cat-salario')
    expect(result.categoryName).toBe('Salário')
  })

  it('deve suportar formatos monetários variados (R$ 45, 12.50, R$ 1.250,90)', () => {
    const r1 = parseNaturalLanguageTransaction('Almoço R$ 45', {
      accounts,
      categories,
      referenceDate
    })
    expect(r1.isValidTransaction).toBe(true)
    expect(r1.amount).toBe(45)
    expect(r1.description).toBe('Almoço')

    const r2 = parseNaturalLanguageTransaction('Café 12.50', {
      accounts,
      categories,
      referenceDate
    })
    expect(r2.isValidTransaction).toBe(true)
    expect(r2.amount).toBe(12.5)
    expect(r2.description).toBe('Café')

    const r3 = parseNaturalLanguageTransaction('Compra R$ 1.250,90', {
      accounts,
      categories,
      referenceDate
    })
    expect(r3.isValidTransaction).toBe(true)
    expect(r3.amount).toBe(1250.9)
    expect(r3.description).toBe('Compra')
  })

  it('deve suportar datas relativas (anteontem, amanhã) e explícitas (dd/mm e dd/mm/yyyy)', () => {
    const anteontem = parseNaturalLanguageTransaction('Uber 24 anteontem', {
      accounts,
      categories,
      referenceDate
    })
    expect(anteontem.occurredAt).toBe('2026-11-19')
    expect(anteontem.dateLabel).toBe('Anteontem')

    const amanha = parseNaturalLanguageTransaction('Farmácia 89 amanha', {
      accounts,
      categories,
      referenceDate
    })
    expect(amanha.occurredAt).toBe('2026-11-22')
    expect(amanha.dateLabel).toBe('Amanhã')

    const explicitShort = parseNaturalLanguageTransaction('Restaurante 120 15/11', {
      accounts,
      categories,
      referenceDate
    })
    expect(explicitShort.occurredAt).toBe('2026-11-15')
    expect(explicitShort.dateLabel).toBe('15/11')

    const explicitFull = parseNaturalLanguageTransaction('Restaurante 120 05/01/2026', {
      accounts,
      categories,
      referenceDate
    })
    expect(explicitFull.occurredAt).toBe('2026-01-05')
    expect(explicitFull.dateLabel).toBe('05/01/2026')
  })

  it('deve fazer matching fuzzy de cartão de crédito e remover preposições conectoras da descrição', () => {
    const result = parseNaturalLanguageTransaction('Uber 32,90 no ultravioleta', {
      accounts,
      creditCards,
      categories,
      referenceDate
    })

    expect(result.isValidTransaction).toBe(true)
    expect(result.description).toBe('Uber')
    expect(result.amount).toBe(32.9)
    expect(result.creditCardId).toBe('card-ultra')
    expect(result.creditCardName).toBe('Nubank Ultravioleta')
    expect(result.categoryId).toBe('cat-transporte')
  })

  it('deve retornar isValidTransaction: false quando não houver valor monetário válido', () => {
    const empty = parseNaturalLanguageTransaction('', {
      accounts,
      categories,
      referenceDate
    })
    expect(empty.isValidTransaction).toBe(false)
    expect(empty.amount).toBeNull()

    const noAmount = parseNaturalLanguageTransaction('Almoço no mercado', {
      accounts,
      categories,
      referenceDate
    })
    expect(noAmount.isValidTransaction).toBe(false)
    expect(noAmount.amount).toBeNull()
  })
})
