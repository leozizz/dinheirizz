import React, { useState } from 'react'
import { BellRing, X, Sparkles } from 'lucide-react'
import { usePushNotifications } from '../../hooks/usePushNotifications'

const STORAGE_KEY = 'dinheirizz_push_banner_dismissed'

export const PushNotificationBanner: React.FC = () => {
  const { isSupported, permission, isSubscribing, subscribeToPush, updatePreferences, preferences } =
    usePushNotifications()

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch (_err) {
      return false
    }
  })

  if (!isSupported || permission !== 'default' || isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch (_err) {
      // Ignora erro de quota em private mode
    }
  }

  const handleEnable = async () => {
    const success = await subscribeToPush()
    if (success && preferences) {
      await updatePreferences({
        ...preferences,
        pushEnabled: true
      })
    }
  }

  return (
    <div
      data-testid="push-notification-banner"
      className="relative overflow-hidden p-3.5 sm:p-4 rounded-2xl bg-card/80 border border-primary/25 shadow-lg backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in"
    >
      <div className="flex items-start gap-3 min-w-0 pr-8 sm:pr-0">
        <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5 sm:mt-0">
          <BellRing className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
            <span>Evite juros e multas com alertas pró-ativos</span>
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          </h4>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Receba notificações direto no seu navegador antes do vencimento de contas e ao atingir o teto de gastos.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
        <button
          type="button"
          data-testid="btn-enable-push-banner"
          onClick={handleEnable}
          disabled={isSubscribing}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {isSubscribing ? (
            <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <span>Ativar Alertas</span>
          )}
        </button>

        <button
          type="button"
          data-testid="btn-dismiss-push-banner"
          onClick={handleDismiss}
          aria-label="Dispensar aviso de notificações"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
