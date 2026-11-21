import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../contexts/AuthContext'
import { goalFormSchema, workspaceFormSchema, contributeGoalSchema } from '../schemas/goals'
import { calculateGoalMetricsClient, useGoals, type SavingsGoalItem } from '../hooks/useGoals'
import { DEMO_PROFILES } from '../hooks/useWorkspaces'
import { ProfileSelector } from '../components/layout/ProfileSelector'
import { GoalsWidget } from '../components/dashboard/GoalsWidget'
import { GoalModal } from '../components/modals/GoalModal'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const mockGoals: SavingsGoalItem[] = [
  {
    id: 'goal-1',
    userId: 'user-1',
    profileId: 'demo-profile-personal',
    name: 'Reserva de Emergência',
    targetAmount: 15000,
    currentAmount: 6000,
    remainingAmount: 9000,
    progressPercentage: 40,
    deadline: '2027-08-21T00:00:00.000Z',
    monthsRemaining: 9,
    monthlyRequiredAmount: 1000,
    isCompleted: false,
    icon: 'shield-check',
    color: '#7bc816',
    createdAt: '2026-11-21T09:00:00.000Z'
  },
  {
    id: 'goal-2',
    userId: 'user-1',
    profileId: 'demo-profile-business',
    name: 'MacBook Pro PJ',
    targetAmount: 12000,
    currentAmount: 12000,
    remainingAmount: 0,
    progressPercentage: 100,
    deadline: null,
    monthsRemaining: null,
    monthlyRequiredAmount: 0,
    isCompleted: true,
    icon: 'laptop',
    color: '#3b82f6',
    createdAt: '2026-11-21T09:00:00.000Z'
  }
]

