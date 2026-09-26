import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  User,
  Mail,
  AtSign,
  ShieldCheck,
  Check,
  AlertCircle,
  Save,
  LogOut,
  Sparkles,
  ShieldAlert,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  Cpu,
  CheckCircle2,
  Users,
  Send
} from 'lucide-react'
import { useUserProfile, useUpdateProfile } from '../../hooks/useUserProfile'
import {
  useUserAiSettings,
  useUpdateUserAiSettings,
  useTestUserAiKey,
  useDeleteUserAiSettings,
  useAdminUsers,
  useSendAdminInvite
} from '../../hooks/useUserAiSettings'
import { useAuth } from '../../contexts/AuthContext'

export interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenLogoutConfirm?: () => void
  onOpenDangerZone?: () => void
}

export function ProfileModal({
  isOpen,
  onClose,
  onOpenLogoutConfirm,
  onOpenDangerZone
}: ProfileModalProps) {
  const { user: authUser } = useAuth()
  const { profile, isLoading: isProfileLoading } = useUserProfile()
  const updateProfileMutation = useUpdateProfile()

  const { data: aiSettings } = useUserAiSettings()
  const updateAiSettingsMutation = useUpdateUserAiSettings()
  const testAiKeyMutation = useTestUserAiKey()
  const deleteAiSettingsMutation = useDeleteUserAiSettings()

  const isAdmin = aiSettings?.role === 'admin'
  const { data: adminUsers, refetch: refetchAdminUsers } = useAdminUsers(Boolean(isOpen && isAdmin))
  const sendAdminInviteMutation = useSendAdminInvite()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // BYOK States
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [aiProvider, setAiProvider] = useState('gemini')
  const [aiCustomModel, setAiCustomModel] = useState('gemini-1.5-flash')
  const [aiFeedback, setAiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Admin Invites States
  const [inviteEmailInput, setInviteEmailInput] = useState('')
  const [showUsersList, setShowUsersList] = useState(false)
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Sincroniza formulário ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      const currentName = profile?.fullName ?? authUser?.fullName ?? authUser?.user_metadata?.full_name ?? ''
      const currentUsername = profile?.username ?? authUser?.username ?? authUser?.user_metadata?.username ?? ''
      setFullName(currentName)
      setUsername(currentUsername)
      setSuccessMessage(null)
      setErrorMessage(null)
      setAiFeedback(null)
      setInviteFeedback(null)
      setApiKeyInput('')
      setInviteEmailInput('')
    }
  }, [isOpen])

  useEffect(() => {
    if (aiSettings) {
      setAiProvider(aiSettings.provider || 'gemini')
      setAiCustomModel(aiSettings.customModel || 'gemini-1.5-flash')
    }
  }, [aiSettings])

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

  const handleSaveAiKey = async () => {
    setAiFeedback(null)
    if (!apiKeyInput.trim() && !aiSettings?.hasKey) {
      setAiFeedback({ type: 'error', message: 'Digite uma chave de API válida.' })
      return
    }

    try {
      await updateAiSettingsMutation.mutateAsync({
        apiKey: apiKeyInput.trim() || undefined,
        provider: aiProvider,
        customModel: aiCustomModel,
        isActive: true
      })
      setApiKeyInput('')
      setAiFeedback({ type: 'success', message: 'Configurações de IA salvas com sucesso!' })
    } catch (err: any) {
      setAiFeedback({ type: 'error', message: err.message || 'Erro ao salvar chave de API.' })
    }
  }

  const handleTestAiKey = async () => {
    setAiFeedback(null)
    const keyToTest = apiKeyInput.trim()
    if (!keyToTest) {
      setAiFeedback({ type: 'error', message: 'Insira a chave no campo para testar.' })
      return
    }

    try {
      const res = await testAiKeyMutation.mutateAsync({
        apiKey: keyToTest,
        provider: aiProvider
      })
      setAiFeedback({ type: 'success', message: res.message || 'Conexão com Gemini validada!' })
    } catch (err: any) {
      setAiFeedback({ type: 'error', message: err.message || 'Falha na validação da chave.' })
    }
  }

  const handleDeleteAiKey = async () => {
    setAiFeedback(null)
    try {
      await deleteAiSettingsMutation.mutateAsync()
      setApiKeyInput('')
      setAiFeedback({ type: 'success', message: 'Chave removida. O sistema usará o diagnóstico gratuito heurístico.' })
    } catch (err: any) {
      setAiFeedback({ type: 'error', message: err.message || 'Erro ao remover chave.' })
    }
  }

  const handleSendInvite = async () => {
    setInviteFeedback(null)
    const emailToInvite = inviteEmailInput.trim().toLowerCase()
    if (!emailToInvite || !emailToInvite.includes('@')) {
      setInviteFeedback({ type: 'error', message: 'Informe um e-mail válido para conceder o convite PRO.' })
      return
    }

    try {
      const res = await sendAdminInviteMutation.mutateAsync({
        email: emailToInvite,
        action: 'grant'
      })
      setInviteEmailInput('')
      setInviteFeedback({ type: 'success', message: res.message || 'Convite PRO concedido com sucesso!' })
      refetchAdminUsers()
    } catch (err: any) {
      setInviteFeedback({ type: 'error', message: err.message || 'Falha ao conceder convite PRO.' })
    }
  }

  const handleToggleProRole = async (targetUserId: string, currentRole: string) => {
    setInviteFeedback(null)
    const action = currentRole === 'pro' ? 'revoke' : 'grant'
    try {
      const res = await sendAdminInviteMutation.mutateAsync({
        targetUserId,
        action
      })
      setInviteFeedback({ type: 'success', message: res.message })
      refetchAdminUsers()
    } catch (err: any) {
      setInviteFeedback({ type: 'error', message: err.message || 'Falha ao atualizar papel.' })
    }
  }

  if (!isOpen) return null

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
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-lg sm:text-xl text-primary shadow-lg shadow-primary/10 flex-shrink-0 font-display">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="profile-modal-title" className="text-lg sm:text-xl font-bold font-display tracking-tight text-white truncate">
                  {fullName || 'Meu Perfil'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold border border-primary/30 flex items-center gap-1 flex-shrink-0">
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  Verificado
                </span>
                {aiSettings?.role === 'admin' ? (
                  <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-semibold border border-accent/30 flex items-center gap-1 flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-accent" />
                    Admin
                  </span>
                ) : aiSettings?.role === 'pro' ? (
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold border border-primary/30 flex items-center gap-1 flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-primary" />
                    Plano PRO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground text-[10px] font-semibold border border-white/15 flex items-center gap-1 flex-shrink-0">
                    Plano Free
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                {username ? `@${username}` : 'Defina seu @username'}
              </p>
            </div>
          </div>

          {/* Notifications Feedback */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-rose-300 text-xs flex items-center gap-2"
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
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                E-mail da Conta
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={displayEmail}
                  disabled
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground text-xs sm:text-sm cursor-not-allowed select-none"
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
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Nome Completo
              </label>
              <input
                id="profile-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu Nome Completo"
                maxLength={100}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all"
              />
            </div>

            {/* Nome de Usuário / Handle */}
            <div>
              <label htmlFor="profile-username" className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-muted-foreground" />
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
                  className="w-full min-h-[44px] pl-8 pr-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all font-mono"
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
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-primary/20 cursor-pointer active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Seção Inteligência Artificial & BYOK */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    Inteligência Artificial (BYOK)
                    <span className="text-[10px] font-normal text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                      Custo Zero
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Utilize sua própria chave para análises sem depender de cotas.
                  </p>
                </div>
              </div>
            </div>

            {/* Status da chave / Banner */}
            {aiSettings?.hasKey ? (
              <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Chave Própria Configurada</span>
                    <span className="font-mono text-[11px] text-emerald-400/80">{aiSettings.maskedKey}</span>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="remove-byok-key-btn"
                  onClick={handleDeleteAiKey}
                  disabled={deleteAiSettingsMutation.isPending}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-colors cursor-pointer shrink-0"
                >
                  Remover
                </button>
              </div>
            ) : (
              <div className="mb-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-400 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Nenhuma chave pessoal salva. O sistema usará o diagnóstico analítico heurístico gratuito.</span>
              </div>
            )}

            {aiFeedback && (
              <div
                className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  aiFeedback.type === 'success'
                    ? 'bg-teal-500/15 border border-teal-500/30 text-teal-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
              >
                {aiFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-teal-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{aiFeedback.message}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Provedor e Modelo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="byok-provider" className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Provedor de IA
                  </label>
                  <select
                    id="byok-provider"
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-400"
                  >
                    <option value="gemini" className="bg-neutral-900 text-white">Google Gemini</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="byok-model" className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Modelo
                  </label>
                  <select
                    id="byok-model"
                    value={aiCustomModel}
                    onChange={(e) => setAiCustomModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-400"
                  >
                    <option value="gemini-1.5-flash" className="bg-neutral-900 text-white">Gemini 1.5 Flash (Recomendado)</option>
                    <option value="gemini-1.5-pro" className="bg-neutral-900 text-white">Gemini 1.5 Pro</option>
                  </select>
                </div>
              </div>

              {/* Input da Chave */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="byok-api-key" className="block text-[11px] font-medium text-neutral-300">
                    Chave de API (Google AI Studio)
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    Obter chave grátis <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="byok-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={aiSettings?.hasKey ? '••••••••••••••••••••••••••••' : 'Cole sua chave AIzaSy...'}
                    className="w-full min-h-[40px] pl-3.5 pr-10 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-indigo-400 font-mono"
                  />
                  <button
                    type="button"
                    aria-label={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Sua chave é criptografada com PBKDF2 + AES-GCM (WebCrypto) e nunca é exposta.
                </p>
              </div>

              {/* Botões de Ação BYOK */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  data-testid="test-byok-key-btn"
                  onClick={handleTestAiKey}
                  disabled={testAiKeyMutation.isPending || !apiKeyInput.trim()}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {testAiKeyMutation.isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Testar Conexão</span>
                  )}
                </button>

                <button
                  type="button"
                  data-testid="save-byok-key-btn"
                  onClick={handleSaveAiKey}
                  disabled={updateAiSettingsMutation.isPending || (!apiKeyInput.trim() && !aiSettings?.hasKey)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {updateAiSettingsMutation.isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Salvar Chave</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Área Administrativa: Gestão de Convites PRO */}
          {isAdmin && (
            <div className="mt-6 pt-5 border-t border-indigo-500/20 bg-indigo-500/[0.04] -mx-5 sm:-mx-7 px-5 sm:px-7 py-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      Área Administrativa • Convites PRO
                      <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                        Admin Only
                      </span>
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Conceda acesso PRO e IA corporativa ilimitada para outros usuários via e-mail.
                    </p>
                  </div>
                </div>
              </div>

              {inviteFeedback && (
                <div
                  className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    inviteFeedback.type === 'success'
                      ? 'bg-teal-500/15 border border-teal-500/30 text-teal-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {inviteFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0 text-teal-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{inviteFeedback.message}</span>
                </div>
              )}

              {/* Input de Envio de Convite por E-mail */}
              <div className="flex flex-col sm:flex-row items-center gap-2 mb-3">
                <div className="relative flex-1 w-full">
                  <input
                    id="admin-invite-email"
                    type="email"
                    value={inviteEmailInput}
                    onChange={(e) => setInviteEmailInput(e.target.value)}
                    placeholder="Digite o e-mail do usuário (ex: amigo@email.com)"
                    className="w-full min-h-[40px] pl-3.5 pr-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <button
                  type="button"
                  data-testid="send-admin-invite-btn"
                  onClick={handleSendInvite}
                  disabled={sendAdminInviteMutation.isPending || !inviteEmailInput.trim()}
                  className="w-full sm:w-auto px-4 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  {sendAdminInviteMutation.isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Conceder PRO</span>
                    </>
                  )}
                </button>
              </div>

              {/* Toggle para Ver Lista de Usuários do Sistema */}
              <div className="pt-1">
                <button
                  type="button"
                  data-testid="toggle-admin-users-list"
                  onClick={() => setShowUsersList(!showUsersList)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{showUsersList ? 'Ocultar usuários cadastrados' : 'Visualizar e gerenciar usuários cadastrados'}</span>
                </button>

                {showUsersList && (
                  <div className="mt-2.5 max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-white/10 rounded-xl p-2 bg-black/30">
                    {(!adminUsers || adminUsers.length === 0) ? (
                      <p className="text-xs text-neutral-500 text-center py-2">Nenhum outro usuário encontrado.</p>
                    ) : (
                      adminUsers.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5 border border-white/5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-medium truncate">{u.fullName || u.email}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  u.role === 'admin'
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                    : u.role === 'pro'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-white/10 text-neutral-400 border-white/15'
                                }`}
                              >
                                {u.role.toUpperCase()}
                                {u.proType ? ` (${u.proType})` : ''}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-400 truncate">{u.email}</p>
                          </div>

                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleToggleProRole(u.id, u.role)}
                              disabled={sendAdminInviteMutation.isPending}
                              className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer shrink-0 ${
                                u.role === 'pro'
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                              }`}
                            >
                              {u.role === 'pro' ? 'Revogar PRO' : 'Tornar PRO'}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gerenciamento de Dados / Zona de Perigo */}
          {onOpenDangerZone && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Gerenciamento de Dados (Zona de Perigo)
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Exclua transações, chaves Pix, contas em cascata ou realize reset geral.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="open-danger-zone-btn"
                  onClick={() => {
                    onClose()
                    onOpenDangerZone()
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Gerenciar Dados
                </button>
              </div>
            </div>
          )}

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
