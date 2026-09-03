import { formatBRL, formatTransactionDate } from '../../lib/formatters'
import { QuickActions, ActionType } from './QuickActions'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react'

export interface TransactionItem {
  id: string
  description: string | null
  amount: number
  paid: boolean
  occurred_at: string
  category?: {
    name: string
    color?: string | null
    icon?: string | null
  } | null
  type?: string
}

interface DashboardProps {
  totalBalance: number
  totalIncome: number
  totalExpense: number
  transactions: TransactionItem[]
  onActionClick: (action: ActionType) => void
}

export function Dashboard({
  totalBalance,
  totalIncome,
  totalExpense,
  transactions,
  onActionClick
}: DashboardProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Saldo Principal Card */}
      <div className="relative overflow-hidden glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Saldo total disponível
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Ativo
          </span>
        </div>

        {/* Valor de Destaque */}
        <div className="mb-6">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
            {formatBRL(totalBalance)}
          </h2>
        </div>

        {/* Resumo de Entradas e Saídas */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-neutral-400 block">Receitas do Mês</span>
              <span className="text-sm sm:text-base font-semibold text-emerald-400">
                {formatBRL(totalIncome)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-neutral-400 block">Despesas do Mês</span>
              <span className="text-sm sm:text-base font-semibold text-rose-400">
                {formatBRL(totalExpense)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 px-1">
          Ações Rápidas
        </h3>
        <QuickActions onAction={onActionClick} />
      </div>

      {/* Extrato Recente */}
      <div className="glass-card p-6 rounded-3xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            <h3 className="text-sm font-semibold text-white">
              Últimas Movimentações
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            {transactions.length} registros
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-sm">
            Nenhuma transação recente encontrada.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {transactions.map((t) => {
              const isIncome = t.amount > 0
              return (
                <div
                  key={t.id}
                  className="py-3.5 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border text-sm font-semibold ${
                        isIncome
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {t.description || 'Transação sem descrição'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-neutral-400">
                          {formatTransactionDate(t.occurred_at)}
                        </span>
                        {t.category && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-md font-medium border"
                            style={{
                              backgroundColor: t.category.color ? `${t.category.color}20` : 'rgba(255,255,255,0.05)',
                              borderColor: t.category.color ? `${t.category.color}40` : 'rgba(255,255,255,0.1)',
                              color: t.category.color || '#e5e7eb'
                            }}
                          >
                            {t.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm sm:text-base font-semibold ${
                        isIncome ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : ''}
                      {formatBRL(t.amount)}
                    </span>
                    <span className="block text-[11px] text-neutral-500">
                      {t.paid ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
