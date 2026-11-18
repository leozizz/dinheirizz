import React, { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

const SW_UPDATE_INTERVAL_MS = 60 * 60 * 1000

/**
 * Exibe um banner não intrusivo quando uma nova versão do Service Worker
 * entra em estado waiting (`needRefresh`), permitindo atualização controlada.
 */
export const PwaUpdatePrompt: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false)
  const intervalRef = useRef<number | null>(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW: (_swUrl, registration) => {
      if (!registration) {
        return
      }

      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
      }

      intervalRef.current = window.setInterval(() => {
        void registration.update().catch(() => undefined)
      }, SW_UPDATE_INTERVAL_MS)
    },
    onRegisterError: () => {
      // Falha de registro em ambientes sem suporte a SW não deve interromper a UI
    }
  })

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  if (!needRefresh) {
    return null
  }

  const handleConfirmUpdate = async (): Promise<void> => {
    setIsUpdating(true)
    try {
      await updateServiceWorker(true)
    } catch {
      setIsUpdating(false)
    }
  }

  const handleDismiss = (): void => {
    setNeedRefresh(false)
  }

  return (
    <div
      data-testid="pwa-update-banner"
      role="status"
      aria-live="polite"
      className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 rounded-2xl border border-border bg-popover/95 backdrop-blur-xl p-4 text-popover-foreground shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-foreground">
            Nova versão disponível
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Atualize o Dinheirizz para aplicar as melhorias mais recentes.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="pwa-update-confirm-btn"
              onClick={() => void handleConfirmUpdate()}
              disabled={isUpdating}
              aria-label="Atualizar agora para a nova versão do Dinheirizz"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdating ? 'Atualizando...' : 'Atualizar agora'}
            </button>
            <button
              type="button"
              data-testid="pwa-update-dismiss-btn"
              onClick={handleDismiss}
              disabled={isUpdating}
              aria-label="Atualizar depois"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              Depois
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
