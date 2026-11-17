import React from 'react'
import { Loader2 } from 'lucide-react'

export interface ModalSuspenseFallbackProps {
  message?: string
  className?: string
}

export const ModalSuspenseFallback: React.FC<ModalSuspenseFallbackProps> = ({
  message = 'Carregando...',
  className = ''
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="modal-loading-fallback"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-opacity duration-200 ${className}`.trim()}
    >
      <div className="flex flex-col items-center gap-3.5 px-6 py-5 rounded-2xl bg-card border border-border/80 shadow-2xl max-w-xs w-full text-center">
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground tracking-tight">
          {message}
        </p>
        <span className="sr-only">Aguarde, carregando conteúdo</span>
      </div>
    </div>
  )
}
