import React, { useState, useEffect, useMemo } from 'react'
import { Command } from 'cmdk'
import {
  Search,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Sun,
  Moon,
  UploadCloud,
  Download,
  Calendar,
  List,
  Wallet,
  CreditCard,
  Tag,
  CornerDownLeft,
  SlidersHorizontal,
  Receipt,
  Sparkles
} from 'lucide-react'
import { parseNaturalLanguageTransaction, type ParsedNlpTransaction } from '../../lib/nlpTransactionParser'
import { formatBRL, formatTransactionDate } from '../../lib/formatters'
import type { AccountItem } from '../../hooks/useAccounts'
import type { CategoryItem } from '../../hooks/useCategories'
import type { TransactionItem } from '../dashboard/Dashboard'
import type { CreditCard as CreditCardType } from '../../types/database.types'
import type { TransactionInitialValues, TransactionMode } from './TransactionModal'

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountItem[]
  creditCards?: CreditCardType[]
  categories: CategoryItem[]
  transactions: TransactionItem[]
  resolvedTheme: 'dark' | 'light'
  viewMode: 'feed' | 'calendar'
  onQuickCreateTransaction: (parsed: ParsedNlpTransaction) => Promise<void> | void
  onOpenTransactionModal: (mode: TransactionMode, initialValues?: TransactionInitialValues) => void
  onSelectAccount: (accountId: string | null) => void
  onToggleTheme: () => void
  onOpenImportStatement: () => void
  onOpenExportReport: () => void
  onToggleViewMode: () => void
  onOpenCopilot?: () => void
}

