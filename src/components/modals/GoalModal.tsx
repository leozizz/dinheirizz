import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, PiggyBank, Trash2, AlertCircle } from 'lucide-react'
import { goalFormSchema, type GoalFormData } from '../../schemas/goals'
import type { SavingsGoalItem } from '../../hooks/useGoals'
import type { FinancialProfile } from '../../hooks/useWorkspaces'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/Select'
import { DatePicker } from '../ui/DatePicker'

export interface GoalModalProps {
  isOpen: boolean
  onClose: () => void
  goal?: SavingsGoalItem | null
  profiles: FinancialProfile[]
  defaultProfileId?: string
  onSubmit: (data: GoalFormData, goalId?: string) => Promise<void>
  onDelete?: (goalId: string) => Promise<void>
  isLoading?: boolean
}

const GOAL_ICONS = [
  { value: 'piggy-bank', label: 'Cofrinho' },
  { value: 'shield-check', label: 'Reserva / Segurança' },
  { value: 'laptop', label: 'Equipamento / Trabalho' },
  { value: 'plane', label: 'Viagem' },
  { value: 'home', label: 'Casa / Imóvel' },
  { value: 'car', label: 'Veículo' },
  { value: 'graduation-cap', label: 'Educação' }
] as const

const toDateInputValue = (iso?: string | null): string => {
  if (!iso) return ''
  const datePart = iso.split('T')[0]
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : ''
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  goal,
  profiles,
  defaultProfileId,
  onSubmit,
  onDelete,
  isLoading = false
}) => {
  const isEditing = Boolean(goal)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: '',
      targetAmount: 1000,
      currentAmount: 0,
      deadline: null,
      profileId: null,
      icon: 'piggy-bank',
      color: '#7bc816'
    }
  })

  useEffect(() => {
    if (!isOpen) return

    if (goal) {
      reset({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: toDateInputValue(goal.deadline) || null,
        profileId: goal.profileId || null,
        icon: goal.icon || 'piggy-bank',
        color: goal.color || '#7bc816'
      })
    } else {
      const initialProfile =
        defaultProfileId && defaultProfileId !== 'all'
          ? defaultProfileId
          : (profiles[0]?.id ?? null)
      reset({
        name: '',
        targetAmount: undefined as unknown as number,
        currentAmount: 0,
        deadline: null,
        profileId: initialProfile,
        icon: 'piggy-bank',
        color: '#7bc816'
      })
    }
  }, [isOpen, goal, defaultProfileId, profiles, reset])

  const handleFormSubmit = async (data: GoalFormData) => {
    await onSubmit(data, goal?.id)
    onClose()
  }

  const handleDelete = async () => {
    if (!goal || !onDelete) return
    await onDelete(goal.id)
    onClose()
  }

  const busy = isLoading || isSubmitting

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-modal-title"
            data-testid="goal-modal"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg glass-card p-5 sm:p-8 rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl bg-card text-foreground max-h-[88dvh] overflow-y-auto pb-8 sm:pb-9 my-auto"
          >
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-primary/15 border-primary/30 text-primary">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="goal-modal-title"
                    className="text-base sm:text-lg font-bold text-foreground font-display"
                  >
                    {isEditing ? 'Editar Meta' : 'Nova Meta de Economia'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Acompanhe seu objetivo e o ritmo mensal necessário
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="goal-close-btn"
                aria-label="Fechar modal"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="goal-name-input"
                  className="block text-xs font-semibold text-foreground mb-1.5"
                >
                  Nome da Meta
                </label>
                <input
                  id="goal-name-input"
                  type="text"
                  data-testid="goal-name-input"
                  placeholder="Ex: Reserva de Emergência"
                  {...register('name')}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-input/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="goal-target-input"
                    className="block text-xs font-semibold text-foreground mb-1.5"
                  >
                    Valor Alvo (R$)
                  </label>
                  <input
                    id="goal-target-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    data-testid="goal-target-input"
                    placeholder="15000.00"
                    {...register('targetAmount', { valueAsNumber: true })}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-input/40 border border-border text-sm text-foreground font-tabular placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {errors.targetAmount && (
                    <p className="mt-1 text-xs text-rose-400">{errors.targetAmount.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="goal-current-input"
                    className="block text-xs font-semibold text-foreground mb-1.5"
                  >
                    Valor Guardado (R$)
                  </label>
                  <input
                    id="goal-current-input"
                    type="number"
                    step="0.01"
                    min="0"
                    data-testid="goal-current-input"
                    placeholder="0.00"
                    {...register('currentAmount', { valueAsNumber: true })}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-input/40 border border-border text-sm text-foreground font-tabular placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {errors.currentAmount && (
                    <p className="mt-1 text-xs text-rose-400">{errors.currentAmount.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="goal-deadline-input"
                    className="block text-xs font-semibold text-foreground mb-1.5"
                  >
                    Prazo (opcional)
                  </label>
                  <Controller
                    name="deadline"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        id="goal-deadline-input"
                        dataTestId="goal-deadline-input"
                        ariaLabel="Prazo da meta"
                        value={toDateInputValue(field.value)}
                        onChange={(val) => field.onChange(val || null)}
                        placeholder="Sem prazo definido"
                        presets={[]}
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Perfil Financeiro
                  </label>
                  <Controller
                    name="profileId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || 'none'}
                        onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                      >
                        <SelectTrigger
                          data-testid="goal-profile-select"
                          aria-label="Perfil financeiro da meta"
                        >
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geral (Todos)</SelectItem>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Ícone
                </label>
                <Controller
                  name="icon"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || 'piggy-bank'}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        data-testid="goal-icon-select"
                        aria-label="Ícone da meta"
                      >
                        <SelectValue placeholder="Escolha um ícone" />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_ICONS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-border">
                {isEditing && onDelete ? (
                  <button
                    type="button"
                    data-testid="goal-delete-btn"
                    disabled={busy}
                    onClick={handleDelete}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    data-testid="goal-cancel-btn"
                    onClick={onClose}
                    className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl bg-muted/50 hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    data-testid="goal-submit-btn"
                    disabled={busy}
                    className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busy ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Meta'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
