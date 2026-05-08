"use client"

import { cn } from "@/lib/utils"
import { forwardRef, type HTMLAttributes } from "react"

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "strong"
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-3xl border border-white/10 p-6",
          "backdrop-blur-xl backdrop-saturate-150",
          "before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none",
          "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
          "transition-all duration-300 ease-out",
          {
            "bg-white/5": variant === "default",
            "bg-white/[0.03]": variant === "subtle",
            "bg-white/10": variant === "strong",
          },
          className
        )}
        {...props}
      >
        <div className="relative z-10">{children}</div>
      </div>
    )
  }
)

GlassCard.displayName = "GlassCard"

export { GlassCard }
