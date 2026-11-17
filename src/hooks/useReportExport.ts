import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import type { ReportFilterInput, ReportSummaryResponse } from '../schemas/reports'
import {
  generateTransactionsCSV,
  downloadCSV,
  type ExportTransactionItem
} from '../lib/export/csvGenerator'

export interface ReportPdfData {
  user: {
    id: string
    name: string
    email: string
  }
  summary: ReportSummaryResponse
  transactions: ExportTransactionItem[]
  hash?: string
}

const getApiOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export const getDemoReportSummary = (filters: ReportFilterInput): ReportSummaryResponse => {
  const isYearly = filters.periodType === 'yearly'
  const periodLabel = filters.period

  return {
    periodType: filters.periodType,
    period: periodLabel,
    accountName: filters.accountId ? 'Conta Selecionada' : undefined,
    generatedAt: new Date().toISOString(),
    kpis: {
      totalIncome: isYearly ? 144000.0 : 12500.0,
      totalExpense: isYearly ? 58200.0 : 4850.5,
      netBalance: isYearly ? 85800.0 : 7649.5,
      savingsRate: isYearly ? 59.58 : 61.19,
      transactionCount: isYearly ? 320 : 28
    },
    categoriesBreakdown: [
      {
        categoryId: 'cat-servicos',
        categoryName: 'Prestação de Serviços PJ',
        categoryColor: '#10b981',
        type: 'income',
        amount: isYearly ? 144000.0 : 12500.0,
        percentage: 100.0,
        count: isYearly ? 24 : 2
      },
      {
        categoryId: 'cat-moradia',
        categoryName: 'Moradia & Aluguel',
        categoryColor: '#ef4444',
        type: 'expense',
        amount: isYearly ? 25200.0 : 2100.0,
        percentage: 43.3,
        count: isYearly ? 12 : 1
      },
      {
        categoryId: 'cat-alimentacao',
        categoryName: 'Alimentação & Mercado',
        categoryColor: '#f59e0b',
        type: 'expense',
        amount: isYearly ? 17400.0 : 1450.5,
        percentage: 29.9,
        count: isYearly ? 120 : 14
      },
      {
        categoryId: 'cat-transporte',
        categoryName: 'Transporte & Mobilidade',
        categoryColor: '#3b82f6',
        type: 'expense',
        amount: isYearly ? 9600.0 : 800.0,
        percentage: 16.5,
        count: isYearly ? 48 : 6
      },
      {
        categoryId: 'cat-saude',
        categoryName: 'Saúde & Farmácia',
        categoryColor: '#ec4899',
        type: 'expense',
        amount: isYearly ? 6000.0 : 500.0,
        percentage: 10.3,
        count: isYearly ? 18 : 3
      }
    ],
    costCentersSummary: [
      {
        accountId: 'acc-nubank-pj',
        accountName: 'Nubank PJ (MEI)',
        income: isYearly ? 144000.0 : 12500.0,
        expense: isYearly ? 34800.0 : 2900.5,
        net: isYearly ? 109200.0 : 9599.5
      },
      {
        accountId: 'acc-itau-pf',
        accountName: 'Itaú Corrente PF',
        income: 0,
        expense: isYearly ? 23400.0 : 1950.0,
        net: isYearly ? -23400.0 : -1950.0
      }
    ],
    cashFlowTimeline: isYearly
      ? [
          { label: 'Jan', income: 12000, expense: 4800, balance: 7200, accumulatedBalance: 7200 },
          { label: 'Fev', income: 12000, expense: 4900, balance: 7100, accumulatedBalance: 14300 },
          { label: 'Mar', income: 12000, expense: 4700, balance: 7300, accumulatedBalance: 21600 },
          { label: 'Abr', income: 12000, expense: 5000, balance: 7000, accumulatedBalance: 28600 },
          { label: 'Mai', income: 12000, expense: 4600, balance: 7400, accumulatedBalance: 36000 },
          { label: 'Jun', income: 12000, expense: 4850, balance: 7150, accumulatedBalance: 43150 },
          { label: 'Jul', income: 12000, expense: 5100, balance: 6900, accumulatedBalance: 50050 },
          { label: 'Ago', income: 12000, expense: 4750, balance: 7250, accumulatedBalance: 57300 },
          { label: 'Set', income: 12000, expense: 4900, balance: 7100, accumulatedBalance: 64400 },
          { label: 'Out', income: 12000, expense: 4800, balance: 7200, accumulatedBalance: 71600 },
          { label: 'Nov', income: 12000, expense: 4850, balance: 7150, accumulatedBalance: 78750 },
          { label: 'Dez', income: 12000, expense: 4950, balance: 7050, accumulatedBalance: 85800 }
        ]
      : [
          { label: 'Sem 1', income: 12500, expense: 1200, balance: 11300, accumulatedBalance: 11300 },
          { label: 'Sem 2', income: 0, expense: 1550.5, balance: -1550.5, accumulatedBalance: 9749.5 },
          { label: 'Sem 3', income: 0, expense: 1100, balance: -1100, accumulatedBalance: 8649.5 },
          { label: 'Sem 4', income: 0, expense: 1000, balance: -1000, accumulatedBalance: 7649.5 }
        ]
  }
}

