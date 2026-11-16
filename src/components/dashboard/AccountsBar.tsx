import { Plus, Layers } from 'lucide-react'
import { formatBRL } from '../../lib/formatters'
import { detectBank } from '../../lib/banks'
import type { AccountItem } from '../../hooks/useAccounts'

interface AccountsBarProps {
  accounts: AccountItem[]
  selectedAccountId: string | null
  onSelectAccount: (accountId: string | null) => void
  onNewAccount: () => void
}

export function AccountsBar({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onNewAccount
}: AccountsBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Suas Contas
        </h3>
        <button
          type="button"
          onClick={onNewAccount}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-white/5 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Conta</span>
        </button>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-0.5 no-scrollbar scroll-smooth">
        {/* Card: Todas as contas */}
        <button
          type="button"
          onClick={() => onSelectAccount(null)}
          data-active={selectedAccountId === null}
          className={`flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 text-left min-h-[44px] cursor-pointer ${
            selectedAccountId === null
              ? 'bg-primary/15 border-primary/40 text-foreground shadow-lg shadow-primary/10'
              : 'glass-card border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/40'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs flex-shrink-0 ${
              selectedAccountId === null
                ? 'bg-primary/25 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 pr-1">
            <span className="block text-xs font-medium truncate">Todas as contas</span>
            <span className="block text-[11px] text-muted-foreground font-normal">
              Visão geral
            </span>
          </div>
        </button>

        {/* Lista de Contas Cadastradas */}
        {accounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id
          const bankInfo = detectBank(acc.bank || acc.name)
          const badgeBg = acc.color ? `${acc.color}25` : `${bankInfo.primaryColor}25`
          const badgeColor = acc.color || bankInfo.primaryColor

          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => onSelectAccount(acc.id)}
              data-active={isSelected}
              className={`flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 text-left min-h-[44px] cursor-pointer ${
                isSelected
                  ? 'bg-primary/15 border-primary/40 text-foreground shadow-lg shadow-primary/10'
                  : 'glass-card border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/40'
              }`}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold flex-shrink-0 border border-border"
                style={{
                  backgroundColor: badgeBg,
                  color: badgeColor
                }}
              >
                <span>{bankInfo.initials}</span>
              </div>
              <div className="min-w-0 pr-1">
                <span className="block text-xs font-medium truncate max-w-[130px]">
                  {acc.name}
                </span>
                <span
                  className={`block text-[11px] font-semibold tabular-nums ${
                    acc.balance >= 0 ? 'text-foreground' : 'text-rose-400'
                  }`}
                >
                  {formatBRL(acc.balance)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
