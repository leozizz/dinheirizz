import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { parseStatementFile } from '../lib/parsers/index'
import { detectDuplicates } from '../lib/deduplication'
import { suggestLocalCategories } from '../lib/categorization'
import type { ParsedStatementResult, ParsedTransactionCandidate } from '../types/import'
import type { TransactionItem } from '../components/dashboard/Dashboard'
import type { CategoryItem } from './useCategories'
import { TRANSACTIONS_QUERY_KEY } from './useTransactions'
import { ACCOUNTS_QUERY_KEY } from './useAccounts'
import { FORECAST_QUERY_KEY } from './useForecast'

const getApiOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export interface UseImportStatementOptions {
  initialAccountId?: string
  existingTransactions?: TransactionItem[]
  availableCategories?: CategoryItem[]
  onDemoImport?: (imported: ParsedTransactionCandidate[], accountId: string) => void
}

export const useImportStatement = ({
  initialAccountId = '',
  existingTransactions = [],
  availableCategories = [],
  onDemoImport
}: UseImportStatementOptions = {}) => {
  const { session } = useAuth()
  const token = session?.access_token
  const queryClient = useQueryClient()

  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedResult, setParsedResult] = useState<ParsedStatementResult | null>(null)
  const [stagingTransactions, setStagingTransactions] = useState<ParsedTransactionCandidate[]>([])

  const handleFileSelected = async (file: File): Promise<void> => {
    setIsProcessingFile(true)
    setError(null)
    try {
      const result = await parseStatementFile(file)
      setParsedResult(result)

      // 1. Detect duplicates against existing transactions in the target account
      const withDuplicates = detectDuplicates(result.transactions, existingTransactions, selectedAccountId)

      // 2. Suggest categories via local rules and user history
      const withCategories = suggestLocalCategories(withDuplicates, existingTransactions, availableCategories)

      setStagingTransactions(withCategories)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar arquivo de extrato.'
      setError(msg)
      setParsedResult(null)
      setStagingTransactions([])
    } finally {
      setIsProcessingFile(false)
    }
  }

  const toggleSelectTransaction = (id: string) => {
    setStagingTransactions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    )
  }

  const selectAll = () => {
    setStagingTransactions((prev) => prev.map((item) => ({ ...item, selected: true })))
  }

  const deselectDuplicates = () => {
    setStagingTransactions((prev) =>
      prev.map((item) => (item.isDuplicate ? { ...item, selected: false } : item))
    )
  }

  const invertSelection = () => {
    setStagingTransactions((prev) => prev.map((item) => ({ ...item, selected: !item.selected })))
  }

  const updateCandidateCategory = (id: string, categoryId: string, categoryName?: string) => {
    setStagingTransactions((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              categoryId,
              categoryName: categoryName || item.categoryName,
              categorySource: 'manual'
            }
          : item
      )
    )
  }

  const toggleCandidateType = (id: string) => {
    setStagingTransactions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, type: item.type === 'income' ? 'expense' : 'income' } : item
      )
    )
  }

  const updateCandidateDescription = (id: string, description: string) => {
    setStagingTransactions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item))
    )
  }

  const updateCandidateDate = (id: string, date: string) => {
    setStagingTransactions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, date } : item))
    )
  }

  const selectedCount = useMemo(
    () => stagingTransactions.filter((item) => item.selected).length,
    [stagingTransactions]
  )

  const duplicateCount = useMemo(
    () => stagingTransactions.filter((item) => item.isDuplicate).length,
    [stagingTransactions]
  )

  const selectedIncomeTotal = useMemo(() => {
    const total = stagingTransactions
      .filter((item) => item.selected && item.type === 'income')
      .reduce((acc, item) => acc + item.amount, 0)
    return Math.round(total * 100) / 100
  }, [stagingTransactions])

  const selectedExpenseTotal = useMemo(() => {
    const total = stagingTransactions
      .filter((item) => item.selected && item.type === 'expense')
      .reduce((acc, item) => acc + item.amount, 0)
    return Math.round(total * 100) / 100
  }, [stagingTransactions])

  const executeImport = async (onSuccess?: (count: number) => void): Promise<void> => {
    const selectedItems = stagingTransactions.filter((item) => item.selected)
    if (selectedItems.length === 0) {
      throw new Error('Nenhuma transação selecionada para importação.')
    }

    if (!selectedAccountId) {
      throw new Error('Selecione uma conta bancária de destino.')
    }

    setIsImporting(true)
    setError(null)

    try {
      if (!token) {
        // Modo Demonstração (sem autenticação)
        if (onDemoImport) {
          onDemoImport(selectedItems, selectedAccountId)
        }
        if (onSuccess) {
          onSuccess(selectedItems.length)
        }
        return
      }

      const origin = getApiOrigin()
      const payload = {
        accountId: selectedAccountId,
        transactions: selectedItems.map((item) => ({
          accountId: selectedAccountId,
          categoryId: item.categoryId || null,
          amount: item.amount,
          type: item.type,
          description: item.description,
          occurredAt: item.date,
          paid: true,
          status: 'completed'
        }))
      }

      const res = await fetch(`${origin}/api/v1/transactions/batch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao importar transações em lote.')
      }

      // Invalidate relevant react-query caches
      await queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY })

      if (onSuccess) {
        onSuccess(selectedItems.length)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao confirmar importação.'
      setError(msg)
      throw err
    } finally {
      setIsImporting(false)
    }
  }

  const reset = () => {
    setError(null)
    setParsedResult(null)
    setStagingTransactions([])
    setIsProcessingFile(false)
    setIsImporting(false)
  }

  return {
    selectedAccountId,
    setSelectedAccountId,
    isProcessingFile,
    isImporting,
    error,
    parsedResult,
    stagingTransactions,
    selectedCount,
    duplicateCount,
    selectedIncomeTotal,
    selectedExpenseTotal,
    handleFileSelected,
    toggleSelectTransaction,
    selectAll,
    deselectDuplicates,
    invertSelection,
    updateCandidateCategory,
    toggleCandidateType,
    updateCandidateDescription,
    updateCandidateDate,
    executeImport,
    reset
  }
}
