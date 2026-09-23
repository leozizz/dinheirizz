import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, X, AlertTriangle } from 'lucide-react'

export interface LogoutConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  isLoading?: boolean
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}: LogoutConfirmModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isLoading ? undefined : onClose}
          className="absolute inset-0"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm rounded-3xl glass-card border border-white/10 p-6 sm:p-7 shadow-2xl text-white overflow-hidden z-10"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full glass-card-interactive flex items-center justify-center text-neutral-400 hover:text-white border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Icon */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
              <LogOut className="w-6 h-6 stroke-[2.2]" />
            </div>

            <h2 id="logout-modal-title" className="text-lg sm:text-xl font-bold font-display tracking-tight text-white mb-2">
              Deseja sair da sua conta?
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-xs mb-6">
              Sua sessão será encerrada com segurança neste dispositivo. Você precisará se autenticar novamente para acessar suas finanças.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              data-testid="cancel-logout-btn"
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl glass-card-interactive border border-white/10 text-neutral-300 hover:text-white font-medium text-xs sm:text-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              data-testid="confirm-logout-btn"
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-rose-600/30 cursor-pointer active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Sim, Sair da Conta</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
