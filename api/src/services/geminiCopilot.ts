import type { AiActionCard, AiChatCitation, AiChatMessage } from '../../../src/types/aiChat'
import {
  executeQueryTransactions,
  executeSimulateCashflowImpact,
  type CopilotContextSummary
} from './copilotContext'

export interface RunCopilotOptions {
  userId: string
  profileId?: string | null
  apiKey: string
  modelName: string
  messages: AiChatMessage[]
  context: CopilotContextSummary
}

export interface RunCopilotResult {
  reply: string
  citations: AiChatCitation[]
  actionCards: AiActionCard[]
}

interface GeminiFunctionCall {
  name: string
  args?: Record<string, unknown>
}

interface GeminiPart {
  text?: string
  functionCall?: GeminiFunctionCall
  functionResponse?: {
    name: string
    response: Record<string, unknown>
  }
}

interface GeminiContent {
  role: 'user' | 'model' | 'function'
  parts: GeminiPart[]
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      role?: string
      parts?: GeminiPart[]
    }
  }>
  error?: {
    message?: string
  }
}

const formatBRLValue = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const GEMINI_TOOL_DECLARATIONS = [
  {
    name: 'query_transactions',
    description:
      'Consulta transações financeiras reais do usuário autenticado filtradas por período, categoria ou texto de busca.',
    parameters: {
      type: 'OBJECT',
      properties: {
        days: { type: 'NUMBER', description: 'Quantidade de dias retroativos (padrão 60)' },
        startDate: { type: 'STRING', description: 'Data inicial YYYY-MM-DD (opcional)' },
        endDate: { type: 'STRING', description: 'Data final YYYY-MM-DD (opcional)' },
        categoryName: { type: 'STRING', description: 'Nome da categoria (opcional)' },
        searchText: { type: 'STRING', description: 'Texto na descrição ou estabelecimento (opcional)' }
      }
    }
  },
  {
    name: 'simulate_cashflow_impact',
    description:
      'Simula o impacto de uma nova despesa ou receita (à vista ou parcelada) no Forecast de fluxo de caixa 30d e 60d.',
    parameters: {
      type: 'OBJECT',
      properties: {
        totalAmount: { type: 'NUMBER', description: 'Valor total da compra ou receita em reais' },
        installments: { type: 'NUMBER', description: 'Número de parcelas (>= 1)' },
        type: { type: 'STRING', description: 'Tipo: expense ou income' }
      },
      required: ['totalAmount', 'installments', 'type']
    }
  },
  {
    name: 'propose_create_transaction',
    description:
      'Propõe a criação de uma transação financeira para aprovação explícita do usuário em 1 clique. Nunca executa diretamente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        amount: { type: 'NUMBER', description: 'Valor positivo da transação' },
        type: { type: 'STRING', description: 'expense ou income' },
        description: { type: 'STRING', description: 'Descrição curta da transação' },
        categoryName: { type: 'STRING', description: 'Nome da categoria sugerida' },
        accountName: { type: 'STRING', description: 'Nome da conta bancária sugerida' },
        occurredAt: { type: 'STRING', description: 'Data no formato YYYY-MM-DD' }
      },
      required: ['amount', 'type', 'description']
    }
  },
  {
    name: 'propose_create_budget',
    description:
      'Propõe a criação de um orçamento mensal por categoria para aprovação explícita do usuário em 1 clique. Nunca executa diretamente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        categoryName: { type: 'STRING', description: 'Nome da categoria' },
        amountLimit: { type: 'NUMBER', description: 'Valor limite mensal em reais' },
        period: { type: 'STRING', description: 'monthly ou YYYY-MM' }
      },
      required: ['categoryName', 'amountLimit']
    }
  }
]

