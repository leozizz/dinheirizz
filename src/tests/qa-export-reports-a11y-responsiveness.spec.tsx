import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ExportReportModal } from '../components/modals/ExportReportModal'
import { ReportPrintView } from '../lib/export/reportPrintView'
import { generateTransactionsCSV, type ExportTransactionItem } from '../lib/export/csvGenerator'
import type { ReportPdfData } from '../hooks/useReportExport'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('QA Suite — Validação E2E, A11y & Responsividade: Exportação de Relatórios Financeiros (#54 / LEO-60)', () => {
  const mockAccounts = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Banco Inter PJ' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Nubank PF' }
  ]

  const sampleTransactions: ExportTransactionItem[] = [
    {
      id: 'tx-1',
      occurredAt: '2026-11-10T10:00:00.000Z',
      description: 'Consultoria Técnica de Software',
      categoryName: 'Serviços Prestados',
      type: 'income',
      amount: 8500.0,
      status: 'completed',
      accountName: 'Banco Inter PJ',
      notes: 'Nota Fiscal 104'
    },
    {
      id: 'tx-2',
      occurredAt: '2026-11-12T14:30:00.000Z',
      description: 'Assinatura Cloudflare Pages Pro',
      categoryName: 'Hospedagem & Nuvem',
      type: 'expense',
      amount: 120.5,
      status: 'completed',
      accountName: 'Banco Inter PJ'
    },
    {
      id: 'tx-3',
      occurredAt: '2026-11-15T09:00:00.000Z',
      description: 'Aluguel do Coworking',
      categoryName: 'Infraestrutura',
      type: 'expense',
      amount: 1450.0,
      status: 'pending',
      accountName: 'Nubank PF'
    }
  ]

  const samplePdfData: ReportPdfData = {
    user: {
      id: 'user-qa-1',
      name: 'Leonardo Ferreira da Silva',
      email: 'leonardo@dinheirizz.com'
    },
    summary: {
      periodType: 'monthly',
      period: '2026-11',
      generatedAt: '2026-11-17T00:00:00Z',
      kpis: {
        totalIncome: 8500.0,
        totalExpense: 120.5,
        netBalance: 8379.5,
        savingsRate: 98.58,
        transactionCount: 2
      },
      categoriesBreakdown: [
        {
          categoryId: 'cat-servicos',
          categoryName: 'Serviços Prestados',
          categoryColor: '#10b981',
          type: 'income',
          amount: 8500.0,
          percentage: 100,
          count: 1
        },
        {
          categoryId: 'cat-cloud',
          categoryName: 'Hospedagem & Nuvem',
          categoryColor: '#ef4444',
          type: 'expense',
          amount: 120.5,
          percentage: 100,
          count: 1
        }
      ],
      costCentersSummary: [
        {
          accountId: '11111111-1111-1111-1111-111111111111',
          accountName: 'Banco Inter PJ',
          income: 8500.0,
          expense: 120.5,
          net: 8379.5
        }
      ],
      cashFlowTimeline: [
        {
          date: '2026-11-10',
          label: '10/11',
          income: 8500.0,
          expense: 0,
          balance: 8500.0,
          accumulatedBalance: 8500.0
        },
        {
          date: '2026-11-12',
          label: '12/11',
          income: 0,
          expense: 120.5,
          balance: 8379.5,
          accumulatedBalance: 8379.5
        }
      ]
    },
    transactions: sampleTransactions,
    hash: 'SHA256:DINHEIRIZZ-REPORT-2026-11-QA-VALIDATION'
  }

  const mockOnClose = vi.fn()
  const mockOnExportCSV = vi.fn()
  const mockOnExportPDF = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Critério 1: Auditoria de Acessibilidade (A11y) & Touch Targets (WCAG 2.1 AA)', () => {
    it('deve assegurar estrutura semântica com role dialog, aria-modal e aria-labelledby', () => {
      render(
        <ExportReportModal
          isOpen={true}
          onClose={mockOnClose}
          accounts={mockAccounts}
        />,
        { wrapper: createWrapper() }
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'export-modal-title')
      expect(screen.getByText(/Exportar Relatórios Financeiros/i)).toBeInTheDocument()
    })

    it('deve garantir touch targets mínimos de 44x44px em todos os botões interativos principais', () => {
      render(
        <ExportReportModal
          isOpen={true}
          onClose={mockOnClose}
          accounts={mockAccounts}
        />,
        { wrapper: createWrapper() }
      )

      // Botão Fechar Modal
      const closeBtn = screen.getByTestId('export-close-btn')
      expect(closeBtn.className).toMatch(/min-h-\[44px\]/)
      expect(closeBtn.className).toMatch(/min-w-\[44px\]/)
      expect(closeBtn).toHaveAttribute('aria-label', 'Fechar')

      // Botões de Seleção de Formato (PDF e CSV)
      const pdfBtn = screen.getByTestId('format-pdf-btn')
      const csvBtn = screen.getByTestId('format-csv-btn')
      expect(pdfBtn.className).toMatch(/min-h-\[44px\]/)
      expect(csvBtn.className).toMatch(/min-h-\[44px\]/)

      // Botões de Ação do Rodapé
      const cancelBtn = screen.getByTestId('export-cancel-btn')
      const submitBtn = screen.getByTestId('export-pdf-btn')
      expect(cancelBtn.className).toMatch(/min-h-\[44px\]/)
      expect(submitBtn.className).toMatch(/min-h-\[44px\]/)
    })

    it('deve permitir fechar o modal via botão de fechar e botão cancelar', () => {
      render(
        <ExportReportModal
          isOpen={true}
          onClose={mockOnClose}
          accounts={mockAccounts}
        />,
        { wrapper: createWrapper() }
      )

      const closeBtn = screen.getByTestId('export-close-btn')
      fireEvent.click(closeBtn)
      expect(mockOnClose).toHaveBeenCalledTimes(1)

      const cancelBtn = screen.getByTestId('export-cancel-btn')
      fireEvent.click(cancelBtn)
      expect(mockOnClose).toHaveBeenCalledTimes(2)
    })
  })

  describe('Critério 2: Responsividade, Prevenção de Overflow & Dual-Theme Anti-Slop', () => {
    it('deve aplicar classes responsivas para evitar overflow em viewports compactos', () => {
      render(
        <ExportReportModal
          isOpen={true}
          onClose={mockOnClose}
          accounts={mockAccounts}
        />,
        { wrapper: createWrapper() }
      )

      const modalWrapper = screen.getByTestId('export-report-modal')
      expect(modalWrapper.className).toMatch(/p-3 sm:p-4/)
      expect(modalWrapper.className).toMatch(/overflow-y-auto/)

      // Fundo e bordas baseados em tokens semânticos (sem hardcoded colors)
      const modalCard = modalWrapper.firstElementChild as HTMLElement
      expect(modalCard.className).toMatch(/bg-popover/)
      expect(modalCard.className).toMatch(/border-border/)
      expect(modalCard.className).toMatch(/text-foreground/)
    })

    it('deve conter a classe no-print no modal para nunca ser impresso fisicamente', () => {
      render(
        <ExportReportModal
          isOpen={true}
          onClose={mockOnClose}
          accounts={mockAccounts}
        />,
        { wrapper: createWrapper() }
      )

      const modalWrapper = screen.getByTestId('export-report-modal')
      expect(modalWrapper.className).toContain('no-print')
    })

    it('não deve conter declarações inline com !important no componente', () => {
      const { container } = render(
        <ExportReportModal
          isOpen={true}
          onClose={mockOnClose}
          accounts={mockAccounts}
        />,
        { wrapper: createWrapper() }
      )

      const elementsWithStyle = container.querySelectorAll('[style]')
      elementsWithStyle.forEach((el) => {
        const styleAttr = el.getAttribute('style') || ''
        expect(styleAttr).not.toContain('!important')
      })
    })
  })

  describe('Critério 3: Fidelidade Contábil & Formatação RFC 4180 pt-BR do Gerador CSV', () => {
    it('deve gerar CSV contábil com BOM UTF-8 e formato monetário em vírgula decimal', () => {
      const csvResult = generateTransactionsCSV(sampleTransactions)

      // Validação do BOM UTF-8 (\uFEFF) para compatibilidade nativa com Excel pt-BR
      expect(csvResult.startsWith('\uFEFF')).toBe(true)

      // Validação do delimitador ponto e vírgula (;) e cabeçalhos oficiais
      expect(csvResult).toContain('Data;Descrição;Tipo;Categoria;Centro de Custo / Conta;Forma / Cartão;Status;Data de Pagamento;Valor (R$);Observações')

      // Validação de vírgula decimal nos valores
      expect(csvResult).toContain('8500,00')
      expect(csvResult).toContain('120,50')
      expect(csvResult).toContain('1450,00')

      // Validação de classificação Contábil
      expect(csvResult).toContain('Receita')
      expect(csvResult).toContain('Despesa')
      expect(csvResult).toContain('Concluído')
      expect(csvResult).toContain('Pendente')
    })

    it('deve escapar corretamente textos contendo aspas e ponto e vírgula', () => {
      const specialTransactions: ExportTransactionItem[] = [
        {
          id: 'tx-special',
          occurredAt: '2026-11-20T10:00:00.000Z',
          description: 'Consultoria: "Módulo Fiscal"; Análise Contábil',
          categoryName: 'Serviços',
          type: 'income',
          amount: 2500.0,
          status: 'completed'
        }
      ]

      const csvResult = generateTransactionsCSV(specialTransactions)

      // Aspas duplas devem ser duplicadas conforme RFC 4180
      expect(csvResult).toContain('"Consultoria: ""Módulo Fiscal""; Análise Contábil"')
    })
  })

  describe('Critério 4: Template Executivo de Impressão ReportPrintView', () => {
    it('deve renderizar o template executivo com cabeçalho contábil, autenticação eletrônica e KPIs sóbrios', () => {
      render(<ReportPrintView data={samplePdfData} />)

      expect(screen.getByTestId('report-print-view')).toBeInTheDocument()
      expect(screen.getByTestId('report-print-view').className).toContain('print-view-document')

      // Título institucional e KPIs contábeis
      expect(screen.getByText(/Relatório Financeiro Executivo/i)).toBeInTheDocument()
      expect(screen.getByText(/Leonardo Ferreira da Silva/i)).toBeInTheDocument()
      expect(screen.getByText(/Período Mensal de Novembro de 2026/i)).toBeInTheDocument()

      // Tabela sintética de lançamentos analíticos
      expect(screen.getByText(/Consultoria Técnica de Software/i)).toBeInTheDocument()
      expect(screen.getByText(/Assinatura Cloudflare Pages Pro/i)).toBeInTheDocument()
    })
  })

  describe('Critério 5: Integração do Fluxo de Submissão de Exportação', () => {
    it('deve disparar onExportCSV com os filtros corretos ao selecionar CSV e submeter', async () => {
      render(
        <ExportReportModal
          isOpen={true}
          onClose={mockOnClose}
          accounts={mockAccounts}
          onExportCSV={mockOnExportCSV}
          onExportPDF={mockOnExportPDF}
        />,
        { wrapper: createWrapper() }
      )

      // Selecionar CSV
      const csvBtn = screen.getByTestId('format-csv-btn')
      fireEvent.click(csvBtn)

      // Selecionar Período Anual
      const yearlyBtn = screen.getByTestId('period-type-yearly-btn')
      fireEvent.click(yearlyBtn)

      // Submeter
      const submitBtn = screen.getByTestId('export-csv-btn')
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(mockOnExportCSV).toHaveBeenCalledWith(
          expect.objectContaining({
            periodType: 'yearly',
            status: 'completed'
          })
        )
      })
    })

    it('deve disparar onExportPDF com os filtros corretos ao selecionar PDF e submeter', async () => {
      render(
        <ExportReportModal
          isOpen={true}
          onClose={mockOnClose}
          accounts={mockAccounts}
          onExportCSV={mockOnExportCSV}
          onExportPDF={mockOnExportPDF}
        />,
        { wrapper: createWrapper() }
      )

      // Selecionar Regime de Competência
      const allStatusBtn = screen.getByTestId('status-all-btn')
      fireEvent.click(allStatusBtn)

      // Submeter PDF
      const submitBtn = screen.getByTestId('export-pdf-btn')
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(mockOnExportPDF).toHaveBeenCalledWith(
          expect.objectContaining({
            periodType: 'monthly',
            status: 'all'
          })
        )
      })
    })
  })
})
