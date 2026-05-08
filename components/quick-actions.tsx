"use client"

import { GlassCard } from "./glass-card"
import { ArrowUpRight, ArrowDownLeft, QrCode, Receipt } from "lucide-react"

const actions = [
  {
    id: "transfer",
    label: "Transferir",
    icon: ArrowUpRight,
    color: "bg-primary/20 text-primary",
  },
  {
    id: "receive",
    label: "Receber",
    icon: ArrowDownLeft,
    color: "bg-emerald-500/20 text-emerald-400",
  },
  {
    id: "pix",
    label: "Pix",
    icon: QrCode,
    color: "bg-teal-500/20 text-teal-400",
  },
  {
    id: "pay",
    label: "Pagar",
    icon: Receipt,
    color: "bg-amber-500/20 text-amber-400",
  },
]

interface QuickActionsProps {
  layout?: "row" | "grid-2x2"
  size?: "default" | "large"
}

export function QuickActions({ layout = "row", size = "default" }: QuickActionsProps) {
  const isLarge = size === "large"
  const isGrid = layout === "grid-2x2"
  
  return (
    <div className={`
      ${isGrid 
        ? "grid grid-cols-2 gap-3 lg:gap-4 h-full" 
        : "grid grid-cols-4 gap-3"
      }
    `}>
      {actions.map((action) => (
        <GlassCard
          key={action.id}
          variant="subtle"
          className={`
            p-0 cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all duration-200
            ${isGrid ? "h-full" : ""}
          `}
        >
          <button className={`
            w-full flex items-center justify-center
            ${isGrid 
              ? "flex-col gap-2 lg:gap-3 p-4 lg:p-5 min-h-[100px] lg:min-h-[110px]" 
              : "flex-col gap-2 py-4 px-2 min-h-[88px]"
            }
          `}>
            <div className={`
              rounded-2xl flex items-center justify-center ${action.color}
              ${isLarge ? "w-12 h-12 lg:w-14 lg:h-14" : "w-11 h-11"}
            `}>
              <action.icon 
                className={isLarge ? "w-5 h-5 lg:w-6 lg:h-6" : "w-5 h-5"} 
                strokeWidth={1.5} 
              />
            </div>
            <span className={`
              font-medium text-foreground/80
              ${isLarge ? "text-sm lg:text-base" : "text-xs"}
            `}>
              {action.label}
            </span>
          </button>
        </GlassCard>
      ))}
    </div>
  )
}
