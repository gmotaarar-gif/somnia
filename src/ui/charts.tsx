import * as React from "react"
import { motion } from "framer-motion"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/cn"

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))

/** Catmull-Rom spline through the points, expressed as cubic béziers. */
export function smoothPath(pts: [number, number][], tension = 0.2): string {
  if (pts.length < 2) return ""
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    d += ` C${p1[0] + (p2[0] - p0[0]) * tension},${p1[1] + (p2[1] - p0[1]) * tension} ${
      p2[0] - (p3[0] - p1[0]) * tension
    },${p2[1] - (p3[1] - p1[1]) * tension} ${p2[0]},${p2[1]}`
  }
  return d
}

/** Streak-style ruler: bold dots up to `value`, a lime marker, faint dots after. */
export function DotTrack({
  value,
  count = 28,
  className,
  marker = true,
}: {
  /** 0..1 */
  value: number
  count?: number
  className?: string
  marker?: boolean
}) {
  const at = Math.round(clamp(value) * (count - 1))
  return (
    <div className={cn("flex h-4 items-center justify-between", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) =>
        i === at && marker ? (
          <span key={i} className="h-4 w-[5px] rounded-[2px] bg-lime shadow-[0_0_12px_rgb(217_242_74/0.8)]" />
        ) : (
          <span
            key={i}
            className={cn("track-dot rounded-full", i < at ? "size-[5px] bg-white" : "size-[2.5px] bg-white/35")}
            style={{ animationDelay: `${i * 14}ms` }}
          />
        )
      )}
    </div>
  )
}

/** Row of on/off LEDs, one per day. */
export function DotRow({
  values,
  className,
  size = 6,
}: {
  values: (boolean | number)[]
  className?: string
  size?: number
}) {
  return (
    <div className={cn("flex items-center justify-between", className)} aria-hidden>
      {values.map((v, i) => {
        const on = typeof v === "number" ? v : v ? 1 : 0
        return (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: size,
              height: size,
              background: on > 0 ? "var(--color-lime)" : "rgb(255 255 255 / 0.2)",
              opacity: on > 0 ? 0.45 + on * 0.55 : 1,
              boxShadow: on > 0.6 ? "0 0 10px rgb(217 242 74 / 0.55)" : undefined,
            }}
          />
        )
      })}
    </div>
  )
}

/** Wide arc gauge with a glass knob, as on the water card. */
export function Arc({
  value,
  color = "#b6f27a",
  className,
}: {
  /** 0..1 */
  value: number
  color?: string
  className?: string
}) {
  const id = React.useId()
  const v = clamp(value)
  const cx = 100
  const cy = 196
  const r = 180
  const a0 = Math.PI * 1.5 - 0.6
  const a1 = Math.PI * 1.5 + 0.6
  const pt = (t: number) => {
    const a = a0 + (a1 - a0) * t
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const
  }
  const arc = (t: number) => {
    const [x0, y0] = pt(0)
    const [x1, y1] = pt(t)
    return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`
  }
  const [kx, ky] = pt(v)
  return (
    <svg viewBox="0 0 200 52" className={cn("w-full overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <path d={arc(1)} fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="5" strokeLinecap="round" />
      {v > 0.01 && <path d={arc(v)} fill="none" stroke={`url(#${id})`} strokeWidth="5" strokeLinecap="round" />}
      <rect x={kx - 9} y={ky - 4} width="18" height="30" rx="9" fill="rgb(255 255 255 / 0.1)" />
      <circle cx={kx} cy={ky} r="8" fill="#fff" />
      <circle cx={kx} cy={ky} r="8" fill="none" stroke="rgb(0 0 0 / 0.18)" />
    </svg>
  )
}

/** Flowing line with a knob on the last point (calories card). */
export function Wave({
  values,
  color = "#d9f24a",
  className,
  fill,
  knob = true,
  height = 60,
}: {
  values: number[]
  color?: string
  className?: string
  fill?: boolean
  knob?: boolean
  height?: number
}) {
  const id = React.useId()
  if (values.length < 2) return <div className={className} style={{ aspectRatio: `200/${height}` }} />
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const pad = 9
  const pts = values.map(
    (v, i) =>
      [pad + (i / (values.length - 1)) * (200 - pad * 2), pad + (1 - (v - lo) / span) * (height - pad * 2)] as [
        number,
        number,
      ]
  )
  const d = smoothPath(pts)
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 200 ${height}`} className={cn("w-full overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="0.7" stopColor={color} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && (
        <motion.path
          d={`${d} L${lx},${height} L${pts[0][0]},${height} Z`}
          fill={`url(#${id}f)`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        />
      )}
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.15 }}
      />
      {knob && (
        <motion.g
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.95 }}
          style={{ transformOrigin: `${lx}px ${ly}px` }}
        >
          <rect x={lx - 8} y={ly - 3} width="16" height="30" rx="8" fill="rgb(255 255 255 / 0.1)" />
          <circle cx={lx} cy={ly} r="6.5" fill="#fff" />
        </motion.g>
      )}
    </svg>
  )
}

