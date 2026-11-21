import * as React from "react"
import { cn } from "@/lib/cn"
import Grainient from "@/ui/Grainient"

export type CardTone =
  | "plum"
  | "lime"
  | "ember"
  | "forest"
  | "moss"
  | "rose"
  | "dusk"
  | "cobalt"
  | "coral"
  | "ink"
  | "violet"
  | "mint"
  | "night"
  | "sunset"
  | "nightfall"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: CardTone
  r?: "sm" | "md" | "lg"
  /** Draws the tone as a living, grainy gradient over its CSS fallback. */
  grain?: boolean
}

/** The `data-tone` gradients of index.css: edge colours, the dark core and where it sits. */
const TONES: Record<CardTone, { c1: string; c2: string; core?: string; y?: number; h?: number; ang?: number }> = {
  plum: { c1: "#a3167d", c2: "#b9a4da" },
  lime: { c1: "#1b7a12", c2: "#c6cf6c" },
  ember: { c1: "#48130f", c2: "#bb561a", y: 0.4 },
  forest: { c1: "#0f3a2a", c2: "#03130c", y: 0.62, h: 0.7 },
  moss: { c1: "#8aa83c", c2: "#0a0f08", y: 0.66, h: 0.78, ang: 140 },
  rose: { c1: "#b93049", c2: "#cc3d88", core: "#14060c", h: 0.52, ang: 215 },
  dusk: { c1: "#6b5db4", c2: "#3a1f3f", core: "#0b070f", y: 0.58, h: 0.7, ang: 205 },
  cobalt: { c1: "#2a3bb4", c2: "#0b0f3a", core: "#05061a", y: 0.62 },
  coral: { c1: "#1a0806", c2: "#ee4a26", y: 0.32, h: 0.66 },
  ink: { c1: "#2c2c33", c2: "#0c0c0f", y: 0.64, h: 0.8 },
  violet: { c1: "#c2489c", c2: "#4b2a8f", core: "#12041a", y: 0.56, h: 0.56 },
  mint: { c1: "#e2994f", c2: "#2f8a2a", core: "#0d2a10", y: 0.7, h: 0.4 },
  night: { c1: "#3d4fd6", c2: "#120a3c", core: "#05061c", y: 0.58, h: 0.58 },
  sunset: { c1: "#d06a3c", c2: "#7a2a78", core: "#16060f", y: 0.54, h: 0.54 },
  nightfall: { c1: "#c2409a", c2: "#3b2cd2", core: "#06041a", y: 0.4, h: 0.56 },
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t)

/** The CSS core fades out along the gradient: full at its centre, gone one radius away. */
function coreWeight(d: number) {
  const stops: [number, number][] = [[0, 1], [0.32, 0.88], [0.66, 0.42], [1, 0]]
  if (d >= 1) return 0
  const i = stops.findIndex(([at]) => at > d)
  const [a, wa] = stops[i - 1]
  const [b, wb] = stops[i]
  return wa + ((d - a) / (b - a)) * (wb - wa)
}

const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
/** The waves carry the edge colours under the text, so light ones are dimmed to keep white legible. */
const MAX_LUMINANCE = 0.3
function dim(c: number[]) {
  const l = 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
  return l > MAX_LUMINANCE ? c.map((v) => v * (MAX_LUMINANCE / l) ** (1 / 2.4)) : c
}

/** Eight stops along the tone's axis, edge colour to edge colour through its dark core. */
export function tonePalette(tone: CardTone) {
  const t = TONES[tone]
  const [c1, c2, core] = [rgb(t.c1), rgb(t.c2), rgb(t.core ?? "#050506")]
  const colors = Array.from({ length: 8 }, (_, i) => {
    const p = i / 7
    return hex(dim(mix(mix(c1, c2, p), core, coreWeight(Math.abs(p - (t.y ?? 0.5)) / (t.h ?? 0.6)))))
  })
  return { colors, angle: t.ang ?? 180 }
}

/** Static until touched: it draws once, stirs under a pointer and settles again. */
function CardGrain({ tone }: { tone: CardTone }) {
  const { colors, angle } = React.useMemo(() => tonePalette(tone), [tone])
  return (
    <Grainient
      aria-hidden
      colors={colors}
      angle={angle}
      speed={0}
      grainAnimated={false}
      intro={false}
      flow={0.9}
      silk={0.3}
      grainAmount={0.07}
      style={{ position: "absolute", inset: 0, zIndex: -2, pointerEvents: "none" }}
    />
  )
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { tone, r = "md", grain, className, children, ...rest },
  ref
) {
  return (
    <div ref={ref} data-tone={tone} data-r={r} className={cn("card", className)} {...rest}>
      {grain && tone && <CardGrain tone={tone} />}
      {children}
    </div>
  )
})

export function CardTitle({
  children,
  sub,
  className,
}: {
  children: React.ReactNode
  sub?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[17px] font-medium leading-tight tracking-[-0.02em]">{children}</div>
      {sub != null && <div className="mt-1.5 text-[12px] leading-snug text-ink-2">{sub}</div>}
    </div>
  )
}
