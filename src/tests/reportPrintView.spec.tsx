import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ReportPrintView } from '../lib/export/reportPrintView'
import type { ReportPdfData } from '../hooks/useReportExport'

describe('ReportPrintView Component (TDD)', () => {
  const samplePdfData: ReportPdfData = {
    user: {
      id: 'user-print-1',
      name: 'Leonardo Ferreira da Silva',
      email: 'leonardo@dinheirizz.com'
    },
    summary: {
      periodType: 'monthly',
      period: '2026-11',
      generatedAt: '2026-11-16T23:50:00.000Z',
      kpis: {
        totalIncome: 18500.0,
        totalExpense: 6200.5,
        netBalance: 12299.5,
        savingsRate: 66.48,
        transactionCount: 35
      },
      categoriesBreakdown: [
        {
          categoryId: 'cat-1',
          categoryName: 'Serviços de Consultoria',
          categoryColor: '#10b981',
          type: 'income',
          amount: 18500.0,
          percentage: 100.0,
          count: 3
        },
        {
          categoryId: 'cat-2',
          categoryName: 'Aluguel Comercial',
          categoryColor: '#ef4444',
          type: 'expense',
          amount: 3200.0,
          percentage: 51.61,
          count: 1
        }
      ],
      costCentersSummary: [
        {
          accountId: 'acc-1',
          accountName: 'Nubank PJ',
          income: 18500.0,
          expense: 4000.0,
          net: 14500.0
        }
      ],
      cashFlowTimeline: [
        {
          label: 'Sem 1',
          income: 18500,
          expense: 2000,
          balance: 16500,
          accumulatedBalance: 16500
        },
        {
          label: 'Sem 2',
          income: 0,
          expense: 4200.5,
          balance: -4200.5,
          accumulatedBalance: 12299.5
        }
      ]
    },
    transactions: [
      {
        id: 'tx-1',
        occurredAt: '2026-11-05T10:00:00Z',
        description: 'Consultoria Mensal',
        type: 'income',
        categoryName: 'Serviços de Consultoria',
        accountName: 'Nubank PJ',
        status: 'completed',
        amount: 18500.0
      },
      {
        id: 'tx-2',
        occurredAt: '2026-11-10T14:00:00Z',
        description: 'Aluguel Sala 302',
        type: 'expense',
        categoryName: 'Aluguel Comercial',
        accountName: 'Nubank PJ',
        status: 'completed',
        amount: 3200.0
      }
    ],
    hash: 'a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01'
  }

  it('deve renderizar o cabeçalho executivo institucional e dados do titular', () => {
    render(<ReportPrintView data={samplePdfData} />)

    expect(screen.getByTestId('report-print-view')).toBeInTheDocument()
    expect(screen.getByText('DINHEIRIZZ')).toBeInTheDocument()
    expect(
      screen.getByText('Relatório Financeiro Executivo & Balancete Contábil')
    ).toBeInTheDocument()
    expect(screen.getByText(/Leonardo Ferreira da Silva/)).toBeInTheDocument()
    expect(screen.getByText(/leonardo@dinheirizz.com/)).toBeInTheDocument()
    expect(screen.getByText(/Período Mensal de Novembro de 2026/)).toBeInTheDocument()
  })

  it('deve exibir os cartões de KPIs consolidados', () => {
    render(<ReportPrintView data={samplePdfData} />)

    expect(screen.getByText(/Receitas Realizadas/)).toBeInTheDocument()
    expect(screen.getByText(/Despesas Realizadas/)).toBeInTheDocument()
    expect(screen.getByText(/Resultado Líquido/)).toBeInTheDocument()
    expect(screen.getByText(/Margem de Poupança/)).toBeInTheDocument()
    expect(screen.getByText('66.5%')).toBeInTheDocument()
  })

  it('deve renderizar a tabela de balancete sintético por categorias', () => {
    render(<ReportPrintView data={samplePdfData} />)

    expect(screen.getByText('3. Balancete Sintético por Categorias')).toBeInTheDocument()
    expect(screen.getAllByText('Serviços de Consultoria').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Aluguel Comercial').length).toBeGreaterThan(0)
  })

  it('deve renderizar a tabela de balanço por centros de custo / contas', () => {
    render(<ReportPrintView data={samplePdfData} />)

    expect(
      screen.getByText('4. Balanço por Centros de Custo / Contas Bancárias')
    ).toBeInTheDocument()
    expect(screen.getAllByText('Nubank PJ').length).toBeGreaterThan(0)
  })

  it('deve renderizar o extrato analítico com as movimentações detalhadas', () => {
    render(<ReportPrintView data={samplePdfData} />)

    expect(screen.getByText('5. Extrato Analítico de Movimentações')).toBeInTheDocument()
    expect(screen.getByText('Consultoria Mensal')).toBeInTheDocument()
    expect(screen.getByText('Aluguel Sala 302')).toBeInTheDocument()
    expect(screen.getByText('05/11/2026')).toBeInTheDocument()
    expect(screen.getByText('10/11/2026')).toBeInTheDocument()
  })

  it('deve exibir o rodapé de conformidade e autenticidade eletrônica', () => {
    render(<ReportPrintView data={samplePdfData} />)

    expect(
      screen.getByText(/Documento gerado eletronicamente pela plataforma Dinheirizz 2.0/)
    ).toBeInTheDocument()
    expect(screen.getByText('Dinheirizz S.A.')).toBeInTheDocument()
  })
})