const buildSystemInstruction = (context: CopilotContextSummary): string => {
  const contextJson = JSON.stringify({
    period: context.period,
    totalBalance: context.totalBalance,
    accounts: context.accounts,
    categories: context.categories,
    openInvoices: context.openInvoices,
    budgets: context.budgets,
    forecast30d: context.forecast30d,
    forecast60d: context.forecast60d,
    last60dSpendingByCategory: context.last60dSpendingByCategory,
    topDescriptionsLast60d: context.topDescriptionsLast60d
  })

  return `Você é o Copiloto Financeiro do Dinheirizz.
Responda sempre em português do Brasil (PT-BR), de forma clara, objetiva, respeitosa e fundamentada nos dados reais do usuário.
Regras obrigatórias:
1. Cite valores em reais (R$) e períodos reais sempre que responder sobre gastos, saldos, faturas ou projeções.
2. Nunca invente valores ou transações que não estejam no contexto ou no retorno das ferramentas.
3. Para consultar transações específicas, use a ferramenta query_transactions.
4. Para simular compras parceladas ou impacto no saldo futuro, use simulate_cashflow_impact.
5. Para criar transações ou orçamentos, use propose_create_transaction ou propose_create_budget e informe ao usuário que um cartão de ação foi gerado para confirmação explícita.

Contexto financeiro agregado do usuário (sem PII):
${contextJson}`
}

const buildActionCardId = (prefix: string, index: number): string =>
  `${prefix}-${Date.now()}-${index}`

