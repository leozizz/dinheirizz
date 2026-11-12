import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { TransactionModal } from '../components/modals/TransactionModal'
import { ForecastCard } from '../components/dashboard/ForecastCard'
import { AiInsightsCard } from '../components/dashboard/AiInsightsCard'
import * as useForecastModule from '../hooks/useForecast'
import * as useReceiptOcrModule from '../hooks/useReceiptOcr'
import type { AiInsightData } from '../hooks/useAiInsights'

const mockCategories = [
  { id: 'cat-1', name: 'Alimentação', type: 'expense' },
  { id: 'cat-2', name: 'Salário', type: 'income' }
]

const mockAccounts = [
  { id: 'acc-1', name: 'Nubank Principal', balance: 5000 }
]

const mockForecastSafe: useForecastModule.ForecastResponse = {
  startingBalance: 6000,
  projectedEndBalance: 4200,
  netChange: -1800,
  dailyBurnRate: 60,
  healthStatus: 'safe',
  healthMessage: 'Saldo saudável e previsível.',
  lowestPoint: { date: '2026-10-28', balance: 4200 },
  timeline: [
    { date: '2026-09-29', balance: 5940, scheduledIncome: 0, scheduledExpense: 0, variableBurn: 60 },
    { date: '2026-09-30', balance: 5880, scheduledIncome: 0, scheduledExpense: 0, variableBurn: 60 },
    { date: '2026-10-01', balance: 4200, scheduledIncome: 0, scheduledExpense: 1620, variableBurn: 60 }
  ]
}

const mockInsight: AiInsightData = {
  id: 'insight-1',
  period: '2026-11',
  summary: 'Excelente ritmo de economia neste mês.',
  financialHealthScore: 90,
  highlights: [
    'Taxa de poupança atingiu 35% da renda líquida',
    'Gastos com alimentação reduziram 12%'
  ],
  alerts: [],
  recommendations: [],
  metrics: {
    totalIncome: 8500,
    totalExpense: 3200,
    netBalance: 5300,
    savingsRate: 62.35,
    topCategory: 'Moradia'
  },
  isFallback: false,
  createdAt: '2026-11-12T04:00:00Z'
}

const renderWithQuery = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('QA Suite — Validação de Unslop UI, Microcopy PT-BR, Tabular Nums e A11y (LEO-32)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Critério 1: Erradicação de AI-Slop & Emojis Crus em Botões e Badges', () => {
    it('deve garantir que o botão de OCR no TransactionModal não contenha emoji cru 📸 e use SVG semântico', () => {
      render(
        <TransactionModal
          isOpen={true}
          mode="expense"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          categories={mockCategories}
          accounts={mockAccounts}
        />
      )

      const ocrBtn = screen.getByTestId('trigger-receipt-ocr-btn')
      expect(ocrBtn).toBeInTheDocument()
      expect(ocrBtn.textContent).not.toContain('📸')
      expect(ocrBtn.textContent).toContain('Ler Comprovante (IA)')
      expect(ocrBtn.querySelector('svg')).toBeInTheDocument()
    })

    it('deve garantir que o badge de leitura por IA utilize texto profissional e SVG Lucide', async () => {
      const mockScanReceipt = vi.fn().mockResolvedValue({
        amount: 84.5,
        occurredAt: '2026-11-08',
        description: 'Supermercado Pão de Açúcar',
        paymentType: 'pix',
        type: 'expense',
        categorySuggestion: { id: 'cat-1', name: 'Alimentação', confidence: 0.95 },
        confidence: 0.95
      })

      vi.spyOn(useReceiptOcrModule, 'useReceiptOcr').mockReturnValue({
        isScanning: false,
        extractedData: null,
        error: null,
        errorCode: null,
        scanReceipt: mockScanReceipt,
        resetScanState: vi.fn()
      })

      render(
        <TransactionModal
          isOpen={true}
          mode="expense"
          categories={mockCategories}
          accounts={mockAccounts}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      )

      fireEvent.click(screen.getByTestId('trigger-receipt-ocr-btn'))
      const fileInput = screen.getByTestId('receipt-file-input')
      const file = new File(['mock-img'], 'cupom.jpg', { type: 'image/jpeg' })
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        const badge = screen.getByTestId('ai-extracted-badge')
        expect(badge).toBeInTheDocument()
        expect(badge.textContent).not.toContain('✨')
        expect(badge.textContent).toContain('Dados lidos do comprovante (95% precisão)')
        expect(badge.querySelector('svg')).toBeInTheDocument()
      })
    })

    it('deve garantir que o AiInsightsCard utilize ícone Lucide <Check /> em vez do caractere unicode cru ✓', () => {
      render(
        <AiInsightsCard
          insight={mockInsight}
          isLoading={false}
          isGenerating={false}
          onGenerate={vi.fn()}
        />
      )

      const highlightItem = screen.getByText('Taxa de poupança atingiu 35% da renda líquida')
      expect(highlightItem).toBeInTheDocument()
      expect(highlightItem.parentElement?.textContent).not.toContain('✓')
    })
  })

  describe('Critério 2: Tipografia Financeira com .tabular-nums', () => {
    it('deve aplicar a classe tabular-nums a todos os blocos de valores monetários no ForecastCard', () => {
      vi.spyOn(useForecastModule, 'useForecast').mockReturnValue({
        data: mockForecastSafe,
        isLoading: false,
        isError: false
      } as unknown as ReturnType<typeof useForecastModule.useForecast>)

      const { container } = renderWithQuery(<ForecastCard />)
      const tabularElements = container.querySelectorAll('.tabular-nums')
      expect(tabularElements.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('Critério 3: Acessibilidade (A11y), Touch Targets & data-testid (WCAG 2.1 AA)', () => {
    it('deve assegurar touch target mínimo e data-testid no botão de OCR', () => {
      render(
        <TransactionModal
          isOpen={true}
          mode="expense"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          categories={mockCategories}
          accounts={mockAccounts}
        />
      )

      const ocrBtn = screen.getByTestId('trigger-receipt-ocr-btn')
      expect(ocrBtn.getAttribute('data-testid')).toBe('trigger-receipt-ocr-btn')
      expect(ocrBtn.className).toMatch(/min-h-\[36px\]|h-9|py-1\.5/)
    })

    it('deve garantir que nenhum elemento renderizado utilize !important inline', () => {
      const { container } = render(
        <TransactionModal
          isOpen={true}
          mode="expense"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          categories={mockCategories}
          accounts={mockAccounts}
        />
      )

      const elementsWithStyle = container.querySelectorAll('[style]')
      elementsWithStyle.forEach((el) => {
        const styleAttr = el.getAttribute('style') || ''
        expect(styleAttr).not.toContain('!important')
      })
    })
  })
})
