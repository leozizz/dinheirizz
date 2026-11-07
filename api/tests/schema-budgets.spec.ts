import { describe, it, expect } from 'vitest'
import { budgets, type Budget, type NewBudget } from '../src/db/schema'

describe('Drizzle ORM Schema - budgets', () => {
  it('deve exportar a tabela budgets com as colunas corretas', () => {
    expect(budgets).toBeDefined()
    expect(budgets.id).toBeDefined()
    expect(budgets.userId).toBeDefined()
    expect(budgets.categoryId).toBeDefined()
    expect(budgets.amountLimit).toBeDefined()
    expect(budgets.period).toBeDefined()
    expect(budgets.createdAt).toBeDefined()
    expect(budgets.updatedAt).toBeDefined()
  })

  it('deve permitir tipagem estática válida para Budget e NewBudget', () => {
    const mockBudget: Budget = {
      id: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000000',
      categoryId: '00000000-0000-0000-0000-000000000002',
      amountLimit: '1200.00',
      period: 'monthly',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const mockNewBudget: NewBudget = {
      userId: '00000000-0000-0000-0000-000000000000',
      categoryId: '00000000-0000-0000-0000-000000000002',
      amountLimit: '1200.00',
      period: '2026-10'
    }

    expect(mockBudget.amountLimit).toBe('1200.00')
    expect(mockNewBudget.period).toBe('2026-10')
  })
})
