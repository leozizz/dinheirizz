import React, { useState, useEffect, useContext } from 'react'
import { Mail, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react'
import { AuthContext } from '../../contexts/AuthContext'

export interface EmailVerificationModalProps {
  isOpen: boolean
  email: string
  onClose: () => void
  onSuccess: () => void
  onVerify?: (email: string, token: string) => Promise<{ success: boolean; message: string; error?: string }>
  onResend?: (email: string) => Promise<{ success: boolean; message: string; error?: string }>
}

export const EmailVerificationModal = ({
  isOpen,
  email,
  onClose,
  onSuccess,
  onVerify,
  onResend
}: EmailVerificationModalProps) => {
  const auth = useContext(AuthContext)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(60)

  // Timer regressivo de 60 segundos para cooldown do reenvio
  useEffect(() => {
    if (!isOpen) {
      setCooldown(60)
      setToken('')
      setErrorMessage(null)
      setSuccessMessage(null)
      return
    }

    if (cooldown <= 0) return

    const intervalId = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [isOpen, cooldown])

  if (!isOpen) return null

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (token.length !== 6 || loading) return

    setErrorMessage(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const verifyFn = onVerify || auth?.verifyEmail
      if (!verifyFn) {
        throw new Error('Função de verificação não disponível')
      }
      const result = await verifyFn(email, token)

      if (!result.success) {
        setErrorMessage(result.error || result.message || 'Código de verificação inválido ou expirado.')
      } else {
        setSuccessMessage(result.message || 'E-mail verificado com sucesso.')
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na verificação de e-mail.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || resending) return

    setErrorMessage(null)
    setSuccessMessage(null)
    setResending(true)

    try {
      const resendFn = onResend || auth?.resendVerification
      if (!resendFn) {
        throw new Error('Função de reenvio não disponível')
      }
      const result = await resendFn(email)

      if (!result.success) {
        setErrorMessage(result.error || result.message || 'Não foi possível reenviar o código.')
      } else {
        setSuccessMessage(result.message || 'Novo código de verificação enviado para o seu e-mail.')
        setCooldown(60)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao reenviar código.'
      setErrorMessage(msg)
    } finally {
      setResending(false)
    }
  }

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 6)
    setToken(rawVal)
    setErrorMessage(null)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      data-testid="email-verification-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md p-6 sm:p-8 bg-zinc-950/90 border border-zinc-800 rounded-3xl shadow-2xl backdrop-blur-xl text-zinc-100 overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Botão de Fechar */}
        <button
          type="button"
          onClick={onClose}
          data-testid="close-verification-modal-btn"
          aria-label="Fechar modal de verificação"
          className="absolute top-5 right-5 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white rounded-full bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header com Ícone */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-lime-400/20 to-emerald-500/20 border border-lime-400/30 flex items-center justify-center text-lime-400 shadow-inner">
            <Mail className="w-7 h-7" />
          </div>
          <h2 id="modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Verifique seu E-mail
          </h2>
          <p className="text-sm text-zinc-400 max-w-xs">
            Enviamos um código de segurança de 6 dígitos para o endereço:
          </p>
          <span className="inline-block px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-lime-400 font-mono text-xs font-semibold">
            {email}
          </span>
        </div>

        {/* Alertas */}
        {errorMessage && (
          <div
            role="alert"
            data-testid="verify-otp-error-alert"
            className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs sm:text-sm animate-in fade-in"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="leading-tight">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div
            role="alert"
            data-testid="verify-otp-success-alert"
            className="mb-5 p-3.5 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-start gap-3 text-lime-400 text-xs sm:text-sm animate-in fade-in"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="leading-tight">{successMessage}</p>
          </div>
        )}

        {/* Formulário OTP */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <label htmlFor="otp-input" className="text-xs font-medium text-zinc-400">
              Digite o código de 6 dígitos
            </label>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={token}
              onChange={handleTokenChange}
              placeholder="000000"
              autoFocus
              data-testid="otp-input-field"
              className="w-full max-w-[240px] tracking-[0.5em] text-center text-2xl sm:text-3xl font-mono py-3 px-4 rounded-xl bg-zinc-900/90 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all shadow-inner"
            />
            <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" /> Válido por 15 minutos
            </p>
          </div>

          {/* Botão de Enviar */}
          <button
            type="submit"
            disabled={token.length !== 6 || loading}
            data-testid="verify-otp-submit-btn"
            className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validando código...</span>
              </>
            ) : (
              <span>Confirmar Código</span>
            )}
          </button>
        </form>

        {/* Área de Reenvio com Rate Limit Cooldown */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
          <span className="text-zinc-400">Não recebeu o código?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            data-testid="resend-otp-btn"
            className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg font-medium text-lime-400 hover:text-lime-300 hover:bg-lime-400/10 disabled:text-zinc-600 disabled:hover:bg-transparent transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>Reenviar código</span>
            {cooldown > 0 && (
              <span
                data-testid="resend-cooldown-timer"
                className="ml-1 text-zinc-500 font-mono"
              >
                ({cooldown}s)
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
