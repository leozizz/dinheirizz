"use client"

import { useState } from "react"
import { GlassCard } from "./glass-card"
import { Eye, EyeOff, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface BalanceCardProps {
  size?: "default" | "large"
}

export function BalanceCard({ size = "default" }: BalanceCardProps) {
  const [isVisible, setIsVisible] = useState(true)
  const isLarge = size === "large"
  
  return (
    <GlassCard variant="strong" className="relative overflow-hidden h-full">
      {/* Decorative gradient orb */}
      <div className="absolute -top-20 -right-20 w-40 h-40 lg:w-56 lg:h-56 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 lg:w-44 lg:h-44 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-1 lg:mb-2">
          <span className={`text-muted-foreground ${isLarge ? "text-sm lg:text-base" : "text-sm"}`}>
            Saldo Disponível
          </span>
          <button 
            onClick={() => setIsVisible(!isVisible)}
            className="p-2.5 -m-2.5 rounded-full hover:bg-white/5 active:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isVisible ? "Ocultar saldo" : "Mostrar saldo"}
          >
            {isVisible ? (
              <Eye className={`text-muted-foreground ${isLarge ? "w-5 h-5" : "w-4.5 h-4.5"}`} />
            ) : (
              <EyeOff className={`text-muted-foreground ${isLarge ? "w-5 h-5" : "w-4.5 h-4.5"}`} />
            )}
          </button>
        </div>
        
        <div className="flex items-baseline gap-1 mb-4 lg:mb-6">
          <span className={`font-bold tracking-tight text-foreground ${isLarge ? "text-4xl xl:text-5xl" : "text-3xl"}`}>
            {isVisible ? "R$ 12.847" : "R$ •••••"}
          </span>
          <span className={`font-medium text-foreground/60 ${isLarge ? "text-xl xl:text-2xl" : "text-lg"}`}>
            {isVisible ? ",50" : ""}
          </span>
        </div>
        
        {/* Stats row */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <TrendingUp className={`text-emerald-400 ${isLarge ? "w-4 h-4" : "w-3.5 h-3.5"}`} />
            <span className={`font-medium text-emerald-400 ${isLarge ? "text-sm" : "text-xs"}`}>+R$ 3.240</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-rose-500/10 border border-rose-500/20">
            <TrendingDown className={`text-rose-400 ${isLarge ? "w-4 h-4" : "w-3.5 h-3.5"}`} />
            <span className={`font-medium text-rose-400 ${isLarge ? "text-sm" : "text-xs"}`}>-R$ 4.000</span>
          </div>
        </div>
        
        {/* Desktop: Additional stats */}
        {isLarge && (
          <div className="hidden lg:flex items-center gap-6 mt-6 pt-5 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-sm font-semibold text-foreground">R$ 8.500</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-rose-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saídas</p>
                <p className="text-sm font-semibold text-foreground">R$ 4.000</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
