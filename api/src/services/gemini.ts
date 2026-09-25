import type { MonthlyFinancialMetrics } from './financial-analytics'

export interface GeneratedInsight {
  summary: string
  financialHealthScore: number
  highlights: string[]
  alerts: string[]
  recommendations: string[]
  isFallback: boolean
  source?: 'byok' | 'system' | 'fallback'
  provider?: string
  modelName?: string | null
}

export interface GenerateInsightOptions {
  metrics: MonthlyFinancialMetrics
  period: string
  userName?: string | null
  apiKey?: string
  source?: 'byok' | 'system' | 'fallback'
  provider?: string
  modelName?: string | null
}

/**
 * Fallback heurístico determinístico caso GEMINI_API_KEY não esteja configurada ou ocorra falha de rede
 */
export function generateFallbackInsight(
  metrics: MonthlyFinancialMetrics,
  userName?: string | null
): GeneratedInsight {
  const nameGreeting = userName ? `${userName}, ` : ''

  // Cenário 1: Sem movimentações
  if (metrics.totalIncome === 0 && metrics.totalExpense === 0) {
    return {
      summary: `${nameGreeting}ainda não identificamos movimentações financeiras registradas neste período. Assim que você cadastrar suas primeiras receitas e despesas, o Consultor IA gerará um diagnóstico completo.`,
      financialHealthScore: 50,
      highlights: ['Ambiente pronto para registrar receitas, despesas e transferências.'],
      alerts: ['Nenhuma transação identificada no mês vigente.'],
      recommendations: [
        'Adicione suas despesas recorrentes e receitas para iniciar o acompanhamento.',
        'Cadastre suas contas bancárias para ter uma visão consolidada do seu patrimônio.'
      ],
      isFallback: true,
      source: 'fallback',
      provider: 'rules-engine',
      modelName: 'heuristics'
    }
  }

  // Cenário 2: Superávit robusto (savingsRate >= 30%)
  if (metrics.savingsRate >= 30) {
    const score = Math.min(98, Math.round(75 + metrics.savingsRate * 0.23))
    return {
      summary: `${nameGreeting}excelente desempenho financeiro! Sua taxa de poupança está em ${metrics.savingsRate}%, revelando grande disciplina e consistência orçamentária.`,
      financialHealthScore: score,
      highlights: [
        `Taxa de poupança saudável atingiu ${metrics.savingsRate}% da sua renda bruta.`,
        `Saldo líquido positivo de R$ ${metrics.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} acumulado.`
      ],
      alerts: metrics.topCategory
        ? [
            `Maior concentração de consumo em "${metrics.topCategory}" (${metrics.categoriesBreakdown[0]?.percentage}% do total de despesas).`
          ]
        : [],
      recommendations: [
        'Mantenha essa margem e direcione o excedente para sua reserva de emergência ou investimentos.',
        'Monitore os custos fixos para preservar seu poder de aporte no próximo período.'
      ],
      isFallback: true,
      source: 'fallback',
      provider: 'rules-engine',
      modelName: 'heuristics'
    }
  }

  // Cenário 3: Equilibrado com saldo positivo (0% <= savingsRate < 30%)
  if (metrics.netBalance >= 0) {
    const score = Math.max(60, Math.round(60 + metrics.savingsRate * 0.5))
    return {
      summary: `${nameGreeting}suas contas estão equilibradas no azul neste período, mas sua margem de economia pode ser otimizada para acelerar suas metas.`,
      financialHealthScore: score,
      highlights: [
        `Mês fechando com saldo superavitário de R$ ${metrics.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        `Receitas superaram as saídas registradas até o momento.`
      ],
      alerts: [
        `As despesas consumiram ${(100 - metrics.savingsRate).toFixed(1)}% do total de ganhos do período.`,
        ...(metrics.topCategory
          ? [`A categoria "${metrics.topCategory}" foi a mais representativa nos gastos.`]
          : [])
      ],
      recommendations: [
        'Identifique oportunidades de corte em gastos supérfluos na categoria de maior impacto.',
        'Tente elevar sua taxa de poupança para pelo menos 20% da sua renda mensal.'
      ],
      isFallback: true,
      source: 'fallback',
      provider: 'rules-engine',
      modelName: 'heuristics'
    }
  }

  // Cenário 4: Déficit orçamentário (despesas > receitas)
  const deficitAmount = Math.abs(metrics.netBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const expenseRatio = metrics.totalIncome > 0 ? metrics.totalExpense / metrics.totalIncome : 2
  const score = Math.max(25, Math.round(55 - (expenseRatio - 1) * 30))

  return {
    summary: `${nameGreeting}atenção ao orçamento deste período: suas despesas superaram as receitas em R$ ${deficitAmount}. É hora de ajustar as contas para restabelecer o equilíbrio.`,
    financialHealthScore: score,
    highlights: [
      'Identificação antecipada do desvio para possibilitar correções rápidas de rota.'
    ],
    alerts: [
      `Déficit orçamentário de R$ ${deficitAmount} acumulado no período.`,
      ...(metrics.topCategory
        ? [`Gastos em "${metrics.topCategory}" exigem contenção imediata.`]
        : [])
    ],
    recommendations: [
      'Pause despesas discricionárias não essenciais até a recuperação do saldo positivo.',
      'Defina um teto orçamentário rígido para as próximas semanas e acompanhe as saídas diariamente.'
    ],
    isFallback: true,
    source: 'fallback',
    provider: 'rules-engine',
    modelName: 'heuristics'
  }
}

/**
 * Invoca a API do Google Gemini com a persona do Consultor Dinheirizz e fallback resiliente
 */
export async function generateGeminiFinancialInsight(
  options: GenerateInsightOptions
): Promise<GeneratedInsight> {
  const { metrics, period, userName } = options
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY

  // Se não há chave de API disponível, aciona o fallback imediatamente
  if (!apiKey) {
    return generateFallbackInsight(metrics, userName)
  }

  const prompt = `
Você é o Consultor Financeiro Pessoal do Dinheirizz, um especialista em finanças inteligente, elegante, direto, empático e sofisticado.
Seu objetivo é analisar as métricas consolidadas do usuário e entregar um diagnóstico prático de saúde financeira para o período ${period}.

Dados Financeiros Consolidados do Usuário:
- Nome: ${userName || 'Usuário'}
- Total de Receitas: R$ ${metrics.totalIncome.toFixed(2)}
- Total de Despesas: R$ ${metrics.totalExpense.toFixed(2)}
- Saldo Líquido: R$ ${metrics.netBalance.toFixed(2)}
- Taxa de Poupança: ${metrics.savingsRate}%
- Categoria de Maior Gasto: ${metrics.topCategory || 'Nenhuma'}
- Distribuição por Categoria: ${JSON.stringify(metrics.categoriesBreakdown)}

Diretrizes de Tom e Resposta:
- Seja encorajador e pragmático. Evite jargões corporativos burocráticos.
- Forneça conselhos acionáveis e realistas.
- Retorne EXCLUSIVAMENTE um objeto JSON válido, sem blocos markdown ou formatações extras, seguindo rigorosamente esta estrutura:
{
  "summary": "Resumo do diagnóstico em 2 a 3 frases fluidas e humanizadas.",
  "financialHealthScore": 85,
  "highlights": ["Ponto positivo 1", "Ponto positivo 2"],
  "alerts": ["Ponto de atenção ou alerta preventivo"],
  "recommendations": ["Recomendação prática 1", "Recomendação prática 2"]
}
`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json'
        }
      })
    })

    if (!response.ok) {
      return generateFallbackInsight(metrics, userName)
    }

    const data = await response.json()
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawContent) {
      return generateFallbackInsight(metrics, userName)
    }

    // Limpa eventuais marcadores ```json ... ``` se o modelo retornar
    const cleanedJson = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleanedJson)

    return {
      summary: String(parsed.summary || ''),
      financialHealthScore: Math.min(100, Math.max(0, Number(parsed.financialHealthScore) || 50)),
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map(String) : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts.map(String) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
      isFallback: false,
      source: options.source || (options.apiKey ? 'byok' : 'system'),
      provider: options.provider || 'gemini',
      modelName: options.modelName || 'gemini-1.5-flash'
    }
  } catch {
    // Qualquer falha de rede ou parsing aciona fallback gracioso
    return generateFallbackInsight(metrics, userName)
  }
}
