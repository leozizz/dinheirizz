import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useImportStatement } from '../hooks/useImportStatement'
import type { CategoryItem } from '../hooks/useCategories'
import type { TransactionItem } from '../components/dashboard/Dashboard'

const mockSession: { access_token: string; user: { id: string; email: string } } | null = {
  access_token: 'valid-test-token',
  user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockSession?.user || null,
    session: mockSession,
    loading: false
  })
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('useImportStatement Hook (TDD)', () => {
  const mockCategories: CategoryItem[] = [
    { id: 'cat-food', name: 'Alimentação', type: 'expense' },
    { id: 'cat-transport', name: 'Transporte', type: 'expense' }
  ]

  const mockExistingTransactions: TransactionItem[] = [
    {
      id: 'tx-existing-1',
      description: 'iFood Refeição',
      amount: 45.0,
      paid: true,
      occurred_at: '2026-10-10',
      accountId: 'acc-1',
      type: 'expense'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : ''
      if (urlStr.includes('/api/v1/transactions/batch')) {
        const body = JSON.parse((options?.body as string) || '{}')
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            importedCount: body.transactions?.length || 0,
            accountId: body.accountId,
            newBalance: 1500,
            transactions: body.transactions || []
          })
        }
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })
  })

  it('deve processar arquivo CSV, detectar duplicata e calcular totais selecionados', async () => {
    const csvContent = `Data;Descrição;Valor
10/10/2026;iFood Refeição;-45,00
11/10/2026;Posto Shell Gasolina;-100,00
12/10/2026;Depósito Salário;2.500,00`

    const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' })

    const { result } = renderHook(
      () =>
        useImportStatement({
          initialAccountId: 'acc-1',
          existingTransactions: mockExistingTransactions,
          availableCategories: mockCategories
        }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.handleFileSelected(file)
    })

    expect(result.current.parsedResult).not.toBeNull()
    expect(result.current.stagingTransactions).toHaveLength(3)

    // A primeira transação (iFood 45.00 na mesma data e conta) deve ser duplicata desmarcada
    expect(result.current.stagingTransactions[0].isDuplicate).toBe(true)
    expect(result.current.stagingTransactions[0].selected).toBe(false)

    // As outras duas devem estar marcadas
    expect(result.current.stagingTransactions[1].selected).toBe(true)
    expect(result.current.stagingTransactions[2].selected).toBe(true)

    // Contadores e totais selecionados
    expect(result.current.selectedCount).toBe(2)
    expect(result.current.duplicateCount).toBe(1)
    expect(result.current.selectedIncomeTotal).toBe(2500)
    expect(result.current.selectedExpenseTotal).toBe(100)
  })

  it('deve permitir alternar seleções (selectAll, deselectDuplicates, toggleSelect)', async () => {
    const csvContent = `Data;Descrição;Valor
10/10/2026;iFood Refeição;-45,00
11/10/2026;Posto Shell;-100,00`

    const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' })

    const { result } = renderHook(
      () =>
        useImportStatement({
          initialAccountId: 'acc-1',
          existingTransactions: mockExistingTransactions,
          availableCategories: mockCategories
        }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.handleFileSelected(file)
    })

    // Marcar todas
    act(() => {
      result.current.selectAll()
    })
    expect(result.current.selectedCount).toBe(2)

    // Desmarcar duplicatas
    act(() => {
      result.current.deselectDuplicates()
    })
    expect(result.current.selectedCount).toBe(1)

    // Alternar item específico
    const firstId = result.current.stagingTransactions[0].id
    act(() => {
      result.current.toggleSelectTransaction(firstId)
    })
    expect(result.current.stagingTransactions[0].selected).toBe(true)
  })

  it('deve atualizar categoria, tipo e descrição no staging', async () => {
    const csvContent = '10/10/2026;Despesa Teste;-50,00'
    const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' })

    const { result } = renderHook(
      () =>
        useImportStatement({
          initialAccountId: 'acc-1',
          existingTransactions: [],
          availableCategories: mockCategories
        }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.handleFileSelected(file)
    })

    const targetId = result.current.stagingTransactions[0].id

    act(() => {
      result.current.updateCandidateCategory(targetId, 'cat-food', 'Alimentação')
      result.current.toggleCandidateType(targetId)
      result.current.updateCandidateDescription(targetId, 'Nova Descrição')
    })

    const updated = result.current.stagingTransactions[0]
    expect(updated.categoryId).toBe('cat-food')
    expect(updated.categoryName).toBe('Alimentação')
    expect(updated.categorySource).toBe('manual')
    expect(updated.type).toBe('income')
    expect(updated.description).toBe('Nova Descrição')
  })

  it('deve disparar executeImport chamando batch API e callback onSuccess', async () => {
    const csvContent = '10/10/2026;Café;-10,00'
    const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' })

    const { result } = renderHook(
      () =>
        useImportStatement({
          initialAccountId: 'acc-1',
          existingTransactions: [],
          availableCategories: mockCategories
        }),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.handleFileSelected(file)
    })

    const onSuccessSpy = vi.fn()
    await act(async () => {
      await result.current.executeImport(onSuccessSpy)
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/transactions/batch'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(onSuccessSpy).toHaveBeenCalledWith(1)
  })
})
