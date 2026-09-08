import React from 'react'
import { Sparkles, ArrowRight, ShieldCheck, Zap, Eye, Wallet } from 'lucide-react'

interface WelcomeScreenProps {
  onGoToLogin: () => void
  onExploreDemo?: () => void
}

export function WelcomeScreen({ onGoToLogin, onExploreDemo }: WelcomeScreenProps) {
  return (
    <div className="min-h-dvh bg-[#0d0d12] text-foreground flex items-center justify-center p-4 sm:p-6 py-8 sm:py-12 relative overflow-y-auto">
      {/* Dynamic Background Glows */}
      <div className="fixed -top-24 -left-24 w-96 h-96 gradient-orb-primary opacity-30 pointer-events-none rounded-full" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 gradient-orb-accent opacity-25 pointer-events-none rounded-full" />

      {/* Main Glassmorphism Welcome Card */}
      <div className="relative z-10 w-full max-w-lg glass-card p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl animate-fade-in text-center my-auto">
        {/* Logo and Tag */}
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#3b82f6]/20 to-[#10b981]/20 border border-white/10 mb-4 sm:mb-5 shadow-inner">
          <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-[#5eead4]" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-teal-300 mb-3 sm:mb-4">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Dinheirizz 2.0 PWA</span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white mb-2.5 sm:mb-3 font-display">
          Controle financeiro inteligente, fluido e refinado.
        </h1>

        <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-6 sm:mb-8 leading-relaxed">
          Gerencie suas finanças pessoais com clareza absoluta. Saldo consolidado, modais ágeis de receita e despesa, e carteira Pix em uma interface inspirada na Apple.
        </p>

        {/* Feature Badges - Horizontal on Mobile, Cards on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6 sm:mb-8 text-left">
          <div className="p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Glassmorphism</span>
              <span className="text-[11px] text-neutral-400 block">Estética Apple refinada</span>
            </div>
          </div>

          <div className="p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Segurança Total</span>
              <span className="text-[11px] text-neutral-400 block">Supabase Auth e JWT</span>
            </div>
          </div>

          <div className="p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">PWA Instantâneo</span>
              <span className="text-[11px] text-neutral-400 block">Instale em segundos</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            data-testid="welcome-login-btn"
            onClick={onGoToLogin}
            className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#60a5fa] hover:to-[#3b82f6] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Acessar minha conta</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onExploreDemo && (
            <button
              type="button"
              data-testid="welcome-demo-btn"
              onClick={onExploreDemo}
              className="w-full min-h-[44px] py-2.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Eye className="w-4 h-4 text-neutral-400" />
              <span>Explorar modo demonstração</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
