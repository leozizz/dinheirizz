import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Mail, Lock, Sparkles, AlertCircle, ArrowRight } from 'lucide-react'

export function LoginScreen() {
  const { signInWithPassword, signUp, signInWithOAuth } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signInWithPassword({ email, password })
        if (error) {
          setErrorMessage('Credenciais inválidas ou erro ao autenticar. Verifique seus dados.')
        }
      } else {
        const { error } = await signUp({ email, password })
        if (error) {
          setErrorMessage('Erro ao criar conta: ' + error.message)
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao processar login.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setErrorMessage(null)
    const { error } = await signInWithOAuth(provider)
    if (error) {
      setErrorMessage(`Erro ao iniciar autenticação com ${provider}: ${error.message}`)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#0d0d12]">
      {/* Dynamic Background Glows */}
      <div className="gradient-orb-primary -top-24 -left-24 w-96 h-96 opacity-30 pointer-events-none" />
      <div className="gradient-orb-accent -bottom-24 -right-24 w-96 h-96 opacity-25 pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md glass-card p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl animate-fade-in">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3b82f6]/20 to-[#10b981]/20 border border-white/10 mb-4 shadow-inner">
            <Sparkles className="w-7 h-7 text-[#5eead4]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 font-display">
            Dinheirizz
          </h1>
          <p className="text-sm text-neutral-400">
            Controle financeiro inteligente, fluido e refinado.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/5">
          <button
            type="button"
            data-testid="tab-login"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              mode === 'login'
                ? 'bg-white/15 text-white shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            data-testid="tab-signup"
            onClick={() => { setMode('signup'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              mode === 'signup'
                ? 'bg-white/15 text-white shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Criar conta
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-300 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5 ml-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5 ml-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            data-testid="auth-submit-btn"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#60a5fa] hover:to-[#3b82f6] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Entrar' : 'Cadastrar'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative px-3 bg-[#13111c] text-xs text-neutral-500 rounded-full">
            ou continue com
          </span>
        </div>

        {/* Social Login Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-white/20 active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span>Entrar com Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('apple')}
            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-white/20 active:scale-[0.98]"
          >
            <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.93-12.04-14.54-6.08-9.28-10.87-19.98-14.34-32.09-3.48-12.11-5.22-23.49-5.22-34.14 0-15.02 3.8-27.42 11.41-37.21 7.61-9.79 17.06-14.79 28.34-15 4.35 0 9.28 1.16 14.79 3.48 5.51 2.32 9.4 3.52 11.66 3.6 2.03 0 5.92-1.22 11.66-3.66 5.74-2.44 10.47-3.56 14.21-3.35 10.57.51 19.34 4.35 26.29 11.51 6.95 7.16 11.21 16.03 12.79 26.6-9.51 5.74-14.18 13.93-14.01 24.58.17 8.35 3.35 15.35 9.53 21 6.18 5.65 13.43 9.09 21.75 10.32-2.12 6.55-4.72 13.06-7.8 19.53zm-28.71-105.7c0 7.15-2.61 13.9-7.83 20.25-5.22 6.35-11.64 10.4-19.26 12.15-.52-1.39-.78-2.78-.78-4.17 0-6.95 2.78-13.68 8.34-20.19 5.56-6.51 12.06-10.46 19.53-11.85 0 1.28 0 2.55 0 3.81z" />
            </svg>
            <span>Entrar com Apple</span>
          </button>
        </div>
      </div>
    </div>
  )
}
