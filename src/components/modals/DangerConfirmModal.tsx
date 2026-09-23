import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Trash2, ShieldAlert, Check } from 'lucide-react'

export interface DangerConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  expectedPhrase: string
  onConfirm: () => Promise<void> | void
  confirmButtonText?: string
  cascadeWarning?: string
}

export function DangerConfirmModal({
  isOpen,
  onClose,
  title,
  description,
  expectedPhrase,
  onConfirm,
  confirmButtonText = 'Entendo os riscos, apagar dados',
  cascadeWarning
}: DangerConfirmModalProps) {
  const [typedPhrase, setTypedPhrase] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTypedPhrase('')
      setIsPending(false)
      setErrorMessage(null)
      setCopied(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const isMatch = typedPhrase.trim().toLowerCase() === expectedPhrase.trim().toLowerCase()

  const handleCopy = () => {
    navigator.clipboard?.writeText(expectedPhrase)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isMatch || isPending) return

    setErrorMessage(null)
    setIsPending(true)

    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setIsPending(false)
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Ocorreu um erro ao realizar a exclusão.')
      }
    }
  }

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="danger-confirm-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-neutral-900/95 border border-rose-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-rose-950/40 text-white my-auto pb-8 sm:pb-9"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Ação Destrutiva Irreversível
                </span>
                <h3 id="danger-confirm-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                  {title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              aria-label="Fechar"
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description & Cascade Alert */}
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-4">
            {description}
          </p>

          {cascadeWarning && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-snug">{cascadeWarning}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <label
                htmlFor="danger-confirm-phrase-input"
                className="block text-xs font-medium text-neutral-300 mb-2"
              >
                Para confirmar a exclusão, digite exatamente:{' '}
                <span
                  onClick={handleCopy}
                  title="Clique para copiar"
                  className="font-mono text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30 cursor-pointer inline-flex items-center gap-1 hover:border-rose-400 transition-colors select-all"
                >
                  {expectedPhrase}
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                </span>
              </label>

              <input
                id="danger-confirm-phrase-input"
                type="text"
                autoComplete="off"
                spellCheck="false"
                value={typedPhrase}
                onChange={(e) => setTypedPhrase(e.target.value)}
                placeholder={expectedPhrase}
                disabled={isPending}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-black/40 border border-neutral-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 text-white placeholder-neutral-600 text-xs sm:text-sm font-mono transition-all disabled:opacity-50"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="w-full sm:w-1/2 min-h-[44px] py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-medium text-xs sm:text-sm transition-all border border-white/10 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={!isMatch || isPending}
                className="w-full sm:w-1/2 min-h-[44px] py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 disabled:border-neutral-700 text-white disabled:text-neutral-500 font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-95 disabled:active:scale-100"
              >
                {isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{confirmButtonText}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
