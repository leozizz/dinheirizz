import React from 'react'
import { CheckCircle2, Circle, Landmark, Receipt, UploadCloud, Target, X, ArrowRight } from 'lucide-react'

export interface OnboardingChecklistProps {
  hasAccount: boolean
  onOpenAccountModal: () => void
  onOpenTransactionModal: () => void
  onOpenImportModal?: () => void
  onOpenBudgetModal?: () => void
  onDismiss: () => void
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  hasAccount,
  onOpenAccountModal,
  onOpenTransactionModal,
  onOpenImportModal,
  onOpenBudgetModal,
  onDismiss
}) => {
  return (
    <section
      data-testid="onboarding-checklist"
      aria-label="Primeiros passos no Dinheirizz"
      className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-semibold text-foreground font-display">
            Primeiros passos na sua conta
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure o essencial em menos de 2 minutos para acompanhar seu saldo e metas.
          </p>
        </div>
        <button
          type="button"
          data-testid="onboarding-dismiss-btn"
          aria-label="Dispensar checklist de primeiros passos"
          onClick={onDismiss}
          className="min-w-[44px] min-h-[44px] -mt-1 -mr-1 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {/* Passo 1: Conta */}
        <button
          type="button"
          data-testid="onboarding-step-account-btn"
          data-completed={hasAccount ? 'true' : 'false'}
          onClick={onOpenAccountModal}
          className="w-full min-h-[44px] p-3 rounded-2xl bg-card hover:bg-muted/50 border border-border flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              {hasAccount ? <CheckCircle2 className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                1. Adicionar ou configurar sua primeira conta
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {hasAccount
                  ? 'Conta inicial configurada. Clique para adicionar outra ou ajustar.'
                  : 'Cadastre sua conta corrente, carteira ou reserva.'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>

        {/* Passo 2: Primeiro Gasto ou Importação */}
        <div className="p-3 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground flex-shrink-0">
              <Circle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                2. Registrar primeiro gasto ou importar extrato
              </p>
              <p className="text-[11px] text-muted-foreground">
                Lance manualmente ou importe um arquivo CSV, OFX ou PDF.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
            <button
              type="button"
              data-testid="onboarding-step-transaction-btn"
              onClick={onOpenTransactionModal}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Registrar gasto</span>
            </button>
            {onOpenImportModal && (
              <button
                type="button"
                data-testid="onboarding-step-import-btn"
                onClick={onOpenImportModal}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-primary" />
                <span>Importar extrato</span>
              </button>
            )}
          </div>
        </div>

        {/* Passo 3: Orçamento */}
        {onOpenBudgetModal && (
          <button
            type="button"
            data-testid="onboarding-step-budget-btn"
            onClick={onOpenBudgetModal}
            className="w-full min-h-[44px] p-3 rounded-2xl bg-card hover:bg-muted/50 border border-border flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground flex-shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                  3. Definir um limite de orçamento mensal
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Acompanhe seus gastos por categoria com alertas visuais.
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        )}
      </div>
    </section>
  )
}
