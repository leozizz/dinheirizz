import React from 'react'
import { Sparkles, ArrowRight, Eye, Download, ShieldCheck, TrendingUp, Cpu } from 'lucide-react'

export interface HeroSectionProps {
  onGoToLogin: () => void
  onExploreDemo?: () => void
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGoToLogin, onExploreDemo }) => {
  return (
    <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            {/* Tagline / Release Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-medium text-primary shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>Dinheirizz 2.0 PWA — Alta performance e soberania financeira</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] font-display">
              Controle financeiro inteligente, fluido e refinado.
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans">
              Gerencie suas contas, fluxo de caixa diário e metas por envelopes com máxima clareza operacional. Inteligência artificial integrada para diagnósticos em tempo real com segurança ponta a ponta.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                type="button"
                data-testid="welcome-login-btn"
                onClick={onGoToLogin}
                className="min-h-[48px] h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Acessar minha conta</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {onExploreDemo && (
                <button
                  type="button"
                  data-testid="welcome-demo-btn"
                  onClick={onExploreDemo}
                  className="min-h-[44px] h-11 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Eye className="w-4 h-4 text-primary" />
                  <span>Explorar modo demonstração</span>
                </button>
              )}

              <button
                type="button"
                data-testid="welcome-pwa-btn"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('dinheirizz:install-pwa'))
                }}
                className="min-h-[44px] h-11 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-muted-foreground hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-accent" />
                <span>Instalar App (PWA)</span>
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Criptografia Client-side</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Zero Anúncios ou Rastreamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-accent" />
                <span>Cloudflare Edge Sub-30ms</span>
              </div>
            </div>
          </div>

          {/* Right Column: Glassmorphism Interactive Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md w-full">
              {/* Backlight orb for mockup */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/15 to-transparent rounded-3xl blur-2xl opacity-60 pointer-events-none" />

              {/* Glass Mockup Container */}
              <div className="relative glass-card border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-2xl space-y-4">
                {/* Header of Mockup */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    painel.dinheirizz.app
                  </span>
                </div>

                {/* Balance Card in Mockup */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Saldo Consolidado
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-white font-mono">
                      R$ 24.850,00
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      +18,4%
                    </span>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-muted-foreground block">Receitas Previstas</span>
                    <span className="text-sm font-semibold text-primary font-mono block">R$ 12.400,00</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-muted-foreground block">Despesas Fixas</span>
                    <span className="text-sm font-semibold text-destructive font-mono block">R$ 4.250,00</span>
                  </div>
                </div>

                {/* AI Assistant Insight Highlight Card */}
                <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-semibold text-white block">
                      Insight Assistido por IA
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Você economizou 14% em assinaturas este mês. Previsão positiva para a reserva de emergência.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
