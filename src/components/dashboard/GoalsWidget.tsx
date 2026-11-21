import React, { useState } from 'react'
import {
  PiggyBank,
  ShieldCheck,
  Laptop,
  Plane,
  Home,
  Car,
  GraduationCap,
  Plus,
  Pencil,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react'
import { formatBRL } from '../../lib/formatters'
import type { SavingsGoalItem, GoalsSummary } from '../../hooks/useGoals'
import type { FinancialProfile } from '../../hooks/useWorkspaces'

export interface GoalsWidgetProps {
  goals: SavingsGoalItem[]
  summary: GoalsSummary
  profiles?: FinancialProfile[]
  selectedProfileId?: string
  isLoading?: boolean
  onOpenCreateGoal: () => void
  onOpenEditGoal: (goal: SavingsGoalItem) => void
  onContributeGoal: (goalId: string, amount: number) => Promise<void> | void
  contributingGoalId?: string | null
}

const CONTRIBUTE_PRESETS = [50, 100, 500] as const

const renderGoalIcon = (iconName?: string | null) => {
  const cls = 'w-4 h-4'
  switch (iconName) {
    case 'shield-check':
      return <ShieldCheck className={cls} />
    case 'laptop':
      return <Laptop className={cls} />
    case 'plane':
      return <Plane className={cls} />
    case 'home':
      return <Home className={cls} />
    case 'car':
      return <Car className={cls} />
    case 'graduation-cap':
      return <GraduationCap className={cls} />
    default:
      return <PiggyBank className={cls} />
  }
}

const formatDeadlineShort = (iso?: string | null): string | null => {
  if (!iso) return null
  const date = new Date(iso)
  if (isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export const GoalsWidget: React.FC<GoalsWidgetProps> = ({
  goals,
  summary,
  profiles = [],
  selectedProfileId = 'all',
  isLoading = false,
  onOpenCreateGoal,
  onOpenEditGoal,
  onContributeGoal,
  contributingGoalId = null
}) => {
  const [activeContributeId, setActiveContributeId] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')

  const profileMap = new Map(profiles.map((p) => [p.id, p.name]))

  if (isLoading) {
    return (
      <div
        data-testid="widget-goals-loading"
        className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border space-y-4 animate-pulse"
      >
        <div className="h-6 w-48 bg-muted rounded-xl" />
        <div className="space-y-3">
          <div className="h-20 bg-muted/50 rounded-2xl" />
          <div className="h-20 bg-muted/50 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div
        data-testid="widget-goals-empty"
        className="glass-card p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border space-y-4 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
          <PiggyBank className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
            Nenhuma caixinha criada
          </h3>
          <p className="text-xs text-muted-foreground">
            Defina metas de economia com prazo para acompanhar quanto guardar por mês e acelerar seus objetivos.
          </p>
        </div>
        <button
          type="button"
          data-testid="goals-new-btn"
          onClick={onOpenCreateGoal}
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Meta
        </button>
      </div>
    )
  }

  const handleCustomSubmit = async (e: React.FormEvent, goalId: string) => {
    e.preventDefault()
    const parsed = parseFloat(customAmount.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) return
    await onContributeGoal(goalId, parsed)
    setCustomAmount('')
    setActiveContributeId(null)
  }

  return (
    <div
      data-testid="widget-goals"
      className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary flex-shrink-0">
            <PiggyBank className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Caixinhas &amp; Metas</h3>
            <p className="text-xs text-muted-foreground font-tabular">
              <span data-testid="goals-total-saved" className="font-semibold text-foreground">
                {formatBRL(summary.totalSaved)}
              </span>{' '}
              de {formatBRL(summary.totalTarget)} acumulados
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="goals-new-btn"
          onClick={onOpenCreateGoal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>Nova Meta</span>
        </button>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => {
          const isContributeOpen = activeContributeId === goal.id
          const isBusy = contributingGoalId === goal.id
          const profileLabel =
            selectedProfileId === 'all' && goal.profileId
              ? profileMap.get(goal.profileId)
              : null
          const deadlineLabel = formatDeadlineShort(goal.deadline)

          return (
            <div
              key={goal.id}
              data-testid={`goal-item-${goal.id}`}
              className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-3"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    {renderGoalIcon(goal.icon)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {goal.name}
                      </span>
                      {profileLabel && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          {profileLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-tabular">
                      {formatBRL(goal.currentAmount)} / {formatBRL(goal.targetAmount)}
                      {deadlineLabel ? ` · ${deadlineLabel}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    data-testid={`goal-edit-btn-${goal.id}`}
                    aria-label={`Editar meta ${goal.name}`}
                    onClick={() => onOpenEditGoal(goal)}
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid={`goal-quick-contribute-btn-${goal.id}`}
                    onClick={() =>
                      setActiveContributeId(isContributeOpen ? null : goal.id)
                    }
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Aportar</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden border border-border">
                  <div
                    role="progressbar"
                    data-testid={`goal-progress-${goal.id}`}
                    aria-label={`Progresso da meta ${goal.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(goal.progressPercentage)}
                    className={`h-full rounded-full transition-all duration-500 ${
                      goal.isCompleted ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, goal.progressPercentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    data-testid={`goal-monthly-pace-${goal.id}`}
                    className="text-muted-foreground flex items-center gap-1 font-tabular"
                  >
                    {goal.isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-medium">Meta atingida</span>
                      </>
                    ) : goal.monthlyRequiredAmount !== null ? (
                      <span>Guardar {formatBRL(goal.monthlyRequiredAmount)}/mês</span>
                    ) : (
                      <span>Defina um prazo para calcular o ritmo</span>
                    )}
                  </span>

                  <span className="font-semibold font-tabular text-foreground">
                    {goal.progressPercentage}%
                  </span>
                </div>
              </div>

              {isContributeOpen && (
                <div className="pt-2 border-t border-border flex flex-wrap items-center gap-2">
                  {CONTRIBUTE_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      data-testid={`goal-contribute-preset-${amount}-${goal.id}`}
                      disabled={isBusy}
                      onClick={async () => {
                        await onContributeGoal(goal.id, amount)
                        setActiveContributeId(null)
                      }}
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-muted hover:bg-primary/20 border border-border text-xs font-semibold text-foreground font-tabular transition-colors cursor-pointer disabled:opacity-50"
                    >
                      +{formatBRL(amount)}
                    </button>
                  ))}

                  <form
                    onSubmit={(e) => handleCustomSubmit(e, goal.id)}
                    className="flex items-center gap-1.5 flex-1 min-w-[150px]"
                  >
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Outro valor"
                      aria-label={`Valor personalizado para ${goal.name}`}
                      className="w-full min-h-[44px] px-2.5 py-1.5 rounded-xl bg-input/40 border border-border text-xs text-foreground font-tabular focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                    >
                      Ok
                    </button>
                  </form>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
