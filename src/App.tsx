import React, { useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, ArrowLeftRight, QrCode, Plus, Bell, ShieldCheck } from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'cards'>('dashboard')

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden pb-20">
      {/* Background Orbs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 rounded-full gradient-orb-primary pointer-events-none" />
      <div className="fixed top-1/3 -right-24 w-96 h-96 rounded-full gradient-orb-accent pointer-events-none" />

      {/* Top Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/60 border-b border-border px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl avatar-gradient flex items-center justify-center shadow-lg shadow-primary/20">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-2">
                Dinheirizz <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">2.0 PWA</span>
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Cloudflare Pages & Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Notificações"
              className="w-9 h-9 rounded-full glass-card-interactive flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-full avatar-gradient flex items-center justify-center font-bold text-xs text-primary-foreground border border-white/20">
              LZ
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Balance Card */}
        <section className="glass-card p-6 relative overflow-hidden shadow-2xl shadow-black/40">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo Total</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-foreground">
                R$ 14.850,20
              </h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +8.4%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receitas do Mês</p>
                <p className="text-sm font-semibold text-emerald-400">R$ 18.200,00</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-destructive/20 text-destructive flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas do Mês</p>
                <p className="text-sm font-semibold text-destructive">R$ 3.349,80</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Ações Rápidas</h3>
          <div className="grid grid-cols-4 gap-3">
            <button className="glass-card-interactive p-3 flex flex-col items-center justify-center gap-2 text-center group">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Receita</span>
            </button>

            <button className="glass-card-interactive p-3 flex flex-col items-center justify-center gap-2 text-center group">
              <div className="w-10 h-10 rounded-full bg-destructive/20 text-destructive flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingDown className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Despesa</span>
            </button>

            <button className="glass-card-interactive p-3 flex flex-col items-center justify-center gap-2 text-center group">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Transferir</span>
            </button>

            <button className="glass-card-interactive p-3 flex flex-col items-center justify-center gap-2 text-center group">
              <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Pix</span>
            </button>
          </div>
        </section>

        {/* Architecture Status Info */}
        <section className="glass-card p-4 space-y-2 border border-accent/20">
          <div className="flex items-center gap-2 text-accent text-sm font-semibold">
            <ShieldCheck className="w-4 h-4" /> Fundação Dinheirizz 2.0 Ativa
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Frontend desacoplado em Vite + React 19 SPA/PWA com arquitetura BFF em HonoJS (/api), Drizzle ORM conectado ao Supabase Cloud e cobertura com Vitest.
          </p>
        </section>
      </main>

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-40 glass-card p-2 flex justify-around items-center shadow-2xl border border-border">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'dashboard' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Início</span>
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'transactions' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Extrato</span>
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'cards' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Pix</span>
        </button>
      </nav>
    </div>
  )
}