describe('Issue #82 — Múltiplos Perfis Financeiros e Metas de Economia (Frontend)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Schemas Zod & Cálculo de Ritmo Mensal', () => {
    it('deve validar workspaceFormSchema e goalFormSchema corretamente', () => {
      expect(workspaceFormSchema.safeParse({ name: 'Empresa / PJ', type: 'business' }).success).toBe(true)
      expect(workspaceFormSchema.safeParse({ name: '' }).success).toBe(false)

      expect(
        goalFormSchema.safeParse({
          name: 'Reserva',
          targetAmount: 10000,
          currentAmount: 500
        }).success
      ).toBe(true)
      expect(
        goalFormSchema.safeParse({
          name: 'Reserva',
          targetAmount: -100
        }).success
      ).toBe(false)

      expect(contributeGoalSchema.safeParse({ amount: 100 }).success).toBe(true)
      expect(contributeGoalSchema.safeParse({ amount: 0 }).success).toBe(false)
    })

    it('deve calcular métricas de ritmo mensal no cliente de forma determinística', () => {
      const ref = new Date('2026-01-01T00:00:00.000Z')
      const deadline = '2026-05-01T00:00:00.000Z' // ~4 meses
      const metrics = calculateGoalMetricsClient({
        targetAmount: 2000,
        currentAmount: 800,
        deadline,
        referenceDate: ref
      })

      expect(metrics.remainingAmount).toBe(1200)
      expect(metrics.progressPercentage).toBe(40)
      expect(metrics.isCompleted).toBe(false)
      expect(metrics.monthsRemaining).toBe(4)
      expect(metrics.monthlyRequiredAmount).toBe(300)

      const completed = calculateGoalMetricsClient({
        targetAmount: 1000,
        currentAmount: 1200,
        deadline: null
      })
      expect(completed.isCompleted).toBe(true)
      expect(completed.progressPercentage).toBe(100)
      expect(completed.monthlyRequiredAmount).toBe(0)
    })
  })

  describe('ProfileSelector', () => {
    it('deve renderizar opções Todos, Pessoal e PJ e permitir alternância e criação rápida', async () => {
      const onSelectProfile = vi.fn()
      const onCreateProfile = vi.fn().mockResolvedValue({
        id: 'new-prof-1',
        userId: 'demo-user',
        name: 'Holdings',
        type: 'business',
        currency: 'BRL',
        isDefault: false,
        createdAt: new Date().toISOString()
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <ProfileSelector
            profiles={DEMO_PROFILES}
            selectedProfileId="all"
            onSelectProfile={onSelectProfile}
            onCreateProfile={onCreateProfile}
          />
        </Wrapper>
      )

      const trigger = screen.getByTestId('header-profile-selector')
      expect(trigger).toHaveTextContent('Todos')
      fireEvent.click(trigger)

      const optionAll = await screen.findByTestId('profile-option-all')
      const optionPersonal = screen.getByTestId('profile-option-demo-profile-personal')
      const optionBusiness = screen.getByTestId('profile-option-demo-profile-business')

      expect(optionAll).toBeInTheDocument()
      expect(optionPersonal).toHaveTextContent('Pessoal')
      expect(optionBusiness).toHaveTextContent('Empresa / PJ')

      fireEvent.click(optionBusiness)
      expect(onSelectProfile).toHaveBeenCalledWith('demo-profile-business')

      // Reabre e cria novo perfil
      fireEvent.click(trigger)
      const createBtn = await screen.findByTestId('profile-create-btn')
      fireEvent.click(createBtn)

      const nameInput = screen.getByTestId('profile-create-name-input')
      fireEvent.change(nameInput, { target: { value: 'Holdings' } })
      fireEvent.click(screen.getByTestId('profile-create-submit-btn'))

      await waitFor(() => {
        expect(onCreateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Holdings' })
        )
      })
    })
  })

  describe('GoalsWidget', () => {
    it('deve renderizar estado vazio elegante com CTA', () => {
      const onOpenCreateGoal = vi.fn()
      render(
        <GoalsWidget
          goals={[]}
          summary={{ totalSaved: 0, totalTarget: 0, activeCount: 0, completedCount: 0 }}
          onOpenCreateGoal={onOpenCreateGoal}
          onOpenEditGoal={vi.fn()}
          onContributeGoal={vi.fn()}
        />
      )

      expect(screen.getByTestId('widget-goals-empty')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('goals-new-btn'))
      expect(onOpenCreateGoal).toHaveBeenCalledTimes(1)
    })

    it('deve renderizar metas, barra de progresso acessível, ritmo mensal e aporte rápido', async () => {
      const onContributeGoal = vi.fn().mockResolvedValue(undefined)
      const onOpenEditGoal = vi.fn()

      render(
        <GoalsWidget
          goals={mockGoals}
          summary={{ totalSaved: 18000, totalTarget: 27000, activeCount: 1, completedCount: 1 }}
          profiles={DEMO_PROFILES}
          selectedProfileId="all"
          onOpenCreateGoal={vi.fn()}
          onOpenEditGoal={onOpenEditGoal}
          onContributeGoal={onContributeGoal}
        />
      )

      expect(screen.getByTestId('widget-goals')).toBeInTheDocument()
      expect(screen.getByTestId('goals-total-saved')).toHaveTextContent('18.000,00')

      const progress1 = screen.getByTestId('goal-progress-goal-1')
      expect(progress1).toHaveAttribute('role', 'progressbar')
      expect(progress1).toHaveAttribute('aria-valuenow', '40')

      expect(screen.getByTestId('goal-monthly-pace-goal-1')).toHaveTextContent('1.000,00/mês')
      expect(screen.getByTestId('goal-monthly-pace-goal-2')).toHaveTextContent('Meta atingida')

      // Aporte rápido com 1 clique no preset +R$ 100
      fireEvent.click(screen.getByTestId('goal-quick-contribute-btn-goal-1'))
      fireEvent.click(screen.getByTestId('goal-contribute-preset-100-goal-1'))

      await waitFor(() => {
        expect(onContributeGoal).toHaveBeenCalledWith('goal-1', 100)
      })

      fireEvent.click(screen.getByTestId('goal-edit-btn-goal-1'))
      expect(onOpenEditGoal).toHaveBeenCalledWith(mockGoals[0])
    })
  })

  describe('GoalModal', () => {
    it('deve permitir criar e excluir meta com validação Zod', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const onDelete = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()

      const { rerender } = render(
        <GoalModal
          isOpen={true}
          onClose={onClose}
          profiles={DEMO_PROFILES}
          defaultProfileId="demo-profile-personal"
          onSubmit={onSubmit}
        />
      )

      expect(screen.getByTestId('goal-modal')).toBeInTheDocument()
      fireEvent.change(screen.getByTestId('goal-name-input'), {
        target: { value: 'Fundo de Reserva' }
      })
      fireEvent.change(screen.getByTestId('goal-target-input'), {
        target: { value: '20000' }
      })
      fireEvent.change(screen.getByTestId('goal-current-input'), {
        target: { value: '2500' }
      })

      fireEvent.click(screen.getByTestId('goal-submit-btn'))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Fundo de Reserva',
            targetAmount: 20000,
            currentAmount: 2500
          }),
          undefined
        )
      })

      // Modo edição exibe botão excluir
      rerender(
        <GoalModal
          isOpen={true}
          onClose={onClose}
          goal={mockGoals[0]}
          profiles={DEMO_PROFILES}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      )

      expect(screen.getByTestId('goal-cancel-btn')).toBeInTheDocument()
      expect(screen.getByTestId('goal-close-btn')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('goal-delete-btn'))
      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith('goal-1')
      })
    })
  })

  describe('useGoals (Modo Demo)', () => {
    it('deve realizar aporte e atualização de meta no modo demo sem lançar erro de meta não encontrada', async () => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false } }
        })
        return (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
          </QueryClientProvider>
        )
      }

      const { result } = renderHook(() => useGoals('all'), { wrapper: Wrapper })

      const initialEmergency = result.current.goals.find((g) => g.id === 'demo-goal-emergency')
      expect(initialEmergency).toBeDefined()
      const initialAmount = initialEmergency!.currentAmount

      await act(async () => {
        const updated = await result.current.contributeGoal({
          id: 'demo-goal-emergency',
          amount: 100
        })
        expect(updated.currentAmount).toBe(initialAmount + 100)
      })

      await waitFor(() => {
        const afterContribute = result.current.goals.find((g) => g.id === 'demo-goal-emergency')
        expect(afterContribute?.currentAmount).toBe(initialAmount + 100)
      })

      await act(async () => {
        const renamed = await result.current.updateGoal({
          id: 'demo-goal-emergency',
          data: { name: 'Reserva Atualizada' }
        })
        expect(renamed.name).toBe('Reserva Atualizada')
      })
    })
  })
})