export const CommandPalette = ({
  isOpen,
  onClose,
  accounts,
  creditCards = [],
  categories,
  transactions,
  resolvedTheme,
  viewMode,
  onQuickCreateTransaction,
  onOpenTransactionModal,
  onSelectAccount,
  onToggleTheme,
  onOpenImportStatement,
  onOpenExportReport,
  onToggleViewMode,
  onOpenCopilot
}: CommandPaletteProps) => {
  const [search, setSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setIsSubmitting(false)
    }
  }, [isOpen])

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

  const parsedNlp = useMemo(() => {
    return parseNaturalLanguageTransaction(search, {
      accounts,
      creditCards,
      categories,
      existingTransactions: transactions
    })
  }, [search, accounts, creditCards, categories, transactions])

  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 8)
  }, [transactions])

  if (!isOpen) return null

  const handleQuickCreate = async () => {
    if (!parsedNlp.isValidTransaction || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onQuickCreateTransaction(parsedNlp)
      setSearch('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenInModal = () => {
    if (!parsedNlp.isValidTransaction) return
    onOpenTransactionModal(parsedNlp.type, {
      description: parsedNlp.description,
      amount: parsedNlp.amount ?? undefined,
      categoryId: parsedNlp.categoryId,
      accountId: parsedNlp.accountId,
      creditCardId: parsedNlp.creditCardId,
      occurredAt: parsedNlp.occurredAt,
      type: parsedNlp.type
    })
    onClose()
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && parsedNlp.isValidTransaction) {
      e.preventDefault()
      void handleQuickCreate()
    }
  }

  const runAction = (fn: () => void) => {
    fn()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[14vh] px-3 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        data-testid="command-palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Barra de comandos e lançamento rápido"
        className="w-[calc(100vw-1.5rem)] max-w-xl rounded-2xl bg-[var(--popover)] text-[var(--popover-foreground)] border border-border shadow-2xl overflow-hidden"
      >
        <Command label="Command Bar Global" shouldFilter={!parsedNlp.isValidTransaction} className="w-full">
          {/* Barra de entrada */}
          <div className="flex items-center gap-2 px-3.5 py-2 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Command.Input
              data-testid="command-palette-input"
              value={search}
              onValueChange={setSearch}
              onKeyDown={handleInputKeyDown}
              autoFocus
              placeholder="Ex.: Mercado 185,50 ontem nubank ou busque ações..."
              className="w-full bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none py-2.5 min-h-[44px]"
            />
            <button
              type="button"
              data-testid="command-palette-close-btn"
              onClick={onClose}
              aria-label="Fechar barra de comandos"
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview Estruturado NLP */}
          {parsedNlp.isValidTransaction && (
            <div
              data-testid="command-nlp-preview"
              className="m-2.5 p-3.5 rounded-xl bg-[var(--card)] border border-primary/35 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        parsedNlp.type === 'income'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}
                    >
                      {parsedNlp.type === 'income' ? (
                        <ArrowDownLeft className="w-3 h-3" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3" />
                      )}
                      {parsedNlp.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {parsedNlp.dateLabel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{parsedNlp.description}</p>
                </div>

                <p
                  className={`text-base font-bold font-tabular whitespace-nowrap ${
                    parsedNlp.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {formatBRL(parsedNlp.amount ?? 0)}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                {parsedNlp.accountName && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60 border border-border text-foreground">
                    <Wallet className="w-3 h-3 text-primary" />
                    {parsedNlp.accountName}
                  </span>
                )}
                {parsedNlp.creditCardName && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60 border border-border text-foreground">
                    <CreditCard className="w-3 h-3 text-primary" />
                    {parsedNlp.creditCardName}
                  </span>
                )}
                {parsedNlp.categoryName && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60 border border-border text-foreground">
                    <Tag className="w-3 h-3 text-primary" />
                    {parsedNlp.categoryName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  data-testid="command-nlp-submit-btn"
                  disabled={isSubmitting}
                  onClick={() => void handleQuickCreate()}
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Registrando...' : 'Lançar agora'}</span>
                </button>
                <button
                  type="button"
                  data-testid="command-nlp-open-modal-btn"
                  onClick={handleOpenInModal}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-muted text-xs font-medium border border-border flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Editar no modal</span>
                </button>
              </div>
            </div>
          )}

          {/* Lista de Comandos e Busca */}
          <Command.List className="max-h-[55vh] overflow-y-auto p-2 space-y-2">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
              Nenhum comando ou transação encontrada.
            </Command.Empty>

            <Command.Group
              heading="Ações Rápidas"
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              <Command.Item
                value="nova despesa gasto"
                data-testid="command-action-new-expense"
                onSelect={() => runAction(() => onOpenTransactionModal('expense'))}
                className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-foreground cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/80 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>Nova Despesa</span>
              </Command.Item>

              <Command.Item
                value="nova receita entrada salario"
                data-testid="command-action-new-income"
                onSelect={() => runAction(() => onOpenTransactionModal('income'))}
                className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-foreground cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/80 transition-colors"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Nova Receita</span>
              </Command.Item>

              <Command.Item
                value="nova transferencia entre contas"
                data-testid="command-action-new-transfer"
                onSelect={() => runAction(() => onOpenTransactionModal('transfer'))}
                className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-foreground cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/80 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Nova Transferência</span>
              </Command.Item>

              <Command.Item
                value="alternar tema dark light escuro claro"
                data-testid="command-action-toggle-theme"
                onSelect={() => runAction(onToggleTheme)}
                className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-foreground cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/80 transition-colors"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                )}
                <span>{resolvedTheme === 'dark' ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro'}</span>
              </Command.Item>

              <Command.Item
                value="importar extrato bancario ofx csv pdf"
                data-testid="command-action-import"
                onSelect={() => runAction(onOpenImportStatement)}
                className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-foreground cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/80 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Importar Extrato Bancário</span>
              </Command.Item>

              <Command.Item
                value="exportar relatorio pdf csv"
                data-testid="command-action-export"
                onSelect={() => runAction(onOpenExportReport)}
                className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-foreground cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/80 transition-colors"
              >
                <Download className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Exportar Relatório</span>
              </Command.Item>

              <Command.Item
                value="alternar visualizacao feed calendario"
                data-testid="command-action-toggle-view"
                onSelect={() => runAction(onToggleViewMode)}
                className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-foreground cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/80 transition-colors"
              >
                {viewMode === 'feed' ? (
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                ) : (
                  <List className="w-4 h-4 text-primary flex-shrink-0" />
                )}
                <span>{viewMode === 'feed' ? 'Alternar para Calendário' : 'Alternar para Feed'}</span>
              </Command.Item>

              {onOpenCopilot && (
                <Command.Item
                  value="abrir copiloto financeiro ia chat assistente"
                  data-testid="command-action-open-copilot"
                  onSelect={() => runAction(onOpenCopilot)}
                  className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-foreground cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/80 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Abrir Copiloto Financeiro</span>
                </Command.Item>
              )}
            </Command.Group>

            {accounts.length > 0 && (
              <>
                <Command.Separator className="h-px bg-border my-1" />
                <Command.Group
                  heading="Contas"
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {accounts.slice(0, 6).map((acc) => (
                    <Command.Item
                      key={acc.id}
                      value={`conta ${acc.name}`}
                      data-testid={`command-account-item-${acc.id}`}
                      onSelect={() => runAction(() => onSelectAccount(acc.id))}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-foreground cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/80 transition-colors"
                    >
                      <span className="flex items-center gap-2.5 min-w-0 truncate">
                        <Wallet className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="truncate">{acc.name}</span>
                      </span>
                      <span className="text-xs font-semibold font-tabular text-muted-foreground whitespace-nowrap">
                        {formatBRL(acc.balance)}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            )}

            {recentTransactions.length > 0 && (
              <>
                <Command.Separator className="h-px bg-border my-1" />
                <Command.Group
                  heading="Transações Recentes"
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {recentTransactions.map((tx) => (
                    <Command.Item
                      key={tx.id}
                      value={`transacao ${tx.description || ''} ${tx.category?.name || ''}`}
                      data-testid={`command-tx-item-${tx.id}`}
                      onSelect={() =>
                        runAction(() =>
                          onOpenTransactionModal(tx.amount >= 0 ? 'income' : 'expense', {
                            description: tx.description || '',
                            amount: Math.abs(tx.amount),
                            categoryId: tx.categoryId || undefined,
                            accountId: tx.accountId || tx.account_id || undefined,
                            creditCardId: tx.creditCardId || undefined,
                            occurredAt: tx.occurred_at?.slice(0, 10)
                          })
                        )
                      }
                      className="flex items-center justify-between gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-foreground cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/80 transition-colors"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Receipt className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{tx.description || 'Sem descrição'}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {formatTransactionDate(tx.occurred_at)}
                            {tx.category?.name ? ` • ${tx.category.name}` : ''}
                          </span>
                        </span>
                      </span>
                      <span
                        className={`text-xs font-bold font-tabular whitespace-nowrap ${
                          tx.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {formatBRL(tx.amount)}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
