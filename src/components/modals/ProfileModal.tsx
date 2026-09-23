import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, AtSign, ShieldCheck, Check, AlertCircle, Save, LogOut, Sparkles } from 'lucide-react'
import { useUserProfile, useUpdateProfile } from '../../hooks/useUserProfile'
import { useAuth } from '../../contexts/AuthContext'

export interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenLogoutConfirm?: () => void
}

export function ProfileModal({
  isOpen,
  onClose,
  onOpenLogoutConfirm
}: ProfileModalProps) {
  const { user: authUser } = useAuth()
  const { profile, isLoading: isProfileLoading } = useUserProfile()
  const updateProfileMutation = useUpdateProfile()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Sincroniza formulário ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      const currentName = profile?.fullName ?? authUser?.fullName ?? authUser?.user_metadata?.full_name ?? ''
      const currentUsername = profile?.username ?? authUser?.username ?? authUser?.user_metadata?.username ?? ''
      setFullName(currentName)
      setUsername(currentUsername)
      setSuccessMessage(null)
      setErrorMessage(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const displayEmail = profile?.email || authUser?.email || 'usuario@dinheirizz.com'
  const displayProvider = profile?.provider || authUser?.provider || 'email'
  const initials = fullName
    ? fullName
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : displayEmail.slice(0, 2).toUpperCase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    const trimmedName = fullName.trim()
    const trimmedUsername = username.trim().toLowerCase()

    if (trimmedName && trimmedName.length < 2) {
      setErrorMessage('Nome completo deve conter pelo menos 2 caracteres.')
      return
    }

    if (trimmedUsername) {
      if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        setErrorMessage('Username deve conter entre 3 e 20 caracteres.')
        return
      }
      if (!/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
        setErrorMessage('Username permite apenas letras minúsculas, números e sublinhados (_).')
        return
      }
    }

    try {
      await updateProfileMutation.mutateAsync({
        fullName: trimmedName || undefined,
        username: trimmedUsername || undefined
      })
      setSuccessMessage('Perfil atualizado com sucesso!')
      setTimeout(() => {
        setSuccessMessage(null)
      }, 4000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Erro ao atualizar dados do perfil.')
      }
    }
  }

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg rounded-3xl glass-card border border-white/10 p-5 sm:p-7 pb-8 sm:pb-9 shadow-2xl text-white my-auto z-10 overflow-hidden"
        >
          {/* Decorative Gradient Orbs */}
          <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full gradient-orb-primary pointer-events-none opacity-25" />
          <div className="absolute -bottom-20 -left-20 w-44 h-44 rounded-full gradient-orb-accent pointer-events-none opacity-20" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 rounded-full glass-card-interactive flex items-center justify-center text-neutral-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header & Avatar Info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl avatar-gradient flex items-center justify-center font-bold text-lg sm:text-xl text-white border border-white/20 shadow-lg shadow-blue-500/20 flex-shrink-0">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="profile-modal-title" className="text-lg sm:text-xl font-bold font-display tracking-tight text-white truncate">
                  {fullName || 'Meu Perfil'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-semibold border border-teal-500/30 flex items-center gap-1 flex-shrink-0">
                  <ShieldCheck className="w-3 h-3 text-teal-400" />
                  Verificado
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {username ? `@${username}` : 'Defina seu @username'}
              </p>
            </div>
          </div>

          {/* Notifications Feedback */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail (Somente leitura) */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                E-mail da Conta
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={displayEmail}
                  disabled
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-400 text-xs sm:text-sm cursor-not-allowed select-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 font-mono uppercase bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  {displayProvider}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">O e-mail é gerenciado pelo provedor de autenticação.</p>
            </div>

            {/* Nome Completo */}
            <div>
              <label htmlFor="profile-fullname" className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                Nome Completo
              </label>
              <input
                id="profile-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu Nome Completo"
                maxLength={100}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-all"
              />
            </div>

            {/* Nome de Usuário / Handle */}
            <div>
              <label htmlFor="profile-username" className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-neutral-400" />
                Nome de Usuário (@handle)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-semibold select-none">
                  @
                </span>
                <input
                  id="profile-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="seu_username"
                  maxLength={20}
                  className="w-full min-h-[44px] pl-8 pr-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                De 3 a 20 caracteres: apenas letras minúsculas, números e sublinhados.
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Session Actions */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Dinheirizz 2.0 PWA
            </span>

            {onOpenLogoutConfirm && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenLogoutConfirm()
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Encerrar Sessão</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
