import React, { useEffect, useRef, useState } from 'react'

export interface AnimatedNumberProps {
  value: number
  formatter?: (val: number) => string
  durationMs?: number
  className?: string
}

export function AnimatedNumber({
  value,
  formatter = (val) => String(val),
  durationMs = 600,
  className
}: AnimatedNumberProps) {
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
  const [currentValue, setCurrentValue] = useState<number>(value)
  const prevValueRef = useRef<number>(value)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    // Em ambiente de teste ou se o usuário prefere redução de movimento, renderiza diretamente
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    if (isTest || prefersReducedMotion) {
      setCurrentValue(value)
      prevValueRef.current = value
      return
    }

    const startValue = prevValueRef.current
    const endValue = value
    const delta = endValue - startValue

    if (delta === 0) {
      setCurrentValue(value)
      return
    }

    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const rawProgress = Math.min(elapsed / durationMs, 1)
      // Curva ease-out cubic
      const progress = 1 - Math.pow(1 - rawProgress, 3)
      const nextValue = startValue + delta * progress

      setCurrentValue(nextValue)

      if (rawProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setCurrentValue(endValue)
        prevValueRef.current = endValue
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      prevValueRef.current = value
    }
  }, [value, durationMs, isTest])

  return <span className={className}>{formatter(currentValue)}</span>
}
