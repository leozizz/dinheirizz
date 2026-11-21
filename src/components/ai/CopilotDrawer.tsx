import React, { useEffect, useRef, useState } from 'react'
import {
  X,
  Send,
  KeyRound,
  Sparkles,
  Check,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Target,
  Trash2,
  Loader2
} from 'lucide-react'
import { formatBRL, formatTransactionDate } from '../../lib/formatters'
import { useAiCopilot, type ActionCardStatus } from '../../hooks/useAiCopilot'
import type { AiActionCard, AiChatSource } from '../../types/aiChat'

export interface CopilotDrawerProps {
  isOpen: boolean
  onClose: () => void
  onOpenAiSettings?: () => void
  period?: string
  profileId?: string | null
}

const SUGGESTED_QUESTIONS: readonly string[] = [
  'Onde posso economizar este mês?',
  'Resumo da fatura atual',
  'Simular compra parcelada'
]

const getSourceBadgeLabel = (source: AiChatSource | null, requiresKey: boolean): string => {
  if (requiresKey || source === 'fallback') return 'Sem Chave'
  if (source === 'byok') return 'BYOK'
  if (source === 'system') return 'Sistema'
  return 'BYOK'
}

const getSourceBadgeClass = (source: AiChatSource | null, requiresKey: boolean): string => {
  if (requiresKey || source === 'fallback') {
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
  }
  if (source === 'system') {
    return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
  }
  return 'bg-primary/15 text-primary border-primary/30'
}

interface ActionCardViewProps {
  card: AiActionCard
  status: ActionCardStatus
  onConfirm: (card: AiActionCard) => void
  onCancel: (cardId: string) => void
}

