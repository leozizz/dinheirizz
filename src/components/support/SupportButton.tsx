import { useEffect, useState } from 'react'
import { Coffee } from 'lucide-react'
import { SupportModal } from './SupportModal'

export interface SupportButtonProps {
  enablePix?: boolean
}

export const SupportButton = ({ enablePix = true }: SupportButtonProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  useEffect(() => {
    const handleOpenSupport = (): void => {
      if (enablePix) {
        setIsOpen(true)
      }
    }

    window.addEventListener('dinheirizz:open-support', handleOpenSupport)
    return () => {
      window.removeEventListener('dinheirizz:open-support', handleOpenSupport)
    }
  }, [enablePix])

  if (!enablePix) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-testid="support-floating-button"
        aria-label="Apoiar o projeto Dinheirizz"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="fixed right-[max(1rem,env(safe-area-inset-right,1rem))] sm:right-[max(1.25rem,env(safe-area-inset-right,1.25rem))] bottom-[max(1rem,env(safe-area-inset-bottom,1rem))] sm:bottom-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] z-40 inline-flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-full bg-card/90 backdrop-blur-xl text-foreground border border-border shadow-lg hover:bg-muted/90 hover:-translate-y-0.5 active:translate-y-0 transition-all text-[13px] font-semibold leading-none tracking-tight whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="inline-flex items-center justify-center text-primary shrink-0" aria-hidden="true">
          <Coffee className="w-[18px] h-[18px]" />
        </span>
        <span>Apoiar com Pix</span>
      </button>

      <SupportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        enablePix={enablePix}
      />
    </>
  )
}