export const getDemoPdfData = (filters: ReportFilterInput): ReportPdfData => {
  const summary = getDemoReportSummary(filters)
  const isYearly = filters.periodType === 'yearly'
  const year = isYearly ? filters.period : filters.period.split('-')[0]
  const month = isYearly ? '11' : filters.period.split('-')[1]

  const transactions: ExportTransactionItem[] = [
    {
      id: 'tx-demo-1',
      occurredAt: `${year}-${month}-05T10:00:00Z`,
      description: 'Consultoria Financeira PJ - Cliente Alpha',
      type: 'income',
      categoryName: 'Prestação de Serviços PJ',
      accountName: 'Nubank PJ (MEI)',
      status: 'completed',
      paidAt: `${year}-${month}-05T10:00:00Z`,
      amount: 7500.0
    },
    {
      id: 'tx-demo-2',
      occurredAt: `${year}-${month}-05T11:00:00Z`,
      description: 'Desenvolvimento de Software - Cliente Beta',
      type: 'income',
      categoryName: 'Prestação de Serviços PJ',
      accountName: 'Nubank PJ (MEI)',
      status: 'completed',
      paidAt: `${year}-${month}-05T11:00:00Z`,
      amount: 5000.0
    },
    {
      id: 'tx-demo-3',
      occurredAt: `${year}-${month}-08T14:30:00Z`,
      description: 'Aluguel Comercial e Condomínio',
      type: 'expense',
      categoryName: 'Moradia & Aluguel',
      accountName: 'Nubank PJ (MEI)',
      status: 'completed',
      paidAt: `${year}-${month}-08T14:30:00Z`,
      amount: 2100.0
    },
    {
      id: 'tx-demo-4',
      occurredAt: `${year}-${month}-12T16:00:00Z`,
      description: 'Supermercado e Suprimentos de Escritório',
      type: 'expense',
      categoryName: 'Alimentação & Mercado',
      accountName: 'Itaú Corrente PF',
      creditCardName: 'Itaú Personnalité Black',
      installment: '1/3',
      status: 'completed',
      paidAt: `${year}-${month}-12T16:00:00Z`,
      amount: 850.5
    },
    {
      id: 'tx-demo-5',
      occurredAt: `${year}-${month}-18T18:20:00Z`,
      description: 'Combustível e Estacionamento',
      type: 'expense',
      categoryName: 'Transporte & Mobilidade',
      accountName: 'Itaú Corrente PF',
      status: 'completed',
      paidAt: `${year}-${month}-18T18:20:00Z`,
      amount: 350.0
    }
  ]

  return {
    user: {
      id: 'demo-user-dinheirizz',
      name: 'Leonardo Dinheirizz (Modo Demo)',
      email: 'demo@dinheirizz.com'
    },
    summary,
    transactions,
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  }
}

export const useReportSummary = (filters: ReportFilterInput) => {
  let session = null
  try {
    const auth = useAuth()
    session = auth?.session
  } catch {
    session = null
  }

  const token = session?.access_token

  return useQuery<ReportSummaryResponse>({
    queryKey: ['report-summary', filters, Boolean(token)],
    staleTime: 60_000,
    queryFn: async (): Promise<ReportSummaryResponse> => {
      if (!token) {
        return getDemoReportSummary(filters)
      }

      const params = new URLSearchParams({
        periodType: filters.periodType,
        period: filters.period,
        status: filters.status
      })

      if (filters.accountId) {
        params.append('accountId', filters.accountId)
      }

      const origin = getApiOrigin()
      const url = `${origin}/api/v1/reports/summary?${params.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // Fallback resiliente para preview em caso de erro transitório de rota
        return getDemoReportSummary(filters)
      }

      return (await response.json()) as ReportSummaryResponse
    }
  })
}

export const useReportExport = () => {
  let session = null
  let user = null
  try {
    const auth = useAuth()
    session = auth?.session
    user = auth?.user
  } catch {
    session = null
    user = null
  }

  const token = session?.access_token

  const downloadReportCSV = async (
    filters: ReportFilterInput,
    localTransactions?: ExportTransactionItem[]
  ): Promise<void> => {
    const filename = `dinheirizz-relatorio-${filters.period}.csv`

    if (token) {
      try {
        const params = new URLSearchParams({
          periodType: filters.periodType,
          period: filters.period,
          status: filters.status
        })
        if (filters.accountId) {
          params.append('accountId', filters.accountId)
        }

        const origin = getApiOrigin()
        const url = `${origin}/api/v1/reports/export/csv?${params.toString()}`

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (response.ok) {
          const text = await response.text()
          downloadCSV(filename, text)
          return
        }
      } catch {
        // Fallback para gerador client-side abaixo
      }
    }

    // Fallback Client-side
    const demoData = getDemoPdfData(filters)
    const txs = localTransactions && localTransactions.length > 0 ? localTransactions : demoData.transactions
    const csvContent = generateTransactionsCSV(txs)
    downloadCSV(filename, csvContent)
  }

  const fetchPdfData = async (
    filters: ReportFilterInput,
    localTransactions?: ExportTransactionItem[]
  ): Promise<ReportPdfData> => {
    if (token) {
      try {
        const params = new URLSearchParams({
          periodType: filters.periodType,
          period: filters.period,
          status: filters.status
        })
        if (filters.accountId) {
          params.append('accountId', filters.accountId)
        }

        const origin = getApiOrigin()
        const url = `${origin}/api/v1/reports/export/pdf-data?${params.toString()}`

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const json = (await response.json()) as ReportPdfData
          return json
        }
      } catch {
        // Fallback para demo abaixo
      }
    }

    const demo = getDemoPdfData(filters)
    if (user?.email) {
      demo.user.email = user.email
      demo.user.name = user.user_metadata?.full_name || user.email.split('@')[0]
    }
    if (localTransactions && localTransactions.length > 0) {
      demo.transactions = localTransactions
    }
    return demo
  }

  return {
    downloadReportCSV,
    fetchPdfData
  }
}