const ActionCardView = ({ card, status, onConfirm, onCancel }: ActionCardViewProps) => {
  const isConfirmed = status === 'confirmed'
  const isCancelled = status === 'cancelled'
  const isConfirming = status === 'confirming'

  return (
    <div
      data-testid={`copilot-action-card-${card.id}`}
      className="mt-2.5 rounded-2xl border border-border bg-card p-3.5 text-card-foreground shadow-sm space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shrink-0">
            {card.type === 'create_transaction' ? (
              <Wallet className="w-4 h-4" />
            ) : card.type === 'create_budget' ? (
              <Target className="w-4 h-4" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{card.title}</p>
            <p className="text-xs text-muted-foreground leading-snug">{card.summary}</p>
          </div>
        </div>
      </div>

      {card.type === 'create_transaction' && (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 border border-border p-2.5 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Valor</span>
            <span className="font-bold font-tabular text-foreground">
              {formatBRL(card.payload.amount)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Data</span>
            <span className="font-medium text-foreground">
              {formatTransactionDate(card.payload.occurredAt) || card.payload.occurredAt}
            </span>
          </div>
          {card.payload.categoryName && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Categoria: </span>
              <span className="font-medium text-foreground">{card.payload.categoryName}</span>
            </div>
          )}
        </div>
      )}

      {card.type === 'create_budget' && (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 border border-border p-2.5 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Categoria</span>
            <span className="font-semibold text-foreground">{card.payload.categoryName}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Limite mensal</span>
            <span className="font-bold font-tabular text-foreground">
              {formatBRL(card.payload.amountLimit)}
            </span>
          </div>
        </div>
      )}

      {card.type === 'cashflow_simulation' && (
        <div className="space-y-2 rounded-xl bg-muted/50 border border-border p-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground block text-[11px]">Total simulado</span>
              <span className="font-bold font-tabular text-foreground">
                {formatBRL(card.payload.totalAmount)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Parcelas</span>
              <span className="font-semibold font-tabular text-foreground">
                {card.payload.installments}x de {formatBRL(card.payload.installmentValue)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Menor saldo (30d)</span>
              <span className="font-bold font-tabular text-foreground">
                {formatBRL(card.payload.projectedMinBalance30d)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Menor saldo (60d)</span>
              <span className="font-bold font-tabular text-foreground">
                {formatBRL(card.payload.projectedMinBalance60d)}
              </span>
            </div>
          </div>
          {card.payload.willGoNegative && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Atenção: o saldo projetado fica negativo no período.</span>
            </div>
          )}
        </div>
      )}

      {card.type !== 'cashflow_simulation' && (
        <div className="flex items-center gap-2 pt-0.5">
          {isConfirmed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <Check className="w-3.5 h-3.5" />
              Confirmado
            </span>
          ) : isCancelled ? (
            <span className="inline-flex items-center px-3 py-2 min-h-[44px] rounded-xl bg-muted text-muted-foreground text-xs font-medium">
              Cancelado
            </span>
          ) : (
            <>
              <button
                type="button"
                data-testid={`copilot-action-confirm-${card.id}`}
                disabled={isConfirming}
                onClick={() => onConfirm(card)}
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isConfirming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{isConfirming ? 'Confirmando...' : 'Confirmar'}</span>
              </button>
              <button
                type="button"
                data-testid={`copilot-action-cancel-${card.id}`}
                disabled={isConfirming}
                onClick={() => onCancel(card.id)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-muted border border-border text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export const CopilotDrawer = ({
  isOpen,
  onClose,
  onOpenAiSettings,
  period,
  profileId
}: CopilotDrawerProps) => {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const {
    messages,
    actionStates,
    isSending,
    lastSource,
    requiresApiKey,
    sendMessage,
    confirmActionCard,
    cancelActionCard,
    clearConversation
  } = useAiCopilot({ period, profileId })

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isOpen, messages.length])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed || isSending) return
    setInputValue('')
    await sendMessage(trimmed)
  }

  const handleChipClick = async (question: string) => {
    if (isSending) return
    await sendMessage(question)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        data-testid="copilot-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Copiloto Financeiro Dinheirizz"
        className="fixed inset-x-0 bottom-0 h-[92dvh] w-full rounded-t-3xl sm:static sm:h-full sm:max-w-lg sm:rounded-none sm:rounded-l-3xl bg-[var(--popover)] text-[var(--popover-foreground)] border-t sm:border-t-0 sm:border-l border-border shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-foreground tracking-tight">
                  Copiloto Financeiro
                </h2>
                <span
                  data-testid="copilot-source-badge"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getSourceBadgeClass(
                    lastSource,
                    requiresApiKey
                  )}`}
                >
                  <KeyRound className="w-3 h-3" />
                  {getSourceBadgeLabel(lastSource, requiresApiKey)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Respostas sobre seus saldos, faturas, orçamentos e previsão
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                data-testid="copilot-clear-btn"
                onClick={clearConversation}
                aria-label="Limpar conversa"
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              data-testid="copilot-close-btn"
              onClick={onClose}
              aria-label="Fechar copiloto financeiro"
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Área de Mensagens */}
        <div
          data-testid="copilot-messages-list"
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        >
          {messages.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Como posso ajudar nas suas finanças hoje?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pergunte sobre gastos por categoria, faturas de cartão, simule compras parceladas ou peça para preparar um orçamento ou lançamento. Nenhuma alteração é salva sem sua confirmação.
              </p>
            </div>
          )}

          {/* Chips de Perguntas Sugeridas */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question, idx) => (
              <button
                key={question}
                type="button"
                data-testid={`copilot-suggested-chip-${idx}`}
                disabled={isSending}
                onClick={() => void handleChipClick(question)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border text-xs font-medium text-foreground text-left transition-colors cursor-pointer disabled:opacity-60"
              >
                {question}
              </button>
            ))}
          </div>

          {/* Histórico da Conversa */}
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user'
            return (
              <div
                key={msg.id}
                data-testid={
                  isUser ? `copilot-message-user-${index}` : `copilot-message-assistant-${index}`
                }
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card text-card-foreground border border-border rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                  {!isUser && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border/70 flex flex-wrap gap-1.5">
                      {msg.citations.map((cit, citIdx) => (
                        <span
                          key={`${cit.label}-${citIdx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/70 border border-border text-[11px] text-foreground"
                        >
                          <span className="text-muted-foreground">{cit.label}:</span>
                          <span className="font-semibold font-tabular">{cit.value}</span>
                          {cit.period && (
                            <span className="text-muted-foreground">({cit.period})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {!isUser &&
                  msg.actionCards &&
                  msg.actionCards.map((card) => (
                    <div key={card.id} className="w-full max-w-[92%]">
                      <ActionCardView
                        card={card}
                        status={actionStates[card.id] ?? 'pending'}
                        onConfirm={(c) => void confirmActionCard(c)}
                        onCancel={cancelActionCard}
                      />
                    </div>
                  ))}
              </div>
            )
          })}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Analisando seus dados financeiros...</span>
            </div>
          )}

          {requiresApiKey && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Configure sua chave gratuita do Google Gemini (BYOK) para ativar respostas com IA sobre seus dados reais.
                </p>
              </div>
              {onOpenAiSettings && (
                <button
                  type="button"
                  data-testid="copilot-missing-key-cta"
                  onClick={() => {
                    onClose()
                    onOpenAiSettings()
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Configurar Chave Gemini (BYOK)
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="p-3 sm:p-4 border-t border-border bg-card/60 shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              data-testid="copilot-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pergunte algo sobre suas finanças..."
              aria-label="Pergunta para o Copiloto Financeiro"
              maxLength={2000}
              className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              data-testid="copilot-send-btn"
              disabled={!inputValue.trim() || isSending}
              aria-label="Enviar mensagem"
              className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
