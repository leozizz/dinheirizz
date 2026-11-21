export type AiChatRole = 'user' | 'assistant'

export type AiChatSource = 'byok' | 'system' | 'fallback'

export interface AiChatMessage {
  role: AiChatRole
  content: string
}

export interface AiChatRequest {
  messages: AiChatMessage[]
  period?: string
  profileId?: string
}

export interface AiChatCitation {
  label: string
  value: string
  period?: string
}

export interface CreateTransactionActionPayload {
  amount: number
  type: 'expense' | 'income'
  description: string
  categoryId?: string | null
  categoryName?: string | null
  accountId?: string | null
  accountName?: string | null
  occurredAt: string
}

export interface CreateBudgetActionPayload {
  categoryId: string
  categoryName: string
  amountLimit: number
  period: string
}

export interface CashflowSimulationActionPayload {
  totalAmount: number
  installments: number
  installmentValue: number
  projectedMinBalance30d: number
  projectedMinBalance60d: number
  willGoNegative: boolean
}

export type AiActionCard =
  | {
      id: string
      type: 'create_transaction'
      title: string
      summary: string
      payload: CreateTransactionActionPayload
    }
  | {
      id: string
      type: 'create_budget'
      title: string
      summary: string
      payload: CreateBudgetActionPayload
    }
  | {
      id: string
      type: 'cashflow_simulation'
      title: string
      summary: string
      payload: CashflowSimulationActionPayload
    }

export interface AiChatResponse {
  reply: string
  source: AiChatSource
  modelName: string | null
  requiresApiKey: boolean
  citations: AiChatCitation[]
  actionCards: AiActionCard[]
}
