"use client"

import { useState } from "react"
import { GlassCard } from "./glass-card"

interface ExpenseCategory {
  name: string
  value: number
  color: string
  percentage: number
}

const categories: ExpenseCategory[] = [
  { name: "Alimentação", value: 1280, color: "#5eead4", percentage: 32 },
  { name: "Transporte", value: 640, color: "#60a5fa", percentage: 16 },
  { name: "Lazer", value: 480, color: "#a78bfa", percentage: 12 },
  { name: "Contas", value: 1600, color: "#fbbf24", percentage: 40 },
]

function generatePieSlices(data: ExpenseCategory[]) {
  let cumulativePercentage = 0
  
  return data.map((item) => {
    const startAngle = cumulativePercentage * 3.6
    cumulativePercentage += item.percentage
    const endAngle = cumulativePercentage * 3.6
    
    const startRad = (startAngle - 90) * (Math.PI / 180)
    const endRad = (endAngle - 90) * (Math.PI / 180)
    
    const x1 = 50 + 40 * Math.cos(startRad)
    const y1 = 50 + 40 * Math.sin(startRad)
    const x2 = 50 + 40 * Math.cos(endRad)
    const y2 = 50 + 40 * Math.sin(endRad)
    
    const largeArcFlag = item.percentage > 50 ? 1 : 0
    
    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ')
    
    return {
      ...item,
      pathData,
    }
  })
}

interface ExpensePieChartProps {
  size?: "default" | "large"
}

export function ExpensePieChart({ size = "default" }: ExpensePieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const slices = generatePieSlices(categories)
  const total = categories.reduce((sum, cat) => sum + cat.value, 0)
  const isLarge = size === "large"

  return (
    <GlassCard className={isLarge ? "p-6 lg:p-7" : "p-5"}>
      <div className="flex items-center justify-between mb-4 lg:mb-5">
        <h3 className={`font-medium text-muted-foreground ${isLarge ? "text-base" : "text-sm"}`}>
          Gastos por Categoria
        </h3>
        <span className={`text-muted-foreground/60 ${isLarge ? "text-sm" : "text-xs"}`}>Este mês</span>
      </div>
      
      <div className={`flex items-center ${isLarge ? "flex-col gap-6" : "gap-6"}`}>
        {/* Pie Chart SVG */}
        <div className={`relative shrink-0 ${isLarge ? "w-40 h-40 lg:w-48 lg:h-48" : "w-28 h-28"}`}>
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full -rotate-90 drop-shadow-lg"
          >
            {slices.map((slice, index) => (
              <path
                key={slice.name}
                d={slice.pathData}
                fill={slice.color}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  opacity: activeIndex === null || activeIndex === index ? 1 : 0.4,
                  transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onTouchStart={() => setActiveIndex(index)}
                onTouchEnd={() => setActiveIndex(null)}
              />
            ))}
            {/* Inner circle for donut effect */}
            <circle
              cx="50"
              cy="50"
              r="24"
              className="fill-background"
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-muted-foreground ${isLarge ? "text-sm" : "text-xs"}`}>Total</span>
            <span className={`font-semibold text-foreground ${isLarge ? "text-lg lg:text-xl" : "text-sm"}`}>
              R$ {(total / 1000).toFixed(1)}k
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className={`
          flex flex-col min-w-0
          ${isLarge ? "w-full gap-3" : "gap-2.5 flex-1"}
        `}>
          {categories.map((category, index) => (
            <button
              key={category.name}
              className={`
                flex items-center rounded-xl transition-all duration-200
                ${activeIndex === index ? 'bg-white/5' : ''}
                ${isLarge 
                  ? "gap-3 p-3 -m-1 min-h-[52px]" 
                  : "gap-2.5 p-2 -m-2 min-h-[44px]"
                }
              `}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onTouchStart={() => setActiveIndex(index)}
              onTouchEnd={() => setActiveIndex(null)}
            >
              <div
                className={`rounded-full shrink-0 ${isLarge ? "w-3 h-3" : "w-2.5 h-2.5"}`}
                style={{ backgroundColor: category.color }}
              />
              <span className={`text-foreground/80 truncate flex-1 text-left ${isLarge ? "text-sm" : "text-xs"}`}>
                {category.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {isLarge && (
                  <span className="text-xs text-muted-foreground hidden lg:inline">
                    R$ {category.value.toLocaleString('pt-BR')}
                  </span>
                )}
                <span className={`font-medium text-foreground tabular-nums ${isLarge ? "text-sm" : "text-xs"}`}>
                  {category.percentage}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}
