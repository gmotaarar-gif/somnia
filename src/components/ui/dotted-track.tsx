import * as React from "react"
import { useReducedMotionPref } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Signature Daily Streak dotted progress rail with a glowing capsule marker
 * separating completed segments from upcoming ones.
 */
export function DottedTrack({
  value,
  dots = 22,
  color = "#e8ff1f",
  className,
}: {
  /** Progress ratio 0..1 */
  value: number
  dots?: number
  color?: string
  className?: string
}) {
  const reduced = useReducedMotionPref()
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const activeIdx = Math.min(dots - 1, Math.max(0, Math.round(clamped * (dots - 1))))

  return (
    <div
      aria-hidden
      className={cn("flex w-full items-center justify-between gap-1", className)}
    >
      {Array.from({ length: dots }, (_, i) => {
        const isNow = i === activeIdx
        const isPast = i < activeIdx
        return (
          <span
            key={i}
            style={
              isNow
                ? {
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}99`,
                    transition: reduced
                      ? "none"
                      : "transform var(--duration-fast) var(--ease-smooth-out), background-color var(--duration-fast)",
                  }
                : {
                    transition: reduced
                      ? "none"
                      : `opacity var(--duration-fast) var(--ease-smooth-out) ${Math.min(i, 12) * 14}ms`,
                  }
            }
            className={cn(
              "shrink-0 rounded-full",
              isNow
                ? "h-3.5 w-[3px]"
                : isPast
                  ? "h-[3.5px] w-[3.5px] bg-white/90"
                  : "h-[2.5px] w-[2.5px] bg-white/25"
            )}
          />
        )
      })}
    </div>
  )
}

/**
 * Breathing cadence hop arcs rendered inside wide breathing cards.
 */
export function HopArcs({
  count = 5,
  active = 3,
  accentColor = "#e8ff1f",
  className,
}: {
  count?: number
  active?: number
  accentColor?: string
  className?: string
}) {
  const W = 136
  const step = W / Math.max(1, count - 1)
  return (
    <svg
      viewBox={`-6 -4 ${W + 12} 42`}
      aria-hidden
      className={cn("h-9 w-full overflow-visible", className)}
    >
      {Array.from({ length: Math.max(0, count - 1) }, (_, i) => (
        <path
          key={i}
          d={`M${(i * step).toFixed(1)},30 Q${(i * step + step / 2).toFixed(1)},2 ${((i + 1) * step).toFixed(1)},30`}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={i < active ? 0.88 : 0.22}
          strokeWidth={1.35}
          strokeDasharray={i < active ? undefined : "2 3.5"}
          strokeLinecap="round"
        />
      ))}
      {Array.from({ length: count }, (_, i) => {
        const isCurrent = i === Math.min(count - 1, active)
        return (
          <circle
            key={i}
            cx={(i * step).toFixed(1)}
            cy={30}
            r={isCurrent ? 4 : 2.5}
            fill={isCurrent ? accentColor : "#ffffff"}
            opacity={i <= active ? 1 : 0.34}
          />
        )
      })}
    </svg>
  )
}
