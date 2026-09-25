import { cn } from "@/src/lib/utils"
import { forwardRef, type HTMLAttributes } from "react"

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "strong" | "glow"
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-3xl border border-white/10 p-5 sm:p-6",
          "backdrop-blur-2xl backdrop-saturate-150",
          "shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
          "transition-all duration-300 ease-out",
          {
            "bg-white/[0.05]": variant === "default",
            "bg-white/[0.03]": variant === "subtle",
            "bg-white/[0.08]": variant === "strong",
            "bg-white/[0.05] border-primary/25 shadow-[0_8px_30px_rgba(0,0,0,0.45)]": variant === "glow",
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
