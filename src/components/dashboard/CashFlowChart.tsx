import React, { useState, useId } from 'react'
import type { DailyCashFlowPoint } from '../../hooks/useForecast'
import { formatBRL } from '../../lib/formatters'

export interface CashFlowChartProps {
  timeline: DailyCashFlowPoint[]
  startingBalance: number
  healthStatus?: 'safe' | 'warning' | 'danger'
}

export function CashFlowChart({
  timeline,
  startingBalance,
  healthStatus = 'safe'
}: CashFlowChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const gradientId = useId()

  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex h-44 w-full items-center justify-center text-xs text-stone-500">
        Sem dados de projeção suficientes.
      </div>
    )
  }

  // Dimensões do viewBox do SVG
  const width = 600
  const height = 180
  const paddingX = 24
  const paddingTop = 20
  const paddingBottom = 28
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingTop - paddingBottom

  // Encontrar valores extremos para escala
  const allBalances = timeline.map((p) => p.balance)
  const rawMin = Math.min(...allBalances, startingBalance, 0)
  const rawMax = Math.max(...allBalances, startingBalance)
  const range = rawMax - rawMin === 0 ? 1000 : rawMax - rawMin

  const minVal = rawMin - range * 0.05
  const maxVal = rawMax + range * 0.05
  const valRange = maxVal - minVal

  const getX = (index: number) => {
    if (timeline.length <= 1) return paddingX
    return paddingX + (index / (timeline.length - 1)) * chartWidth
  }

  const getY = (val: number) => {
    const normalized = (val - minVal) / valRange
    return paddingTop + (1 - normalized) * chartHeight
  }

  // Coordenadas dos pontos
  const points = timeline.map((p, i) => ({
    x: getX(i),
    y: getY(p.balance),
    point: p,
    index: i
  }))

  // Construir caminho (smooth path)
  const pathD = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = arr[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
  }, '')

  // Área preenchida sob a curva
  const lastPoint = points[points.length - 1]
  const firstPoint = points[0]
  const bottomY = height - paddingBottom
  const areaD = `${pathD} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`

  // Linha zero se o mínimo for negativo ou próximo de zero
  const zeroY = getY(0)
  const showZeroLine = rawMin < 0 || healthStatus === 'danger'

  // Cores dinâmicas de acordo com a saúde
  const strokeColor =
    healthStatus === 'danger'
      ? '#f43f5e' // Rose
      : healthStatus === 'warning'
        ? '#f59e0b' // Amber
        : '#10b981' // Emerald

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null

  return (
    <div className="relative w-full select-none">
      <svg
        className="cashflow-curve h-44 w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Linha Zero / Limiar Crítico */}
        {showZeroLine && zeroY >= paddingTop && zeroY <= bottomY && (
          <g>
            <line
              x1={paddingX}
              y1={zeroY}
              x2={width - paddingX}
              y2={zeroY}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth="1.2"
              opacity="0.6"
            />
            <text
              x={width - paddingX}
              y={zeroY - 4}
              textAnchor="end"
              fill="#f43f5e"
              fontSize="9"
              fontWeight="600"
              opacity="0.8"
            >
              R$ 0 (Crítico)
            </text>
          </g>
        )}

        {/* Área preenchida com gradiente */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Linha da Curva de Saldo */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Marcadores de despesas expressivas agendadas */}
        {points.map((p) => {
          if (p.point.scheduledExpense > 0) {
            return (
              <circle
                key={`exp-${p.index}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#f43f5e"
                stroke="#18181b"
                strokeWidth="1.5"
              />
            )
          }
          if (p.point.scheduledIncome > 0) {
            return (
              <circle
                key={`inc-${p.index}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#10b981"
                stroke="#18181b"
                strokeWidth="1.5"
              />
            )
          }
          return null
        })}

        {/* Ponto interativo destacado no hover */}
        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={bottomY}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="5"
              fill={strokeColor}
              stroke="#18181b"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Áreas invisíveis para captura de hover ao longo do tempo */}
        {points.map((p) => (
          <rect
            key={`hit-${p.index}`}
            x={p.x - chartWidth / (timeline.length * 2)}
            y={0}
            width={chartWidth / timeline.length}
            height={height}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredIndex(p.index)}
          />
        ))}
      </svg>

      {/* Tooltip flutuante tátil */}
      {activePoint && (
        <div
          className="pointer-events-none absolute -top-3 z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-zinc-900/95 px-2.5 py-1.5 shadow-xl backdrop-blur-md transition-all duration-75"
          style={{
            left: `${(activePoint.x / width) * 100}%`
          }}
        >
          <div className="text-[10px] font-medium text-stone-400">
            {activePoint.point.date.split('-').reverse().slice(0, 2).join('/')}
          </div>
          <div
            className={`text-xs font-bold ${
              activePoint.point.balance < 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {formatBRL(activePoint.point.balance)}
          </div>
          {activePoint.point.scheduledIncome > 0 && (
            <div className="text-[10px] text-emerald-400">
              +{formatBRL(activePoint.point.scheduledIncome)}
            </div>
          )}
          {activePoint.point.scheduledExpense > 0 && (
            <div className="text-[10px] text-rose-400">
              -{formatBRL(activePoint.point.scheduledExpense)}
            </div>
          )}
        </div>
      )}

      {/* Rótulos temporais no rodapé */}
      <div className="mt-1 flex items-center justify-between px-2 text-[10px] font-medium text-stone-500">
        <span>Hoje</span>
        <span>
          {timeline.length >= 15
            ? timeline[Math.floor(timeline.length / 2)]?.date.split('-').reverse().slice(0, 2).join('/')
            : ''}
        </span>
        <span>{timeline[timeline.length - 1]?.date.split('-').reverse().slice(0, 2).join('/')}</span>
      </div>
    </div>
  )
}
