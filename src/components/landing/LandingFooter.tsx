import React from 'react'
import { Wallet, Github, ExternalLink, Heart } from 'lucide-react'

export interface LandingFooterProps {
  onGoToLogin?: () => void
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onGoToLogin }) => {
  return (
    <footer data-testid="landing-footer" className="border-t border-white/5 bg-background/90 pt-16 pb-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/5">
          {/* Brand & Mission */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-bold text-white font-display">
                Dinheirizz
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
              Plataforma de gestão financeira pessoal e empresarial de código aberto. Projetada para proporcionar soberania, alta performance e clareza analítica.
            </p>
            {/* System Status Indicator */}
            <div
              data-testid="landing-system-status"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Todos os sistemas operacionais (Cloudflare & Supabase)</span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div className="space-y-3">
              <span className="text-xs font-semibold text-white uppercase tracking-wider block">
                Navegação
              </span>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <a href="#recursos" className="hover:text-white transition-colors min-h-[44px] flex items-center">
                    Recursos
                  </a>
                </li>
                <li>
                  <a href="#seguranca" className="hover:text-white transition-colors min-h-[44px] flex items-center">
                    Segurança & RLS
                  </a>
                </li>
                <li>
                  <a href="#tecnologia" className="hover:text-white transition-colors min-h-[44px] flex items-center">
                    Arquitetura Edge
                  </a>
                </li>
                {onGoToLogin && (
                  <li>
                    <button
                      type="button"
                      onClick={onGoToLogin}
                      className="hover:text-white transition-colors cursor-pointer text-left min-h-[44px] flex items-center"
                    >
                      Acessar Conta
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-white uppercase tracking-wider block">
                Tecnologia
              </span>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5 min-h-[44px]">
                  <span>React 19 + Vite</span>
                </li>
                <li className="flex items-center gap-1.5 min-h-[44px]">
                  <span>Hono.js + Cloudflare</span>
                </li>
                <li className="flex items-center gap-1.5 min-h-[44px]">
                  <span>Drizzle ORM</span>
                </li>
                <li className="flex items-center gap-1.5 min-h-[44px]">
                  <span>Supabase PostgreSQL</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 col-span-2 sm:col-span-1">
              <span className="text-xs font-semibold text-white uppercase tracking-wider block">
                Comunidade
              </span>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <a
                    href="https://github.com/leozizz/dinheirizz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-white transition-colors min-h-[44px]"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>Repositório</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </a>
                </li>
                <li>
                  <span className="text-[11px] text-muted-foreground min-h-[44px] flex items-center">
                    Licença MIT Open Source
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>© 2026 Dinheirizz. Desenvolvido com</span>
            <Heart className="w-3.5 h-3.5 text-destructive inline fill-destructive" />
            <span>e transparência.</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-neutral-300 font-mono text-[11px]">
              v2.0.0 Production Ready
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
