import React, { useState } from 'react'
import { formatBRL } from '../../lib/formatters'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import type { TransactionItem } from './Dashboard'
import { PieChart, TrendingDown, TrendingUp, Layers } from 'lucide-react'

export interface CategoryDonutChartProps {
  transactions: TransactionItem[]
  mode?: 'expense' | 'income'
  onModeChange?: (mode: 'expense' | 'income') => void
}

interface CategorySlice {
  name: string
  color: string
  amount: number
  percentage: number
}

const DEFAULT_EXPENSE_COLORS = [
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#64748b'  // Slate
]

const DEFAULT_INCOME_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#64748b'  // Slate
]

export function CategoryDonutChart({
  transactions,
  mode: controlledMode,
  onModeChange
}: CategoryDonutChartProps) {
  const [internalMode, setInternalMode] = useState<'expense' | 'income'>('expense')
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  const activeMode = controlledMode !== undefined ? controlledMode : internalMode

  const handleModeToggle = (newMode: 'expense' | 'income') => {
    setInternalMode(newMode)
    setHoveredCategory(null)
    onModeChange?.(newMode)
  }

  // Filtrar e agrupar transações pelo modo ativo
  const relevantTransactions = transactions.filter((t) => {
    if (activeMode === 'expense') {
      return t.amount < 0 || t.type === 'expense'
    }
    return t.amount > 0 || t.type === 'income'
  })

  // Agrupamento por categoria
  const categoryMap = new Map<string, { name: string; color: string; amount: number }>()

  for (const t of relevantTransactions) {
    const name = t.category?.name || 'Outros'
    const absAmount = Math.abs(t.amount)
    const existing = categoryMap.get(name)

    if (existing) {
      existing.amount += absAmount
    } else {
      const palette = activeMode === 'expense' ? DEFAULT_EXPENSE_COLORS : DEFAULT_INCOME_COLORS
      const color = t.category?.color || palette[categoryMap.size % palette.length]
      categoryMap.set(name, {
        name,
        color,
        amount: absAmount
      })
    }
  }

  const rawSlices = Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount)
  const totalAmount = rawSlices.reduce((sum, item) => sum + item.amount, 0)

  const slices: CategorySlice[] = rawSlices.map((item) => ({
    ...item,
    percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0
  }))

  const activeHoveredSlice = hoveredCategory ? slices.find((s) => s.name === hoveredCategory) : null

  // Geometria do Donut SVG
  const radius = 70
  const strokeWidth = 22
  const center = 100
  const circumference = 2 * Math.PI * radius

  let accumulatedOffset = 0

  return (
    <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
      {/* Cabeçalho com Título e Toggle Deslizante */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Distribuição por Categoria
            </h3>
            <span className="text-[11px] text-neutral-400">
              {activeMode === 'expense' ? 'Composição de despesas do mês' : 'Origem das receitas do mês'}
            </span>
          </div>
        </div>

        {/* Toggle Despesas / Receitas */}
        <div className="flex p-0.5 bg-white/5 border border-white/10 rounded-xl relative self-start sm:self-auto">
          <button
            type="button"
            data-testid="donut-btn-expenses"
            onClick={() => handleModeToggle('expense')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'expense'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            Despesas
          </button>
          <button
            type="button"
            data-testid="donut-btn-incomes"
            onClick={() => handleModeToggle('income')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'income'
                ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Receitas
          </button>
        </div>
      </div>

      {/* Conteúdo: Donut e Legenda */}
      {totalAmount === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center">
          <div className="relative w-44 h-44 flex items-center justify-center mb-3">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray="4 6"
                className="text-white/10"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider mb-0.5">
                {activeMode === 'expense' ? 'Total Despesas' : 'Total Receitas'}
              </span>
              <span data-testid="donut-center-total" className="text-lg font-bold text-white font-display tabular-nums">
                R$ 0,00
              </span>
            </div>
          </div>
          <p className="text-xs text-neutral-400">Sem lançamentos no período</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Gráfico Donut em Círculo / Aro */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative w-48 h-48 sm:w-52 sm:h-52">
              <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                {/* Trilha de fundo */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth={strokeWidth}
                />

                {/* Segmentos de Categorias */}
                {slices.map((slice) => {
                  const sliceLength = (slice.amount / totalAmount) * circumference
                  const strokeDasharray = `${sliceLength} ${circumference - sliceLength}`
                  const strokeDashoffset = -accumulatedOffset
                  accumulatedOffset += sliceLength

                  const isHovered = hoveredCategory === slice.name

                  return (
                    <circle
                      key={slice.name}
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered
                          ? `drop-shadow(0 0 10px ${slice.color}90)`
                          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                      }}
                      onMouseEnter={() => setHoveredCategory(slice.name)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  )
                })}
              </svg>

              {/* Centro do Aro com Total e Informações Contextuais */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
                <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-neutral-400 truncate max-w-[130px]">
                  {activeHoveredSlice
                    ? activeHoveredSlice.name
                    : activeMode === 'expense'
                      ? 'Total Despesas'
                      : 'Total Receitas'}
                </span>
                <span
                  data-testid="donut-center-total"
                  className="text-base sm:text-lg font-bold text-white font-display tabular-nums tracking-tight mt-0.5"
                >
                  <AnimatedNumber
                    value={activeHoveredSlice ? activeHoveredSlice.amount : totalAmount}
                    formatter={formatBRL}
                  />
                </span>
                <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium mt-0.5">
                  {activeHoveredSlice
                    ? `${activeHoveredSlice.percentage.toFixed(1)}% do total`
                    : `${slices.length} categoria${slices.length > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Legenda Lateral / Inferior com Cores, Porcentagens e Valores */}
          <div className="md:col-span-7 flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {slices.map((slice) => {
              const isHovered = hoveredCategory === slice.name

              return (
                <div
                  key={slice.name}
                  onMouseEnter={() => setHoveredCategory(slice.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-white/[0.08] border-white/20 translate-x-1'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 transition-transform"
                      style={{
                        backgroundColor: slice.color,
                        boxShadow: isHovered ? `0 0 10px ${slice.color}` : 'none',
                        transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                      }}
                    />
                    <span className="text-xs text-neutral-200 font-medium truncate">
                      {slice.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border tabular-nums"
                      style={{
                        backgroundColor: `${slice.color}15`,
                        borderColor: `${slice.color}35`,
                        color: slice.color
                      }}
                    >
                      {slice.percentage.toFixed(1)}%
                    </span>
                    <span className="text-xs font-semibold text-white tabular-nums">
                      {formatBRL(slice.amount)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
