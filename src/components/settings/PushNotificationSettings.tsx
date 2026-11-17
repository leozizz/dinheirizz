import React, { useState } from 'react'
import {
  BellRing,
  BellOff,
  Send,
  AlertCircle,
  CheckCircle2,
  Calendar,
  PieChart,
  CreditCard,
  Smartphone
} from 'lucide-react'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import type { NotificationPreferences } from '../../schemas/push'

export const PushNotificationSettings: React.FC = () => {
  const {
    preferences,
    isSupported,
    permission,
    isLoading,
    isSubscribing,
    isUpdatingPreferences,
    isSendingTest,
    hasActiveSubscription,
    subscribeToPush,
    updatePreferences,
    sendTestNotification
  } = usePushNotifications()

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const currentPrefs: NotificationPreferences = preferences || {
    pushEnabled: true,
    billsDueAlerts: true,
    billsDueDaysBefore: 1,
    budgetLimitAlerts: true,
    budgetThresholdPercent: 85,
    invoiceDueAlerts: true
  }

  const handleMasterToggle = async () => {
    if (!isSupported) return

    setFeedback(null)
    if (!currentPrefs.pushEnabled) {
      if (permission !== 'granted') {
        const subscribed = await subscribeToPush()
        if (subscribed) {
          await updatePreferences({
            ...currentPrefs,
            pushEnabled: true
          })
          setFeedback({ type: 'success', message: 'Notificações ativadas com sucesso!' })
        } else {
          setFeedback({
            type: 'error',
            message: 'Permissão necessária para ativar notificações push.'
          })
        }
      } else {
        await updatePreferences({
          ...currentPrefs,
          pushEnabled: true
        })
        setFeedback({ type: 'success', message: 'Notificações ativadas com sucesso!' })
      }
    } else {
      await updatePreferences({
        ...currentPrefs,
        pushEnabled: false
      })
      setFeedback({ type: 'success', message: 'Alertas push pausados.' })
    }
  }

  const handleToggleOption = async (
    field: 'billsDueAlerts' | 'budgetLimitAlerts' | 'invoiceDueAlerts',
    value: boolean
  ) => {
    setFeedback(null)
    await updatePreferences({
      ...currentPrefs,
      [field]: value
    })
  }

  const handleChangeBillsDays = async (days: 0 | 1 | 3) => {
    setFeedback(null)
    await updatePreferences({
      ...currentPrefs,
      billsDueDaysBefore: days
    })
  }

  const handleChangeBudgetThreshold = async (threshold: 80 | 85 | 90 | 100) => {
    setFeedback(null)
    await updatePreferences({
      ...currentPrefs,
      budgetThresholdPercent: threshold
    })
  }

  const handleSendTest = async () => {
    setFeedback(null)
    const result = await sendTestNotification()
    if (result.success) {
      setFeedback({ type: 'success', message: result.message })
    } else {
      setFeedback({ type: 'error', message: result.message })
    }
  }

  const getStatusBadge = () => {
    if (!isSupported) {
      return (
        <span className="text-[10px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
          Não suportado
        </span>
      )
    }
    if (permission === 'denied') {
      return (
        <span className="text-[10px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
          Bloqueado
        </span>
      )
    }
    if (permission === 'granted' && currentPrefs.pushEnabled) {
      return (
        <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
          Ativo
        </span>
      )
    }
    return (
      <span className="text-[10px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">
        Desativado
      </span>
    )
  }

  return (
    <div
      data-testid="push-notifications-section"
      className="mt-6 pt-5 border-t border-border"
    >
      {/* Header da Seção */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              Notificações Pró-Ativas
              {getStatusBadge()}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Web Push para vencimentos de contas e limites de envelopes orçamentários.
            </p>
          </div>
        </div>

        {/* Master Switch */}
        {isSupported && permission !== 'denied' && (
          <button
            type="button"
            role="switch"
            aria-checked={currentPrefs.pushEnabled}
            data-testid="switch-push-master"
            onClick={handleMasterToggle}
            disabled={isLoading || isSubscribing || isUpdatingPreferences}
            className={`relative inline-flex min-h-[44px] min-w-[52px] items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
              currentPrefs.pushEnabled ? 'bg-primary' : 'bg-muted border border-border'
            }`}
            aria-label="Ativar ou desativar notificações pró-ativas"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-background shadow-md transition-transform ${
                currentPrefs.pushEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        )}
      </div>

      {/* Alerta de Navegador Não Suportado */}
      {!isSupported && (
        <div className="mb-4 p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-2.5">
          <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
          <span>Notificações push não suportadas neste navegador ou dispositivo.</span>
        </div>
      )}

      {/* Alerta de Permissão Bloqueada (Denied) */}
      {isSupported && permission === 'denied' && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-300">Permissão bloqueada no navegador</p>
            <p className="text-[11px] text-rose-400/90 mt-0.5">
              Desbloqueie as notificações nas configurações do seu navegador para receber alertas automáticos de contas e orçamentos.
            </p>
          </div>
        </div>
      )}

      {/* Feedback de Ação */}
      {feedback && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-primary/10 border border-primary/20 text-primary'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Preferências Granulares */}
      {isSupported && (
        <div className="space-y-3">
          {/* Alerta de Contas a Vencer */}
          <div className="p-3 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-xs font-medium text-foreground block">Contas a Vencer</span>
                <span className="text-[11px] text-muted-foreground block">
                  Avisos preventivos para boletos e despesas pendentes.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                id="select-bills-days-before"
                aria-label="Antecedência de alerta de contas a vencer"
                data-testid="select-bills-days-before"
                value={currentPrefs.billsDueDaysBefore}
                onChange={(e) => handleChangeBillsDays(Number(e.target.value) as 0 | 1 | 3)}
                disabled={!currentPrefs.pushEnabled || isUpdatingPreferences}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-input/40 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40 [&>option]:bg-card [&>option]:text-foreground"
              >
                <option value={0}>No dia do vencimento</option>
                <option value={1}>1 dia de antecedência</option>
                <option value={3}>3 dias de antecedência</option>
              </select>

              <button
                type="button"
                role="switch"
                aria-checked={currentPrefs.billsDueAlerts}
                data-testid="switch-bills-due-alert"
                onClick={() => handleToggleOption('billsDueAlerts', !currentPrefs.billsDueAlerts)}
                disabled={!currentPrefs.pushEnabled || isUpdatingPreferences}
                className={`relative inline-flex min-h-[44px] min-w-[48px] items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                  currentPrefs.billsDueAlerts && currentPrefs.pushEnabled
                    ? 'bg-primary'
                    : 'bg-muted border border-border'
                }`}
                aria-label="Ativar alerta de contas a vencer"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${
                    currentPrefs.billsDueAlerts && currentPrefs.pushEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Alerta de Envelopes de Orçamento */}
          <div className="p-3 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <PieChart className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-medium text-foreground block">Limites de Orçamento</span>
                <span className="text-[11px] text-muted-foreground block">
                  Avisos quando os gastos atingirem o teto definido.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                id="select-budget-threshold"
                aria-label="Percentual de disparo do alerta de orçamento"
                data-testid="select-budget-threshold"
                value={currentPrefs.budgetThresholdPercent}
                onChange={(e) =>
                  handleChangeBudgetThreshold(Number(e.target.value) as 80 | 85 | 90 | 100)
                }
                disabled={!currentPrefs.pushEnabled || isUpdatingPreferences}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-input/40 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40 [&>option]:bg-card [&>option]:text-foreground"
              >
                <option value={80}>Aos 80% do teto</option>
                <option value={85}>Aos 85% do teto</option>
                <option value={90}>Aos 90% do teto</option>
                <option value={100}>Ao estourar 100%</option>
              </select>

              <button
                type="button"
                role="switch"
                aria-checked={currentPrefs.budgetLimitAlerts}
                data-testid="switch-budget-limit-alert"
                onClick={() =>
                  handleToggleOption('budgetLimitAlerts', !currentPrefs.budgetLimitAlerts)
                }
                disabled={!currentPrefs.pushEnabled || isUpdatingPreferences}
                className={`relative inline-flex min-h-[44px] min-w-[48px] items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                  currentPrefs.budgetLimitAlerts && currentPrefs.pushEnabled
                    ? 'bg-primary'
                    : 'bg-muted border border-border'
                }`}
                aria-label="Ativar alerta de limite de orçamento"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${
                    currentPrefs.budgetLimitAlerts && currentPrefs.pushEnabled
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Alerta de Faturas de Cartão */}
          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <span className="text-xs font-medium text-foreground block">Faturas de Cartão de Crédito</span>
                <span className="text-[11px] text-muted-foreground block">
                  Alertas no fechamento e na proximidade do vencimento.
                </span>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={currentPrefs.invoiceDueAlerts}
              data-testid="switch-invoice-due-alert"
              onClick={() => handleToggleOption('invoiceDueAlerts', !currentPrefs.invoiceDueAlerts)}
              disabled={!currentPrefs.pushEnabled || isUpdatingPreferences}
              className={`relative inline-flex min-h-[44px] min-w-[48px] items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                currentPrefs.invoiceDueAlerts && currentPrefs.pushEnabled
                  ? 'bg-primary'
                  : 'bg-muted border border-border'
              }`}
              aria-label="Ativar alerta de faturas de cartão"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${
                  currentPrefs.invoiceDueAlerts && currentPrefs.pushEnabled
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Botão de Notificação de Teste */}
          <div className="pt-2">
            <button
              type="button"
              data-testid="btn-test-push-notification"
              onClick={handleSendTest}
              disabled={
                !currentPrefs.pushEnabled ||
                permission !== 'granted' ||
                isSendingTest ||
                isLoading
              }
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-muted/60 hover:bg-muted border border-border text-foreground font-medium text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSendingTest ? (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-primary" />
                  <span>Enviar Notificação de Teste</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
