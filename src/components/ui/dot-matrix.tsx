import * as React from "react"
import NumberFlow from "@number-flow/react"
import { useCountUp, useReducedMotionPref } from "@/lib/motion"
import { cn } from "@/lib/utils"

// 5x7 dot-matrix glyphs rendered via TWO SVG <path> nodes (lit + unlit grid dots)
// so count-up animations update 2 DOM paths instead of hundreds of <circle> elements.
const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00", "00", "00", "00", "00", "11", "11"],
  ",": ["0", "0", "0", "0", "0", "1", "1"],
  ":": ["00", "11", "11", "00", "11", "11", "00"],
  "/": ["0001", "0001", "0010", "0010", "0100", "1000", "1000"],
  "%": ["11001", "11010", "00100", "01000", "10011", "00011", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "\u2212": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "±": ["00000", "00100", "01110", "00100", "00000", "01110", "00000"],
  "°": ["010", "101", "010", "000", "000", "000", "000"],
  " ": ["00", "00", "00", "00", "00", "00", "00"],
}

const PITCH_BY_SIZE = {
  xs: 3.1,
  sm: 3.9,
  md: 4.9,
  lg: 6.2,
  xl: 7.4,
} as const

function layoutDots(text: string, includeUnlit: boolean) {
  const lit: [number, number][] = []
  const unlit: [number, number][] = []
  let colOffset = 0
  for (let idx = 0; idx < text.length; idx++) {
    const ch = text[idx]
    const glyph = GLYPHS[ch] ?? GLYPHS[" "]
    const w = glyph[0].length
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < w; c++) {
        if (glyph[r][c] === "1") {
          lit.push([colOffset + c, r])
        } else if (includeUnlit) {
          unlit.push([colOffset + c, r])
        }
      }
    }
    colOffset += w + (idx < text.length - 1 ? 1 : 0)
  }
  return { lit, unlit, totalCols: Math.max(1, colOffset - 1) }
}

function buildDotsPath(pts: [number, number][], pitch: number, radius: number): string {
  if (pts.length === 0) return ""
  const rStr = radius.toFixed(2)
  const dStr = (radius * 2).toFixed(2)
  const negDStr = (-radius * 2).toFixed(2)
  let d = ""
  for (let i = 0; i < pts.length; i++) {
    const [c, row] = pts[i]
    const startX = (c * pitch + pitch / 2 - radius).toFixed(2)
    const cy = (row * pitch + pitch / 2).toFixed(2)
    d += `M${startX},${cy}a${rStr},${rStr} 0 1,0 ${dStr},0a${rStr},${rStr} 0 1,0 ${negDStr},0`
  }
  return d
}

export interface DotMatrixProps {
  value: string | number
  size?: keyof typeof PITCH_BY_SIZE
  color?: string
  dimOpacity?: number
  countUp?: boolean
  duration?: number
  decimals?: number
  format?: (v: number) => string
  /** Disable dot entrance/update animation (recommended during scrub/drag) */
  instant?: boolean
  /** Add subtle luminous bloom on large hero readouts */
  glow?: boolean
  label?: string
  className?: string
}

export const DotMatrix = React.memo(function DotMatrix({
  value,
  size = "md",
  color = "#ffffff",
  dimOpacity = 0,
  countUp = false,
  duration = 820,
  decimals,
  format,
  instant = false,
  glow = false,
  label,
  className,
}: DotMatrixProps) {
  const reduced = useReducedMotionPref()
  const numeric = typeof value === "number" && Number.isFinite(value)
  const shouldAnimate = numeric && countUp && !instant && !reduced
  const tweened = useCountUp(numeric ? value : 0, duration, shouldAnimate)
  const activeNum = shouldAnimate ? tweened : numeric ? value : 0

  const dec = decimals ?? (numeric && !Number.isInteger(value) ? 1 : 0)
  const displayStr = numeric
    ? format
      ? format(activeNum)
      : dec > 0
        ? activeNum.toFixed(dec)
        : String(Math.round(activeNum))
    : String(value)

  const finalLabel =
    label ??
    (numeric
      ? format
        ? format(value)
        : dec > 0
          ? value.toFixed(dec)
          : String(value)
      : String(value))

  const pitch = PITCH_BY_SIZE[size]
  const radius = pitch * 0.37

  const { totalCols, litPath, unlitPath } = React.useMemo(() => {
    const { lit, unlit, totalCols } = layoutDots(displayStr, dimOpacity > 0)
    return {
      totalCols,
      litPath: buildDotsPath(lit, pitch, radius),
      unlitPath: dimOpacity > 0 ? buildDotsPath(unlit, pitch, radius * 0.62) : "",
    }
  }, [displayStr, dimOpacity, pitch, radius])

  const width = totalCols * pitch
  const height = 7 * pitch

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("inline-block shrink-0 select-none overflow-visible", className)}
      style={glow ? { filter: `drop-shadow(0 0 6px ${color}40)` } : undefined}
      role="img"
      aria-label={finalLabel}
    >
      {dimOpacity > 0 && unlitPath ? (
        <path d={unlitPath} fill={color} opacity={dimOpacity} />
      ) : null}
      {litPath ? <path d={litPath} fill={color} /> : null}
    </svg>
  )
})

export function AnimatedMetric({
  value,
  suffix,
  className,
}: {
  value: number
  suffix?: string
  className?: string
}) {
  return (
    <span className={cn("font-mono tabular-nums inline-flex items-baseline gap-1 tracking-tight", className)}>
      <NumberFlow value={value} />
      {suffix ? <span className="font-sans text-xs font-medium text-white/55">{suffix}</span> : null}
    </span>
  )
}
