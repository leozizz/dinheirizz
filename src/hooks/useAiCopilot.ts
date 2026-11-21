import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { getApiOrigin, normalizeProfileId } from '../lib/profileQuery'
import { TRANSACTIONS_QUERY_KEY } from './useTransactions'
import { ACCOUNTS_QUERY_KEY } from './useAccounts'
import { FORECAST_QUERY_KEY } from './useForecast'
import { BUDGETS_QUERY_KEY } from './useBudgets'
import type {
  AiActionCard,
  AiChatCitation,
  AiChatMessage,
  AiChatRequest,
  AiChatResponse,
  AiChatSource
} from '../types/aiChat'

export type ActionCardStatus = 'pending' | 'confirming' | 'confirmed' | 'cancelled'

export interface CopilotTimelineItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: AiChatCitation[]
  actionCards?: AiActionCard[]
  source?: AiChatSource
  modelName?: string | null
  requiresApiKey?: boolean
}

export interface UseAiCopilotOptions {
  period?: string
  profileId?: string | null
}

export const useAiCopilot = (options?: UseAiCopilotOptions) => {
  const { session } = useAuth()
  const token = session?.access_token
  const queryClient = useQueryClient()

  const [messages, setMessages] = useState<CopilotTimelineItem[]>([])
  const [actionStates, setActionStates] = useState<Record<string, ActionCardStatus>>({})
  const [lastSource, setLastSource] = useState<AiChatSource | null>(null)
  const [lastModelName, setLastModelName] = useState<string | null>(null)
  const [requiresApiKey, setRequiresApiKey] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const normalizedProfileId = normalizeProfileId(options?.profileId)

  const chatMutation = useMutation({
    mutationFn: async (history: AiChatMessage[]): Promise<AiChatResponse> => {
      const origin = getApiOrigin()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const payload: AiChatRequest = {
        messages: history.slice(-20)
      }
      if (options?.period) {
        payload.period = options.period
      }
      if (normalizedProfileId) {
        payload.profileId = normalizedProfileId
      }

      const res = await fetch(`${origin}/api/v1/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        throw new Error(errJson.message || errJson.error || 'Falha ao consultar o Copiloto Financeiro')
      }

      return (await res.json()) as AiChatResponse
    }
  })

  const sendMessage = useCallback(
    async (rawText: string) => {
      const content = rawText.trim()
      if (!content || chatMutation.isPending) return

      setErrorMessage(null)

      const userEntry: CopilotTimelineItem = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'user',
        content
      }

      const nextHistory: AiChatMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content }
      ]

      setMessages((prev) => [...prev, userEntry])

      try {
        const response = await chatMutation.mutateAsync(nextHistory)
        setLastSource(response.source)
        setLastModelName(response.modelName)
        setRequiresApiKey(response.requiresApiKey)

        if (response.actionCards.length > 0) {
          setActionStates((prev) => {
            const next = { ...prev }
            for (const card of response.actionCards) {
              if (!next[card.id]) {
                next[card.id] = 'pending'
              }
            }
            return next
          })
        }

        const assistantEntry: CopilotTimelineItem = {
          id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'assistant',
          content: response.reply,
          citations: response.citations,
          actionCards: response.actionCards,
          source: response.source,
          modelName: response.modelName,
          requiresApiKey: response.requiresApiKey
        }

        setMessages((prev) => [...prev, assistantEntry])
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Não foi possível obter resposta do Copiloto'
        setErrorMessage(msg)
        toast.error(msg)
      }
    },
    [chatMutation, messages]
  )

  const confirmActionCard = useCallback(
    async (card: AiActionCard) => {
      if (card.type === 'cashflow_simulation') return

      const currentStatus = actionStates[card.id]
      if (currentStatus === 'confirming' || currentStatus === 'confirmed') return

      setActionStates((prev) => ({ ...prev, [card.id]: 'confirming' }))

      try {
        const origin = getApiOrigin()
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        if (card.type === 'create_transaction') {
          const res = await fetch(`${origin}/api/v1/transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              amount: Math.abs(card.payload.amount),
              type: card.payload.type,
              description: card.payload.description,
              categoryId: card.payload.categoryId ?? null,
              accountId: card.payload.accountId || undefined,
              occurredAt: card.payload.occurredAt,
              status: 'completed',
              paid: true,
              profileId: normalizedProfileId || undefined
            })
          })

          if (!res.ok) {
            const errJson = (await res.json().catch(() => ({}))) as { error?: string }
            throw new Error(errJson.error || 'Erro ao criar transação sugerida')
          }

          await Promise.all([
            queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: FORECAST_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] }),
            queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: ['ai-insights'] })
          ])
          toast.success('Lançamento registrado com sucesso!')
        } else if (card.type === 'create_budget') {
          const res = await fetch(`${origin}/api/v1/budgets`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              categoryId: card.payload.categoryId,
              amountLimit: card.payload.amountLimit,
              period: card.payload.period,
              profileId: normalizedProfileId || undefined
            })
          })

          if (!res.ok) {
            const errJson = (await res.json().catch(() => ({}))) as { error?: string }
            throw new Error(errJson.error || 'Erro ao criar orçamento sugerido')
          }

          await Promise.all([
            queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: ['ai-insights'] })
          ])
          toast.success('Orçamento criado com sucesso!')
        }

        setActionStates((prev) => ({ ...prev, [card.id]: 'confirmed' }))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao confirmar ação'
        setActionStates((prev) => ({ ...prev, [card.id]: 'pending' }))
        toast.error(msg)
      }
    },
    [actionStates, normalizedProfileId, queryClient, token]
  )

  const cancelActionCard = useCallback((cardId: string) => {
    setActionStates((prev) => ({ ...prev, [cardId]: 'cancelled' }))
  }, [])

  const clearConversation = useCallback(() => {
    setMessages([])
    setActionStates({})
    setErrorMessage(null)
    setRequiresApiKey(false)
  }, [])

  return {
    messages,
    actionStates,
    isSending: chatMutation.isPending,
    lastSource,
    lastModelName,
    requiresApiKey,
    errorMessage,
    sendMessage,
    confirmActionCard,
    cancelActionCard,
    clearConversation
  }
}