export function Ring({
  value,
  size = 120,
  stroke = 3,
  color = "#d9f24a",
  children,
  className,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  children?: React.ReactNode
  className?: string
}) {
  const r = 50 - stroke
  const c = 2 * Math.PI * r
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth={stroke * 0.5} />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamp(value)) }}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.15 }}
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  )
}

/** Capsule bars; `goal` draws a dashed target line. */
export function Bars({
  values,
  labels,
  max,
  goal,
  highlight,
  className,
  format,
}: {
  values: number[]
  labels?: string[]
  max?: number
  goal?: number
  highlight?: number
  className?: string
  format?: (v: number) => string
}) {
  const top = max ?? Math.max(...values, goal ?? 0, 1)
  const hot = highlight ?? values.length - 1
  return (
    <div className={cn("relative flex h-full items-end gap-[6px]", className)}>
      {goal != null && (
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/30"
          style={{ bottom: `calc(${labels ? "22px" : "0px"} + (100% - ${labels ? "22px" : "0px"}) * ${goal / top})` }}
        />
      )}
      {values.map((v, i) => (
        <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <div className="relative flex w-full flex-1 items-end justify-center">
            <motion.div
              title={format ? format(v) : undefined}
              className={cn(
                "w-full max-w-[26px] rounded-full",
                i === hot ? "bg-lime shadow-[0_0_22px_-4px_rgb(217_242_74/0.8)]" : "bg-white/22"
              )}
              initial={{ height: "4%" }}
              animate={{ height: `${Math.max(6, (v / top) * 100)}%` }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.12 + i * 0.045 }}
            />
          </div>
          {labels && (
            <span className={cn("h-[14px] text-[10px] leading-none", i === hot ? "text-ink" : "text-ink-3")}>
              {labels[i]}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/** Dotted orbits with a few lit points: the "lung capacity" motif. */
export function Orbits({ points = [0.18, 0.52, 0.8], className }: { points?: number[]; className?: string }) {
  const rings = [0, 1, 2, 3, 4]
  return (
    <svg viewBox="0 0 240 110" className={cn("w-full overflow-visible", className)} aria-hidden>
      {rings.map((i) => (
        <ellipse
          key={i}
          cx={60 + i * 30}
          cy="110"
          rx="62"
          ry="58"
          fill="none"
          stroke="rgb(255 255 255 / 0.32)"
          strokeWidth="1"
          strokeDasharray="0.1 4.2"
          strokeLinecap="round"
        />
      ))}
      {points.map((p, i) => {
        const cx = 60 + ((i * 2) % 5) * 30
        const a = Math.PI + p * Math.PI
        return <circle key={i} cx={cx + Math.cos(a) * 62} cy={110 + Math.sin(a) * 58} r="3.2" fill="#fff" />
      })}
    </svg>
  )
}

/** Hops along a dotted baseline (breath volume card). */
export function Hops({ values, className }: { values: number[]; className?: string }) {
  const n = Math.max(2, values.length)
  const xs = Array.from({ length: n + 1 }, (_, i) => 12 + (i / n) * 176)
  const top = Math.max(...values, 1)
  return (
    <svg viewBox="0 0 200 64" className={cn("w-full overflow-visible", className)} aria-hidden>
      <line x1="0" x2="200" y1="56" y2="56" stroke="rgb(255 255 255 / 0.4)" strokeDasharray="0.1 5" strokeLinecap="round" strokeWidth="1.4" />
      {values.map((v, i) => {
        const x0 = xs[i]
        const x1 = xs[i + 1]
        const h = 8 + (v / top) * 44
        return (
          <path
            key={i}
            d={`M${x0},56 C${x0},${56 - h * 1.33} ${x1},${56 - h * 1.33} ${x1},56`}
            fill="none"
            stroke="rgb(255 255 255 / 0.85)"
            strokeWidth="1.2"
          />
        )
      })}
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy="56" r="3" fill={i % 2 ? "#f0a070" : "#d9f24a"} />
      ))}
    </svg>
  )
}
