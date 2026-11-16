import React, { useContext } from 'react'
import { Wallet, LogIn, Sun, Moon } from 'lucide-react'
import { ThemeContext } from '../../contexts/ThemeContext'

export interface LandingHeaderProps {
  onGoToLogin: () => void
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ onGoToLogin }) => {
  const themeContext = useContext(ThemeContext)
  const resolvedTheme = themeContext?.resolvedTheme ?? 'dark'

  const handleToggleTheme = () => {
    if (themeContext) {
      void themeContext.toggleTheme()
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80 border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shadow-inner">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-display">
              Dinheirizz
            </span>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
              v2.0
            </span>
          </div>
        </div>

        {/* Anchors Navigation for Desktop */}
        <nav aria-label="Navegação institucional" className="hidden md:flex items-center gap-8">
          <a
            href="#recursos"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center"
          >
            Recursos
          </a>
          <a
            href="#seguranca"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center"
          >
            Segurança & Infra
          </a>
          <a
            href="#tecnologia"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center"
          >
            Tecnologia
          </a>
        </nav>

        {/* Fast Action CTA & Theme Toggle */}
        <div className="flex items-center gap-3">
          {/* Alternância Rápida de Tema na Landing Page */}
          <button
            type="button"
            data-testid="landing-theme-toggle-btn"
            onClick={handleToggleTheme}
            aria-label="Alternar tema visual"
            title={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl glass-card-interactive flex items-center justify-center text-muted-foreground hover:text-foreground border border-border cursor-pointer active:scale-95 transition-all"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>

          <button
            type="button"
            data-testid="welcome-header-login-btn"
            onClick={onGoToLogin}
            aria-label="Entrar na conta Dinheirizz"
            className="min-h-[44px] h-11 px-4 sm:px-5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>Entrar</span>
          </button>
        </div>
      </div>
    </header>
  )
}
