import React, { useState } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Flame,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react'
import { useForecast } from '../../hooks/useForecast'
import { CashFlowChart } from './CashFlowChart'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { formatBRL } from '../../lib/formatters'

export interface ForecastCardProps {
  accountId?: string | null
  className?: string
}

export const ForecastCard: React.FC<ForecastCardProps> = ({
  accountId,
  className = ''
}) => {
  const [days, setDays] = useState<30 | 60>(30)
  const { data, isLoading } = useForecast({ days, accountId })

  if (isLoading && !data) {
    return (
      <div className={`glass-card rounded-2xl border border-border bg-card p-5 backdrop-blur-xl ${className}`}>
        <div className="flex items-center justify-between pb-4">
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
          <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="my-4 h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-44 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const forecast = data || {
    startingBalance: 0,
    projectedEndBalance: 0,
    netChange: 0,
    dailyBurnRate: 0,
    healthStatus: 'safe' as const,
    healthMessage: 'Sem dados suficientes para projeção.',
    lowestPoint: { date: '', balance: 0 },
    timeline: []
  }

  const isDanger = forecast.healthStatus === 'danger'
  const isWarning = forecast.healthStatus === 'warning'
  const isSafe = forecast.healthStatus === 'safe'

  return (
    <div
      className={`glass-card relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-border/80 ${className}`}
    >
      {/* Glow sutil de fundo condicional */}
      <div
        className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl opacity-20 ${
          isDanger
            ? 'bg-rose-500'
            : isWarning
              ? 'bg-amber-500'
              : 'bg-emerald-500'
        }`}
      />

      {/* Cabeçalho com título, ícone e alternador de horizonte */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
              isDanger
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                : isWarning
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-foreground">
              Previsão de Saldo & Fluxo de Caixa
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Projeção diária com base em boletos e histórico
            </p>
          </div>
        </div>

        {/* Alternador 30 Dias / 60 Dias */}
        <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5 shadow-inner">
          <button
            type="button"
            data-testid="forecast-horizon-30-btn"
            onClick={() => setDays(30)}
            className={`min-h-[44px] rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              days === 30
                ? 'bg-primary/15 text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            30 Dias
          </button>
          <button
            type="button"
            data-testid="forecast-horizon-60-btn"
            onClick={() => setDays(60)}
            className={`min-h-[44px] rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              days === 60
                ? 'bg-primary/15 text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            60 Dias
          </button>
        </div>
      </div>

      {/* Linha de Destaque: Saldo Previsto, Variação e Badge de Saúde */}
      <div className="relative z-10 my-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Saldo Previsto em {days} Dias
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black tracking-tight sm:text-3xl tabular-nums ${
                forecast.projectedEndBalance < 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-foreground'
              }`}
            >
              <AnimatedNumber
                value={forecast.projectedEndBalance}
                formatter={formatBRL}
              />
            </span>
          </div>

          {/* Delta em relação ao saldo atual */}
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {forecast.netChange >= 0 ? (
              <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +{formatBRL(forecast.netChange)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                <ArrowDownRight className="h-3.5 w-3.5" />
                -{formatBRL(Math.abs(forecast.netChange))}
              </span>
            )}
            <span className="text-muted-foreground">vs saldo atual (<span className="tabular-nums">{formatBRL(forecast.startingBalance)}</span>)</span>
          </div>
        </div>

        {/* Badge Semântico de Saúde Financeira */}
        <div className="flex items-center">
          {isSafe && (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Tranquilo</span>
            </div>
          )}

          {isWarning && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Atenção</span>
            </div>
          )}

          {isDanger && (
            <div className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Risco de Saldo Negativo</span>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico da Curva de Projeção Temporal */}
      <div className="relative z-10 pt-1">
        <CashFlowChart
          timeline={forecast.timeline}
          startingBalance={forecast.startingBalance}
          healthStatus={forecast.healthStatus}
        />
      </div>

      {/* Métricas Auxiliares & Insights Determinísticos */}
      <div className="relative z-10 mt-4 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-2.5 text-xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
            <Flame className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Gasto Diário Médio (Burn Rate)</div>
            <div className="font-semibold text-foreground tabular-nums">
              {formatBRL(forecast.dailyBurnRate)}/dia
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-2.5 text-xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Menor Saldo no Período</div>
            <div
              className={`font-semibold tabular-nums ${
                forecast.lowestPoint.balance < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-foreground'
              }`}
            >
              {formatBRL(forecast.lowestPoint.balance)}
              {forecast.lowestPoint.date && (
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  (em {forecast.lowestPoint.date.split('-').reverse().slice(0, 2).join('/')})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Caixa de Mensagem / Alerta Inteligente */}
      {forecast.healthMessage && (
        <div
          className={`relative z-10 mt-3 flex items-start gap-2 rounded-xl border p-2.5 text-xs ${
            isDanger
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : isWarning
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : 'border-border bg-muted/40 text-foreground'
          }`}
        >
          {isDanger ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-400" />
          ) : isWarning ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
          )}
          <p className="leading-relaxed">{forecast.healthMessage}</p>
        </div>
      )}
    </div>
  )
}