export const runCopilotWithGemini = async (
  options: RunCopilotOptions
): Promise<RunCopilotResult> => {
  const modelName = options.modelName || 'gemini-1.5-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(options.apiKey)}`

  const contents: GeminiContent[] = options.messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))

  const citations: AiChatCitation[] = []
  const actionCards: AiActionCard[] = []
  let finalReply = ''

  for (let turn = 0; turn < 4; turn++) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemInstruction(options.context) }]
        },
        contents,
        tools: [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      })
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new Error(`Falha na API Gemini (${response.status}): ${errorBody.slice(0, 180)}`)
    }

    const payload = (await response.json()) as GeminiApiResponse
    if (payload.error?.message) {
      throw new Error(payload.error.message)
    }

    const candidateParts = payload.candidates?.[0]?.content?.parts ?? []
    const textParts = candidateParts
      .map((p) => p.text)
      .filter((text): text is string => Boolean(text && text.trim()))
    const functionCalls = candidateParts
      .map((p) => p.functionCall)
      .filter((fc): fc is GeminiFunctionCall => Boolean(fc && fc.name))

    if (functionCalls.length === 0) {
      finalReply = textParts.join('\n').trim()
      break
    }

    contents.push({
      role: 'model',
      parts: candidateParts
    })

    const functionResponseParts: GeminiPart[] = []

    for (const call of functionCalls) {
      const args = call.args ?? {}

      if (call.name === 'query_transactions') {
        const result = await executeQueryTransactions(
          options.userId,
          {
            days: typeof args.days === 'number' ? args.days : undefined,
            startDate: typeof args.startDate === 'string' ? args.startDate : undefined,
            endDate: typeof args.endDate === 'string' ? args.endDate : undefined,
            categoryName: typeof args.categoryName === 'string' ? args.categoryName : undefined,
            searchText: typeof args.searchText === 'string' ? args.searchText : undefined
          },
          options.profileId
        )

        citations.push({
          label: `Transações (${result.count} lançamentos)`,
          value: formatBRLValue(result.totalAmount),
          period: result.periodLabel
        })

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: {
              count: result.count,
              totalAmount: result.totalAmount,
              periodLabel: result.periodLabel,
              sample: result.sample
            }
          }
        })
      } else if (call.name === 'simulate_cashflow_impact') {
        const totalAmount = Number(args.totalAmount) || 0
        const installments = Math.max(1, Math.floor(Number(args.installments) || 1))
        const txType = args.type === 'income' ? 'income' : 'expense'

        const sim = await executeSimulateCashflowImpact(
          options.userId,
          { totalAmount, installments, type: txType },
          options.profileId
        )

        citations.push({
          label: `Menor saldo projetado (60d)`,
          value: formatBRLValue(sim.projectedMinBalance60d),
          period: 'próximos 60 dias'
        })

        actionCards.push({
          id: buildActionCardId('sim', actionCards.length + 1),
          type: 'cashflow_simulation',
          title: `Simulação em ${sim.installments}x de ${formatBRLValue(sim.installmentValue)}`,
          summary: sim.willGoNegative
            ? `Atenção: o saldo mínimo projetado cai para ${formatBRLValue(Math.min(sim.projectedMinBalance30d, sim.projectedMinBalance60d))}.`
            : `Saldo projetado permanece positivo (mínimo de ${formatBRLValue(Math.min(sim.projectedMinBalance30d, sim.projectedMinBalance60d))}).`,
          payload: sim
        })

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { ...sim }
          }
        })
      } else if (call.name === 'propose_create_transaction') {
        const amount = Math.max(0.01, Number(args.amount) || 0)
        const txType = args.type === 'income' ? 'income' : 'expense'
        const description =
          typeof args.description === 'string' && args.description.trim()
            ? args.description.trim()
            : 'Lançamento sugerido'
        const categoryName =
          typeof args.categoryName === 'string' ? args.categoryName.trim() : null
        const matchedCat = categoryName
          ? options.context.categories.find(
              (c) => normalizeText(c.name) === normalizeText(categoryName)
            )
          : undefined
        const accountName =
          typeof args.accountName === 'string' ? args.accountName.trim() : null
        const matchedAcc = accountName
          ? options.context.accounts.find(
              (a) => normalizeText(a.name) === normalizeText(accountName)
            )
          : options.context.accounts[0]
        const occurredAt =
          typeof args.occurredAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.occurredAt)
            ? args.occurredAt
            : new Date().toISOString().slice(0, 10)

        actionCards.push({
          id: buildActionCardId('tx', actionCards.length + 1),
          type: 'create_transaction',
          title: `Lançar ${txType === 'income' ? 'receita' : 'despesa'}: ${description}`,
          summary: `${formatBRLValue(amount)} em ${occurredAt}`,
          payload: {
            amount,
            type: txType,
            description,
            categoryId: matchedCat?.id ?? null,
            categoryName: matchedCat?.name ?? categoryName,
            accountId: matchedAcc?.id ?? null,
            accountName: matchedAcc?.name ?? accountName,
            occurredAt
          }
        })

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { proposed: true, requiresUserConfirmation: true }
          }
        })
      } else if (call.name === 'propose_create_budget') {
        const requestedCategory =
          typeof args.categoryName === 'string' && args.categoryName.trim()
            ? args.categoryName.trim()
            : 'Alimentação'
        const matchedCat =
          options.context.categories.find(
            (c) => normalizeText(c.name) === normalizeText(requestedCategory)
          ) ?? options.context.categories[0]

        const amountLimit = Math.max(1, Number(args.amountLimit) || 0)
        const period =
          typeof args.period === 'string' && args.period.trim()
            ? args.period.trim()
            : 'monthly'

        if (matchedCat) {
          actionCards.push({
            id: buildActionCardId('budget', actionCards.length + 1),
            type: 'create_budget',
            title: `Criar orçamento de ${matchedCat.name}`,
            summary: `Limite de ${formatBRLValue(amountLimit)} (${period === 'monthly' ? 'mensal' : period})`,
            payload: {
              categoryId: matchedCat.id,
              categoryName: matchedCat.name,
              amountLimit,
              period
            }
          })
        }

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: {
              proposed: Boolean(matchedCat),
              requiresUserConfirmation: true
            }
          }
        })
      }
    }

    contents.push({
      role: 'function',
      parts: functionResponseParts
    })
  }

  if (!finalReply) {
    finalReply =
      actionCards.length > 0
        ? 'Preparei uma sugestão com base nos seus dados reais. Confira os detalhes no cartão abaixo.'
        : 'Não foi possível gerar uma resposta completa neste momento. Tente reformular sua pergunta.'
  }

  return {
    reply: finalReply,
    citations,
    actionCards
  }
}
