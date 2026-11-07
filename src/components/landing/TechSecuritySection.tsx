import React from 'react'
import { Database, Cloud, Lock, Smartphone, ShieldCheck } from 'lucide-react'

export const TechSecuritySection: React.FC = () => {
  return (
    <section id="seguranca" data-testid="landing-security" className="py-16 sm:py-24 relative border-t border-white/5">
      <div id="tecnologia" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Engenharia & Soberania de Dados</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white font-display">
            Arquitetura moderna construída para durar.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sem caixas-pretas. O Dinheirizz combina o melhor da nuvem distribuída com proteção criptográfica intransigente.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1: Supabase */}
          <div className="glass-card border border-white/10 rounded-2xl p-6 hover:border-primary/40 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Database className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5 text-muted-foreground inline-block">
                PostgreSQL RLS
              </span>
              <h3 className="text-lg font-bold text-white">
                Supabase Cloud + RLS
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Isolamento multi-tenant estrito por linha no banco PostgreSQL. Nenhuma consulta acessa dados de outro usuário em nenhum nível.
              </p>
            </div>
          </div>

          {/* Pillar 2: Cloudflare Pages & Edge */}
          <div className="glass-card border border-white/10 rounded-2xl p-6 hover:border-primary/40 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                <Cloud className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5 text-muted-foreground inline-block">
                BFF HonoJS Edge
              </span>
              <h3 className="text-lg font-bold text-white">
                Cloudflare Pages & Edge
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Infraestrutura global com backend BFF leve em centenas de pontos de presença. Respostas sub-30ms e zero cold starts.
              </p>
            </div>
          </div>

          {/* Pillar 3: Criptografia em Repouso */}
          <div className="glass-card border border-white/10 rounded-2xl p-6 hover:border-primary/40 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
                <Lock className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5 text-muted-foreground inline-block">
                AES-256-GCM
              </span>
              <h3 className="text-lg font-bold text-white">
                Criptografia em Repouso
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dados ultrassensíveis como chaves Pix são cifrados no navegador com Web Crypto API antes de serem sincronizados na nuvem.
              </p>
            </div>
          </div>

          {/* Pillar 4: PWA Nativo */}
          <div className="glass-card border border-white/10 rounded-2xl p-6 hover:border-primary/40 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5 text-muted-foreground inline-block">
                Offline First
              </span>
              <h3 className="text-lg font-bold text-white">
                PWA Nativo & Offline Ready
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Experiência idêntica a aplicativo nativo em iOS, Android, macOS e Windows. Instale direto do navegador sem passar por app stores.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
