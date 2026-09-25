import React, { useState } from 'react'
import {
  Sparkles,
  RotateCw,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import type { AiInsightData } from '../../hooks/useAiInsights'

export interface AiInsightsCardProps {
  insight: AiInsightData | null
  isLoading?: boolean
  isGenerating?: boolean
  onGenerate?: () => void
}

export function AiInsightsCard({
  insight,
  isLoading = false,
  isGenerating = false,
  onGenerate
}: AiInsightsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="glass-card p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 shadow-xl space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10" />
            <div className="space-y-2">
              <div className="w-36 h-4 bg-white/10 rounded" />
              <div className="w-24 h-3 bg-white/5 rounded" />
            </div>
          </div>
          <div className="w-16 h-8 bg-white/10 rounded-xl" />
        </div>
        <div className="h-14 bg-white/5 rounded-xl" />
      </div>
    )
  }

  if (!insight) {
    return null
  }

  const score = Math.round(insight.financialHealthScore)
  let scoreColorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  let scoreLabel = 'Excelente'

  if (score < 50) {
    scoreColorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    scoreLabel = 'Atenção'
  } else if (score < 75) {
    scoreColorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    scoreLabel = 'Regular'
  } else if (score < 90) {
    scoreColorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    scoreLabel = 'Saudável'
  }

  return (
    <div className="relative overflow-hidden glass-card p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl bg-gradient-to-br from-indigo-500/[0.07] via-emerald-500/[0.04] to-transparent">
      {/* Glow orb decorativo sutil */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header do Card */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-white/15 flex items-center justify-center text-indigo-300 shadow-inner">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Consultor Dinheirizz
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                IA
              </span>
            </div>
            <p className="text-xs text-white/50">Diagnóstico de Saúde Financeira</p>
          </div>
        </div>

        {/* Score Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${scoreColorClass} shadow-sm backdrop-blur-md`}
        >
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold block leading-none opacity-80">
              {scoreLabel}
            </span>
            <span className="text-base font-extrabold tracking-tight leading-tight">
              {score}
            </span>
          </div>
          <span className="text-[11px] text-white/40 font-medium">/100</span>
        </div>
      </div>

      {/* Resumo do Consultor */}
      <p className="text-sm text-white/80 leading-relaxed font-normal mb-4">
        {insight.summary}
      </p>

      {/* Destaques e Alertas Rápidos */}
      <div className="space-y-2 mb-4">
        {insight.highlights?.slice(0, 1).map((highlight, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 text-xs text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl"
          >
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{highlight}</span>
          </div>
        ))}

        {insight.alerts?.slice(0, 1).map((alert, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{alert}</span>
          </div>
        ))}
      </div>

      {/* Seção Expansível com Recomendações e Mais Destaques */}
      {isExpanded && (
        <div className="pt-3 border-t border-white/10 space-y-3 mb-4 animate-fade-in">
          {insight.recommendations && insight.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Recomendações Práticas
              </h4>
              <ul className="space-y-2">
                {insight.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="text-xs text-white/70 bg-white/5 p-2 rounded-lg border border-white/5 leading-relaxed"
                  >
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insight.highlights && insight.highlights.length > 1 && (
            <div>
              <h4 className="text-xs font-semibold text-white/70 mb-2">
                Outros Destaques
              </h4>
              <ul className="space-y-1.5">
                {insight.highlights.slice(1).map((h, i) => (
                  <li key={i} className="text-xs text-emerald-400/80 leading-relaxed">
                    ✓ {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Ações do Card */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-white/60 hover:text-white flex items-center gap-1 transition-colors py-1 cursor-pointer"
        >
          {isExpanded ? (
            <>
              Menos detalhes <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Ver recomendações completas <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCw
              className={`w-3.5 h-3.5 text-indigo-400 ${
                isGenerating ? 'animate-spin' : ''
              }`}
            />
            {isGenerating ? 'Analisando...' : 'Atualizar Análise'}
          </button>
        )}
      </div>
    </div>
  )
}
