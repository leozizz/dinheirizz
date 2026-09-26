import React from 'react'
import { Sparkles, ArrowRight, ShieldCheck, Zap, Eye, Wallet } from 'lucide-react'

interface WelcomeScreenProps {
  onGoToLogin: () => void
  onExploreDemo?: () => void
}

export function WelcomeScreen({ onGoToLogin, onExploreDemo }: WelcomeScreenProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4 sm:p-6 py-8 sm:py-12 relative overflow-y-auto">
      {/* Dynamic Background Glows */}
      <div className="fixed -top-24 -left-24 w-96 h-96 gradient-orb-primary opacity-40 pointer-events-none rounded-full" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 gradient-orb-accent opacity-35 pointer-events-none rounded-full" />

      {/* Main Glassmorphism Welcome Card */}
      <div className="relative z-10 w-full max-w-lg glass-card p-6 sm:p-9 md:p-10 border border-white/10 shadow-2xl backdrop-blur-xl animate-fade-in text-center my-auto">
        {/* Logo and Tag */}
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 border border-primary/25 mb-4 sm:mb-5 shadow-inner">
          <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs font-medium text-primary mb-3 sm:mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Dinheirizz 2.0 PWA</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3 font-display">
          Controle financeiro inteligente com máxima fluidez e presença.
        </h1>

        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-6 sm:mb-8 leading-relaxed">
          Gerencie suas contas, despesas e receitas com clareza instantânea. Diagnóstico com IA e carteira Pix em uma experiência tátil moderna.
        </p>

        {/* Feature Badges - Horizontal on Mobile, Cards on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6 sm:mb-8 text-left">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Glassmorphism</span>
              <span className="text-[11px] text-muted-foreground block">Fluidez iOS & OneUI</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Segurança Total</span>
              <span className="text-[11px] text-muted-foreground block">Criptografia ponta a ponta</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">PWA Nativo</span>
              <span className="text-[11px] text-muted-foreground block">Acesso ágil e offline</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            data-testid="welcome-login-btn"
            onClick={onGoToLogin}
            className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer"
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
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span>Explorar modo demonstração</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
