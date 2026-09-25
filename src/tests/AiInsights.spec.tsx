import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AiInsightsCard } from '../components/dashboard/AiInsightsCard'
import type { AiInsightData } from '../hooks/useAiInsights'

const mockInsight: AiInsightData = {
  id: 'insight-1',
  period: '2026-09',
  summary: 'Excelente ritmo de economia neste mês! Seus gastos essenciais representaram apenas 42% da sua renda.',
  financialHealthScore: 88,
  highlights: [
    'Taxa de poupança atingiu 35% da renda líquida',
    'Gastos com alimentação reduziram 12% em relação à média'
  ],
  alerts: [
    'Categoria Lazer concentrou 60% dos gastos supérfluos no último fim de semana'
  ],
  recommendations: [
    'Considere direcionar o saldo excedente para a sua reserva de emergência',
    'Defina um teto semanal para refeições fora de casa'
  ],
  metrics: {
    totalIncome: 8500,
    totalExpense: 3200,
    netBalance: 5300,
    savingsRate: 62.35,
    topCategory: 'Moradia'
  },
  isFallback: false,
  createdAt: '2026-09-24T18:00:00Z'
}

describe('AiInsightsCard (TDD)', () => {
  it('deve renderizar skeleton shimmer durante carregamento', () => {
    const { container } = render(
      <AiInsightsCard
        insight={null}
        isLoading={true}
        isGenerating={false}
        onGenerate={vi.fn()}
      />
    )

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('deve renderizar resumo do consultor, health score e tags de destaques/alertas', () => {
    render(
      <AiInsightsCard
        insight={mockInsight}
        isLoading={false}
        isGenerating={false}
        onGenerate={vi.fn()}
      />
    )

    expect(screen.getByText('Consultor Dinheirizz')).toBeInTheDocument()
    expect(screen.getByText(/Excelente ritmo de economia neste mês/i)).toBeInTheDocument()
    expect(screen.getByText('88')).toBeInTheDocument()
    expect(screen.getByText(/Taxa de poupança atingiu 35%/i)).toBeInTheDocument()
    expect(screen.getByText(/Categoria Lazer concentrou 60%/i)).toBeInTheDocument()
  })

  it('deve disparar regeneração ao clicar no botão "Atualizar Análise"', () => {
    const handleGenerate = vi.fn()
    render(
      <AiInsightsCard
        insight={mockInsight}
        isLoading={false}
        isGenerating={false}
        onGenerate={handleGenerate}
      />
    )

    const btnRefresh = screen.getByRole('button', { name: /atualizar análise/i })
    expect(btnRefresh).toBeInTheDocument()

    fireEvent.click(btnRefresh)
    expect(handleGenerate).toHaveBeenCalledTimes(1)
  })

  it('deve desabilitar o botão durante a regeneração (isGenerating = true)', () => {
    render(
      <AiInsightsCard
        insight={mockInsight}
        isLoading={false}
        isGenerating={true}
        onGenerate={vi.fn()}
      />
    )

    const btnRefresh = screen.getByRole('button', { name: /analisando/i })
    expect(btnRefresh).toBeDisabled()
  })

  it('deve exibir badge transparente de "Diagnóstico Analítico (Sem IA)" quando for fallback', () => {
    const fallbackInsight: AiInsightData = {
      ...mockInsight,
      isFallback: true,
      source: 'fallback'
    }

    render(
      <AiInsightsCard
        insight={fallbackInsight}
        isLoading={false}
        isGenerating={false}
        onGenerate={vi.fn()}
      />
    )

    expect(screen.getByTestId('badge-fallback')).toBeInTheDocument()
    expect(screen.getByText(/Diagnóstico Analítico \(Sem IA\)/i)).toBeInTheDocument()
    expect(screen.getByText(/regras orçamentárias heurísticas locais/i)).toBeInTheDocument()
  })

  it('deve exibir badge de "Chave Pessoal (BYOK)" quando gerado com chave do usuário', () => {
    const byokInsight: AiInsightData = {
      ...mockInsight,
      isFallback: false,
      source: 'byok',
      modelName: 'gemini-1.5-flash'
    }

    render(
      <AiInsightsCard
        insight={byokInsight}
        isLoading={false}
        isGenerating={false}
        onGenerate={vi.fn()}
      />
    )

    expect(screen.getByTestId('badge-byok')).toBeInTheDocument()
    expect(screen.getByText(/Chave Pessoal \(BYOK\)/i)).toBeInTheDocument()
    expect(screen.getByText(/gemini-1.5-flash/i)).toBeInTheDocument()
  })

  it('deve exibir badge de "Dinheirizz IA (Admin/Pro)" quando gerado via servidor', () => {
    const systemInsight: AiInsightData = {
      ...mockInsight,
      isFallback: false,
      source: 'system',
      modelName: 'gemini-1.5-flash'
    }

    render(
      <AiInsightsCard
        insight={systemInsight}
        isLoading={false}
        isGenerating={false}
        onGenerate={vi.fn()}
      />
    )

    expect(screen.getByTestId('badge-system')).toBeInTheDocument()
    expect(screen.getByText(/Dinheirizz IA \(Admin\/Pro\)/i)).toBeInTheDocument()
  })
})

