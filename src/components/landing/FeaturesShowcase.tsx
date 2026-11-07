import React, { useState } from 'react'
import { LayoutDashboard, QrCode, BrainCircuit, Receipt, CheckCircle2, ArrowRight } from 'lucide-react'
import { ShowcaseTabId, ShowcaseFeature } from '../../types/landing'

export interface FeaturesShowcaseProps {
  onExploreDemo?: () => void
}

const features: Record<ShowcaseTabId, ShowcaseFeature> = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard & Calendário Financeiro',
    subtitle: 'Visão consolidada de receitas e despesas',
    badge: 'Visão Tática 360°',
    description:
      'Acompanhe seu fluxo de caixa diário, transações pendentes e previsão financeira para os próximos 30 dias com gráficos táteis interativos e calendário inteligente.',
    highlights: [
      'Visão diária, semanal e mensal com fluxo de caixa em tempo real',
      'Previsão preditiva de saldo para 30 e 60 dias',
      'Múltiplas contas correntes, carteiras e investimentos em um único painel',
      'Filtros rápidos por status: todas, concluídas ou pendentes',
    ],
    iconName: 'LayoutDashboard',
  },
  pix: {
    id: 'pix',
    title: 'Carteira Pix & Chaves',
    subtitle: 'Criptografia client-side (AES-GCM)',
    badge: 'Soberania & Privacidade',
    description:
      'Armazene e gerencie suas chaves Pix com proteção criptográfica robusta no dispositivo. Cópia instantânea e geração de QR Codes dinâmicos sem intermediação bancária.',
    highlights: [
      'Criptografia client-side (AES-GCM) — chaves cifradas antes do envio',
      'Cópia instantânea com 1 toque para transações ágeis',
      'Suporte a CPF/CNPJ, Email, Telefone e Chave Aleatória',
      'Privacidade absoluta: apenas você possui a chave mestre de decifragem',
    ],
    iconName: 'QrCode',
  },
  ai: {
    id: 'ai',
    title: 'Inteligência Financeira com IA',
    subtitle: 'Análises preditivas e sugestões inteligentes',
    badge: 'Diagnósticos Proativos',
    description:
      'Receba diagnósticos detalhados do seu comportamento de consumo, alertas preditivos de gastos excessivos e sugestões práticas de economia baseadas em seus dados reais.',
    highlights: [
      'Análises preditivas de fluxo e risco de déficit mensal',
      'Categorização inteligente e detecção de cobranças recorrentes anômalas',
      'Sugestões personalizadas para atingir metas de economia mais rápido',
      'Zero compartilhamento de dados financeiros brutos com modelos públicos',
    ],
    iconName: 'BrainCircuit',
  },
  transactions: {
    id: 'transactions',
    title: 'Orçamentos por Envelopes & Categorias',
    subtitle: 'Controle visual de metas com barras de progresso dinâmicas',
    badge: 'Disciplina Financeira',
    description:
      'Defina limites mensais por categoria com a clássica metodologia de envelopes. Barras de progresso com alerta visual quando um teto de despesa estiver próximo de ser atingido.',
    highlights: [
      'Metas por envelopes com limites personalizados por categoria',
      'Alertas visuais de proximidade de estouro de orçamento',
      'Distribuição percentual interativa através de gráficos de rosca (Donut)',
      'Acompanhamento em tempo real do impacto de cada despesa no teto mensal',
    ],
    iconName: 'Receipt',
  },
}

export const FeaturesShowcase: React.FC<FeaturesShowcaseProps> = ({ onExploreDemo }) => {
  const [activeTab, setActiveTab] = useState<ShowcaseTabId>('dashboard')
  const currentFeature = features[activeTab]

  return (
    <section id="recursos" data-testid="landing-showcase" className="py-16 sm:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs font-semibold text-primary">
            <span>Experiência Dinheirizz 2.0</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white font-display">
            Recursos projetados para clareza e controle absoluto.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Uma suíte financeira completa construída com arquitetura moderna, combinando alta velocidade e estética refinada.
          </p>
        </div>

        {/* Tab Selectors */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          <button
            type="button"
            data-testid="landing-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            aria-selected={activeTab === 'dashboard'}
            className={`min-h-[44px] h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]'
                : 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard & Calendário</span>
          </button>

          <button
            type="button"
            data-testid="landing-tab-pix"
            onClick={() => setActiveTab('pix')}
            aria-selected={activeTab === 'pix'}
            className={`min-h-[44px] h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'pix'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]'
                : 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/5'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Carteira Pix</span>
          </button>

          <button
            type="button"
            data-testid="landing-tab-ai"
            onClick={() => setActiveTab('ai')}
            aria-selected={activeTab === 'ai'}
            className={`min-h-[44px] h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]'
                : 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/5'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Inteligência Artificial</span>
          </button>

          <button
            type="button"
            data-testid="landing-tab-transactions"
            onClick={() => setActiveTab('transactions')}
            aria-selected={activeTab === 'transactions'}
            className={`min-h-[44px] h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]'
                : 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/5'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Gestão de Transações</span>
          </button>
        </div>

        {/* Feature Display Card */}
        <div className="glass-card border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Info & Highlights */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-xs font-medium text-accent">
                <span>{currentFeature.badge}</span>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-display">
                  {currentFeature.title}
                </h3>
                <p className="text-sm font-medium text-primary">
                  {currentFeature.subtitle}
                </p>
              </div>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {currentFeature.description}
              </p>

              {/* Highlights List */}
              <ul className="space-y-3 pt-2">
                {currentFeature.highlights.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-xs sm:text-sm text-neutral-200">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {onExploreDemo && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={onExploreDemo}
                    className="min-h-[44px] h-11 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs sm:text-sm inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <span>Testar este recurso no modo demo</span>
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Visual Accent Showcase */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl p-6 bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs font-mono text-muted-foreground uppercase">Demonstração Interativa</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">ATIVO</span>
                </div>

                {activeTab === 'dashboard' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Previsão 30 Dias</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">+ R$ 6.320,00</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Taxa de Poupança</span>
                      <span className="text-sm font-bold text-primary font-mono">28,5%</span>
                    </div>
                  </div>
                )}

                {activeTab === 'pix' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Chave Protegida</span>
                      <span className="text-xs font-mono text-white">478.***.***-00</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Algoritmo</span>
                      <span className="text-xs font-mono text-accent">AES-256-GCM</span>
                    </div>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Diagnóstico</span>
                      <span className="text-xs font-semibold text-emerald-400">Saudável (Score 92)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Potencial de Economia</span>
                      <span className="text-xs font-bold text-primary font-mono">R$ 410,00 / mês</span>
                    </div>
                  </div>
                )}

                {activeTab === 'transactions' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Alimentação (Envelope)</span>
                        <span className="text-white font-mono">68% consumido</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full w-[68%]" />
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Lazer & Streaming</span>
                        <span className="text-accent font-mono">42% consumido</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full w-[42%]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
