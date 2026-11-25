import { useEffect, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Coffee, ExternalLink, X } from 'lucide-react'

export interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
  enablePix?: boolean
}

const PIX_PRESETS = [5, 10, 25, 50, 100] as const
const DEFAULT_LIVEPIX_USERNAME = 'leozizz'
const BLOCKED_AMOUNT_KEYS = new Set(['.', ',', '-', '+', 'e', 'E'])

/**
 * Monta a URL dinâmica de apoio no LivePix para valores inteiros em reais.
 */
export const buildLivePixUrl = (
  amount: number,
  message?: string,
  username?: string
): string => {
  const envUsername =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_LIVEPIX_USERNAME
      ? String(import.meta.env.VITE_LIVEPIX_USERNAME)
      : ''
  const resolvedUsername = (username ?? envUsername).trim() || DEFAULT_LIVEPIX_USERNAME
  const baseUrl = `https://livepix.gg/${encodeURIComponent(resolvedUsername)}?amount=${amount}`
  const trimmedMessage = (message ?? '').trim()

  if (!trimmedMessage) {
    return baseUrl
  }

  return `${baseUrl}&message=${encodeURIComponent(trimmedMessage)}`
}

export const SupportModal = ({
  isOpen,
  onClose,
  enablePix = true
}: SupportModalProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(10)
  const [customAmount, setCustomAmount] = useState<string>('10')
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!isOpen) {
      setError('')
      return
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const handleSelectPreset = (amount: number): void => {
    setSelectedAmount(amount)
    setCustomAmount(String(amount))
    setError('')
  }

  const handleAmountKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (BLOCKED_AMOUNT_KEYS.has(event.key)) {
      event.preventDefault()
    }
  }

  const handleCustomAmountChange = (raw: string): void => {
    const digitsOnly = raw.replace(/\D+/g, '')
    setCustomAmount(digitsOnly)

    if (!digitsOnly) {
      setSelectedAmount(0)
    } else {
      const parsed = Number.parseInt(digitsOnly, 10)
      setSelectedAmount(Number.isFinite(parsed) ? parsed : 0)
    }
    setError('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (!Number.isInteger(selectedAmount) || selectedAmount < 1) {
      setError('Informe um valor inteiro mínimo de R$ 1.')
      return
    }

    const targetUrl = buildLivePixUrl(selectedAmount, message)
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/75 backdrop-blur-md"
      data-testid="support-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="w-full max-w-[440px] max-h-[calc(100dvh-2rem)] bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
        data-testid="support-modal"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center text-primary shrink-0" aria-hidden="true">
              <Coffee className="w-5 h-5" />
            </span>
            <h2
              id="support-modal-title"
              className="font-display text-base font-bold leading-tight text-foreground truncate"
            >
              Apoiar o Dinheirizz
            </h2>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="support-modal-close"
            onClick={onClose}
            aria-label="Fechar janela de apoio"
          >
            <X className="w-[18px] h-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            O Dinheirizz está ajudando a organizar suas finanças? Pague um café para o desenvolvedor e ajude a manter a plataforma no ar!
          </p>

          <div
            className="p-3.5 rounded-xl bg-muted/60 border border-border flex flex-col gap-2"
            data-testid="support-why-card"
          >
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span className="text-[13px] font-semibold text-foreground leading-tight">
                Por que apoiar?
              </span>
            </div>
            <ul className="pl-4 list-disc flex flex-col gap-1.5 text-[13px] leading-relaxed text-muted-foreground">
              <li>Mantém o gerenciador financeiro gratuito, sem anúncios, sem paywalls e sem venda de dados.</li>
              <li>Ajuda a custear a hospedagem Edge e o desenvolvimento contínuo de novos recursos.</li>
            </ul>
          </div>

          {enablePix && (
            <form
              className="flex flex-col gap-3.5"
              data-testid="support-pix-section"
              data-clarity-mask="true"
              onSubmit={handleSubmit}
              noValidate
            >
              {error && (
                <div
                  className="px-3 py-2 rounded-lg bg-destructive/15 border border-destructive/40 text-destructive text-[13px] font-medium leading-snug"
                  role="alert"
                  data-testid="support-pix-error"
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-muted-foreground">
                  Escolha um valor
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {PIX_PRESETS.map((amount) => {
                    const isActive = selectedAmount === amount
                    return (
                      <button
                        key={amount}
                        type="button"
                        data-testid={`support-pix-preset-${amount}`}
                        aria-pressed={isActive}
                        onClick={() => handleSelectPreset(amount)}
                        className={`min-h-[44px] px-2 py-2 rounded-xl border text-[13px] font-semibold font-tabular whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isActive
                            ? 'bg-primary/15 border-primary text-primary'
                            : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                        }`}
                      >
                        R$ {amount}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="support-pix-amount" className="text-[13px] font-semibold text-muted-foreground">
                  Outro valor inteiro (R$)
                </label>
                <div className="relative flex items-center">
                  <span
                    className="absolute left-3 text-sm font-semibold text-muted-foreground pointer-events-none"
                    aria-hidden="true"
                  >
                    R$
                  </span>
                  <input
                    id="support-pix-amount"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={customAmount}
                    onKeyDown={handleAmountKeyDown}
                    onChange={(event) => handleCustomAmountChange(event.target.value)}
                    placeholder="10"
                    data-testid="support-pix-amount-input"
                    className="w-full min-w-0 min-h-[44px] pl-10 pr-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-base sm:text-sm font-tabular placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="support-pix-message" className="text-[13px] font-semibold text-muted-foreground">
                  Mensagem de incentivo (opcional)
                </label>
                <textarea
                  id="support-pix-message"
                  rows={2}
                  maxLength={200}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Deixe uma mensagem para o mantenedor..."
                  data-testid="support-pix-message-input"
                  className="w-full min-w-0 min-h-[68px] px-3 py-2.5 rounded-xl border border-border bg-input text-foreground text-base sm:text-sm leading-relaxed resize-y placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="support-pix-submit-button"
              >
                <span>Apoiar via LivePix</span>
                <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
