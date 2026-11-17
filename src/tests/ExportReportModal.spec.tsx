import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ExportReportModal } from '../components/modals/ExportReportModal'

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

describe('ExportReportModal Component (TDD)', () => {
  const mockAccounts = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Nubank PJ' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Itaú PF' }
  ]

  const mockOnClose = vi.fn()
  const mockOnExportCSV = vi.fn()
  const mockOnExportPDF = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não deve renderizar nada quando isOpen=false', () => {
    const { container } = render(
      <ExportReportModal
        isOpen={false}
        onClose={mockOnClose}
        accounts={mockAccounts}
      />,
      { wrapper: createWrapper() }
    )

    expect(container.firstChild).toBeNull()
  })

  it('deve renderizar o modal com os elementos obrigatórios e data-testid quando isOpen=true', () => {
    render(
      <ExportReportModal
        isOpen={true}
        onClose={mockOnClose}
        accounts={mockAccounts}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('export-report-modal')).toBeInTheDocument()
    expect(screen.getByTestId('format-pdf-btn')).toBeInTheDocument()
    expect(screen.getByTestId('format-csv-btn')).toBeInTheDocument()
    expect(screen.getByTestId('period-type-monthly-btn')).toBeInTheDocument()
    expect(screen.getByTestId('period-type-yearly-btn')).toBeInTheDocument()
    expect(screen.getByTestId('account-filter-select')).toBeInTheDocument()
    expect(screen.getByTestId('export-submit-btn')).toBeInTheDocument()
    expect(screen.getByTestId('export-cancel-btn')).toBeInTheDocument()
  })

  it('deve alternar entre os formatos PDF Executivo e Planilha CSV', () => {
    render(
      <ExportReportModal
        isOpen={true}
        onClose={mockOnClose}
        accounts={mockAccounts}
      />,
      { wrapper: createWrapper() }
    )

    const csvFormatBtn = screen.getByTestId('format-csv-btn')
    fireEvent.click(csvFormatBtn)

    // O botão de submit deve refletir a ação de baixar CSV
    expect(screen.getByTestId('export-submit-btn')).toHaveTextContent(/Baixar Planilha CSV/i)

    const pdfFormatBtn = screen.getByTestId('format-pdf-btn')
    fireEvent.click(pdfFormatBtn)
    expect(screen.getByTestId('export-submit-btn')).toHaveTextContent(/Gerar & Imprimir PDF/i)
  })

  it('deve alternar entre os tipos de período Mensal e Anual', () => {
    render(
      <ExportReportModal
        isOpen={true}
        onClose={mockOnClose}
        accounts={mockAccounts}
      />,
      { wrapper: createWrapper() }
    )

    const yearlyBtn = screen.getByTestId('period-type-yearly-btn')
    fireEvent.click(yearlyBtn)

    // Deve exibir o seletor de ano
    expect(screen.getByTestId('period-year-select')).toBeInTheDocument()

    const monthlyBtn = screen.getByTestId('period-type-monthly-btn')
    fireEvent.click(monthlyBtn)

    // Deve exibir os seletores de mês e ano
    expect(screen.getByTestId('period-month-select')).toBeInTheDocument()
  })

  it('deve exibir cards de pré-visualização instantânea dos totais', async () => {
    render(
      <ExportReportModal
        isOpen={true}
        onClose={mockOnClose}
        accounts={mockAccounts}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('export-preview-income')).toBeInTheDocument()
    expect(screen.getByTestId('export-preview-expense')).toBeInTheDocument()
    expect(screen.getByTestId('export-preview-net')).toBeInTheDocument()
    expect(screen.getByTestId('export-preview-count')).toBeInTheDocument()
  })

  it('deve disparar onExportCSV com os filtros corretos ao submeter em modo CSV', async () => {
    render(
      <ExportReportModal
        isOpen={true}
        onClose={mockOnClose}
        accounts={mockAccounts}
        onExportCSV={mockOnExportCSV}
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('format-csv-btn'))
    fireEvent.click(screen.getByTestId('export-submit-btn'))

    await waitFor(() => {
      expect(mockOnExportCSV).toHaveBeenCalledTimes(1)
      const callArg = mockOnExportCSV.mock.calls[0][0]
      expect(callArg.periodType).toBeDefined()
      expect(callArg.period).toBeDefined()
    })
  })

  it('deve disparar onExportPDF com os filtros corretos ao submeter em modo PDF', async () => {
    render(
      <ExportReportModal
        isOpen={true}
        onClose={mockOnClose}
        accounts={mockAccounts}
        onExportPDF={mockOnExportPDF}
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('format-pdf-btn'))
    fireEvent.click(screen.getByTestId('export-submit-btn'))

    await waitFor(() => {
      expect(mockOnExportPDF).toHaveBeenCalledTimes(1)
      const callArg = mockOnExportPDF.mock.calls[0][0]
      expect(callArg.periodType).toBeDefined()
      expect(callArg.period).toBeDefined()
    })
  })

  it('deve fechar o modal ao clicar no botão de cancelar ou fechar', () => {
    render(
      <ExportReportModal
        isOpen={true}
        onClose={mockOnClose}
        accounts={mockAccounts}
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('export-cancel-btn'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('export-close-btn'))
    expect(mockOnClose).toHaveBeenCalledTimes(2)
  })
})
